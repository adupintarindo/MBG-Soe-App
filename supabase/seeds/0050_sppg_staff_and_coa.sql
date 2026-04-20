-- =============================================================================
-- Seed: SPPG Staff (48 orang) + Chart of Accounts BGN
-- -----------------------------------------------------------------------------
-- Input: seed_sppg_relawan.csv (FIFI — Future Farmers Indonesia, Apr 2026)
-- COA  : Mirror Lamp 30c BGN (kategori operasional SPPG)
--
-- Idempoten:
--   - sppg_staff pakai ON CONFLICT (seq_no) DO UPDATE
--   - chart_of_accounts pakai ON CONFLICT (code) DO UPDATE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pastikan unique constraint pada seq_no untuk upsert (jika belum ada)
-- -----------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sppg_staff_seq_no_key'
      and conrelid = 'public.sppg_staff'::regclass
  ) then
    alter table public.sppg_staff add constraint sppg_staff_seq_no_key unique (seq_no);
  end if;
end $$;

-- =============================================================================
-- 1. SPPG Staff — 48 orang (1 pengawas + 1 aslap + 46 relawan)
-- =============================================================================

insert into public.sppg_staff (seq_no, full_name, role, role_label, active, gaji_pokok, notes) values
  ( 1, 'Eka Omri Yokran Atty, S.Tr.Ak', 'pengawas_keuangan'::public.sppg_role, 'Pengawas Akuntan',  true, 3500000, 'Inti BGN'),
  ( 2, 'Yecika Agustina Bani',          'asisten_lapangan'::public.sppg_role,   'Asisten Lapangan',  true, 2500000, 'Inti BGN'),
  ( 3, 'Morids Robert A. Boymau',       'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  ( 4, 'Yoram Adryanus Nesimnasi',      'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  ( 5, 'Adi Robinson Tamonop',          'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  ( 6, 'Jitrisa Pitay',                 'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  ( 7, 'Apwelinda Selan',               'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  ( 8, 'Jesaya Jun Patri Atty',         'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  ( 9, 'Daryanti V. Tanesib',           'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  (10, 'Nening Demarlin Abanat',        'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  (11, 'Adilira Halawa',                'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  (12, 'Sherly Dalti Sae',              'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  (13, 'Martelda Yuliana Meo',          'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  (14, 'Norliana Yuliana Nuban',        'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  (15, 'Marselinus Sawa Sola',          'pengemasan'::public.sppg_role,         'Pengemasan',        true, 2000000, null),
  (16, 'Fardes Nabunome',               'distribusi'::public.sppg_role,         'Distribusi',        true, 2000000, null),
  (17, 'Evan Lamawuran',                'distribusi'::public.sppg_role,         'Distribusi',        true, 2000000, null),
  (18, 'Vinsensius Kollo',              'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (19, 'Andri Thomy Berthionus',        'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (20, 'Devi Demantrius Tamonop',       'pencucian'::public.sppg_role,          'Pencucian',         true, 2000000, null),
  (21, 'Imelda M. Saekoko',             'pemorsian'::public.sppg_role,          'Pemorsian',         true, 2000000, null),
  (22, 'Juan Harvian Ndun',             'pemorsian'::public.sppg_role,          'Pemorsian',         true, 2000000, null),
  (23, 'Olga Titenia Tefi',             'pemorsian'::public.sppg_role,          'Pemorsian',         true, 2000000, null),
  (24, 'Fenci Diana Tse',               'pemorsian'::public.sppg_role,          'Pemorsian',         true, 2000000, null),
  (25, 'Alince Albertha Taneo',         'pemorsian'::public.sppg_role,          'Pemorsian',         true, 2000000, null),
  (26, 'Merlin Johsariani Nubatonis',   'pemorsian'::public.sppg_role,          'Pemorsian',         true, 2000000, null),
  (27, 'Delvis Ari Tahun',              'pemorsian'::public.sppg_role,          'Pemorsian',         true, 2000000, null),
  (28, 'Lediana Benu',                  'pemorsian'::public.sppg_role,          'Pemorsian',         true, 2000000, null),
  (29, 'Yarobiam S. Taneo',             'sanitasi'::public.sppg_role,           'Sanitasi',          true, 2000000, null),
  (30, 'Jecky Elisa Malelak',           'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (31, 'Komang Awang Pranama',          'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (32, 'Ardi Jelifelet Neolaka',        'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (33, 'Yoseph Laurens Rudysta Hormat', 'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (34, 'Rofus Lerrick',                 'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (35, 'Cili Riski Dekristo Saekoko',   'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (36, 'Raymon Jeriko Kristofel Sarong','pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (37, 'Yunus Cristotelens Bule',       'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (38, 'John Saekoko',                  'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (39, 'Yohanes Pascal Adeputra Lupa',  'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (40, 'Imelda Yosina Lopo',            'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (41, 'Simson Oristo Binsasi',         'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (42, 'Ferny Tresalia Nipu',           'persiapan_makanan'::public.sppg_role,  'Persiapan Makanan', true, 2000000, null),
  (43, 'Yoka Antoneta Gella',           'pencucian_alat'::public.sppg_role,     'Pencucian Alat',    true, 2000000, null),
  (44, 'Irnatasia Ate',                 'pemorsian'::public.sppg_role,          'Pemorsian',         true, 2000000, null),
  (45, 'Laurenzo R. V. Tatengkeng',     'distribusi'::public.sppg_role,         'Distribusi',        true, 2000000, null),
  (46, 'Elsta Nikmus Selan',            'distribusi'::public.sppg_role,         'Distribusi',        true, 2000000, null),
  (47, 'Sri Suhartini',                 'pemrosesan_makanan'::public.sppg_role, 'Pemrosesan Makanan',true, 2000000, null),
  (48, 'Militia Misri Afi',             'sanitasi'::public.sppg_role,           'Sanitasi',          true, 2000000, null)
on conflict (seq_no) do update
  set full_name  = excluded.full_name,
      role       = excluded.role,
      role_label = excluded.role_label,
      active     = excluded.active,
      gaji_pokok = excluded.gaji_pokok,
      notes      = excluded.notes,
      updated_at = now();

-- =============================================================================
-- 2. Chart of Accounts — mirror Lamp 30c BGN + standard SPPG operations
-- =============================================================================

-- ASSETS (1xxx)
insert into public.chart_of_accounts (code, name, category, parent_code, active, notes) values
  ('1000', 'Aset',                         'asset'::public.coa_category, null,   true, 'Header'),
  ('1010', 'Kas Operasional',              'asset'::public.coa_category, '1000', true, 'Rekening utama SPPG'),
  ('1020', 'Bank',                         'asset'::public.coa_category, '1000', true, 'Rekening bank BGN'),
  ('1030', 'Kas Kecil',                    'asset'::public.coa_category, '1000', true, 'Petty cash — Lamp 30f'),
  ('1040', 'Piutang Usaha',                'asset'::public.coa_category, '1000', true, null),
  ('1050', 'Persediaan Bahan',             'asset'::public.coa_category, '1000', true, 'Stok bahan pokok'),
  ('1060', 'Aset Tetap — Peralatan Dapur', 'asset'::public.coa_category, '1000', true, null)
on conflict (code) do update
  set name        = excluded.name,
      category    = excluded.category,
      parent_code = excluded.parent_code,
      active      = excluded.active,
      notes       = excluded.notes;

-- LIABILITIES (2xxx)
insert into public.chart_of_accounts (code, name, category, parent_code, active, notes) values
  ('2000', 'Liabilitas',              'liability'::public.coa_category, null,   true, 'Header'),
  ('2010', 'Utang Supplier',          'liability'::public.coa_category, '2000', true, 'AP — PO belum dibayar'),
  ('2020', 'Utang Gaji',              'liability'::public.coa_category, '2000', true, 'Payroll accrual'),
  ('2030', 'Utang BPJS Kesehatan',    'liability'::public.coa_category, '2000', true, 'Iuran BPJS Kes'),
  ('2040', 'Utang BPJS Ketenagakerjaan','liability'::public.coa_category, '2000', true, 'Iuran BPJS TK'),
  ('2050', 'Utang Pajak',             'liability'::public.coa_category, '2000', true, 'PPh 21')
on conflict (code) do update
  set name        = excluded.name,
      category    = excluded.category,
      parent_code = excluded.parent_code,
      active      = excluded.active,
      notes       = excluded.notes;

-- EQUITY (3xxx)
insert into public.chart_of_accounts (code, name, category, parent_code, active, notes) values
  ('3000', 'Ekuitas',                'equity'::public.coa_category, null,   true, 'Header'),
  ('3010', 'Hibah BGN',              'equity'::public.coa_category, '3000', true, 'Modal hibah awal'),
  ('3020', 'Surplus/Defisit Berjalan','equity'::public.coa_category,'3000', true, null)
on conflict (code) do update
  set name        = excluded.name,
      category    = excluded.category,
      parent_code = excluded.parent_code,
      active      = excluded.active,
      notes       = excluded.notes;

-- REVENUE (4xxx)
insert into public.chart_of_accounts (code, name, category, parent_code, active, notes) values
  ('4000', 'Pendapatan',             'revenue'::public.coa_category, null,   true, 'Header'),
  ('4010', 'Hibah BGN Bulanan',      'revenue'::public.coa_category, '4000', true, 'Dana hibah bulanan pusat'),
  ('4020', 'Pendapatan Lain-lain',   'revenue'::public.coa_category, '4000', true, null)
on conflict (code) do update
  set name        = excluded.name,
      category    = excluded.category,
      parent_code = excluded.parent_code,
      active      = excluded.active,
      notes       = excluded.notes;

-- EXPENSES (5xxx) — 17+ kategori operasional SPPG BGN (Lamp 30c)
insert into public.chart_of_accounts (code, name, category, parent_code, active, notes) values
  ('5000', 'Beban',                           'expense'::public.coa_category, null,   true, 'Header'),
  ('5010', 'Bahan Makanan',                   'expense'::public.coa_category, '5000', true, 'Karbohidrat, Protein Hewani, Protein Nabati, Sayur, Buah'),
  ('5015', 'Bumbu & Penyedap',                'expense'::public.coa_category, '5000', true, 'Garam, gula, kecap, bumbu basah/kering'),
  ('5020', 'Insentif Relawan Dapur',          'expense'::public.coa_category, '5000', true, 'Uang harian 46 relawan'),
  ('5030', 'Insentif Kader Posyandu',         'expense'::public.coa_category, '5000', true, 'Lamp 26 — kader'),
  ('5040', 'Insentif PIC Sekolah',            'expense'::public.coa_category, '5000', true, 'Lamp 27 — PIC satdik'),
  ('5050', 'Gaji Tim Inti SPPG',              'expense'::public.coa_category, '5000', true, 'Kepala, Pengawas, Juru masak, Aslap'),
  ('5060', 'BPJS Kesehatan (Employer)',       'expense'::public.coa_category, '5000', true, '4% employer share'),
  ('5070', 'BPJS Ketenagakerjaan (Employer)', 'expense'::public.coa_category, '5000', true, 'JKK + JKM + JHT employer'),
  ('5080', 'Listrik',                         'expense'::public.coa_category, '5000', true, 'PLN bulanan'),
  ('5090', 'Air (PDAM)',                      'expense'::public.coa_category, '5000', true, null),
  ('5100', 'Gas LPG',                         'expense'::public.coa_category, '5000', true, 'Tabung 12kg/50kg'),
  ('5110', 'Sewa Bangunan/Dapur',             'expense'::public.coa_category, '5000', true, 'Sewa tempat SPPG'),
  ('5120', 'BBM & Transport Distribusi',      'expense'::public.coa_category, '5000', true, 'Bensin, solar, ojek distribusi'),
  ('5130', 'Pulsa & Komunikasi',              'expense'::public.coa_category, '5000', true, 'Telepon SPPG'),
  ('5140', 'Internet',                        'expense'::public.coa_category, '5000', true, 'WiFi/data operasional'),
  ('5150', 'ATK & Percetakan',                'expense'::public.coa_category, '5000', true, 'Form BGN, label, printer'),
  ('5160', 'Peralatan Kebersihan',            'expense'::public.coa_category, '5000', true, 'Sabun, disinfektan, pel'),
  ('5170', 'APD & Seragam',                   'expense'::public.coa_category, '5000', true, 'Masker, sarung tangan, celemek, topi'),
  ('5180', 'Pemeliharaan Alat Dapur',         'expense'::public.coa_category, '5000', true, 'Service kompor, panci, rak'),
  ('5190', 'Pengujian Laboratorium',          'expense'::public.coa_category, '5000', true, 'Uji sampel makanan (jika dirujuk)'),
  ('5200', 'Biaya Lain-lain',                 'expense'::public.coa_category, '5000', true, 'Katch-all BGN')
on conflict (code) do update
  set name        = excluded.name,
      category    = excluded.category,
      parent_code = excluded.parent_code,
      active      = excluded.active,
      notes       = excluded.notes;

-- =============================================================================
-- Verifikasi cepat
-- =============================================================================
do $$
declare
  v_staff int;
  v_coa   int;
begin
  select count(*) into v_staff from public.sppg_staff where active = true;
  select count(*) into v_coa from public.chart_of_accounts where active = true;
  raise notice 'Seed selesai: % staf aktif, % akun COA aktif', v_staff, v_coa;
end $$;

-- =============================================================================
-- END seed 0050 SPPG + COA
-- =============================================================================
