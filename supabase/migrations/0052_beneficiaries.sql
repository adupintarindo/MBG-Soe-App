-- =============================================================================
-- 0052 · Beneficiaries (Ibu Hamil/Menyusui + Balita)
-- -----------------------------------------------------------------------------
-- Konteks: SPPG tidak hanya distribusi ke sekolah, tapi juga ke posyandu untuk
--          ibu hamil/menyusui (porsi besar) dan balita (porsi kecil).
-- Scope:
--   1. Tabel beneficiary_pregnant, beneficiary_toddler
--   2. RPC porsi_counts diperluas utk ikut-sertakan bumil/busui & balita
--   3. RPC porsi_breakdown(p_date): sekolah, siswa, bumil, balita per-date
--   4. RPC beneficiary_list(): daftar nama utk fitur rincian/download
--   5. RLS policies (read: staff+viewer, write: admin/operator)
--   6. Seed demo: 4 posyandu tambahan + 25 bumil/busui + 45 balita
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enums & tables
-- -----------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'pregnant_phase') then
    create type public.pregnant_phase as enum ('hamil', 'menyusui');
  end if;
end $$;

create table if not exists public.beneficiary_pregnant (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  nik               text,
  phase             public.pregnant_phase not null default 'hamil',
  gestational_week  smallint,           -- trimester/minggu kehamilan (kalau fase 'hamil')
  child_age_months  smallint,           -- usia anak (kalau fase 'menyusui')
  age               smallint,           -- usia ibu
  posyandu_id       uuid references public.posyandu(id) on delete set null,
  address           text,
  phone             text,
  notes             text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists beneficiary_pregnant_active_idx
  on public.beneficiary_pregnant(active) where active = true;
create index if not exists beneficiary_pregnant_posyandu_idx
  on public.beneficiary_pregnant(posyandu_id);

create table if not exists public.beneficiary_toddler (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  nik               text,
  dob               date,                -- tanggal lahir balita
  gender            text check (gender in ('L','P')),
  mother_name       text,
  posyandu_id       uuid references public.posyandu(id) on delete set null,
  address           text,
  phone             text,
  notes             text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists beneficiary_toddler_active_idx
  on public.beneficiary_toddler(active) where active = true;
create index if not exists beneficiary_toddler_posyandu_idx
  on public.beneficiary_toddler(posyandu_id);

-- -----------------------------------------------------------------------------
-- 2. Update porsi_counts — ikut-sertakan bumil (besar) + balita (kecil).
-- -----------------------------------------------------------------------------
-- Backward compat: signature identik dengan 0043, hanya body diperluas.
-- Bumil/busui & balita dianggap hadir pada setiap hari operasional (active=true).

create or replace function public.porsi_counts(p_date date)
returns table(kecil int, besar int, guru int, total int, operasional boolean)
language plpgsql stable as $$
declare
  v_kecil   int := 0;
  v_besar   int := 0;
  v_guru    int := 0;
  v_bumil   int := 0;
  v_balita  int := 0;
  v_nonop   boolean := false;
begin
  select true into v_nonop from public.non_op_days where op_date = p_date;
  if coalesce(v_nonop, false) then
    return query select 0,0,0,0,false;
    return;
  end if;

  if extract(dow from p_date) in (0,6) then
    return query select 0,0,0,0,false;
    return;
  end if;

  -- Porsi dari sekolah (sama dgn 0043, pakai alias eksplisit)
  with roster as (
    select
      s.id              as sid,
      s.level           as slevel,
      s.students        as sstudents,
      s.kelas13         as skelas13,
      s.kelas46         as skelas46,
      s.guru            as sguru,
      a.qty             as att_qty,
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
    coalesce(sum(
      case
        when slevel = 'PAUD/TK' then round(sstudents * ratio)
        when slevel = 'SD'      then round(skelas13 * ratio)
        else 0
      end
    ), 0)::int,
    coalesce(sum(
      case
        when slevel = 'SD'                 then round(skelas46 * ratio)
        when slevel in ('SMP','SMA','SMK') then round(sstudents * ratio)
        else 0
      end
    ), 0)::int,
    coalesce(sum(round(sguru * ratio)), 0)::int
  into v_kecil, v_besar, v_guru
  from roster;

  -- Porsi dari posyandu: bumil=besar, balita=kecil
  select coalesce(count(*),0)::int into v_bumil
    from public.beneficiary_pregnant bp where bp.active = true;
  select coalesce(count(*),0)::int into v_balita
    from public.beneficiary_toddler bt where bt.active = true;

  v_kecil := v_kecil + v_balita;
  v_besar := v_besar + v_bumil;

  return query select v_kecil, v_besar, v_guru, (v_kecil + v_besar + v_guru), true;
end; $$;

-- -----------------------------------------------------------------------------
-- 3. Breakdown per-date utk tabel dashboard (sekolah/siswa/bumil/balita count)
-- -----------------------------------------------------------------------------

create or replace function public.porsi_breakdown(p_date date)
returns table(
  schools_count    int,
  students_total   int,
  pregnant_count   int,
  toddler_count    int,
  operasional      boolean
)
language plpgsql stable as $$
declare
  v_nonop boolean := false;
  v_op    boolean := true;
begin
  select true into v_nonop from public.non_op_days where op_date = p_date;
  if coalesce(v_nonop, false) or extract(dow from p_date) in (0,6) then
    v_op := false;
  end if;

  if not v_op then
    return query select 0, 0, 0, 0, false;
    return;
  end if;

  return query
  with sch as (
    select
      count(distinct s.id) filter (
        where coalesce(a.qty, s.students) > 0
      )::int as sc,
      coalesce(sum(
        case when a.qty is null then s.students else a.qty end
      ), 0)::int as st
    from public.schools s
    left join public.school_attendance a
      on a.school_id = s.id and a.att_date = p_date
    where s.active = true
  ),
  bumil as (
    select count(*)::int as bc
    from public.beneficiary_pregnant where active = true
  ),
  balita as (
    select count(*)::int as tc
    from public.beneficiary_toddler where active = true
  )
  select sch.sc, sch.st, bumil.bc, balita.tc, true
  from sch, bumil, balita;
end; $$;

-- -----------------------------------------------------------------------------
-- 4. Rincian daftar utk modal/Excel download per-tanggal
-- -----------------------------------------------------------------------------
-- Mengembalikan 1 row per sekolah (dgn qty utk tanggal itu).
create or replace function public.schools_breakdown(p_date date)
returns table(
  school_id    text,
  school_name  text,
  level        text,
  qty          int,
  students     int
)
language sql stable as $$
  select
    s.id,
    s.name,
    s.level,
    case
      when a.qty is not null then a.qty::int
      else s.students::int
    end,
    s.students::int
  from public.schools s
  left join public.school_attendance a
    on a.school_id = s.id and a.att_date = p_date
  where s.active = true
    and (a.qty is null or a.qty > 0)
  order by s.name;
$$;

-- -----------------------------------------------------------------------------
-- 5. RLS
-- -----------------------------------------------------------------------------

alter table public.beneficiary_pregnant enable row level security;

drop policy if exists "beneficiary_pregnant: staff read" on public.beneficiary_pregnant;
create policy "beneficiary_pregnant: staff read" on public.beneficiary_pregnant
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "beneficiary_pregnant: ops write" on public.beneficiary_pregnant;
create policy "beneficiary_pregnant: ops write" on public.beneficiary_pregnant
  for all using (
    public.current_role() in ('admin','operator','ahli_gizi')
  )
  with check (
    public.current_role() in ('admin','operator','ahli_gizi')
  );

alter table public.beneficiary_toddler enable row level security;

drop policy if exists "beneficiary_toddler: staff read" on public.beneficiary_toddler;
create policy "beneficiary_toddler: staff read" on public.beneficiary_toddler
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "beneficiary_toddler: ops write" on public.beneficiary_toddler;
create policy "beneficiary_toddler: ops write" on public.beneficiary_toddler
  for all using (
    public.current_role() in ('admin','operator','ahli_gizi')
  )
  with check (
    public.current_role() in ('admin','operator','ahli_gizi')
  );

grant execute on function public.porsi_breakdown(date) to authenticated;
grant execute on function public.schools_breakdown(date) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Seed demo (idempoten — skip kalau sudah ada data)
-- -----------------------------------------------------------------------------

-- Seed posyandu hanya kalau tabel masih kosong
insert into public.posyandu (name, village, district)
select name, village, district
from (values
  ('Posyandu Melati',   'Desa Nunkolo',   'Amanuban Tengah'),
  ('Posyandu Mawar',    'Desa Polen',     'Amanuban Tengah'),
  ('Posyandu Anggrek',  'Desa Bisene',    'Amanuban Tengah'),
  ('Posyandu Kenanga',  'Desa Oekiu',     'Amanuban Tengah')
) as t(name, village, district)
where not exists (
  select 1 from public.posyandu where name = t.name
);

-- Seed bumil/busui — 25 data dummy
insert into public.beneficiary_pregnant
  (full_name, nik, phase, gestational_week, child_age_months, age, posyandu_id, address, phone, active)
select
  src.full_name, src.nik, src.phase::public.pregnant_phase, src.gw, src.cam, src.age,
  (select id from public.posyandu where name = src.posyandu_name limit 1),
  src.address, src.phone, true
from (values
  ('Maria Selan',        '5301234501010001', 'hamil',     24,  null, 27, 'Posyandu Melati',   'RT 01 Nunkolo',  '08231111111'),
  ('Yuliana Tefa',       '5301234501010002', 'hamil',     32,  null, 24, 'Posyandu Melati',   'RT 02 Nunkolo',  '08232222222'),
  ('Martha Banunaek',    '5301234501010003', 'menyusui',  null, 4,   29, 'Posyandu Melati',   'RT 03 Nunkolo',  '08233333333'),
  ('Hendrika Taneo',     '5301234501010004', 'hamil',     12,  null, 22, 'Posyandu Melati',   'RT 01 Nunkolo',  '08234444444'),
  ('Sofia Nubatonis',    '5301234501010005', 'menyusui',  null, 2,   31, 'Posyandu Melati',   'RT 04 Nunkolo',  '08235555555'),
  ('Elisabeth Takoy',    '5301234501010006', 'hamil',     28,  null, 26, 'Posyandu Melati',   'RT 02 Nunkolo',  '08236666666'),
  ('Agustina Benu',      '5301234502020001', 'hamil',     20,  null, 25, 'Posyandu Mawar',    'RT 01 Polen',    '08237777777'),
  ('Dorcas Kolo',        '5301234502020002', 'menyusui',  null, 6,   30, 'Posyandu Mawar',    'RT 02 Polen',    '08238888888'),
  ('Juliana Boymau',     '5301234502020003', 'hamil',     16,  null, 23, 'Posyandu Mawar',    'RT 03 Polen',    '08239999999'),
  ('Risda Tusi',         '5301234502020004', 'menyusui',  null, 10,  34, 'Posyandu Mawar',    'RT 01 Polen',    '08231010101'),
  ('Frederika Nenohai',  '5301234502020005', 'hamil',     36,  null, 28, 'Posyandu Mawar',    'RT 04 Polen',    '08231212121'),
  ('Yuliana Lomi',       '5301234502020006', 'menyusui',  null, 3,   27, 'Posyandu Mawar',    'RT 02 Polen',    '08231313131'),
  ('Martha Sakan',       '5301234503030001', 'hamil',     8,   null, 21, 'Posyandu Anggrek',  'RT 01 Bisene',   '08231414141'),
  ('Anastasia Kause',    '5301234503030002', 'hamil',     24,  null, 26, 'Posyandu Anggrek',  'RT 02 Bisene',   '08231515151'),
  ('Melkiana Fallo',     '5301234503030003', 'menyusui',  null, 5,   29, 'Posyandu Anggrek',  'RT 03 Bisene',   '08231616161'),
  ('Ofiria Tafetin',     '5301234503030004', 'hamil',     30,  null, 25, 'Posyandu Anggrek',  'RT 01 Bisene',   '08231717171'),
  ('Yustina Mnao',       '5301234503030005', 'menyusui',  null, 8,   32, 'Posyandu Anggrek',  'RT 04 Bisene',   '08231818181'),
  ('Bernadete Nenobahan','5301234503030006', 'hamil',     18,  null, 24, 'Posyandu Anggrek',  'RT 02 Bisene',   '08231919191'),
  ('Theresia Nomleni',   '5301234504040001', 'hamil',     14,  null, 22, 'Posyandu Kenanga',  'RT 01 Oekiu',    '08232020202'),
  ('Veronika Saunoah',   '5301234504040002', 'menyusui',  null, 1,   28, 'Posyandu Kenanga',  'RT 02 Oekiu',    '08232121212'),
  ('Pauline Bureni',     '5301234504040003', 'hamil',     22,  null, 26, 'Posyandu Kenanga',  'RT 03 Oekiu',    '08232222111'),
  ('Yovita Nabu',        '5301234504040004', 'menyusui',  null, 7,   31, 'Posyandu Kenanga',  'RT 01 Oekiu',    '08232323232'),
  ('Klara Mella',        '5301234504040005', 'hamil',     26,  null, 24, 'Posyandu Kenanga',  'RT 04 Oekiu',    '08232424242'),
  ('Serafina Faot',      '5301234504040006', 'menyusui',  null, 9,   33, 'Posyandu Kenanga',  'RT 02 Oekiu',    '08232525252'),
  ('Dominika Sopaheluwakan','5301234504040007','hamil',   34,  null, 27, 'Posyandu Kenanga',  'RT 03 Oekiu',    '08232626262')
) as src(full_name, nik, phase, gw, cam, age, posyandu_name, address, phone)
where not exists (select 1 from public.beneficiary_pregnant where nik = src.nik);

-- Seed balita — 45 data dummy
insert into public.beneficiary_toddler
  (full_name, nik, dob, gender, mother_name, posyandu_id, address, phone, active)
select
  src.full_name, src.nik, src.dob::date, src.gender, src.mother_name,
  (select id from public.posyandu where name = src.posyandu_name limit 1),
  src.address, src.phone, true
from (values
  ('Adrianus Selan',      '5301234511110001', '2023-08-12','L','Maria Selan',        'Posyandu Melati',  'RT 01 Nunkolo','08234141111'),
  ('Beatrix Tefa',        '5301234511110002', '2024-01-05','P','Yuliana Tefa',       'Posyandu Melati',  'RT 02 Nunkolo','08234141112'),
  ('Clementius Banunaek', '5301234511110003', '2023-11-18','L','Martha Banunaek',    'Posyandu Melati',  'RT 03 Nunkolo','08234141113'),
  ('Daniela Taneo',       '5301234511110004', '2022-06-23','P','Hendrika Taneo',     'Posyandu Melati',  'RT 01 Nunkolo','08234141114'),
  ('Emanuel Nubatonis',   '5301234511110005', '2024-03-09','L','Sofia Nubatonis',    'Posyandu Melati',  'RT 04 Nunkolo','08234141115'),
  ('Fransiska Takoy',     '5301234511110006', '2022-09-14','P','Elisabeth Takoy',    'Posyandu Melati',  'RT 02 Nunkolo','08234141116'),
  ('Gabriel Kanai',       '5301234511110007', '2023-02-28','L','Rina Kanai',         'Posyandu Melati',  'RT 01 Nunkolo','08234141117'),
  ('Helena Saunoa',       '5301234511110008', '2023-12-03','P','Rosa Saunoa',        'Posyandu Melati',  'RT 03 Nunkolo','08234141118'),
  ('Ignatius Boro',       '5301234511110009', '2024-05-22','L','Lena Boro',          'Posyandu Melati',  'RT 04 Nunkolo','08234141119'),
  ('Jacinta Nokas',       '5301234511110010', '2022-11-08','P','Ria Nokas',          'Posyandu Melati',  'RT 02 Nunkolo','08234141120'),
  ('Kornelius Benu',      '5301234512220001', '2023-07-17','L','Agustina Benu',      'Posyandu Mawar',   'RT 01 Polen',  '08234141121'),
  ('Lidwina Kolo',        '5301234512220002', '2023-10-02','P','Dorcas Kolo',        'Posyandu Mawar',   'RT 02 Polen',  '08234141122'),
  ('Maksimus Boymau',     '5301234512220003', '2024-02-14','L','Juliana Boymau',     'Posyandu Mawar',   'RT 03 Polen',  '08234141123'),
  ('Norbertha Tusi',      '5301234512220004', '2022-04-30','P','Risda Tusi',         'Posyandu Mawar',   'RT 01 Polen',  '08234141124'),
  ('Oktavianus Nenohai',  '5301234512220005', '2023-09-11','L','Frederika Nenohai',  'Posyandu Mawar',   'RT 04 Polen',  '08234141125'),
  ('Pamela Lomi',         '5301234512220006', '2024-06-07','P','Yuliana Lomi',       'Posyandu Mawar',   'RT 02 Polen',  '08234141126'),
  ('Quirinus Tnunai',     '5301234512220007', '2023-01-24','L','Siti Tnunai',        'Posyandu Mawar',   'RT 03 Polen',  '08234141127'),
  ('Rosalina Abi',        '5301234512220008', '2023-05-16','P','Maria Abi',          'Posyandu Mawar',   'RT 01 Polen',  '08234141128'),
  ('Stefanus Liu',        '5301234512220009', '2022-12-29','L','Yanti Liu',          'Posyandu Mawar',   'RT 04 Polen',  '08234141129'),
  ('Theresa Ndun',        '5301234512220010', '2024-04-11','P','Ani Ndun',           'Posyandu Mawar',   'RT 02 Polen',  '08234141130'),
  ('Urbanus Sakan',       '5301234513330001', '2023-03-19','L','Martha Sakan',       'Posyandu Anggrek', 'RT 01 Bisene', '08234141131'),
  ('Veronika Kause',      '5301234513330002', '2024-01-27','P','Anastasia Kause',    'Posyandu Anggrek', 'RT 02 Bisene', '08234141132'),
  ('Wilibrordus Fallo',   '5301234513330003', '2023-08-05','L','Melkiana Fallo',     'Posyandu Anggrek', 'RT 03 Bisene', '08234141133'),
  ('Xaverine Tafetin',    '5301234513330004', '2022-10-20','P','Ofiria Tafetin',     'Posyandu Anggrek', 'RT 01 Bisene', '08234141134'),
  ('Yoseph Mnao',         '5301234513330005', '2024-07-14','L','Yustina Mnao',       'Posyandu Anggrek', 'RT 04 Bisene', '08234141135'),
  ('Zita Nenobahan',      '5301234513330006', '2023-04-02','P','Bernadete Nenobahan','Posyandu Anggrek', 'RT 02 Bisene', '08234141136'),
  ('Alfonsius Manek',     '5301234513330007', '2023-11-28','L','Eva Manek',          'Posyandu Anggrek', 'RT 03 Bisene', '08234141137'),
  ('Brigitta Nikolaus',   '5301234513330008', '2024-05-01','P','Dewi Nikolaus',      'Posyandu Anggrek', 'RT 04 Bisene', '08234141138'),
  ('Caesario Boy',        '5301234513330009', '2022-08-17','L','Nur Boy',            'Posyandu Anggrek', 'RT 01 Bisene', '08234141139'),
  ('Damaris Toy',         '5301234513330010', '2023-02-04','P','Nona Toy',           'Posyandu Anggrek', 'RT 02 Bisene', '08234141140'),
  ('Egidius Nomleni',     '5301234514440001', '2023-06-21','L','Theresia Nomleni',   'Posyandu Kenanga', 'RT 01 Oekiu',  '08234141141'),
  ('Filomena Saunoah',    '5301234514440002', '2024-02-08','P','Veronika Saunoah',   'Posyandu Kenanga', 'RT 02 Oekiu',  '08234141142'),
  ('Gerardus Bureni',     '5301234514440003', '2023-09-29','L','Pauline Bureni',     'Posyandu Kenanga', 'RT 03 Oekiu',  '08234141143'),
  ('Hildegardis Nabu',    '5301234514440004', '2022-12-12','P','Yovita Nabu',        'Posyandu Kenanga', 'RT 01 Oekiu',  '08234141144'),
  ('Isidorus Mella',      '5301234514440005', '2024-06-25','L','Klara Mella',        'Posyandu Kenanga', 'RT 04 Oekiu',  '08234141145'),
  ('Juliana Faot',        '5301234514440006', '2023-10-18','P','Serafina Faot',      'Posyandu Kenanga', 'RT 02 Oekiu',  '08234141146'),
  ('Kristoforus Sopaheluwakan','5301234514440007','2023-03-06','L','Dominika Sopaheluwakan','Posyandu Kenanga','RT 03 Oekiu','08234141147'),
  ('Laurensia Nelci',     '5301234514440008', '2024-04-19','P','Sinta Nelci',        'Posyandu Kenanga', 'RT 04 Oekiu',  '08234141148'),
  ('Modestus Bria',       '5301234514440009', '2022-07-03','L','Sara Bria',          'Posyandu Kenanga', 'RT 01 Oekiu',  '08234141149'),
  ('Noberta Leton',       '5301234514440010', '2023-05-26','P','Lusia Leton',        'Posyandu Kenanga', 'RT 02 Oekiu',  '08234141150'),
  ('Oliverius Bait',      '5301234514440011', '2024-01-13','L','Yanti Bait',         'Posyandu Kenanga', 'RT 03 Oekiu',  '08234141151'),
  ('Paulina Uli',         '5301234514440012', '2023-12-20','P','Mince Uli',          'Posyandu Kenanga', 'RT 04 Oekiu',  '08234141152'),
  ('Quido Manikin',       '5301234514440013', '2022-05-09','L','Dorkas Manikin',     'Posyandu Kenanga', 'RT 01 Oekiu',  '08234141153'),
  ('Renata Tameon',       '5301234514440014', '2024-03-24','P','Wilhelmina Tameon',  'Posyandu Kenanga', 'RT 02 Oekiu',  '08234141154'),
  ('Servatius Finit',     '5301234514440015', '2023-07-31','L','Agata Finit',        'Posyandu Kenanga', 'RT 03 Oekiu',  '08234141155')
) as src(full_name, nik, dob, gender, mother_name, posyandu_name, address, phone)
where not exists (select 1 from public.beneficiary_toddler where nik = src.nik);

-- =============================================================================
-- END 0052
-- =============================================================================
