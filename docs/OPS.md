# MBG SOE — Operations Runbook

Panduan operasional harian untuk admin/DevOps. Catat setiap kejadian produksi di bawah **Incident Log** di akhir file ini.

---

## 1. Stack Overview

| Layer         | Tech                                    | Notes                               |
|---------------|-----------------------------------------|-------------------------------------|
| Frontend      | Next.js 14 (App Router), React 18       | Deploy via Vercel                   |
| Backend API   | Next.js route handlers + server actions | Edge (middleware) + Node runtime    |
| DB            | Supabase Postgres                       | RLS enforced on all user tables     |
| Auth          | Supabase Auth (email+password)          | Dev-admin bypass via `DEV_ADMIN`    |
| Storage       | Supabase Storage                        | Buckets: `invoices`, `pod-photos`   |
| Cache/Queue   | In-memory (Next.js process)             | Rate-limit, notification poll       |

Environment variables (SSOT `.env.local` local, Vercel project envs production):

| Key                               | Scope    | Purpose                                   |
|-----------------------------------|----------|-------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | public   | Supabase project URL                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`   | public   | Anon client (respects RLS)                |
| `SUPABASE_SERVICE_ROLE_KEY`       | server   | Admin scripts, seed, RLS tests            |
| `NEXT_PUBLIC_SENTRY_DSN`          | public   | Error forwarding (optional)               |
| `DEV_ADMIN`                       | server   | `1` hanya di lokal, JANGAN di prod        |

---

## 2. Daily Ops Checklist

Setiap pagi (08:00 WIB):

1. Buka `/dashboard` — pastikan KPI render tanpa error.
2. Cek notification bell (pojok kanan navbar) — ada shortage/expiry/overdue?
3. Scroll `/stock` → filter "Near expiry (≤3 hari)" — plan re-route/donasi.
4. Cek `/payments` → filter "Overdue" — follow-up supplier.
5. Buka Supabase Dashboard → **Logs** → filter `level=error` last 24h.

Setiap malam (22:00 WIB):

1. Jalankan backup manual (lihat §5) kalau auto-backup Supabase belum cukup.
2. Review `admin/audit` untuk activity anomali (login gagal berturut, bulk delete, dll).

---

## 3. Deployment Flow

Branch strategy: `main` = production, feature branch → PR → merge.

```bash
# Local smoke test
pnpm install
pnpm build            # next build
pnpm lint
npx tsc --noEmit

# Deploy production
git push origin main  # Vercel auto-deploy
```

Rollback production (Vercel):

1. Buka Vercel project → **Deployments**.
2. Pilih deployment sebelumnya yang hijau (✓ Ready).
3. Menu "…" → **Promote to Production**.
4. Purge edge cache (Vercel → Settings → Data Cache → Purge).

---

## 4. Database Migrations

Semua migration di `supabase/migrations/*.sql` (ordered). Apply manually via Supabase SQL Editor (copy-paste seluruh file) atau via CLI:

```bash
supabase db push
```

Retrofit DB lama (yang belum idempotent):

```sql
-- Apply 0040_idempotent_retrofit.sql untuk melindungi create type / create table
-- dari "already exists" error kalau replay migration.
```

Rollback migration:

```bash
# Opsi A — teardown total (DESTRUCTIVE)
psql $DATABASE_URL -f supabase/rollbacks/0001_schema.down.sql

# Opsi B — drop module tertentu
psql $DATABASE_URL -f supabase/rollbacks/_module-drops.down.sql
# (edit file dulu, comment out section yang tidak mau di-drop)
```

Seed demo (3 bulan):

```bash
# Pastikan SUPABASE_SERVICE_ROLE_KEY di .env.local
pnpm db:seed:demo          # 90 hari default
pnpm db:seed:demo:reset    # wipe tabel demo dulu, lalu seed ulang
```

Smoke-test RLS per role:

```bash
pnpm db:test:rls
# Exit code 0 = semua role pass; 1 = ada leak
```

---

## 5. Backup & Restore

### 5.1 Automatic (Supabase Pro)

Supabase auto-backup harian, retention 7 hari (paid tier). Cek:

- Dashboard → **Database** → **Backups**
- Klik date → **Download** atau **Restore to new project**

### 5.2 Manual pg_dump

Full dump (schema + data):

```bash
# Ambil connection string dari Supabase → Settings → Database → URI
export DATABASE_URL="postgres://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"

pg_dump "$DATABASE_URL" \
  --no-owner --no-privileges \
  --file="backups/$(date +%F_%H%M)_full.sql"

# Compressed binary (lebih cepat restore)
pg_dump "$DATABASE_URL" -Fc -f "backups/$(date +%F_%H%M)_full.dump"
```

Schema-only atau data-only:

```bash
pg_dump "$DATABASE_URL" --schema-only -f backups/schema.sql
pg_dump "$DATABASE_URL" --data-only  -f backups/data.sql
```

### 5.3 Restore

**Ke project baru** (disaster recovery):

```bash
# 1. Buat Supabase project baru, ambil URI
export NEW_DB_URL="postgres://postgres:[PW]@db.new.supabase.co:5432/postgres"

# 2. Restore schema dulu
psql "$NEW_DB_URL" -f backups/schema.sql

# 3. Restore data
psql "$NEW_DB_URL" -f backups/data.sql

# atau single-shot binary
pg_restore --no-owner --no-privileges -d "$NEW_DB_URL" backups/full.dump

# 4. Re-create auth users via admin API (auth.users tidak ikut kena pg_dump default)
node scripts/migrate-auth-users.js  # tulis manual kalau perlu
```

**Selective restore** (1 tabel rusak):

```bash
pg_restore -d "$DATABASE_URL" -t public.transactions backups/full.dump
```

### 5.4 Storage Bucket Backup

Supabase Storage tidak ikut `pg_dump`. Backup manual:

```bash
# List buckets
supabase storage ls

# Download bucket ke local
supabase storage download invoices ./backups/storage/invoices --recursive
supabase storage download pod-photos ./backups/storage/pod-photos --recursive
```

---

## 6. Security Runbook

### 6.1 Rotate API Keys

```bash
# 1. Supabase Dashboard → Settings → API → Roll anon + service_role
# 2. Update Vercel env:
vercel env rm NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
# 3. Redeploy
```

### 6.2 Kompromi Akun (password leak)

1. Supabase Dashboard → **Authentication** → search user → **Reset password**.
2. Revoke sessions: `supabase.auth.admin.signOut(userId)` via script.
3. Cek `admin/audit` untuk aksi mencurigakan di 30 hari terakhir.

### 6.3 RLS Audit

Jalankan `pnpm db:test:rls` setiap habis merge migration yang sentuh policy. Kalau exit 1 → **blokir deploy**.

---

## 7. Monitoring & Alerts

| Signal              | Source                          | Threshold           |
|---------------------|---------------------------------|---------------------|
| API 5xx rate        | Vercel Analytics                | >1% over 5 min      |
| DB connections      | Supabase Dashboard → Database   | >80% pool           |
| Build failure       | Vercel + GitHub Actions         | Any                 |
| Error log spike     | Sentry (kalau sudah wire)       | >10 errors/min      |
| RLS test failure    | GitHub Actions nightly          | Exit 1              |

Notification bell in-app polls RPC `notification_feed` tiap 90 detik — kalau ada shortage/expiry/overdue muncul di UI real-time.

---

## 8. Common Issues

**"Failed to fetch" di /dashboard**
Biasanya anon key expired atau RLS policy tertutup. Cek: network tab → 401? → rotate key + `pnpm db:test:rls`.

**PO stuck di status draft**
Cek `po_rows` ada isi? Kalau kosong, user belum approve di `/procurement/requisition/[no]`.

**Delivery route tidak render di map**
School `lat`/`lng` masih NULL. Fix via `/schools` → edit → paste Google Maps coords.

**Invoice overdue tapi tidak muncul di notif bell**
RPC filter `invoice_overdue` butuh `due_date` kolom berisi. Cek data di Supabase `invoices` table editor.

---

## 9. Contacts

| Role              | Person                          | Channel           |
|-------------------|---------------------------------|-------------------|
| Product Owner     | Alfatehan Septianta (Titan)     | pinkatitan@gmail.com |
| DevOps on-call    | (TBD)                           | (TBD)             |
| Supabase billing  | (TBD)                           | Supabase dashboard owner |

---

## 10. Incident Log

Format: `YYYY-MM-DD HH:MM TZ | severity | 1-line summary | link to postmortem`

```
(empty — isi mulai insiden pertama)
```
