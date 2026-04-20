-- =============================================================================
-- 0038 · suppliers.excel_ref_id bridge column
-- -----------------------------------------------------------------------------
-- Dashboard HTML pakai ID internal SUP-01..14 untuk LTA / contract tracking.
-- Costing Excel pakai SUP-E01..E17 sebagai master pricing. Dua sistem ini
-- berjalan paralel — kolom bridge ini jadi penghubung supaya Next.js bisa
-- reconcile "supplier X di dashboard = supplier Y di price list".
--
-- Schema change:
--   suppliers.excel_ref_id text null (unique when not null)
--
-- Seed mapping: hand-curated dari match-by-name. 9 dari 14 HTML supplier aktif
-- + 2 rejected punya counterpart di Excel. Sisanya (SUP-10..14) leave null
-- karena tidak ada counterpart di Excel master.
-- Idempoten: semua step aman re-run.
-- =============================================================================

-- 1. Add nullable column (idempoten via if not exists)
alter table public.suppliers
  add column if not exists excel_ref_id text;

-- 2. Unique partial index (biar boleh null multiple, tapi non-null unique)
create unique index if not exists suppliers_excel_ref_id_uq
  on public.suppliers (excel_ref_id)
  where excel_ref_id is not null;

-- 3. Comment untuk documentation
comment on column public.suppliers.excel_ref_id is
  'Bridge to Excel costing master supplier ID (SUP-E01..SUP-E17). Null if supplier tidak ada di Excel (mis. rejected LTA atau belum masuk costing sheet).';

-- 4. Seed mapping — hanya set kalau currently null (tidak overwrite manual edit)
--    Source: ADJUSTED Costing Sheet Dish 06042026.xlsx · Supplier List sheet.
do $$
begin
  -- HTML SUP-01 "Bulog NTT"                       → Excel SUP-E08 "Bulog"
  update public.suppliers set excel_ref_id = 'SUP-E08'
   where id = 'SUP-01' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E08');

  -- HTML SUP-02 "UD Karya Sukses"                 → Excel SUP-E01 "UD Karya Sukses"
  update public.suppliers set excel_ref_id = 'SUP-E01'
   where id = 'SUP-02' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E01');

  -- HTML SUP-03 "CV Triantanta Wijaya"            → Excel SUP-E02 "CV Triantanta Jaya (Wijaya)"
  update public.suppliers set excel_ref_id = 'SUP-E02'
   where id = 'SUP-03' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E02');

  -- HTML SUP-04 "PT Alger Karya Pratama"          → Excel SUP-E09 "PT Alger Karya Pratama"
  update public.suppliers set excel_ref_id = 'SUP-E09'
   where id = 'SUP-04' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E09');

  -- HTML SUP-05 "TLM (Tanaoba Lais Manekat)"      → Excel SUP-E06 "TLM"
  update public.suppliers set excel_ref_id = 'SUP-E06'
   where id = 'SUP-05' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E06');

  -- HTML SUP-06 "Toko Maju Lancar"                → Excel SUP-E13 "Toko Maju Lancar"
  update public.suppliers set excel_ref_id = 'SUP-E13'
   where id = 'SUP-06' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E13');

  -- HTML SUP-07 "Tunmuni Farmer Group"            → Excel SUP-E11 "Tunmuni Farmers Group"
  update public.suppliers set excel_ref_id = 'SUP-E11'
   where id = 'SUP-07' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E11');

  -- HTML SUP-08 "Red & White Cooperatives Nunumeu"→ Excel SUP-E14 "Red & White Cooperatives (Nunumeu)"
  update public.suppliers set excel_ref_id = 'SUP-E14'
   where id = 'SUP-08' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E14');

  -- HTML SUP-09 "Pisang Efron (CV Philia)"        → Excel SUP-E10 "CV Philia"
  update public.suppliers set excel_ref_id = 'SUP-E10'
   where id = 'SUP-09' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E10');

  -- HTML SUP-R1 "Toko Glory (CV Kaka Ade)"        → Excel SUP-E03 "Toko Glory"
  update public.suppliers set excel_ref_id = 'SUP-E03'
   where id = 'SUP-R1' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E03');

  -- HTML SUP-R2 "Kios Louis"                      → Excel SUP-E04 "Kios Louis"
  update public.suppliers set excel_ref_id = 'SUP-E04'
   where id = 'SUP-R2' and excel_ref_id is null
     and exists (select 1 from public.suppliers where id = 'SUP-E04');

  -- NOT MAPPED (no Excel counterpart):
  --   SUP-10 UD Rempah Timor          (bumbu segar — ga ada di Excel master)
  --   SUP-11 UD Bumbu Nusantara       (rempah kering — ga ada di Excel master)
  --   SUP-12 CV Minyak Sehat NTT      (Excel minyak di Aneka SUP-E15 / pieces brand)
  --   SUP-13 UD Buah Segar Soe        (ga ada di Excel master)
  --   SUP-14 CV Sayur Dataran Tinggi  (Excel sayuran di Green Young SUP-E07 / beda entitas)
  --
  -- UNMAPPED EXCEL SUPPLIERS (no HTML counterpart — ada di costing tapi belum masuk LTA):
  --   SUP-E05 Blivo             · SUP-E07 Green Young Cooperative
  --   SUP-E12 CV Nusantara Pangan Distributor · SUP-E15 Aneka
  --   SUP-E16 CV Sangandolu     · SUP-E17 PS Mart

  raise notice 'Bridge mapping applied: % HTML suppliers now linked to Excel IDs',
    (select count(*) from public.suppliers where excel_ref_id is not null);
end $$;

-- =============================================================================
-- END 0027
-- =============================================================================
