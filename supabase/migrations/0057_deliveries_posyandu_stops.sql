-- =============================================================================
-- 0057 · Deliveries to Posyandu (Bumil + Balita)
-- -----------------------------------------------------------------------------
-- Konteks:
--   Manifest pengiriman (delivery_stops) sebelumnya hanya berisi stops ke
--   sekolah. SPPG juga mendistribusikan porsi ke posyandu (untuk ibu hamil/
--   menyusui dan balita). Migrasi ini memperluas delivery_stops supaya satu
--   stop bisa berupa sekolah ATAU posyandu, tanpa memecah tabel.
--
-- Scope:
--   1. Enum `stop_kind` ('school' | 'posyandu')
--   2. delivery_stops: tambah posyandu_id + stop_kind, school_id jadi nullable,
--      CHECK exactly-one recipient, ganti unique menjadi partial-unique per kind
--   3. RPC `delivery_generate_for_date` diperluas: setelah loop sekolah, loop
--      juga posyandu aktif — porsi = count(bumil aktif) + count(balita aktif).
--      Posyandu dengan 0 penerima aktif dilewati.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enum stop_kind
-- -----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'stop_kind') then
    create type public.stop_kind as enum ('school', 'posyandu');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. delivery_stops: tambah kolom, relax constraint, tambah partial-unique
-- -----------------------------------------------------------------------------
alter table public.delivery_stops
  add column if not exists stop_kind   public.stop_kind not null default 'school';

alter table public.delivery_stops
  add column if not exists posyandu_id uuid references public.posyandu(id) on delete restrict;

-- school_id tidak wajib lagi (posyandu stops tidak punya school_id)
alter table public.delivery_stops
  alter column school_id drop not null;

-- Drop unique (delivery_no, school_id) lama — diganti partial-unique
do $$
declare
  v_con text;
begin
  select constraint_name into v_con
    from information_schema.table_constraints
   where table_schema = 'public'
     and table_name   = 'delivery_stops'
     and constraint_type = 'UNIQUE'
     and constraint_name like '%school_id%';
  if v_con is not null then
    execute format('alter table public.delivery_stops drop constraint %I', v_con);
  end if;
end $$;

-- Partial-unique: per-delivery tidak boleh duplikasi school yang sama
create unique index if not exists idx_stop_delivery_school_uniq
  on public.delivery_stops(delivery_no, school_id)
  where school_id is not null;

-- Partial-unique: per-delivery tidak boleh duplikasi posyandu yang sama
create unique index if not exists idx_stop_delivery_posyandu_uniq
  on public.delivery_stops(delivery_no, posyandu_id)
  where posyandu_id is not null;

-- Index lookup per posyandu
create index if not exists idx_stop_posyandu on public.delivery_stops(posyandu_id);

-- CHECK exactly-one (school XOR posyandu, konsisten dengan stop_kind)
-- Drop dulu kalau sudah ada (idempotent re-run)
alter table public.delivery_stops
  drop constraint if exists delivery_stops_recipient_check;

alter table public.delivery_stops
  add constraint delivery_stops_recipient_check
  check (
    (stop_kind = 'school'   and school_id is not null and posyandu_id is null) or
    (stop_kind = 'posyandu' and posyandu_id is not null and school_id is null)
  );

-- -----------------------------------------------------------------------------
-- 3. RPC delivery_generate_for_date — tambah loop posyandu
-- -----------------------------------------------------------------------------
create or replace function public.delivery_generate_for_date(p_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_no text;
  v_menu_id smallint;
  v_existing int;
  r record;
  v_order smallint := 1;
begin
  v_role := public.current_role();
  if v_role not in ('admin','operator') then
    raise exception 'role % tidak berwenang', v_role;
  end if;

  -- Idempotent: kalau sudah ada, kembalikan yang ada
  select count(*) into v_existing
    from public.deliveries where delivery_date = p_date;
  if v_existing > 0 then
    select no into v_no from public.deliveries
      where delivery_date = p_date order by created_at limit 1;
    return v_no;
  end if;

  select menu_id into v_menu_id from public.menu_assign where assign_date = p_date;
  v_no := 'DLV-' || to_char(p_date, 'YYYY-MM-DD') || '-01';

  insert into public.deliveries(no, delivery_date, menu_id, status, created_by)
  values (v_no, p_date, v_menu_id, 'planned', auth.uid());

  -- Stops ke sekolah (sama seperti sebelumnya)
  for r in
    select s.id as school_id,
           coalesce(a.qty, s.students) as porsi
      from public.schools s
      left join public.school_attendance a
        on a.school_id = s.id and a.att_date = p_date
     where s.active = true
     order by s.id
  loop
    insert into public.delivery_stops(
      delivery_no, stop_order, stop_kind, school_id, porsi_planned, status
    ) values (
      v_no, v_order, 'school', r.school_id, r.porsi::int, 'planned'
    );
    v_order := v_order + 1;
  end loop;

  -- Stops ke posyandu: porsi = bumil aktif + balita aktif per posyandu
  for r in
    select p.id as posyandu_id,
           (
             coalesce((select count(*)::int from public.beneficiary_pregnant bp
                        where bp.active = true and bp.posyandu_id = p.id), 0)
             +
             coalesce((select count(*)::int from public.beneficiary_toddler bt
                        where bt.active = true and bt.posyandu_id = p.id), 0)
           ) as porsi
      from public.posyandu p
     where p.active = true
     order by p.name
  loop
    if r.porsi > 0 then
      insert into public.delivery_stops(
        delivery_no, stop_order, stop_kind, posyandu_id, porsi_planned, status
      ) values (
        v_no, v_order, 'posyandu', r.posyandu_id, r.porsi::int, 'planned'
      );
      v_order := v_order + 1;
    end if;
  end loop;

  return v_no;
end; $$;

grant execute on function public.delivery_generate_for_date(date) to authenticated;
