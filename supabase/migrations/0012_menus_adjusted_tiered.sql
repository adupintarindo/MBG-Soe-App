-- ============================================================================
-- 0011 · Replace 14 placeholder menus with 10 ADJUSTED menus from
-- "ADJUSTED Costing Sheet Dish 06042026.xlsx" (WFP × IFSR × FFI, SPPG Nunumeu).
--
-- Changes:
--   1. Tambah tiered gramasi column di menu_bom
--      (grams_paud, grams_sd13, grams_sd46, grams_smp) · 4 age-band SPPG.
--   2. Insert item baru yang belum ada di master (bumbu, rempah, sawi putih, dst).
--   3. Rewrite 14 menu placeholder → 10 menu riil ADJUSTED (M1..M10).
--   4. Rewrite menu_bom lengkap dengan tiered gramasi.
--   5. Regenerate menu_assign go-live 2026-05-04 rotasi 10-hari.
--   6. New function `porsi_counts_tiered(p_date)` return 4-tier count.
--   7. Patch `requirement_for_date` pakai tiered multiplication jika tier ≠ 0.
--   8. Patch `monthly_requirements` pakai tiered.
-- ============================================================================

-- ---------- 1. Tier columns ----------------------------------------------
alter table public.menu_bom
  add column if not exists grams_paud numeric(10,3) not null default 0,
  add column if not exists grams_sd13 numeric(10,3) not null default 0,
  add column if not exists grams_sd46 numeric(10,3) not null default 0,
  add column if not exists grams_smp  numeric(10,3) not null default 0;

comment on column public.menu_bom.grams_paud is 'Gramasi per porsi PAUD/TK (3-5 th). Sumber: ADJUSTED Costing Sheet.';
comment on column public.menu_bom.grams_sd13 is 'Gramasi per porsi SD kelas 1-3 (6-9 th).';
comment on column public.menu_bom.grams_sd46 is 'Gramasi per porsi SD kelas 4-6 (10-12 th) — baseline besar.';
comment on column public.menu_bom.grams_smp  is 'Gramasi per porsi SMP/SMA/SMK + Guru (13-18 th +).';

-- ---------- 2. Items baru ------------------------------------------------
insert into public.items(code, name_en, unit, category, price_idr, vol_weekly) values
  ('Ayam Tanpa Tulang', 'Boneless Chicken', 'kg', 'HEWANI', 58000, 0),
  ('Bawang Bombay',     'Onion',            'kg', 'BUMBU',  30000, 0),
  ('Daun Bawang',       'Spring Onion',     'kg', 'BUMBU',  27500, 0),
  ('Daun Jeruk',        'Kaffir Lime Leaf', 'kg', 'REMPAH', 25000, 0),
  ('Daun Kemangi',      'Basil',            'kg', 'BUMBU',  50000, 0),
  ('Kemiri',            'Candlenut',        'kg', 'REMPAH', 35000, 0),
  ('Ketumbar',          'Coriander',        'kg', 'REMPAH',  7000, 0),
  ('Labu Parang',       'Pumpkin',          'kg', 'SAYUR',  17500, 0),
  ('Lengkuas',          'Galangal',         'kg', 'REMPAH',  7000, 0),
  ('Merica',            'Pepper',           'kg', 'REMPAH',100000, 0),
  ('Pakcoi',            'Pak Choi',         'kg', 'SAYUR_HIJAU', 12000, 0),
  ('Sawi Putih',        'Chinese Cabbage',  'kg', 'SAYUR_HIJAU', 12000, 0),
  ('Sereh',             'Lemongrass',       'kg', 'REMPAH', 15000, 0),
  ('Tomat',             'Tomato',           'kg', 'SAYUR',  15000, 0)
on conflict (code) do nothing;

-- ---------- 3. Menu cycle: 14 → 10 ADJUSTED -----------------------------
-- Kosongkan dulu menu_bom 11-14 dan menu 11-14 yg obsolete.
delete from public.menu_bom  where menu_id not between 1 and 10;
delete from public.menu_assign where menu_id not between 1 and 10;
delete from public.menus      where id      not between 1 and 10;

-- Upsert 10 menu riil
insert into public.menus(id, name, name_en, cycle_day, active) values
  (1,  'Tumis Jagung Sawi Putih & Semur Ayam',      'Stir-Fried Corn-Cabbage + Braised Chicken',    1,  true),
  (2,  'Tumis Buncis & Telur Balado',               'Stir-Fried Green Bean + Balado Egg',           2,  true),
  (3,  'Tumis Labu Pakcoi & Ikan Balado',           'Stir-Fried Squash-Pakcoi + Balado Fish',       3,  true),
  (4,  'Tumis Kacang Panjang & Ayam Opor Bening',   'Stir-Fried Long Bean + Clear Opor Chicken',    4,  true),
  (5,  'Tumis Sawi Hijau & Telur Dadar',            'Stir-Fried Mustard Greens + Omelette',         5,  true),
  (6,  'Tumis Buncis Jagung & Ikan Saus Merah',     'Stir-Fried Bean-Corn + Red Sauce Fish',        6,  true),
  (7,  'Tumis Sawi Putih & Ayam Woku',              'Stir-Fried Cabbage + Woku Chicken',            7,  true),
  (8,  'Tumis Pakcoi & Telur Balado',               'Stir-Fried Pakcoi + Balado Egg',               8,  true),
  (9,  'Tumis Buncis & Semur Tahu Kentang',         'Stir-Fried Bean + Braised Tofu-Potato',        9,  true),
  (10, 'Capcai & Ikan Tuna Pepes',                  'Capcai + Pepes Tuna',                          10, true)
on conflict (id) do update set
  name       = excluded.name,
  name_en    = excluded.name_en,
  cycle_day  = excluded.cycle_day,
  active     = excluded.active;

-- ---------- 4. Menu BOM tiered ------------------------------------------
-- grams_per_porsi dipakai fallback (= grams_sd46 sebagai baseline besar)
delete from public.menu_bom;
insert into public.menu_bom(menu_id, item_code, grams_per_porsi, grams_paud, grams_sd13, grams_sd46, grams_smp) values
  (1, 'Beras Putih',        70, 30, 50, 70, 110),
  (1, 'Ayam Tanpa Tulang', 100, 25, 25,100, 100),
  (1, 'Jagung Manis',        5,  5,  5,  5,   5),
  (1, 'Sawi Putih',         25, 25, 25, 25,  25),
  (1, 'Wortel',             20, 20, 20, 20,  20),
  (1, 'Bawang Bombay',       5,  5,  5,  5,   5),
  (1, 'Bawang Merah',        7,  7,  7,  7,   7),
  (1, 'Bawang Putih',        3,  3,  3,  3,   3),
  (1, 'Daun Jeruk',       0.25, 0.25,0.25,0.25,0.25),
  (1, 'Garam',               1,  1,  1,  1,   1),
  (1, 'Jahe',                1,  1,  1,  1,   1),
  (1, 'Kecap Manis',         5,  5,  5,  5,   5),
  (1, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (1, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (1, 'Pisang',     150,100,100,150, 150),

  (2, 'Beras Putih',        70, 30, 50, 70, 110),
  (2, 'Telur Ayam',         60, 60, 60, 60,  60),
  (2, 'Buncis',             25, 25, 25, 25,  25),
  (2, 'Wortel',             20, 20, 20, 20,  20),
  (2, 'Bawang Merah',        7,  7,  7,  7,   7),
  (2, 'Bawang Putih',        3,  3,  3,  3,   3),
  (2, 'Cabai Merah',         2,  2,  2,  2,   2),
  (2, 'Daun Jeruk',       0.25, 0.25,0.25,0.25,0.25),
  (2, 'Garam',               1,  1,  1,  1,   1),
  (2, 'Lengkuas',            1,  1,  1,  1,   1),
  (2, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (2, 'Sereh',               2,  2,  2,  2,   2),
  (2, 'Tomat',              30, 30, 30, 30,  30),
  (2, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (2, 'Pepaya',     150,100,100,150, 150),

  (3, 'Beras Putih',        70, 30, 50, 70, 110),
  (3, 'Ikan Tuna',         100, 25, 25,100, 100),
  (3, 'Jagung Manis',        5,  5,  5,  5,   5),
  (3, 'Labu Parang',        40, 40, 40, 40,  40),
  (3, 'Pakcoi',             25, 25, 25, 25,  25),
  (3, 'Bawang Merah',        7,  7,  7,  7,   7),
  (3, 'Bawang Putih',        3,  3,  3,  3,   3),
  (3, 'Cabai Merah',         2,  2,  2,  2,   2),
  (3, 'Daun Jeruk',       0.25, 0.25,0.25,0.25,0.25),
  (3, 'Garam',               1,  1,  1,  1,   1),
  (3, 'Lengkuas',            1,  1,  1,  1,   1),
  (3, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (3, 'Sereh',               2,  2,  2,  2,   2),
  (3, 'Tomat',              30, 30, 30, 30,  30),
  (3, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (3, 'Melon',      150,100,100,150, 150),

  (4, 'Beras Putih',        70, 30, 50, 70, 110),
  (4, 'Ayam Tanpa Tulang', 100, 25, 25,100, 100),
  (4, 'Kacang Panjang',     25, 25, 25, 25,  25),
  (4, 'Wortel',             20, 20, 20, 20,  20),
  (4, 'Bawang Merah',        7,  7,  7,  7,   7),
  (4, 'Bawang Putih',        3,  3,  3,  3,   3),
  (4, 'Daun Jeruk',       0.25, 0.25,0.25,0.25,0.25),
  (4, 'Garam',               1,  1,  1,  1,   1),
  (4, 'Kemiri',              2,  2,  2,  2,   2),
  (4, 'Ketumbar',         0.25, 0.25,0.25,0.25,0.25),
  (4, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (4, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (4, 'Pisang',     150,100,100,150, 150),

  (5, 'Beras Putih',        70, 30, 50, 70, 110),
  (5, 'Telur Ayam',         60, 60, 60, 60,  60),
  (5, 'Sawi Hijau',         25, 25, 25, 25,  25),
  (5, 'Wortel',             20, 20, 20, 20,  20),
  (5, 'Bawang Merah',        7,  7,  7,  7,   7),
  (5, 'Bawang Putih',        3,  3,  3,  3,   3),
  (5, 'Daun Bawang',         1,  1,  1,  1,   1),
  (5, 'Garam',               1,  1,  1,  1,   1),
  (5, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (5, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (5, 'Pepaya',     150,100,100,150, 150),

  (6, 'Beras Putih',        70, 30, 50, 70, 110),
  (6, 'Ikan Tuna',         100, 25, 25,100, 100),
  (6, 'Buncis',             25, 25, 25, 25,  25),
  (6, 'Jagung Manis',        5,  5,  5,  5,   5),
  (6, 'Wortel',             20, 20, 20, 20,  20),
  (6, 'Bawang Merah',        7,  7,  7,  7,   7),
  (6, 'Bawang Putih',        3,  3,  3,  3,   3),
  (6, 'Cabai Merah',         1,  1,  1,  1,   1),
  (6, 'Garam',               1,  1,  1,  1,   1),
  (6, 'Ketumbar',         0.25, 0.25,0.25,0.25,0.25),
  (6, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (6, 'Sereh',               2,  2,  2,  2,   2),
  (6, 'Tomat',              35, 35, 35, 35,  35),
  (6, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (6, 'Pisang',     150,100,100,150, 150),

  (7, 'Beras Putih',        70, 30, 50, 70, 110),
  (7, 'Ayam Tanpa Tulang', 100, 25, 25,100, 100),
  (7, 'Sawi Putih',         25, 25, 25, 25,  25),
  (7, 'Wortel',             20, 20, 20, 20,  20),
  (7, 'Bawang Merah',        7,  7,  7,  7,   7),
  (7, 'Bawang Putih',        3,  3,  3,  3,   3),
  (7, 'Cabai Merah',         1,  1,  1,  1,   1),
  (7, 'Daun Jeruk',       0.25, 0.25,0.25,0.25,0.25),
  (7, 'Daun Kemangi',        2,  2,  2,  2,   2),
  (7, 'Garam',               1,  1,  1,  1,   1),
  (7, 'Jahe',              0.5, 0.5, 0.5, 0.5, 0.5),
  (7, 'Kemiri',              1,  1,  1,  1,   1),
  (7, 'Kunyit',            0.5, 0.5, 0.5, 0.5, 0.5),
  (7, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (7, 'Sereh',               2,  2,  2,  2,   2),
  (7, 'Tomat',               2,  2,  2,  2,   2),
  (7, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (7, 'Pepaya',     150,100,100,150, 150),

  (8, 'Beras Putih',        70, 30, 50, 70, 110),
  (8, 'Telur Ayam',         60, 60, 60, 60,  60),
  (8, 'Pakcoi',             25, 25, 25, 25,  25),
  (8, 'Wortel',             20, 20, 20, 20,  20),
  (8, 'Bawang Merah',        7,  7,  7,  7,   7),
  (8, 'Bawang Putih',        3,  3,  3,  3,   3),
  (8, 'Cabai Merah',         2,  2,  2,  2,   2),
  (8, 'Daun Jeruk',       0.25, 0.25,0.25,0.25,0.25),
  (8, 'Garam',               1,  1,  1,  1,   1),
  (8, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (8, 'Sereh',               2,  2,  2,  2,   2),
  (8, 'Tomat',              30, 30, 30, 30,  30),
  (8, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (8, 'Semangka',   150,100,100,150, 150),

  (9, 'Beras Putih',        70, 30, 50, 70, 110),
  (9, 'Tahu',              100, 25, 25,100, 100),
  (9, 'Kentang',            20, 20, 20, 20,  20),
  (9, 'Buncis',             25, 25, 25, 25,  25),
  (9, 'Wortel',             20, 20, 20, 20,  20),
  (9, 'Bawang Bombay',       5,  5,  5,  5,   5),
  (9, 'Bawang Merah',        7,  7,  7,  7,   7),
  (9, 'Bawang Putih',        3,  3,  3,  3,   3),
  (9, 'Daun Jeruk',       0.25, 0.25,0.25,0.25,0.25),
  (9, 'Garam',               1,  1,  1,  1,   1),
  (9, 'Jahe',                1,  1,  1,  1,   1),
  (9, 'Kecap Manis',         5,  5,  5,  5,   5),
  (9, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (9, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (9, 'Pisang',     150,100,100,150, 150),

  (10, 'Beras Putih',        70, 30, 50, 70, 110),
  (10, 'Ikan Tuna',         100, 25, 25,100, 100),
  (10, 'Sawi Hijau',         25, 25, 25, 25,  25),
  (10, 'Wortel',             20, 20, 20, 20,  20),
  (10, 'Bawang Merah',        7,  7,  7,  7,   7),
  (10, 'Bawang Putih',        3,  3,  3,  3,   3),
  (10, 'Cabai Merah',         2,  2,  2,  2,   2),
  (10, 'Daun Jeruk',       0.25, 0.25,0.25,0.25,0.25),
  (10, 'Daun Kemangi',        2,  2,  2,  2,   2),
  (10, 'Garam',               1,  1,  1,  1,   1),
  (10, 'Kemiri',              2,  2,  2,  2,   2),
  (10, 'Ketumbar',         0.25, 0.25,0.25,0.25,0.25),
  (10, 'Kunyit',            0.5, 0.5, 0.5, 0.5, 0.5),
  (10, 'Merica',            0.2, 0.2, 0.2, 0.2, 0.2),
  (10, 'Sereh',               2,  2,  2,  2,   2),
  (10, 'Minyak Goreng',      10, 10, 10, 10,  10),
  (10, 'Pepaya',     150,100,100,150, 150)
on conflict (menu_id, item_code) do update set
  grams_per_porsi = excluded.grams_per_porsi,
  grams_paud      = excluded.grams_paud,
  grams_sd13      = excluded.grams_sd13,
  grams_sd46      = excluded.grams_sd46,
  grams_smp       = excluded.grams_smp;

-- ---------- 5. Regenerate menu_assign 2026-05-04..2026-07-31 rotasi 10 -----
-- Hapus assign di rentang go-live yang diregenerasi (jaga custom override).
delete from public.menu_assign
 where assign_date between date '2026-05-04' and date '2026-07-31';

do $$
declare
  d date;
  m smallint := 1;
begin
  d := date '2026-05-04';
  while d < date '2026-07-31' loop
    if extract(dow from d) not in (0,6) then
      insert into public.menu_assign(assign_date, menu_id) values (d, m)
        on conflict (assign_date) do update set menu_id = excluded.menu_id;
      m := m + 1;
      if m > 10 then m := 1; end if;
    end if;
    d := d + 1;
  end loop;
end $$;

-- ---------- 6. porsi_counts_tiered --------------------------------------
-- 4 tier sesuai ADJUSTED Costing:
--   paud     : PAUD/TK students (3-5 th)
--   sd13     : SD kelas 1-3 (6-9 th)
--   sd46     : SD kelas 4-6 (10-12 th)
--   smp_plus : SMP + SMA + SMK students + seluruh guru (13-18 th +)
-- Attendance forecast tetap dipakai (ratio per-sekolah).
create or replace function public.porsi_counts_tiered(p_date date)
returns table(paud int, sd13 int, sd46 int, smp_plus int, total int, operasional boolean)
language plpgsql stable as $$
declare
  v_paud     int := 0;
  v_sd13     int := 0;
  v_sd46     int := 0;
  v_smp_plus int := 0;
  v_nonop    boolean := false;
begin
  select true into v_nonop from public.non_op_days where op_date = p_date;
  if coalesce(v_nonop, false) then
    return query select 0,0,0,0,0,false;
    return;
  end if;

  if extract(dow from p_date) in (0,6) then
    return query select 0,0,0,0,0,false;
    return;
  end if;

  with roster as (
    select
      s.id,
      s.level,
      s.students,
      s.kelas13,
      s.kelas46,
      s.guru,
      case
        when a.qty is null then 1.0
        when s.students <= 0 then 0.0
        else least(a.qty::numeric / nullif(s.students,0)::numeric, 1.0)
      end as ratio
    from public.schools s
    left join public.school_attendance a
      on a.school_id = s.id and a.att_date = p_date
    where s.active = true
  )
  select
    coalesce(sum(case when level = 'PAUD/TK' then round(students * ratio) else 0 end), 0)::int,
    coalesce(sum(case when level = 'SD' then round(kelas13 * ratio) else 0 end), 0)::int,
    coalesce(sum(case when level = 'SD' then round(kelas46 * ratio) else 0 end), 0)::int,
    coalesce(sum(case when level in ('SMP','SMA','SMK') then round(students * ratio) else 0 end), 0)::int
      + coalesce(sum(round(guru * ratio)), 0)::int
  into v_paud, v_sd13, v_sd46, v_smp_plus
  from roster;

  return query select
    v_paud, v_sd13, v_sd46, v_smp_plus,
    (v_paud + v_sd13 + v_sd46 + v_smp_plus),
    true;
end; $$;

grant execute on function public.porsi_counts_tiered(date) to authenticated;

-- ---------- 7. Patch requirement_for_date untuk tiered -------------------
-- Pakai tier kalau ada gramasi tier > 0, fallback grams_per_porsi * porsi_effective.
create or replace function public.requirement_for_date(p_date date)
returns table(item_code text, qty numeric, unit text, category public.item_category, price_idr numeric)
language plpgsql stable as $$
declare
  v_menu smallint;
  v_tier record;
begin
  -- Custom menu: tetap pakai fallback 100g/porsi (tidak tiered)
  if exists (select 1 from public.custom_menus where menu_date = p_date) then
    declare v_eff numeric := public.porsi_effective(p_date);
    begin
      if v_eff <= 0 then return; end if;
      return query
        select
          it.code as item_code,
          (100.0 * v_eff / 1000.0)::numeric as qty,
          it.unit,
          it.category,
          it.price_idr
        from public.custom_menus cm,
             jsonb_array_elements_text(cm.karbo || cm.protein || cm.sayur || cm.buah) as elem(val)
             join public.items it on it.code = elem.val
        where cm.menu_date = p_date;
      return;
    end;
  end if;

  select menu_id into v_menu from public.menu_assign where assign_date = p_date;
  if v_menu is null then return; end if;

  select paud, sd13, sd46, smp_plus, operasional
    into v_tier from public.porsi_counts_tiered(p_date);
  if not coalesce(v_tier.operasional, false) then return; end if;

  return query
    select
      b.item_code,
      (
        case
          when (coalesce(b.grams_paud,0) + coalesce(b.grams_sd13,0)
              + coalesce(b.grams_sd46,0) + coalesce(b.grams_smp,0)) > 0 then
            (coalesce(b.grams_paud,0) * v_tier.paud
           + coalesce(b.grams_sd13,0) * v_tier.sd13
           + coalesce(b.grams_sd46,0) * v_tier.sd46
           + coalesce(b.grams_smp,0)  * v_tier.smp_plus) / 1000.0
          else
            b.grams_per_porsi * public.porsi_effective(p_date) / 1000.0
        end
      )::numeric as qty,
      it.unit,
      it.category,
      it.price_idr
    from public.menu_bom b
    join public.items it on it.code = b.item_code
    where b.menu_id = v_menu;
end; $$;

-- ---------- 8. Patch monthly_requirements tiered -------------------------
create or replace function public.monthly_requirements(
  p_start date,
  p_months int default 4
)
returns table(
  item_code text,
  month date,
  qty_kg numeric
)
language plpgsql stable as $$
declare
  v_end date;
begin
  v_end := (p_start + (p_months || ' months')::interval - interval '1 day')::date;

  return query
  with days as (
    select generate_series(p_start, v_end, interval '1 day')::date as op_date
  ),
  ops as (
    select
      d.op_date,
      date_trunc('month', d.op_date)::date as month
    from days d
    where extract(isodow from d.op_date) between 1 and 5
      and not exists (
        select 1 from public.non_op_days n where n.op_date = d.op_date
      )
  ),
  daily as (
    select
      o.op_date,
      o.month,
      ma.menu_id,
      pct.paud     as p_paud,
      pct.sd13     as p_sd13,
      pct.sd46     as p_sd46,
      pct.smp_plus as p_smp,
      public.porsi_effective(o.op_date) as p_eff
    from ops o
    join public.menu_assign ma on ma.assign_date = o.op_date
    cross join lateral public.porsi_counts_tiered(o.op_date) pct
    where pct.operasional = true
  )
  select
    b.item_code,
    d.month,
    round(
      sum(
        case
          when (coalesce(b.grams_paud,0) + coalesce(b.grams_sd13,0)
              + coalesce(b.grams_sd46,0) + coalesce(b.grams_smp,0)) > 0 then
            (coalesce(b.grams_paud,0) * d.p_paud
           + coalesce(b.grams_sd13,0) * d.p_sd13
           + coalesce(b.grams_sd46,0) * d.p_sd46
           + coalesce(b.grams_smp,0)  * d.p_smp) / 1000.0
          else
            b.grams_per_porsi * d.p_eff / 1000.0
        end
      ), 3
    ) as qty_kg
  from daily d
  join public.menu_bom b on b.menu_id = d.menu_id
  group by b.item_code, d.month
  order by d.month, qty_kg desc;
end; $$;

grant execute on function public.monthly_requirements(date, int) to authenticated;
grant execute on function public.requirement_for_date(date) to authenticated;
