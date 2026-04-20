# MBG Soe · Supply Chain Dashboard

**WFP × IFSR × FFI · SPPG Nunumeu, Soe, Nusa Tenggara Timur**
Sistem rantai pasok & perencanaan menu program Makan Bergizi Gratis untuk 9 sekolah pilot di Kecamatan Kota Soe. Migrasi dari single-file HTML dashboard (Round 5) ke Next.js + Supabase (Round 6).

Go-live: **4 Mei 2026.**

---

## Arsitektur

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind |
| Auth | Supabase Auth · Magic-link email · invite-only |
| Database | Postgres (Supabase) + Row Level Security |
| Engine | SQL functions + RPC — port dari `MBG_ENGINE` HTML |
| Deploy | Vercel (Singapore region `sin1`) + Supabase Cloud |

### 5 peran (role matrix)

| Role | Tulis apa | Baca apa |
| --- | --- | --- |
| `admin` | Semua | Semua |
| `operator` | stok, PO, GRN, invoice, receipt, menu_assign | Semua |
| `ahli_gizi` | menus, menu_bom, custom_menus, items, settings | Semua |
| `supplier` | status GRN miliknya | PO/GRN/invoice yang `supplier_id = profile.supplier_id` |
| `viewer` | — | Read-only semua |

Seluruh aturan dienforce oleh **RLS** (`supabase/migrations/0002_rls.sql`). Tidak ada bypass lewat client; anon-key hanya bisa yang policy ijinkan.

---

## Struktur folder

```
mbg-soe-app/
├── app/
│   ├── admin/invite/           ← Halaman admin: buat undangan
│   ├── auth/callback/          ← Route handler magic-link
│   ├── auth/signout/           ← Route handler sign out
│   ├── dashboard/              ← Halaman utama setelah login
│   ├── login/                  ← Form kirim magic-link
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                ← Landing publik
├── components/
│   └── nav.tsx                 ← Header navigasi
├── lib/
│   ├── engine.ts               ← TS wrapper untuk SQL RPC
│   ├── roles.ts                ← Helper role matrix
│   └── supabase/
│       ├── client.ts           ← Browser client
│       └── server.ts           ← Server + admin (service role) client
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql     ← 20 tabel + 9 enum + trigger
│   │   ├── 0002_rls.sql        ← Semua policy RLS
│   │   └── 0003_functions.sql  ← porsi_counts, requirement_for_date, dll
│   └── seed.sql                ← 9 sekolah, 40 item, 14 menu, 12 supplier
├── types/
│   └── database.ts             ← TS types (hand-authored; regen via CLI)
├── middleware.ts               ← Session refresh + gate /dashboard /admin
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── vercel.json
├── .env.local.example
└── README.md                   ← Dokumen ini
```

---

## Setup lokal (5 menit)

### 1 · Install Supabase CLI + link project

```bash
# macOS
brew install supabase/tap/supabase

# atau via npm
npm i -g supabase

supabase login
supabase link --project-ref <your-project-ref>
```

### 2 · Clone & install dependencies

```bash
git clone <repo>
cd mbg-soe-app
npm install
cp .env.local.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY
# dari Supabase dashboard → Project Settings → API
```

### 3 · Push migrasi + seed

```bash
# Apply 0001 → 0002 → 0003 ke Supabase cloud
supabase db push

# Load seed data (9 sekolah, 40 item, dll)
psql "$DATABASE_URL" -f supabase/seed.sql
# atau dari Supabase dashboard → SQL editor → paste isi seed.sql → Run
```

### 4 · Jalankan dev server

```bash
npm run dev
# → http://localhost:3000
```

### 5 · Bootstrap admin pertama

Supabase Auth belum tahu siapa admin; kita promote manual via SQL editor:

```sql
-- Setelah anda login sekali via magic-link di /login, profil anda otomatis
-- dibuat dengan role='viewer' inactive. Promote ke admin:
update public.profiles
   set role = 'admin',
       active = true,
       full_name = 'Alfatehan Septianta'
 where email = 'pinkatitan@gmail.com';
```

Login ulang → sekarang bisa akses `/admin/invite` untuk mengundang operator, ahli gizi, supplier, dll.

---

## Flow undangan (invite-only)

1. Admin login, buka `/admin/invite`
2. Input email + peran + supplier (jika role=supplier)
3. RPC `public.create_invite(email, role, supplier_id)` dipanggil — `security definer`, cek caller=admin dulu
4. User dikirim link `/login`, input email yg sama
5. Supabase kirim magic-link ke inbox
6. Klik link → Supabase redirect ke `/auth/callback?code=xxx`
7. Callback exchange code, trigger `handle_new_user` pada insert `auth.users`:
   - Cocokkan email dengan `invites` yang `used_at IS NULL AND expires_at > now()`
   - Jika match: buat `profiles` dengan role dari invite, `active=true`
   - Jika tak match: buat `profiles` default `viewer, active=false`
8. Middleware redirect ke `/dashboard`
9. Jika `active=false`, halaman dashboard tampil pesan "Akun belum aktif, hubungi admin"

Undangan berlaku 7 hari (default settable di `0001_schema.sql` line ~46).

---

## Deploy ke Vercel

### 1 · Push ke GitHub

```bash
cd mbg-soe-app
git init
git add -A
git commit -m "R6P1: Next.js + Supabase scaffold"
git branch -M main
gh repo create ifsr/mbg-soe-app --private --source=. --push
```

### 2 · Import di Vercel

- Buka https://vercel.com/new
- Pilih repo `ifsr/mbg-soe-app`
- Framework preset: **Next.js** (auto-detected dari `vercel.json`)
- Environment variables — salin dari `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (mark "sensitive")
  - `NEXT_PUBLIC_SITE_URL` → `https://mbg-soe.vercel.app` (domain produksi)
- Deploy

### 3 · Whitelist redirect URL di Supabase

Supabase → Authentication → URL Configuration → Site URL + Redirect URLs:

```
http://localhost:3000
http://localhost:3000/auth/callback
https://mbg-soe.vercel.app
https://mbg-soe.vercel.app/auth/callback
```

### 4 · Custom domain (opsional)

Vercel → Settings → Domains → `mbg-soe.ifsr.or.id` → ikuti instruksi DNS.

---

## Engine — dari HTML ke SQL

Semua math yang dulu di `MBG_ENGINE` (client-side JS) dipindahkan ke Postgres sebagai RPC functions. Kenapa? Single source of truth + enforceable di RLS + tidak bocor rahasia ke client.

| HTML function | SQL RPC |
| --- | --- |
| `porsiWeight()` | `settings.porsi_weight` (jsonb) |
| `porsiCounts(d)` | `public.porsi_counts(p_date)` |
| `porsiEffective(d)` | `public.porsi_effective(p_date)` |
| `requirementForDate(d)` | `public.requirement_for_date(p_date)` |
| `stockShortageForDate(d)` | `public.stock_shortage_for_date(p_date)` |
| `upcomingShortages(h)` | `public.upcoming_shortages(p_horizon)` |

Client memanggil lewat `supabase.rpc(...)`; wrapper TypeScript di `lib/engine.ts`.

### Weighting porsi

Dari `settings.porsi_weight`:

```json
{"kecil": 0.7, "besar": 1.0}
```

Rumus di `porsi_effective`:

```
eff = kecil × 0.7 + (besar + guru) × 1.0
```

Dipakai untuk scaling BOM (gram/porsi × eff / 1000 = kg total).

### Kalender non-operasional

`non_op_days` berisi tanggal libur + alasan. Weekend otomatis non-op (cek `extract(dow from p_date) in (0,6)`). `porsi_counts` return semua 0 jika non-op.

### Custom menu override

Jika tanggal ada di `custom_menus`, itu menang atas `menu_assign`. Engine flatten jsonb array (`karbo || protein || sayur || buah`) dan resolve ke `items` dengan default 100g/porsi (bisa diatur per-item nanti).

---

## Testing

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Build production (sanity check)
npm run build
```

Untuk testing engine lebih serius, siapkan `supabase/tests/*.sql` (pg_tap) di Round 6 Phase 2.

---

## Roadmap

**Phase 1 — ⚡ sekarang**
- [x] Schema + RLS + RPC
- [x] Magic-link auth + invite flow
- [x] Dashboard minimal
- [x] Admin invite page
- [ ] Deploy ke Vercel production

**Phase 2 — setelah go-live**
- [ ] Modul Stok + PO + GRN CRUD (port penuh dari HTML)
- [ ] Modul Kalender Menu + Custom Menu builder
- [ ] Modul Supplier + Vendor Matrix
- [ ] Upload foto receipt ke Supabase Storage
- [ ] Supplier portal (read-only PO/invoice mereka)
- [ ] WFP observer view (dashboard publik terbatas)

**Phase 3 — scale**
- [ ] Multi-SPPG (pisahkan tenant per SPPG)
- [ ] Mobile PWA untuk operator di lapangan
- [ ] Integrasi SIPD / SIRUP (e-procurement pemerintah)

---

## Kontak

- Product lead: **Alfatehan Septianta** · `alfatehan.s@ifsr.or.id`
- Program: **IFSR Ship-to-School** · pilot WFP × IFSR × FFI 2026
- Lokasi: **SPPG Nunumeu**, Kota Soe, Timor Tengah Selatan, NTT

---

*Built with ❤️ for gizi anak Indonesia.*
