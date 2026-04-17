-- ============================================================================
-- 0013 · BOM Variance (plan vs actual)
-- Bandingkan kebutuhan bahan baku RENCANA (dari BOM × porsi tiered) vs
-- REALISASI (dari GRN receipts via stock_moves) dalam periode tertentu.
-- Threshold default ±10% → flag OVER/UNDER/OK.
-- ============================================================================

-- ---------- bom_variance(p_start, p_end) --------------------------------------
-- Per item: plan (kg), actual (kg), variance, % , flag.
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
  -- Plan: iterate setiap hari dalam periode, hitung kebutuhan tiered.
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
    left join public.menu_assign ma on ma.op_date = dc.op_date
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
  -- Actual: GRN yg status ok/partial dalam periode, via po_rows → item.
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

-- ---------- bom_variance_summary(p_start, p_end) ------------------------------
-- KPI kompak utk header card.
create or replace function public.bom_variance_summary(
  p_start date,
  p_end   date,
  p_threshold_pct numeric default 10.0
)
returns table(
  total_items int,
  over_cnt int,
  under_cnt int,
  ok_cnt int,
  total_plan_kg numeric,
  total_actual_kg numeric,
  total_variance_kg numeric,
  total_variance_pct numeric
) language plpgsql stable as $$
begin
  return query
  with v as (
    select * from public.bom_variance(p_start, p_end, p_threshold_pct)
  )
  select
    count(*)::int,
    count(*) filter (where flag = 'OVER')::int,
    count(*) filter (where flag = 'UNDER')::int,
    count(*) filter (where flag = 'OK')::int,
    sum(plan_kg)::numeric(14,3),
    sum(actual_kg)::numeric(14,3),
    (sum(actual_kg) - sum(plan_kg))::numeric(14,3),
    case
      when sum(plan_kg) <= 0 then null
      else ((sum(actual_kg) - sum(plan_kg)) / sum(plan_kg) * 100.0)::numeric(7,2)
    end
  from v;
end; $$;

-- ---------- bom_variance_by_menu(p_start, p_end) -----------------------------
-- Per menu: total plan kg & breakdown cost (pakai items.price_idr fallback).
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
    left join public.menu_assign ma on ma.op_date = dc.op_date
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

-- ---------- Grants -----------------------------------------------------------
grant execute on function public.bom_variance(date, date, numeric) to anon, authenticated;
grant execute on function public.bom_variance_summary(date, date, numeric) to anon, authenticated;
grant execute on function public.bom_variance_by_menu(date, date) to anon, authenticated;
