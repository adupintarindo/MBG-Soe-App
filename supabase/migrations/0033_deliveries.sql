-- =============================================================================
-- 0033 · Deliveries dapur → sekolah + POD (proof of delivery)
-- -----------------------------------------------------------------------------
-- Masalah: SPPG Nunumeu distribusikan ke 9 sekolah setiap hari. Tidak ada
-- surat jalan/manifest/POD → klaim ke WFP/dinas tidak bisa dibuktikan.
-- school_attendance = konsumsi (bukan distribusi).
--
-- Desain:
--   deliveries       : header per trip (delivery_no, date, driver, kendaraan)
--   delivery_stops   : per sekolah (porsi_planned, porsi_delivered, foto, sign, waktu)
--   RPC daily_delivery_summary, delivery_generate_for_date
-- =============================================================================

create type public.delivery_status as enum (
  'planned','dispatched','delivered','partial','cancelled'
);

create table if not exists public.deliveries (
  no text primary key,                              -- 'DLV-2026-04-18-01'
  delivery_date date not null,
  menu_id smallint references public.menus(id),
  driver_name text,
  vehicle text,
  dispatched_at timestamptz,
  completed_at timestamptz,
  status public.delivery_status not null default 'planned',
  total_porsi_planned int not null default 0,
  total_porsi_delivered int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create index if not exists idx_deliveries_date on public.deliveries(delivery_date desc);
create index if not exists idx_deliveries_status on public.deliveries(status)
  where status in ('planned','dispatched');

drop trigger if exists trg_deliveries_touch on public.deliveries;
create trigger trg_deliveries_touch
  before update on public.deliveries
  for each row execute function public.touch_updated_at();

alter table public.deliveries enable row level security;

drop policy if exists "deliveries: staff read" on public.deliveries;
create policy "deliveries: staff read" on public.deliveries
  for select using (
    auth.uid() is not null and public.current_role() in
      ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "deliveries: op/admin write" on public.deliveries;
create policy "deliveries: op/admin write" on public.deliveries
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- -----------------------------------------------------------------------------
create table if not exists public.delivery_stops (
  id bigserial primary key,
  delivery_no text not null references public.deliveries(no) on delete cascade,
  stop_order smallint not null,
  school_id text not null references public.schools(id),
  porsi_planned int not null default 0,
  porsi_delivered int not null default 0 check (porsi_delivered >= 0),
  arrival_at timestamptz,
  temperature_c numeric(4,1),                       -- suhu saat tiba
  receiver_name text,
  signature_url text,                               -- storage path PNG tanda tangan
  photo_url text,                                   -- foto serah-terima
  note text,
  status public.delivery_status not null default 'planned',
  created_at timestamptz not null default now(),
  unique (delivery_no, school_id)
);
create index if not exists idx_stop_delivery on public.delivery_stops(delivery_no);
create index if not exists idx_stop_school_date on public.delivery_stops(school_id);

alter table public.delivery_stops enable row level security;

drop policy if exists "stops: staff read" on public.delivery_stops;
create policy "stops: staff read" on public.delivery_stops
  for select using (
    auth.uid() is not null and public.current_role() in
      ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "stops: op/admin write" on public.delivery_stops;
create policy "stops: op/admin write" on public.delivery_stops
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- -----------------------------------------------------------------------------
-- Trigger: roll-up total porsi dari delivery_stops ke deliveries
-- -----------------------------------------------------------------------------
create or replace function public.delivery_recalc_totals()
returns trigger language plpgsql as $$
declare
  v_no text;
  v_planned int;
  v_delivered int;
  v_stops_done int;
  v_stops_total int;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  v_no := coalesce(new.delivery_no, old.delivery_no);

  select coalesce(sum(porsi_planned), 0),
         coalesce(sum(porsi_delivered), 0),
         count(*) filter (where status = 'delivered'),
         count(*)
    into v_planned, v_delivered, v_stops_done, v_stops_total
    from public.delivery_stops
   where delivery_no = v_no;

  update public.deliveries
     set total_porsi_planned = v_planned,
         total_porsi_delivered = v_delivered,
         status = case
           when v_stops_total = 0 then status
           when v_stops_done = v_stops_total then 'delivered'
           when v_stops_done > 0 then 'partial'
           else status
         end,
         completed_at = case
           when v_stops_done = v_stops_total and v_stops_total > 0 then now()
           else completed_at
         end
   where no = v_no;
  return null;
end; $$;

drop trigger if exists trg_stop_recalc on public.delivery_stops;
create trigger trg_stop_recalc
  after insert or update or delete on public.delivery_stops
  for each row execute function public.delivery_recalc_totals();

-- -----------------------------------------------------------------------------
-- RPC · generate delivery plan untuk tanggal (iterate schools × attendance)
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

  -- Sudah ada untuk tanggal ini?
  select count(*) into v_existing
    from public.deliveries where delivery_date = p_date;
  if v_existing > 0 then
    select no into v_no from public.deliveries
      where delivery_date = p_date order by created_at limit 1;
    return v_no;  -- idempotent: kembali yang ada
  end if;

  select menu_id into v_menu_id from public.menu_assign where assign_date = p_date;

  v_no := 'DLV-' || to_char(p_date, 'YYYY-MM-DD') || '-01';

  insert into public.deliveries(no, delivery_date, menu_id, status, created_by)
  values (v_no, p_date, v_menu_id, 'planned', auth.uid());

  -- Ambil school_attendance qty untuk tanggal; fallback ke schools.students
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
      delivery_no, stop_order, school_id, porsi_planned, status
    ) values (
      v_no, v_order, r.school_id, r.porsi::int, 'planned'
    );
    v_order := v_order + 1;
  end loop;

  return v_no;
end; $$;

grant execute on function public.delivery_generate_for_date(date) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC · daily_delivery_summary (untuk dashboard)
-- -----------------------------------------------------------------------------
create or replace function public.daily_delivery_summary(
  p_from date default (current_date - interval '30 days')::date,
  p_to date default current_date
)
returns table (
  delivery_date date,
  delivery_no text,
  status text,
  stops_total int,
  stops_delivered int,
  porsi_planned int,
  porsi_delivered int,
  fulfilment_pct numeric
)
language sql stable as $$
  select
    d.delivery_date,
    d.no,
    d.status::text,
    count(ds.id)::int as stops_total,
    count(ds.id) filter (where ds.status = 'delivered')::int as stops_delivered,
    d.total_porsi_planned,
    d.total_porsi_delivered,
    case when d.total_porsi_planned > 0
         then round(d.total_porsi_delivered::numeric * 100
                    / d.total_porsi_planned, 1)
         else null end as fulfilment_pct
  from public.deliveries d
  left join public.delivery_stops ds on ds.delivery_no = d.no
  where d.delivery_date between p_from and p_to
  group by d.delivery_date, d.no, d.status,
           d.total_porsi_planned, d.total_porsi_delivered
  order by d.delivery_date desc, d.no;
$$;

grant execute on function public.daily_delivery_summary(date, date) to authenticated;

-- =============================================================================
-- END 0033
-- =============================================================================
