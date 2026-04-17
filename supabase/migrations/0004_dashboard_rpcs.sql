-- ============================================================================
-- Dashboard RPCs · Rich overview untuk /dashboard page
-- Port dari mockup HTML (Volume 4-Bulan, Top Supplier, 10-Hari Planning)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- monthly_requirements(p_start date, p_months int)
-- Return agregat kebutuhan bahan per bulan untuk horizon N bulan ke depan.
-- Loop hari operasional (weekday & bukan non_op_day), join menu_assign × menu_bom,
-- scale dengan porsi_effective per tanggal, kelompokkan per (item, bulan).
-- ----------------------------------------------------------------------------
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
      public.porsi_effective(o.op_date) as porsi
    from ops o
    join public.menu_assign ma on ma.assign_date = o.op_date
  )
  select
    b.item_code,
    d.month,
    round(sum(b.grams_per_porsi * d.porsi) / 1000.0, 3) as qty_kg
  from daily d
  join public.menu_bom b on b.menu_id = d.menu_id
  where d.porsi > 0
  group by b.item_code, d.month
  order by d.month, qty_kg desc;
end; $$;

-- ----------------------------------------------------------------------------
-- top_suppliers_by_spend(p_start date, p_end date, p_limit int)
-- Return top supplier berdasarkan total nilai invoice dalam rentang tanggal.
-- ----------------------------------------------------------------------------
create or replace function public.top_suppliers_by_spend(
  p_start date,
  p_end date,
  p_limit int default 10
)
returns table(
  supplier_id text,
  supplier_name text,
  supplier_type public.supplier_type,
  total_spend numeric,
  invoice_count int
)
language sql stable as $$
  select
    s.id as supplier_id,
    s.name as supplier_name,
    s.type as supplier_type,
    coalesce(sum(i.total), 0) as total_spend,
    count(i.no)::int as invoice_count
  from public.suppliers s
  left join public.invoices i
    on i.supplier_id = s.id
   and i.inv_date between p_start and p_end
   and i.status <> 'cancelled'
  where s.active = true
  group by s.id, s.name, s.type
  having coalesce(sum(i.total), 0) > 0
  order by total_spend desc
  limit greatest(p_limit, 1);
$$;

-- ----------------------------------------------------------------------------
-- daily_planning(p_horizon int)
-- Return ringkasan planning untuk N hari ke depan (termasuk hari ini):
--   tanggal, menu_id, menu_name, porsi_total, porsi_effective, total_kg_required,
--   status operasional, jumlah item short.
-- ----------------------------------------------------------------------------
create or replace function public.daily_planning(p_horizon int default 10)
returns table(
  op_date date,
  menu_id smallint,
  menu_name text,
  porsi_total int,
  porsi_eff numeric,
  total_kg numeric,
  short_items int,
  operasional boolean
)
language plpgsql stable as $$
declare
  d date;
  i int := 0;
  v_cnt record;
  v_menu smallint;
  v_menu_name text;
  v_eff numeric;
  v_kg numeric;
  v_short int;
  v_op boolean;
begin
  d := current_date;
  while i < greatest(p_horizon, 1) loop
    -- porsi counts & operasional
    select kecil, besar, guru, operasional
      into v_cnt
      from public.porsi_counts(d);

    v_op := coalesce(v_cnt.operasional, false);
    v_eff := public.porsi_effective(d);

    -- menu for date
    select menu_id into v_menu from public.menu_assign where assign_date = d;
    if v_menu is not null then
      select name into v_menu_name from public.menus where id = v_menu;
    else
      v_menu_name := null;
    end if;

    -- total kg req
    select coalesce(sum(qty), 0) into v_kg
      from public.requirement_for_date(d);

    -- short items count
    select coalesce(count(*) filter (where gap > 0), 0)::int into v_short
      from public.stock_shortage_for_date(d);

    return query select
      d,
      v_menu,
      v_menu_name,
      coalesce(v_cnt.kecil, 0) + coalesce(v_cnt.besar, 0) + coalesce(v_cnt.guru, 0),
      v_eff,
      v_kg,
      v_short,
      v_op;

    d := d + 1;
    i := i + 1;
  end loop;
end; $$;

-- ----------------------------------------------------------------------------
-- dashboard_kpis()
-- Ringkasan KPI 4 angka untuk tile teratas dashboard: siswa aktif, sekolah,
-- menu hari ini, supplier aktif. Satu call saja.
-- ----------------------------------------------------------------------------
create or replace function public.dashboard_kpis()
returns table(
  students_total int,
  schools_active int,
  menu_today_id smallint,
  menu_today_name text,
  suppliers_active int
)
language sql stable as $$
  select
    coalesce((select sum(students)::int from public.schools where active = true), 0),
    coalesce((select count(*)::int from public.schools where active = true), 0),
    (select ma.menu_id from public.menu_assign ma where ma.assign_date = current_date limit 1),
    (select m.name from public.menu_assign ma
       join public.menus m on m.id = ma.menu_id
       where ma.assign_date = current_date limit 1),
    coalesce((select count(*)::int from public.suppliers where active = true), 0);
$$;

-- Grants untuk authenticated user (dibaca semua role kecuali supplier dibatasi
-- oleh RLS di layer data; RPC stable tidak bypass RLS).
grant execute on function public.monthly_requirements(date, int) to authenticated;
grant execute on function public.top_suppliers_by_spend(date, date, int) to authenticated;
grant execute on function public.daily_planning(int) to authenticated;
grant execute on function public.dashboard_kpis() to authenticated;
