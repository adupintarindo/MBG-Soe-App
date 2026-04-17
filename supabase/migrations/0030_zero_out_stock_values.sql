-- =============================================================================
-- 0030_zero_out_stock_values.sql
-- Reset semua nilai kuantitatif di master data ke 0.
-- Alasan: data belum diisi — tampilan awal harus menunjukkan 0, bukan seed dummy.
--
-- Kolom yang direset:
--   items.price_idr      → 0
--   items.vol_weekly     → 0
--   stock.qty            → 0
--   supplier_items.price_idr → NULL
--
-- Kolom text (items.unit) TIDAK disentuh.
-- Harga per minggu di weekly_prices TIDAK disentuh (itu data histori).
-- =============================================================================

begin;

update public.items
set
  price_idr = 0,
  vol_weekly = 0,
  updated_at = now();

update public.stock
set
  qty = 0,
  updated_at = now();

update public.supplier_items
set
  price_idr = null;

commit;
