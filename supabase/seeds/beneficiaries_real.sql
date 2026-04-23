-- =============================================================================
-- SEED REAL DATA — Penerima Manfaat Posyandu (Bumil + Balita)
-- =============================================================================
-- Ganti blok VALUES di bawah dengan data asli sebelum go-live. Pattern idempoten
-- (WHERE NOT EXISTS by NIK) — aman dijalankan berulang. Row dengan NIK yang sudah
-- ada akan di-skip, bukan di-overwrite; untuk update pakai UPDATE terpisah.
--
-- Urutan eksekusi:
--   1. Isi tabel posyandu (kalau nama posyandu belum ada di DB)
--   2. Isi beneficiary_pregnant
--   3. Isi beneficiary_toddler
--
-- Cara pakai:
--   - Supabase CLI:  supabase db execute -f supabase/seeds/beneficiaries_real.sql
--   - Dashboard UI:  copy-paste ke SQL Editor di Supabase
-- =============================================================================

-- 1) POSYANDU ------------------------------------------------------------------
-- Tambahkan posyandu yang belum ada. Hapus blok ini kalau semua posyandu sudah
-- di-input manual via UI (/posyandu).
insert into public.posyandu (name, village, district)
select name, village, district
from (values
  -- ('Nama Posyandu', 'Desa/Kelurahan', 'Kecamatan'),
  ('GANTI_NAMA_POSYANDU', 'GANTI_DESA', 'GANTI_KECAMATAN')
) as t(name, village, district)
where not exists (
  select 1 from public.posyandu where name = t.name
);

-- 2) BENEFICIARY_PREGNANT (Ibu Hamil + Ibu Menyusui) ---------------------------
-- phase: 'hamil' atau 'menyusui'
-- gestational_week: isi kalau hamil (1-42), null kalau menyusui
-- child_age_months: isi kalau menyusui (0-24), null kalau hamil
-- NIK: 16 digit, atau null kalau belum ada
insert into public.beneficiary_pregnant
  (full_name, nik, phase, gestational_week, child_age_months, age,
   posyandu_id, address, phone, active)
select
  src.full_name,
  src.nik,
  src.phase::public.pregnant_phase,
  src.gw,
  src.cam,
  src.age,
  (select id from public.posyandu where name = src.posyandu_name limit 1),
  src.address,
  src.phone,
  true
from (values
  -- Template: ('Nama Lengkap', 'NIK-16-digit'|null, 'hamil'|'menyusui',
  --           minggu_kehamilan|null, umur_anak_bulan|null, umur_ibu,
  --           'Nama Posyandu', 'Alamat Lengkap', 'No. HP')
  ('GANTI_NAMA', null, 'hamil', 20, null, 25,
   'GANTI_NAMA_POSYANDU', 'GANTI_ALAMAT', '08xxxxxxxxxx')
) as src(full_name, nik, phase, gw, cam, age, posyandu_name, address, phone)
where not exists (
  select 1 from public.beneficiary_pregnant
  where nik is not null and nik = src.nik
);

-- 3) BENEFICIARY_TODDLER (Balita 0-59 bulan) -----------------------------------
-- gender: 'L' atau 'P'
-- dob: format YYYY-MM-DD
-- NIK: 16 digit, atau null kalau belum ada
insert into public.beneficiary_toddler
  (full_name, nik, dob, gender, mother_name,
   posyandu_id, address, phone, active)
select
  src.full_name,
  src.nik,
  src.dob::date,
  src.gender,
  src.mother_name,
  (select id from public.posyandu where name = src.posyandu_name limit 1),
  src.address,
  src.phone,
  true
from (values
  -- Template: ('Nama Balita', 'NIK-16-digit'|null, 'YYYY-MM-DD', 'L'|'P',
  --           'Nama Ibu', 'Nama Posyandu', 'Alamat', 'No. HP Ibu')
  ('GANTI_NAMA_BALITA', null, '2024-01-15', 'L', 'GANTI_NAMA_IBU',
   'GANTI_NAMA_POSYANDU', 'GANTI_ALAMAT', '08xxxxxxxxxx')
) as src(full_name, nik, dob, gender, mother_name, posyandu_name, address, phone)
where not exists (
  select 1 from public.beneficiary_toddler
  where nik is not null and nik = src.nik
);

-- =============================================================================
-- VERIFIKASI — jalankan ini setelah insert untuk cek jumlah
-- =============================================================================
-- select count(*) as total_bumil from public.beneficiary_pregnant where active;
-- select count(*) as total_balita from public.beneficiary_toddler where active;
-- select p.name, count(bp.id) as bumil, count(bt.id) as balita
--   from public.posyandu p
--   left join public.beneficiary_pregnant bp on bp.posyandu_id = p.id and bp.active
--   left join public.beneficiary_toddler bt on bt.posyandu_id = p.id and bt.active
--   group by p.name
--   order by p.name;
