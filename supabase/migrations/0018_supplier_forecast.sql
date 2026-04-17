-- =============================================================================
-- 0018 · Supplier 90-day Forecast (limited-access portal)
-- -----------------------------------------------------------------------------
-- Kebutuhan: supplier boleh lihat forecast kebutuhan per komoditas sampai 3
-- bulan ke depan, tapi HANYA untuk item yang dia jual (supplier_items),
-- dan tanpa bocor harga/supplier lain.
--
-- Sumber data tanggal:
--   1. custom_menus(menu_date)    → flatten (source='custom')
--   2. menu_assign(assign_date)   → BOM menu (source='assigned')
--   3. fallback → cycle rotation dari settings.go_live_date + active_cycle_days
--      (source='cycle')
--
-- Weekend & non_op_days → skip.
-- =============================================================================

-- Projected requirement untuk tanggal apapun (pakai cycle fallback)
create or replace function public.requirement_for_date_projected(p_date date)
returns table(
  item_code text,
  qty numeric,
  unit text,
  category public.item_category,
  source text  -- 'assigned' | 'cycle' | 'custom'
)
language plpgsql stable as $$
declare
  v_menu smallint;
  v_source text := 'assigned';
  v_tier record;
  v_cycle_days int;
  v_go_live date;
  v_cycle_day int;
  v_offset int;
begin
  -- Weekend skip
  if extract(dow from p_date) in (0,6) then return; end if;
  -- Non-op skip
  if exists (select 1 from public.non_op_days where op_date = p_date) then return; end if;

  -- Custom menu (flat 100g/porsi per item)
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
          'custom'::text as source
        from public.custom_menus cm,
             jsonb_array_elements_text(cm.karbo || cm.protein || cm.sayur || cm.buah) as elem(val)
             join public.items it on it.code = elem.val
        where cm.menu_date = p_date;
      return;
    end;
  end if;

  -- Assigned?
  select menu_id into v_menu from public.menu_assign where assign_date = p_date;

  if v_menu is null then
    -- Cycle fallback
    select nullif(trim(both '"' from value::text), '')::int
      into v_cycle_days
      from public.settings where key = 'active_cycle_days';
    select nullif(trim(both '"' from value::text), '')::date
      into v_go_live
      from public.settings where key = 'go_live_date';

    v_cycle_days := coalesce(v_cycle_days, 14);
    v_go_live    := coalesce(v_go_live, date '2026-05-04');

    v_offset := (p_date - v_go_live)::int;
    -- Python-style positive modulo untuk handle date < go_live
    v_cycle_day := ((v_offset % v_cycle_days) + v_cycle_days) % v_cycle_days + 1;

    select id into v_menu
      from public.menus
      where cycle_day = v_cycle_day and active = true
      order by id
      limit 1;

    if v_menu is null then return; end if;
    v_source := 'cycle';
  end if;

  -- Porsi tiered
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
      v_source as source
    from public.menu_bom b
    join public.items it on it.code = b.item_code
    where b.menu_id = v_menu;
end; $$;

grant execute on function public.requirement_for_date_projected(date) to authenticated;

-- =============================================================================
-- RPC · supplier_forecast_90d
-- Return daily forecast per item yang ada di supplier_items(supplier_id).
-- Supplier-role: force ke own supplier_id. Staff: bebas (atau fallback ke
-- parameter supplier_id).
-- =============================================================================
create or replace function public.supplier_forecast_90d(
  p_supplier_id text default null,
  p_horizon_days int default 90
)
returns table(
  op_date date,
  item_code text,
  item_name text,
  unit text,
  category public.item_category,
  qty numeric,
  source text
)
language plpgsql stable
security definer
set search_path = public, auth
as $$
declare
  v_sup text;
  v_role public.user_role;
  v_horizon int;
begin
  v_role := public.current_role();
  v_horizon := greatest(1, least(coalesce(p_horizon_days, 90), 180));

  if v_role = 'supplier' then
    v_sup := public.current_supplier_id();
    if v_sup is null then raise exception 'supplier profile incomplete'; end if;
  elsif v_role in ('admin','operator','ahli_gizi','viewer') then
    v_sup := coalesce(p_supplier_id, public.current_supplier_id());
    if v_sup is null then
      raise exception 'supplier_id required';
    end if;
  else
    raise exception 'forbidden';
  end if;

  return query
    select
      (d::date) as op_date,
      r.item_code,
      coalesce(it.name_en, r.item_code) as item_name,
      r.unit,
      r.category,
      round(r.qty, 3) as qty,
      r.source
    from generate_series(
      current_date, current_date + (v_horizon - 1), interval '1 day'
    ) as d
    cross join lateral public.requirement_for_date_projected(d::date) r
    join public.items it on it.code = r.item_code
    where exists (
      select 1 from public.supplier_items si
      where si.supplier_id = v_sup and si.item_code = r.item_code
    )
      and r.qty > 0
    order by d, r.item_code;
end; $$;

grant execute on function public.supplier_forecast_90d(text, int) to authenticated;

-- =============================================================================
-- RPC · supplier_forecast_monthly (agregasi 3 bulan per item)
-- Return: bulan × item → total_qty, dipakai di tab "Monthly"
-- =============================================================================
create or replace function public.supplier_forecast_monthly(
  p_supplier_id text default null,
  p_months int default 3
)
returns table(
  month date,
  item_code text,
  item_name text,
  unit text,
  category public.item_category,
  qty_total numeric,
  days_count int
)
language plpgsql stable
security definer
set search_path = public, auth
as $$
declare
  v_sup text;
  v_role public.user_role;
  v_months int;
  v_horizon int;
begin
  v_role := public.current_role();
  v_months := greatest(1, least(coalesce(p_months, 3), 6));
  v_horizon := v_months * 31;

  if v_role = 'supplier' then
    v_sup := public.current_supplier_id();
    if v_sup is null then raise exception 'supplier profile incomplete'; end if;
  elsif v_role in ('admin','operator','ahli_gizi','viewer') then
    v_sup := coalesce(p_supplier_id, public.current_supplier_id());
    if v_sup is null then raise exception 'supplier_id required'; end if;
  else
    raise exception 'forbidden';
  end if;

  return query
    select
      date_trunc('month', d::date)::date as month,
      r.item_code,
      coalesce(it.name_en, r.item_code) as item_name,
      r.unit,
      r.category,
      round(sum(r.qty), 3) as qty_total,
      count(*)::int as days_count
    from generate_series(
      current_date, current_date + (v_horizon - 1), interval '1 day'
    ) as d
    cross join lateral public.requirement_for_date_projected(d::date) r
    join public.items it on it.code = r.item_code
    where exists (
      select 1 from public.supplier_items si
      where si.supplier_id = v_sup and si.item_code = r.item_code
    )
      and r.qty > 0
      and (date_trunc('month', d::date) < date_trunc('month', current_date)
           + (v_months || ' months')::interval)
    group by date_trunc('month', d::date), r.item_code, it.name_en, r.unit, r.category
    order by date_trunc('month', d::date), r.item_code;
end; $$;

grant execute on function public.supplier_forecast_monthly(text, int) to authenticated;
