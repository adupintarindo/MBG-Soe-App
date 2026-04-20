-- =============================================================================
-- Combined: 0024 + 0025 + 0026 + 0038 for one-shot paste to Supabase SQL Editor
-- IMPORTANT: FOUR transactions.
--   TX1: 0024 — enum MINYAK must commit before being used as type cast.
--   TX2: 0025 — 137 price observations (references MINYAK).
--   TX3: 0026 — strip 'Buah - ' prefix from supplier_prices.ingredient_name.
--   TX4: 0038 — suppliers.excel_ref_id bridge column + HTML↔Excel mapping.
-- =============================================================================

-- ---------- Transaction 1: enum + suppliers -----------------------------
begin;
-- =============================================================================
-- 0024 · Costing Sync (Apr 2026) · enum MINYAK + 17 suppliers Excel
-- -----------------------------------------------------------------------------
-- Source: ADJUSTED Costing Sheet Dish 06042026.xlsx
-- Sheets: Ingredients List (44), Supplier List (17), Price List (137 obs)
--
-- Changes:
--  1. price_commodity enum: + MINYAK
--  2. suppliers: upsert 17 baris dengan id SUP-E01..SUP-E17
-- =============================================================================

-- 1. Enum MINYAK (idempotent via duplicate_object catch)
do $$ begin
  alter type public.price_commodity add value if not exists 'MINYAK';
exception when duplicate_object then null;
end $$;

-- 2. Upsert suppliers from Excel
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E01', 'UD Karya Sukses', 'UD'::public.supplier_type, 'Rice', null, '0812xxxx', 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E02', 'CV Triantanta Jaya ( Wijaya)', 'CV'::public.supplier_type, 'Dry condiments & salt & rice & cooking oil & frozen chicken & others', null, '0813xxxx', 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E03', 'Toko Glory', 'TOKO'::public.supplier_type, 'Dry condiments & rice & salt & cooking oil & eggs & frozen chicken', 'Mety', '081237590717', 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E04', 'Kios Louis', 'KIOS'::public.supplier_type, 'Dry condiments & cooking oil', null, '0856xxxx', 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E05', 'Blivo', 'INFORMAL'::public.supplier_type, 'Vegetables & Fruits', null, '0857xxxx', 'Jl. Palapa No.14, Oebobo, Kec. Oebobo, Kota Kupang, Nusa Tenggara Timur', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E06', 'TLM', 'INFORMAL'::public.supplier_type, 'Eggs', null, '0899xxxx', 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E07', 'Green Young Cooperative', 'KOPERASI'::public.supplier_type, 'Vegetables & Eggs & Fruits', null, '(0380) 833203', 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E08', 'Bulog', 'BUMN'::public.supplier_type, 'Rice', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E09', 'PT Alger Karya Pratama', 'PT'::public.supplier_type, 'Fish (Tuna)', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E10', 'CV Philia', 'CV'::public.supplier_type, 'Banana', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E11', 'Tunmuni Farmers Group', 'POKTAN'::public.supplier_type, 'Vegetables & Eggs', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E12', 'CV Nusantara Pangan Distributor', 'CV'::public.supplier_type, 'Rice', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E13', 'Toko Maju Lancar', 'TOKO'::public.supplier_type, 'Tofu & Tempe', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E14', 'Red & White Cooperatives (Nunumeu)', 'KOPERASI'::public.supplier_type, 'Banana & Vegetables', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Contract', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E15', 'Aneka', 'INFORMAL'::public.supplier_type, 'Fresh Chicken', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Roster', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E16', 'CV Sangandolu', 'CV'::public.supplier_type, 'Dry condiments', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Roster', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active) values ('SUP-E17', 'PS Mart', 'INFORMAL'::public.supplier_type, 'Dry condiments & Rice', null, null, 'Kupang', null, 'Excel Apr 2026 · Vendor type: Roster', 75.0, 'signed'::public.supplier_status, true) on conflict (id) do update set name = excluded.name, type = excluded.type, commodity = excluded.commodity, pic = coalesce(excluded.pic, public.suppliers.pic), phone = coalesce(excluded.phone, public.suppliers.phone), address = excluded.address, notes = excluded.notes, status = excluded.status, active = true;

-- =============================================================================
-- END 0024
-- =============================================================================
commit;

-- ---------- Transaction 2: 137 price observations ------------------------
begin;
-- =============================================================================
-- 0025 · Costing Sync (Apr 2026) · 137 supplier_prices observations
-- -----------------------------------------------------------------------------
-- Seed week_id = week 1 dari period 'April–Juni 2026' (period_id paling awal).
-- Pakai migration 0022's upsert_supplier_price RPC via ad-hoc do-block.
-- -----------------------------------------------------------------------------
-- Guard: abort kalau period April-Juni 2026 belum ada (migration 0017 belum di-apply).
-- =============================================================================

do $$
declare
  v_week_id bigint;
  v_period_id smallint;
begin
  select id into v_period_id from public.price_periods order by id limit 1;
  if v_period_id is null then
    raise exception 'No price_periods row — apply 0017 first';
  end if;

  select id into v_week_id from public.price_weeks
   where period_id = v_period_id and week_no = 1 limit 1;
  if v_week_id is null then
    raise exception 'Week 1 not found for period %', v_period_id;
  end if;

  -- Clear existing rows for this (week_id) so we get a clean Excel-backed seed
  delete from public.supplier_prices where week_id = v_week_id
    and supplier_id like 'SUP-E%';

  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'PROTEIN_HEWANI'::public.price_commodity, 'Ayam frozen', 43000.0, 43000.0, 'kg', null, 'Ayam potong 1 Kg');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E02', 'PROTEIN_HEWANI'::public.price_commodity, 'Ayam segar', 45000.0, 45000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'PROTEIN_HEWANI'::public.price_commodity, 'Ayam segar', 45000.0, 45000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'PROTEIN_HEWANI'::public.price_commodity, 'Ayam segar', 65000.0, 65000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E02', 'PROTEIN_HEWANI'::public.price_commodity, 'Ayam tanpa tulang', 58000.0, 58000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'PROTEIN_HEWANI'::public.price_commodity, 'Ayam tanpa tulang', 72000.0, 72000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'PROTEIN_HEWANI'::public.price_commodity, 'Ayam tanpa tulang', 65000.0, 65000.0, 'kg', null, 'Ayam boneless 1.0 Kg');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Bawang bombay', 30000.0, 30000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUMBU_KERING'::public.price_commodity, 'Bawang bombay', 35000.0, 35000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Bawang bombay', 42500.0, 42500.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Bawang merah', 52500.0, 52500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUMBU_KERING'::public.price_commodity, 'Bawang merah', 35000.0, 35000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E04', 'BUMBU_KERING'::public.price_commodity, 'Bawang merah', 40000.0, 40000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Bawang merah', 25000.0, 25000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Bawang merah', 38509.0, 38509.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Bawang putih', 52000.0, 52000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUMBU_KERING'::public.price_commodity, 'Bawang putih', 50000.0, 50000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E04', 'BUMBU_KERING'::public.price_commodity, 'Bawang putih', 40000.0, 40000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Bawang putih', 42000.0, 42000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Bawang putih', 50000.0, 50000.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'SAYURAN'::public.price_commodity, 'Bayam', 12500.0, 12500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Bayam', 13409.0, 13409.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E08', 'BERAS'::public.price_commodity, 'Beras fortifikasi', 20000.0, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E08', 'BERAS'::public.price_commodity, 'Beras premium', 15400.0, 15400.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E02', 'BERAS'::public.price_commodity, 'Beras premium', 15400.0, 15400.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BERAS'::public.price_commodity, 'Beras premium', 20000.0, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E01', 'BERAS'::public.price_commodity, 'Beras premium', 16200.0, 16200.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUAH'::public.price_commodity, 'Melon', 26000.0, 26000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUAH'::public.price_commodity, 'Melon', 27000.0, 27000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUAH'::public.price_commodity, 'Melon', 13333.33, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUAH'::public.price_commodity, 'Pepaya', 15000.0, 15000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUAH'::public.price_commodity, 'Pepaya', 15000.0, 15000.0, 'kg', null, 'Menggunakan harga termahal buah melon: melon 22,000 per Kg');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUAH'::public.price_commodity, 'Pepaya', 10000.0, 10000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUAH'::public.price_commodity, 'Pisang', 13000.0, 13000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E10', 'BUAH'::public.price_commodity, 'Pisang', 20000.0, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUAH'::public.price_commodity, 'Pisang', 30000.0, 30000.0, 'kg', null, 'Menggunakan harga termahal buah pisang: pisang ukuran kecil 30,000 per Kg');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUAH'::public.price_commodity, 'Pisang', 1500.0, 1500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUAH'::public.price_commodity, 'Semangka', 20000.0, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUAH'::public.price_commodity, 'Semangka', 25000.0, 25000.0, 'kg', null, 'Menggunakan harga termahal buah semangka: semangka kecil 20,000 per Kg');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUAH'::public.price_commodity, 'Semangka', 8000.0, 8000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'SAYURAN'::public.price_commodity, 'Buncis', 15000.0, 15000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'SAYURAN'::public.price_commodity, 'Buncis', 19000.0, 19000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'SAYURAN'::public.price_commodity, 'Buncis', 17000.0, 17000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Buncis', 17500.0, 17500.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Cabai merah besar', 60000.0, 60000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUMBU_KERING'::public.price_commodity, 'Cabai merah besar', 80000.0, 80000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Cabai merah besar', 60000.0, 60000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Cabai merah besar', 67407.0, 67407.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Daun jeruk', 5000.0, 5000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Daun jeruk', 25000.0, 25000.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E02', 'BUMBU_KERING'::public.price_commodity, 'Garam', 720.0, 7200.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Garam', 15000.0, 7500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'BUMBU_KERING'::public.price_commodity, 'Garam', 690.0, 6900.0, 'kg', null, 'Harga Garam Kapal 500 gram = 3,300');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'PROTEIN_HEWANI'::public.price_commodity, 'Ikan - Tuna', 80000.0, 80000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E09', 'PROTEIN_HEWANI'::public.price_commodity, 'Ikan - Tuna', 69000.0, 69000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'SAYURAN'::public.price_commodity, 'Jagung manis', 57142.86, 24000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'SAYURAN'::public.price_commodity, 'Jagung manis', 5000.0, 5000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Jagung manis', 23571.0, 23571.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Jahe', 6000.0, 6000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Jahe', 7500.0, 7500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Jahe', 50000.0, 50000.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'SAYURAN'::public.price_commodity, 'Kacang panjang', 13500.0, 13500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'SAYURAN'::public.price_commodity, 'Kacang panjang', 25000.0, 25000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'SAYURAN'::public.price_commodity, 'Kacang panjang', 13000.0, 13000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Kacang panjang', 10000.0, 10000.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E02', 'BUMBU_KERING'::public.price_commodity, 'Kecap manis', 26153.85, 170000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Kecap manis', 38000.0, 38000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'BUMBU_KERING'::public.price_commodity, 'Kecap manis', 30769.23, 200000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Kemiri', 35000.0, 35000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Kemiri', 35000.0, 35000.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'SAYURAN'::public.price_commodity, 'Kentang', 27000.0, 27000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'SAYURAN'::public.price_commodity, 'Kentang', 25000.0, 25000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E04', 'SAYURAN'::public.price_commodity, 'Kentang', 30000.0, 30000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'SAYURAN'::public.price_commodity, 'Kentang', 26000.0, 26000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Kentang', 21947.0, 21947.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Ketumbar', 7000.0, 7000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E02', 'BUMBU_KERING'::public.price_commodity, 'Ketumbar', 352941.18, 30000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E04', 'BUMBU_KERING'::public.price_commodity, 'Ketumbar', 60000.0, 60000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Ketumbar', 160000.0, 2000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'BUMBU_KERING'::public.price_commodity, 'Ketumbar', 250000.0, 20000.0, 'kg', null, 'Ketumbar bubuk kemasan @ 80gr');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Kunyit', 7000.0, 7000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Kunyit', 15000.0, 15000.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Lengkuas', 5000.0, 5000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUMBU_KERING'::public.price_commodity, 'Lengkuas', 20000.0, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Lengkuas', 7000.0, 7000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Lengkuas', 15000.0, 15000.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Merica', 100000.0, 4000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E02', 'BUMBU_KERING'::public.price_commodity, 'Merica', 390000.0, 39000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E04', 'BUMBU_KERING'::public.price_commodity, 'Merica', 200000.0, 200000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Merica', 120000.0, 1500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'BUMBU_KERING'::public.price_commodity, 'Merica', 736842.11, 28000.0, 'kg', null, 'Merica putih (koepoe) 38 gram');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E15', 'MINYAK'::public.price_commodity, 'Minyak sayur', 21819.44, 392750.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'MINYAK'::public.price_commodity, 'Minyak sayur', 96666.67, 87000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E02', 'MINYAK'::public.price_commodity, 'Minyak sayur', 25000.0, 450000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E04', 'MINYAK'::public.price_commodity, 'Minyak sayur', 25555.56, 115000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'MINYAK'::public.price_commodity, 'Minyak sayur', 25555.56, 23000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'MINYAK'::public.price_commodity, 'Minyak sayur', 23333.33, 420000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'SAYURAN'::public.price_commodity, 'Pakcoi', 14500.0, 14500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'SAYURAN'::public.price_commodity, 'Pakcoi', 16000.0, 16000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'SAYURAN'::public.price_commodity, 'Pakcoi', 12000.0, 12000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Pakcoi', 13947.0, 13947.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'SAYURAN'::public.price_commodity, 'Pepaya muda', 15000.0, 15000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'SAYURAN'::public.price_commodity, 'Pepaya muda', 15000.0, 15000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'SAYURAN'::public.price_commodity, 'Pepaya muda', 10000.0, 10000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Pepaya muda', 18000.0, 18000.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'SAYURAN'::public.price_commodity, 'Sawi hijau', 15000.0, 15000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'SAYURAN'::public.price_commodity, 'Sawi hijau', 12000.0, 12000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Sawi hijau', 14651.0, 14651.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'SAYURAN'::public.price_commodity, 'Sawi putih', 20000.0, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'SAYURAN'::public.price_commodity, 'Sawi putih', 12000.0, 12000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Sawi putih', 20000.0, 20000.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Sereh', 5000.0, 5000.0, 'kg', null, '3pcs');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Sereh', 12000.0, 12000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Sereh', 15000.0, 15000.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'PROTEIN_NABATI'::public.price_commodity, 'Tahu', 5000.0, 5000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E13', 'PROTEIN_NABATI'::public.price_commodity, 'Tahu', 22328.55, 140000.0, 'kg', null, 'estimation 1 papan isi 209 potong tahu ukuran besar (estimasi @ 30 gram)');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E06', 'PROTEIN_HEWANI'::public.price_commodity, 'Telur (besar)', 34716.67, 2083.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'PROTEIN_HEWANI'::public.price_commodity, 'Telur (besar)', 35648.15, 385000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'PROTEIN_HEWANI'::public.price_commodity, 'Telur (besar)', 33952.0, 33952.0, 'kg', null, 'updated on 25 March - new item added');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'PROTEIN_HEWANI'::public.price_commodity, 'Telur (kecil)', 44444.44, 360000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E02', 'PROTEIN_HEWANI'::public.price_commodity, 'Telur (sedang)', 38383.84, 380000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'PROTEIN_HEWANI'::public.price_commodity, 'Telur (sedang)', 50909.09, 2800.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'PROTEIN_HEWANI'::public.price_commodity, 'Telur (sedang)', 45454.55, 2500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E06', 'PROTEIN_HEWANI'::public.price_commodity, 'Telur (sedang)', 37381.82, 2056.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E03', 'PROTEIN_HEWANI'::public.price_commodity, 'Telur (sedang)', 38383.84, 380000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Tomat', 15000.0, 15000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUMBU_KERING'::public.price_commodity, 'Tomat', 25000.0, 25000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Tomat', 25000.0, 25000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Tomat', 20878.0, 20878.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'SAYURAN'::public.price_commodity, 'Wortel', 27000.0, 27000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'SAYURAN'::public.price_commodity, 'Wortel', 25000.0, 25000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'SAYURAN'::public.price_commodity, 'Wortel', 13000.0, 13000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'SAYURAN'::public.price_commodity, 'Wortel', 19015.0, 19015.0, 'kg', null, 'updated on 25 March');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E11', 'BUMBU_KERING'::public.price_commodity, 'Daun kemangi', 500000.0, 75000.0, 'kg', null, 'estimation price');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUMBU_KERING'::public.price_commodity, 'Daun kemangi', 50000.0, 5000.0, 'kg', null, 'estimation price');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUMBU_KERING'::public.price_commodity, 'Daun kemangi', 50000.0, 2500.0, 'kg', null, 'estimation price');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUMBU_KERING'::public.price_commodity, 'Daun kemangi', 40000.0, 40000.0, 'kg', null, null);

  raise notice 'Seeded % price observations for week_id=%',     (select count(*) from public.supplier_prices where week_id = v_week_id), v_week_id;
end $$;

-- =============================================================================
-- END 0025
-- =============================================================================
commit;

-- ---------- Transaction 3: strip 'Buah - ' prefix from supplier_prices -----
begin;
-- =============================================================================
-- 0026 · Strip "Buah - " prefix dari supplier_prices.ingredient_name
-- -----------------------------------------------------------------------------
-- Migration 0025 (costing_sync_prices) men-seed ingredient_name dengan prefix
-- 'Buah - Melon', 'Buah - Pepaya', dll. Tampilan price list & admin menuntut
-- nama bersih ('Melon', 'Pepaya', 'Pisang', 'Semangka', 'Jeruk') — konsisten
-- dengan migrasi 0018 yang sudah strip prefix di items.code.
--
-- Idempoten: aman re-run, loop update jadi no-op kalau tidak ada row match.
-- Conflict handling: kalau sudah ada row tanpa prefix dengan composite key yang
-- sama, row berprefix akan di-delete (bukan merge — anggap entry baru win).
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from public.supplier_prices where ingredient_name like 'Buah - %'
  ) then
    return;
  end if;

  -- Hapus row berprefix yang bentrok dengan row tanpa prefix (safety net).
  delete from public.supplier_prices pe
   where pe.ingredient_name like 'Buah - %'
     and exists (
       select 1
         from public.supplier_prices clean
        where clean.week_id         = pe.week_id
          and clean.supplier_id     = pe.supplier_id
          and clean.commodity       = pe.commodity
          and clean.ingredient_name = regexp_replace(pe.ingredient_name, '^Buah - ', '')
     );

  update public.supplier_prices
     set ingredient_name = regexp_replace(ingredient_name, '^Buah - ', '')
   where ingredient_name like 'Buah - %';
end$$;
commit;

-- ---------- Transaction 4: suppliers.excel_ref_id bridge -----------------
begin;
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
commit;
