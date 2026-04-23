-- =============================================================================
-- Price List · Cleanup queries (jalankan di Supabase Dashboard → SQL Editor)
-- -----------------------------------------------------------------------------
-- FK chain: price_periods (parent) → price_weeks → supplier_prices
--           on delete cascade — hapus parent otomatis bersihkan child.
--
-- SIAPKAN BACKUP DULU kalau ragu: `pg_dump` atau export CSV dari Dashboard.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- OPSI A · Nuclear: hapus SEMUA data price list
-- -----------------------------------------------------------------------------
-- Efek: semua periode + minggu + harga supplier hilang.
-- Gunakan kalau mau mulai dari kosong.
-- -----------------------------------------------------------------------------

-- Preview dulu (read-only):
select
  (select count(*) from public.price_periods)  as periods,
  (select count(*) from public.price_weeks)    as weeks,
  (select count(*) from public.supplier_prices) as prices;

-- Eksekusi hapus (buka comment baris-baris di bawah):
-- delete from public.price_periods;
-- -- atau kalau mau paksa urutan eksplisit:
-- delete from public.supplier_prices;
-- delete from public.price_weeks;
-- delete from public.price_periods;


-- -----------------------------------------------------------------------------
-- OPSI B · Selective: hapus 1 periode tertentu (by name)
-- -----------------------------------------------------------------------------
-- Ganti 'Apr-Agu 2026' dengan nama periode yang mau dibersihkan.
-- Cascade akan ikut bersihkan price_weeks + supplier_prices.
-- -----------------------------------------------------------------------------

-- Preview row yang akan terhapus:
select p.id, p.name, p.start_date, p.end_date, p.active,
       (select count(*) from public.price_weeks    w where w.period_id = p.id) as weeks,
       (select count(*) from public.supplier_prices sp
          join public.price_weeks w on w.id = sp.week_id
         where w.period_id = p.id) as prices
  from public.price_periods p
 where p.name = 'Apr-Agu 2026';

-- Eksekusi:
-- delete from public.price_periods where name = 'Apr-Agu 2026';


-- -----------------------------------------------------------------------------
-- OPSI C · Selective: hapus hanya SUPPLIER_PRICES (pertahankan struktur periode/minggu)
-- -----------------------------------------------------------------------------
-- Efek: nama periode + grid minggu tetap, semua sel harga kosong.
-- Gunakan kalau cuma mau reset harga untuk re-entry ulang.
-- -----------------------------------------------------------------------------

-- Preview:
select count(*) from public.supplier_prices;

-- Eksekusi:
-- delete from public.supplier_prices;


-- -----------------------------------------------------------------------------
-- OPSI D · Selective: hapus harga di 1 minggu tertentu (mis. "May 26" yang 0)
-- -----------------------------------------------------------------------------

-- Cek weeks dulu:
select w.id, w.week_no, w.label, w.start_date, w.end_date, p.name as period_name
  from public.price_weeks w
  join public.price_periods p on p.id = w.period_id
 order by p.start_date desc, w.week_no;

-- Hapus harga di satu minggu (ganti angka `week_id` sesuai hasil query di atas):
-- delete from public.supplier_prices where week_id = 123;

-- Atau hapus minggu-nya sekalian (cascade ikut hapus harga):
-- delete from public.price_weeks where id = 123;


-- -----------------------------------------------------------------------------
-- VERIFIKASI pasca-cleanup
-- -----------------------------------------------------------------------------
select
  (select count(*) from public.price_periods)  as periods_after,
  (select count(*) from public.price_weeks)    as weeks_after,
  (select count(*) from public.supplier_prices) as prices_after;
