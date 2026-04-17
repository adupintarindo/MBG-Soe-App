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
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUAH'::public.price_commodity, 'Buah - Melon', 26000.0, 26000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUAH'::public.price_commodity, 'Buah - Melon', 27000.0, 27000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUAH'::public.price_commodity, 'Buah - Melon', 13333.33, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUAH'::public.price_commodity, 'Buah - Pepaya', 15000.0, 15000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUAH'::public.price_commodity, 'Buah - Pepaya', 15000.0, 15000.0, 'kg', null, 'Menggunakan harga termahal buah melon: melon 22,000 per Kg');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUAH'::public.price_commodity, 'Buah - Pepaya', 10000.0, 10000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUAH'::public.price_commodity, 'Buah - Pisang', 13000.0, 13000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E10', 'BUAH'::public.price_commodity, 'Buah - Pisang', 20000.0, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUAH'::public.price_commodity, 'Buah - Pisang', 30000.0, 30000.0, 'kg', null, 'Menggunakan harga termahal buah pisang: pisang ukuran kecil 30,000 per Kg');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUAH'::public.price_commodity, 'Buah - Pisang', 1500.0, 1500.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E05', 'BUAH'::public.price_commodity, 'Buah - Semangka', 20000.0, 20000.0, 'kg', null, null);
  perform public.upsert_supplier_price(v_week_id, 'SUP-E07', 'BUAH'::public.price_commodity, 'Buah - Semangka', 25000.0, 25000.0, 'kg', null, 'Menggunakan harga termahal buah semangka: semangka kecil 20,000 per Kg');
  perform public.upsert_supplier_price(v_week_id, 'SUP-E14', 'BUAH'::public.price_commodity, 'Buah - Semangka', 8000.0, 8000.0, 'kg', null, null);
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
