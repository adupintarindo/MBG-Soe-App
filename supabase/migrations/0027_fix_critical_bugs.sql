-- =============================================================================
-- 0027 · Fix critical bugs (Prioritas 1 dari DB_REVIEW.md)
-- -----------------------------------------------------------------------------
-- Bug #1  bom_variance / bom_variance_by_menu refer ma.op_date (kolom tidak ada)
--         Fix: ganti ke ma.assign_date
-- Bug #2  log_sop_run SELECT profiles WHERE user_id (kolom tidak ada)
--         Fix: ganti ke WHERE id
-- Bug #3  Duplicate updated_at trigger function
--         tg_touch_updated_at (0017) identical dengan touch_updated_at (0001).
--         Fix: point trigger 0017 ke touch_updated_at, drop tg_touch_updated_at.
--
-- Idempoten: CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS, DROP FUNCTION
-- IF EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bug #1 · bom_variance
-- -----------------------------------------------------------------------------
create or replace function public.bom_variance(
  p_start date,
  p_end   date,
  p_threshold_pct numeric default 10.0
)
returns table(
  item_code text,
  name_en text,
  unit text,
  category public.item_category,
  plan_kg numeric,
  actual_kg numeric,
  variance_kg numeric,
  variance_pct numeric,
  flag text
) language plpgsql stable as $$
begin
  return query
  with
  dates as (
    select d::date as op_date
    from generate_series(p_start, p_end, interval '1 day') as d
  ),
  day_counts as (
    select d.op_date,
           (public.porsi_counts_tiered(d.op_date)).*
    from dates d
  ),
  day_menu as (
    select dc.op_date, dc.paud, dc.sd13, dc.sd46, dc.smp_plus, dc.operasional,
           ma.menu_id
    from day_counts dc
    left join public.menu_assign ma on ma.assign_date = dc.op_date
    where dc.operasional = true
  ),
  plan_per_item as (
    select
      b.item_code,
      sum(
        case
          when (coalesce(b.grams_paud,0) + coalesce(b.grams_sd13,0)
              + coalesce(b.grams_sd46,0) + coalesce(b.grams_smp,0)) > 0 then
            ( coalesce(b.grams_paud,0)*dm.paud
            + coalesce(b.grams_sd13,0)*dm.sd13
            + coalesce(b.grams_sd46,0)*dm.sd46
            + coalesce(b.grams_smp,0)*dm.smp_plus
            ) / 1000.0
          else
            coalesce(b.grams_per_porsi,0)
              * (dm.paud + dm.sd13 + dm.sd46 + dm.smp_plus) / 1000.0
        end
      ) as plan_kg
    from day_menu dm
    join public.menu_bom b on b.menu_id = dm.menu_id
    group by b.item_code
  ),
  actual_per_item as (
    select pr.item_code,
           sum(pr.qty) as actual_kg
    from public.grns g
    join public.po_rows pr on pr.po_no = g.po_no
    where g.grn_date between p_start and p_end
      and g.status in ('ok','partial')
    group by pr.item_code
  )
  select
    i.code as item_code,
    i.name_en,
    i.unit,
    i.category,
    coalesce(p.plan_kg,   0)::numeric(14,3) as plan_kg,
    coalesce(a.actual_kg, 0)::numeric(14,3) as actual_kg,
    (coalesce(a.actual_kg,0) - coalesce(p.plan_kg,0))::numeric(14,3) as variance_kg,
    case
      when coalesce(p.plan_kg,0) <= 0 then null
      else ((coalesce(a.actual_kg,0) - p.plan_kg) / p.plan_kg * 100.0)::numeric(7,2)
    end as variance_pct,
    case
      when coalesce(p.plan_kg,0) <= 0 and coalesce(a.actual_kg,0) > 0 then 'OVER'
      when coalesce(p.plan_kg,0) <= 0 and coalesce(a.actual_kg,0) = 0 then 'OK'
      when abs((coalesce(a.actual_kg,0) - p.plan_kg) / nullif(p.plan_kg,0) * 100.0)
           <= p_threshold_pct then 'OK'
      when (coalesce(a.actual_kg,0) - p.plan_kg) > 0 then 'OVER'
      else 'UNDER'
    end as flag
  from public.items i
  left join plan_per_item   p on p.item_code = i.code
  left join actual_per_item a on a.item_code = i.code
  where coalesce(p.plan_kg,0) > 0 or coalesce(a.actual_kg,0) > 0
  order by
    case
      when coalesce(p.plan_kg,0) <= 0 then 3
      when abs((coalesce(a.actual_kg,0) - p.plan_kg) / nullif(p.plan_kg,0) * 100.0)
           > p_threshold_pct then 1
      else 2
    end,
    i.code;
end; $$;

create or replace function public.bom_variance_by_menu(
  p_start date,
  p_end   date
)
returns table(
  menu_id int,
  menu_name text,
  days_served int,
  plan_porsi int,
  plan_kg_total numeric,
  plan_cost_idr numeric
) language plpgsql stable as $$
begin
  return query
  with
  dates as (
    select d::date as op_date
    from generate_series(p_start, p_end, interval '1 day') as d
  ),
  day_counts as (
    select d.op_date,
           (public.porsi_counts_tiered(d.op_date)).*
    from dates d
  ),
  day_menu as (
    select dc.op_date, dc.paud, dc.sd13, dc.sd46, dc.smp_plus,
           dc.total as porsi_total, dc.operasional,
           ma.menu_id
    from day_counts dc
    left join public.menu_assign ma on ma.assign_date = dc.op_date
    where dc.operasional = true
      and ma.menu_id is not null
  ),
  per_menu_day as (
    select dm.menu_id, dm.op_date, dm.porsi_total,
      sum(
        case
          when (coalesce(b.grams_paud,0) + coalesce(b.grams_sd13,0)
              + coalesce(b.grams_sd46,0) + coalesce(b.grams_smp,0)) > 0 then
            ( coalesce(b.grams_paud,0)*dm.paud
            + coalesce(b.grams_sd13,0)*dm.sd13
            + coalesce(b.grams_sd46,0)*dm.sd46
            + coalesce(b.grams_smp,0)*dm.smp_plus
            ) / 1000.0
          else
            coalesce(b.grams_per_porsi,0)
              * (dm.paud + dm.sd13 + dm.sd46 + dm.smp_plus) / 1000.0
        end
      ) as kg_total,
      sum(
        case
          when (coalesce(b.grams_paud,0) + coalesce(b.grams_sd13,0)
              + coalesce(b.grams_sd46,0) + coalesce(b.grams_smp,0)) > 0 then
            ( coalesce(b.grams_paud,0)*dm.paud
            + coalesce(b.grams_sd13,0)*dm.sd13
            + coalesce(b.grams_sd46,0)*dm.sd46
            + coalesce(b.grams_smp,0)*dm.smp_plus
            ) / 1000.0 * coalesce(i.price_idr,0)
          else
            coalesce(b.grams_per_porsi,0)
              * (dm.paud + dm.sd13 + dm.sd46 + dm.smp_plus) / 1000.0
              * coalesce(i.price_idr,0)
        end
      ) as cost_idr
    from day_menu dm
    join public.menu_bom b on b.menu_id = dm.menu_id
    join public.items   i on i.code = b.item_code
    group by dm.menu_id, dm.op_date, dm.porsi_total
  )
  select
    m.id as menu_id,
    m.name as menu_name,
    count(pmd.op_date)::int as days_served,
    coalesce(sum(pmd.porsi_total),0)::int as plan_porsi,
    coalesce(sum(pmd.kg_total),0)::numeric(14,3) as plan_kg_total,
    coalesce(sum(pmd.cost_idr),0)::numeric(16,2) as plan_cost_idr
  from public.menus m
  left join per_menu_day pmd on pmd.menu_id = m.id
  where m.active = true
  group by m.id, m.name
  order by m.id;
end; $$;

-- -----------------------------------------------------------------------------
-- Bug #2 · log_sop_run SELECT profiles salah kolom
-- -----------------------------------------------------------------------------
create or replace function public.log_sop_run(
  p_sop_id        text,
  p_sop_title     text,
  p_sop_category  text,
  p_steps_checked int,
  p_steps_total   int,
  p_risks_flagged text[],
  p_notes         text default null,
  p_run_date      date default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := public.current_role();
  v_id bigint;
  v_eval text;
begin
  if v_role not in ('admin', 'operator', 'ahli_gizi') then
    raise exception 'Hanya admin/operator/ahli_gizi yang boleh mencatat eksekusi SOP.';
  end if;
  if p_sop_id is null or length(trim(p_sop_id)) = 0 then
    raise exception 'sop_id wajib diisi.';
  end if;
  if p_steps_checked > p_steps_total then
    raise exception 'steps_checked (%) tidak boleh melebihi steps_total (%).',
      p_steps_checked, p_steps_total;
  end if;

  select full_name into v_eval
    from public.profiles
    where id = auth.uid();

  insert into public.sop_runs(
    sop_id, sop_title, sop_category,
    run_date, steps_checked, steps_total, risks_flagged, notes,
    evaluator, created_by
  ) values (
    p_sop_id, p_sop_title, p_sop_category,
    coalesce(p_run_date, current_date),
    coalesce(p_steps_checked, 0),
    coalesce(p_steps_total, 0),
    coalesce(p_risks_flagged, '{}'::text[]),
    nullif(trim(coalesce(p_notes, '')), ''),
    v_eval, auth.uid()
  ) returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Bug #3 · Konsolidasi touch_updated_at
--         0001 menciptakan `touch_updated_at()`, 0017 duplikat `tg_touch_updated_at()`.
--         Point trigger 0017 ke versi 0001, drop yg duplikat.
-- -----------------------------------------------------------------------------
drop trigger if exists trg_price_periods_touch   on public.price_periods;
drop trigger if exists trg_supplier_prices_touch on public.supplier_prices;

create trigger trg_price_periods_touch
  before update on public.price_periods
  for each row execute function public.touch_updated_at();

create trigger trg_supplier_prices_touch
  before update on public.supplier_prices
  for each row execute function public.touch_updated_at();

drop function if exists public.tg_touch_updated_at();

-- =============================================================================
-- END 0027
-- =============================================================================
