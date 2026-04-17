# Review Struktur Database & Supabase — MBG Soe App
**Tanggal:** 2026-04-17 · **Reviewer:** Claude (Titan Global)
**Scope:** 26 migrations (5.348 baris SQL), RLS, RPC, Storage, types/database.ts, pola konsumsi di app/.

---

## 1. Ringkasan Eksekutif

Schema **fundamental sudah sehat** — domain model (MBG supply chain: Menu → BOM → Porsi → Requirement → PR → Quotation → PO → GRN → Invoice → Stock) konsisten dengan business logic yang dicover oleh 26 migration. Role matrix (`admin/operator/ahli_gizi/supplier/viewer`) diterapkan rapi lewat RLS + 3 security-definer helper (`current_role`, `current_supplier_id`, `is_admin`). Auto-sync flow (stock_moves → stock, GRN → stock_moves, quotation rows → total, NCR → auto-number) sudah ter-trigger dengan benar.

**Tapi ada 4 bug kritikal yang bisa fail runtime, 3 kelemahan arsitektur yang akan menyakitkan saat scaling multi-SPPG, dan type-safety untuk ~14 tabel baru tidak ter-maintain sejak 0001.** Prioritas jangka pendek: fix bug, regenerate types, tambah index. Jangka menengah: refactor stock ke multi-location, grn_rows actual, audit log.

Health score subyektif: **7/10**. Solid untuk single-SPPG (Soe) go-live 4 Mei 2026, tapi beberapa utang teknis yang sebaiknya dibayar sebelum replikasi ke SPPG lain.

---

## 2. Bug Kritikal (FIX DULU)

### 2.1 `0013_bom_variance.sql` — kolom salah nama di JOIN

[supabase/migrations/0013_bom_variance.sql:43](supabase/migrations/0013_bom_variance.sql#L43) dan [line 179](supabase/migrations/0013_bom_variance.sql#L179):

```sql
left join public.menu_assign ma on ma.op_date = dc.op_date
```

Tabel `menu_assign` PK-nya `assign_date`, bukan `op_date`. Function `bom_variance()` dan `bom_variance_by_menu()` akan throw `column "op_date" does not exist` saat dipanggil. Fix: ganti `ma.op_date` → `ma.assign_date` di kedua tempat.

### 2.2 `0015_sop_runs.sql` — kolom `user_id` tidak ada di profiles

[supabase/migrations/0015_sop_runs.sql:82](supabase/migrations/0015_sop_runs.sql#L82):

```sql
select full_name into v_eval
  from public.profiles
  where user_id = auth.uid();
```

Tabel `profiles` PK-nya `id` (lihat 0001_schema.sql:22). RPC `log_sop_run()` akan fail saat eksekusi → `column "user_id" does not exist`. Fix: `where id = auth.uid()`.

### 2.3 `types/database.ts` stale — 14+ tabel tidak punya type

File di-author tangan dari 0001. Migration 0007–0026 menambah tabel-tabel berikut yang **belum masuk types**: `supplier_certs`, `school_attendance`, `qc_checklist_templates`, `grn_qc_checks`, `non_conformance_log`, `quotations`, `quotation_rows`, `purchase_requisitions`, `pr_rows`, `pr_allocations`, `price_periods`, `price_weeks`, `supplier_prices`. Juga RPC baru (pr_*, supplier_forecast_*, upsert_supplier_price) tidak ada di `Functions`. Di app layer ini jatuh ke `any`-nya PostgrestClient — tidak ada type safety untuk 40%+ kode.

Fix: `supabase gen types typescript --linked > types/database.ts` dan commit. Jangan maintain manual lagi — ubah `database.ts` jadi fully generated.

### 2.4 Duplicate `touch_updated_at` function

[0001:347 `public.touch_updated_at`](supabase/migrations/0001_schema.sql#L347) vs [0017:92 `public.tg_touch_updated_at`](supabase/migrations/0017_weekly_price_list.sql#L92) — dua function identical dengan nama beda. Tidak error, tapi 6 trigger pakai yang pertama, 2 trigger pakai yang kedua. Konsolidasi ke satu function.

---

## 3. Kelemahan Arsitektur

### 3.1 Stock single-location (akan jadi masalah multi-SPPG)

`stock(item_code PRIMARY KEY)` hanya support satu warehouse. Saat fase replikasi IFSR × WFP ke SPPG Kupang/Atambua/NTT lain, kamu harus schema-break untuk tambah `location_id`. Antisipasi sekarang dengan composite PK `(location_id, item_code)` plus default location row 'NUNUMEU' — migration sekarang juga lebih murah ketimbang after-deploy.

### 3.2 Tidak ada batch/expiry tracking untuk stock

Pangan sekolah = risiko food safety. Stock cuma punya `qty`, tidak ada `received_batches (grn_no, expiry_date, qty_remaining)`. Kalau ada beras kedaluwarsa atau recall ikan tuna, tidak ada jejak lot untuk trace. Untuk audit WFP dan SNI 8152 (sistem mutu katering), ini requirement implicit.

### 3.3 GRN tidak punya received_qty per line

[0011_grn_autostock.sql](supabase/migrations/0011_grn_autostock.sql) melakukan approximation: status='partial' tetap insert full qty dari po_rows, operator manual adjustment lewat stock_moves. Ini **menciptakan drift yang sulit direkonsiliasi**. Tambahkan tabel `grn_rows(grn_no, line_no, item_code, qty_received, qty_rejected, note)` — wajib ada untuk tiap line PO yang masuk. Stock sync baru baca dari situ, bukan dari po_rows.

### 3.4 Primary key text rawan rename-hell

`items.code text PK`, `suppliers.id text PK`, `schools.id text PK`. Kalau "Beras Putih" di-rename jadi "Beras Premium", semua FK di `menu_bom`, `po_rows`, `stock`, `stock_moves`, `quotation_rows`, `pr_rows`, `supplier_items`, `supplier_prices` harus di-update (sebagian ON DELETE RESTRICT malah blocking). Saran: surrogate PK `id bigserial`, `code text UNIQUE NOT NULL` jadi business key yang editable. Ini utang teknis, bukan emergency.

### 3.5 `transactions` tabel redundant / duplikasi

Event `po`, `grn`, `invoice`, `payment`, `adjustment`, `receipt` sudah ada di tabel masing-masing. `transactions` cuma diisi manual (dari app layer) — dan tidak ada trigger auto-sync. Gampang out-of-sync dengan source of truth. Dua opsi: (a) hapus tabel, bangun view union dari tabel asli; (b) biarkan tabel, tapi isi via trigger `after insert on {purchase_orders, grns, invoices, receipts}`. Saat ini jatuh ke kategori "dead code yang bikin bingung reader".

### 3.6 `purchase_orders.total` tidak auto-sync dari po_rows

`po_rows.subtotal` generated stored, tapi `purchase_orders.total` manual diupdate di RPC `convert_quotation_to_po` dan presumed di frontend. Bisa drift kalau admin edit po_rows langsung. Pasang trigger `after insert/update/delete on po_rows → recalc po.total`, mirror pattern `recalc_quotation_total` yang sudah ada.

### 3.7 Custom menu pakai jsonb tanpa FK

[0001:193-201](supabase/migrations/0001_schema.sql#L193) — `custom_menus.karbo/protein/sayur/buah` jsonb array of item_code string. Kalau operator typo atau item di-delete, `requirement_for_date` akan quiet-join dengan `jsonb_array_elements_text(...) join items on code = val` dan item hilang tanpa warning. Tambah validation trigger yang cek semua element valid di items, atau better: normalisasi jadi tabel `custom_menu_items(menu_date, slot enum, item_code FK)`.

---

## 4. RLS & Security

### 4.1 Supplier bisa baca full `suppliers` + `schools`

[0002_rls.sql:78](supabase/migrations/0002_rls.sql#L78) — `suppliers: auth read` allow semua authenticated. Berarti supplier login bisa intip kompetitor (nama, alamat, skor, status). Juga `schools: auth read` → supplier bisa lihat detail sekolah, jumlah siswa, PIC phone. Mungkin bocor kompetitif. Tighten ke `current_role() != 'supplier'`, atau spawn view khusus supplier.

### 4.2 Supplier update policy tidak membatasi kolom

[0002:109-115](supabase/migrations/0002_rls.sql#L109) `supactions: supplier update own` — pakai WITH CHECK supplier_id = own. Tapi tidak ada check kolom yang boleh dimodif. Supplier bisa rubah `priority`, `target_date`, `status`, `blocked_reason`, `source`, bahkan `supplier_id` ke supplier lain (tidak — WITH CHECK nahan). Tapi bisa rubah `priority = 'low'` semua action-nya biar kelihatan non-urgent. Sama issue di `grn: supplier update own status`: supplier bisa self-mark status='ok' tanpa field QC. Pasang trigger whitelist: supplier only boleh update `{status, output_notes, blocked_reason}`.

### 4.3 RLS helper per-row — potential N+1

`current_role()` & `current_supplier_id()` dipanggil per kolom policy yang evaluasi per row. Di query yang return 10.000 rows (monthly requirement scan), bisa 10k × 2 `SELECT from profiles`. Walau security-definer jadi stable + cached per-row-in-statement oleh planner, worst case tetap ada cost. Long-term: embed role + supplier_id ke JWT custom claims via `auth.jwt() -> 'user_metadata'`, helper baca dari JWT saja. Supabase Auth Hook sudah support.

### 4.4 `create_invite` tidak validasi role assignment

Admin bisa create invite `role = 'admin'` tanpa audit trail extra. OK untuk trust model current, tapi worth: tambah log table `admin_audit(actor, action, target_role, ts)` untuk compliance WFP.

### 4.5 Storage `avatars` bucket public

Seluruh dunia bisa GET `avatars/{user_id}.jpg`. Foto operator SPPG + supplier accessible tanpa auth. Kalau intent adalah public profile, OK. Kalau tidak, flip ke private + signed URL.

---

## 5. Performance & Indexing

### 5.1 Index yang hilang (high-impact)

```sql
-- Sering di-join untuk QC/NCR/scorecard
create index if not exists idx_grns_po on public.grns(po_no);
create index if not exists idx_grns_date on public.grns(grn_date desc);

-- top_suppliers_by_spend & invoice filter
create index if not exists idx_invoices_sup_date on public.invoices(supplier_id, inv_date desc);
create index if not exists idx_invoices_status on public.invoices(status) where status <> 'paid';

-- pr_generate_quotations & price suggestion cascade
create index if not exists idx_po_rows_item on public.po_rows(item_code);

-- dashboard monthly_requirements
create index if not exists idx_menu_assign_date on public.menu_assign(assign_date);
-- sudah ada sebagai PK, OK

-- supplier_actions owner filter
create index if not exists idx_supaction_owner on public.supplier_actions(owner_user_id) where owner_user_id is not null;
```

### 5.2 `requirement_for_date_projected` dipanggil per-hari di loop 90 hari

[0021](supabase/migrations/0021_supplier_forecast.sql) loop 90 hari × cross join lateral. Untuk setiap hari memanggil `porsi_counts_tiered` (yang loop schools + attendance) + menu_bom lookup. Sekali call `supplier_forecast_90d` bisa ratusan ribu row reads. Mitigasi: materialized view `mv_daily_requirement(op_date, item_code, qty, source)` yang di-refresh nightly + trigger on `menu_assign/custom_menus/school_attendance/non_op_days` change.

### 5.3 `v_price_list_matrix` hardcode w1..w12

View di-hardcode untuk 12 minggu. Period >12 minggu (misal quarterly refresh → 13 minggu) akan silently drop week 13. Refactor ke crosstab dinamis atau return array `weekly_prices numeric[12]`.

### 5.4 `bom_variance` scan generate_series hari × menu_bom × porsi_counts_tiered

Nested call ke `porsi_counts_tiered(d.op_date)` di subquery — di-planner biasanya di-eksekusi per row. Untuk rentang 3 bulan × 10 menu × ~20 item per menu = 60k eksekusi. Sama solusi: materialized view atau CTE pre-compute porsi per date sekali.

---

## 6. Data Integrity Issues

### 6.1 `profiles.supplier_id` tidak FK

[0001:27](supabase/migrations/0001_schema.sql#L27) — `supplier_id text` tanpa `references suppliers(id)`. Kalau supplier dihapus, profile jadi orphan. Tambah FK + `on delete set null`.

### 6.2 `stock.qty` bisa negatif

Tidak ada `check (qty >= 0)`. Consumption tanpa cek availability bisa bikin stok -50kg beras. Tambah check atau trigger validation yang raise saat delta negatif > current qty.

### 6.3 `schools.kelas13 + kelas46` tidak divalidasi

Untuk level='SD', `students` seharusnya = `kelas13 + kelas46`. Tidak ada constraint. Bisa typo input bikin double-counting di `porsi_counts`. Add check constraint atau trigger validation.

### 6.4 `supplier.commodity` text comma-separated legacy

Comment di 0001:124 sudah flag "legacy". Sudah ada `supplier_items` sebagai replacement, tapi `commodity` masih dipakai di 0024_costing_sync_suppliers.sql. Konsolidasi: drop kolom, populate `supplier_items` dari yang existing, atau at minimum view yang derive `commodity` dari supplier_items.

### 6.5 Weekend hardcode di porsi_counts

`extract(dow from p_date) in (0,6)` hardcode Sabtu-Minggu tidak operasi. Beberapa SPPG operasi Sabtu (misal semester padat). Config-driven via `settings('operating_days', '[1,2,3,4,5]')`.

### 6.6 `stock_moves.ref_doc text` tanpa enum

[0001:224](supabase/migrations/0001_schema.sql#L224) — free text. `grn_sync_stock()` idempotency guard pakai `where ref_doc = 'grn' and ref_no = new.no`. Typo case mismatch (`'GRN'` vs `'grn'`) bisa bikin double insert. Bikin enum `ref_doc_type`.

---

## 7. Migration Hygiene

### 7.1 Numbering komentar inkonsisten

File 0012 komentar "0011", 0020 komentar "0017", 0021 komentar "0018". Kalau ada developer baca SQL standalone bingung. Regex normalize sekali saja.

### 7.2 Noise di root `supabase/`

`_apply-rls-fix.js`, `_apply.js`, `_apply_0022_0023.sql`, `_apply_0024_0025.sql`, `_build_run_all.py`, `_run_all.sql`, `_seed-april.js` — script helper di mix dengan `migrations/` proper. Pindah ke `supabase/scripts/` atau `.gitignore` kalau one-off.

### 7.3 Re-occurring data fix "strip_buah_prefix"

0018 dan 0026 sama-sama strip prefix "Buah - " / "Buah_" / dsb. Indikasi source data (Excel costing?) konsisten inject prefix. Fix di sumber + validation trigger supaya tidak butuh migration ketiga.

### 7.4 Tidak ada CHANGELOG

26 migration tanpa narrative dokumen. Bikin `supabase/migrations/CHANGELOG.md` ringkas satu baris per file (apa, kapan, kenapa). Onboarding dev baru lebih cepat.

### 7.5 Seed data di-mix dengan migration

0005, 0012, 0017, 0024, 0025 semua inject data. Campuran DDL + data migration bikin susah rerun di fresh environment (idempotency mostly handled, tapi tidak konsisten). Saran: pisah ke `supabase/seeds/` proper, tonton aplikasi via `supabase db reset --seed`.

---

## 8. Hal yang Sudah Bagus (Pertahankan)

Konsep `porsi_counts_tiered` 4-band (PAUD/SD13/SD46/SMP+) menyelesaikan kalibrasi gramasi anak yang sering jadi over/under feeding issue di SPPG. Auto-numbering scheme (PO-YYYY-NNN, QT, PR, NCR) konsisten dan idempotent. Price list pakai dual-unit (per_item + per_kg) smart untuk komoditas sayur-ikat atau telur-butir. RPC `supplier_scorecard_auto` 5-dimensi sudah integrated ke existing data — tidak butuh manual input. Trigger idempotency guard (`grn_sync_stock`, `pg_trigger_depth()`) menunjukkan awareness yang baik. Security-definer helper fix di 0016 untuk RLS recursion = lesson-learned yang well-documented.

---

## 9. Roadmap Perbaikan — Prioritized

### Prioritas 1 — FIX SEKARANG (1-2 hari)

Migration `0027_fix_bom_variance_and_sop_runs.sql`:
1. Rename `ma.op_date` → `ma.assign_date` di `bom_variance` & `bom_variance_by_menu`.
2. Fix `where user_id = auth.uid()` → `where id = auth.uid()` di `log_sop_run`.
3. Regenerate `types/database.ts` via `supabase gen types typescript --linked`.
4. Konsolidasi `touch_updated_at` — drop `tg_touch_updated_at`, point semua trigger ke yang original.

### Prioritas 2 — SEBELUM GO-LIVE (seminggu)

Migration `0028_grn_rows_and_stock_checks.sql`:
1. `grn_rows(grn_no, line_no, item_code, qty_received, qty_rejected)` + trigger sync `stock_moves` dari sini, bukan approximasi po_rows.
2. `check (stock.qty >= 0)`.
3. FK `profiles.supplier_id references suppliers(id) on delete set null`.
4. Trigger auto-recalc `purchase_orders.total` dari po_rows.
5. Index yang hilang (grns.po_no, invoices.sup_date, po_rows.item_code).

### Prioritas 3 — JANGKA MENENGAH (1 bulan, sebelum replikasi SPPG)

Migration `0029_multi_location_and_batching.sql`:
1. `stock_locations` table + composite PK `(location_id, item_code)` di stock/stock_moves.
2. `stock_batches(grn_no, item_code, expiry_date, qty_remaining)` untuk food safety.
3. Custom menu normalisasi ke `custom_menu_items` dengan FK.
4. Audit log generic `audit_events(actor, table_name, row_id, action, diff, ts)`.
5. RLS supplier: tighten `suppliers` + `schools` read, whitelist update columns di `grns` & `supplier_actions`.

### Prioritas 4 — PERFORMA (2 bulan, saat data volume naik)

Migration `0030_mv_requirements.sql`:
1. Materialized view `mv_daily_requirement` refresh nightly + triggered invalidation.
2. Pindah `current_role` ke JWT claims via Auth Hook.
3. `v_price_list_matrix` dinamis (crosstab) atau return jsonb array.

### Prioritas 5 — HOUSEKEEPING

1. `supabase/migrations/CHANGELOG.md`
2. Pindah `_apply*`, `_build*`, `_seed*` ke `supabase/scripts/`.
3. Fix sumber data Excel supaya tidak butuh migration prefix-strip lagi.
4. Drop `transactions` table (atau populate via trigger).
5. Enum `ref_doc_type` untuk `stock_moves.ref_doc`.

---

## 10. Verdict

**Database sudah layak untuk go-live 4 Mei 2026 di SPPG Nunumeu** — asal 4 bug kritikal di Prioritas 1 dibenerin dulu (2-3 jam kerja). Setelah go-live, jalankan Prioritas 2 sebelum rolling ke SPPG kedua. Prioritas 3–5 bisa dicicil sambil operasional berjalan.

Skor per dimensi:

| Dimensi | Skor | Catatan |
|---|---|---|
| Domain modeling | 8/10 | Flow PR→Quote→PO→GRN→Invoice solid |
| RLS / security | 7/10 | Working, tapi supplier role terlalu permisif read |
| Performance | 6/10 | Butuh MV + index tambahan untuk scale |
| Data integrity | 6/10 | FK gaps, no batch/expiry, stock bisa negatif |
| Migration hygiene | 7/10 | Idempotent tapi noise di root + no changelog |
| Type safety (app↔db) | 4/10 | Manual types stale sejak 0001 |
| **Overall** | **7/10** | **Production-ready dengan utang teknis tertunda** |
