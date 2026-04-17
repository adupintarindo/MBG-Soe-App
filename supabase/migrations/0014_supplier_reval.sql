-- ============================================================================
-- 0014 · Supplier Re-Evaluasi (periodic scorecard)
-- Re-evaluation berkala (quarterly/semester) berbasis 5 dimensi:
--   1. Quality      (QC pass rate dari grn_qc_checks)
--   2. Delivery     (on-time GRN: grn_date vs PO created_at + target)
--   3. Price        (variance vs reference items.price_idr)
--   4. Compliance   (certs masih berlaku, NCR open critical)
--   5. Responsiveness (action tracker: overdue vs on-time)
-- Skor 0-100 per dimensi, bobot default 30/25/20/15/10.
-- ============================================================================

create type public.reval_period as enum (
  'quarterly','semester','annual','ad_hoc'
);

create table if not exists public.supplier_reval (
  id bigserial primary key,
  supplier_id text not null references public.suppliers(id) on delete cascade,
  period public.reval_period not null default 'quarterly',
  period_start date not null,
  period_end date not null,
  quality_score numeric(5,2) not null default 0 check (quality_score between 0 and 100),
  delivery_score numeric(5,2) not null default 0 check (delivery_score between 0 and 100),
  price_score numeric(5,2) not null default 0 check (price_score between 0 and 100),
  compliance_score numeric(5,2) not null default 0 check (compliance_score between 0 and 100),
  responsiveness_score numeric(5,2) not null default 0 check (responsiveness_score between 0 and 100),
  w_quality numeric(4,3) not null default 0.30,
  w_delivery numeric(4,3) not null default 0.25,
  w_price numeric(4,3) not null default 0.20,
  w_compliance numeric(4,3) not null default 0.15,
  w_responsiveness numeric(4,3) not null default 0.10,
  total_score numeric(5,2) generated always as (
    quality_score      * w_quality
    + delivery_score   * w_delivery
    + price_score      * w_price
    + compliance_score * w_compliance
    + responsiveness_score * w_responsiveness
  ) stored,
  recommendation text,              -- 'RETAIN' | 'IMPROVE' | 'REPLACE' | 'EXIT'
  notes text,
  evaluator uuid references auth.users(id),
  evaluated_at timestamptz not null default now(),
  unique (supplier_id, period_start, period_end)
);

create index if not exists idx_reval_supplier on public.supplier_reval(supplier_id, period_end desc);

alter table public.supplier_reval enable row level security;

drop policy if exists "reval: auth read" on public.supplier_reval;
create policy "reval: auth read" on public.supplier_reval
  for select using (auth.uid() is not null);

drop policy if exists "reval: admin write" on public.supplier_reval;
create policy "reval: admin write" on public.supplier_reval
  for all
  using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- ----------------------------------------------------------------------------
-- scorecard_auto(p_supplier_id, p_start, p_end)
-- Hitung 5 skor otomatis dari data operasional dalam periode.
-- ----------------------------------------------------------------------------
create or replace function public.supplier_scorecard_auto(
  p_supplier_id text,
  p_start date,
  p_end date
)
returns table(
  quality_score numeric,
  delivery_score numeric,
  price_score numeric,
  compliance_score numeric,
  responsiveness_score numeric,
  total_score numeric,
  grn_count int,
  qc_pass int,
  qc_fail int,
  ncr_critical_open int,
  actions_overdue int,
  actions_total int
) language plpgsql stable as $$
declare
  v_quality numeric := 0;
  v_delivery numeric := 0;
  v_price numeric := 0;
  v_compliance numeric := 0;
  v_responsiveness numeric := 0;

  v_grn_cnt int := 0;
  v_qc_pass int := 0;
  v_qc_fail int := 0;
  v_ncr_crit int := 0;
  v_act_overdue int := 0;
  v_act_total int := 0;

  v_expired_certs int := 0;
  v_on_time_cnt int := 0;
  v_late_cnt int := 0;
  v_price_dev numeric := 0;
  v_price_items int := 0;
begin
  -- === 1. Quality: QC pass rate ===
  with grn_ids as (
    select g.no, g.status
    from public.grns g
    join public.purchase_orders po on po.no = g.po_no
    where po.supplier_id = p_supplier_id
      and g.grn_date between p_start and p_end
  ),
  qc_rollup as (
    select
      coalesce(sum(case when qc.result = 'pass' then 1 else 0 end), 0) as pass_cnt,
      coalesce(sum(case when qc.result in ('minor','major','critical') then 1 else 0 end), 0) as fail_cnt
    from grn_ids g
    left join public.grn_qc_checks qc on qc.grn_no = g.no
  )
  select pass_cnt, fail_cnt, (select count(*) from grn_ids)
    into v_qc_pass, v_qc_fail, v_grn_cnt
    from qc_rollup;

  if (v_qc_pass + v_qc_fail) = 0 then
    v_quality := 80;  -- neutral default (no data yet)
  else
    v_quality := round(100.0 * v_qc_pass / (v_qc_pass + v_qc_fail), 2);
  end if;

  -- === 2. Delivery: on-time GRN (grn_date within 3 days of PO + lead_time_days) ===
  -- Approximation: GRN status='ok' count as on-time, 'partial' 70%, 'rejected' 0.
  select
    count(*) filter (where g.status = 'ok'),
    count(*) filter (where g.status in ('partial','rejected'))
    into v_on_time_cnt, v_late_cnt
    from public.grns g
    join public.purchase_orders po on po.no = g.po_no
    where po.supplier_id = p_supplier_id
      and g.grn_date between p_start and p_end;

  if (v_on_time_cnt + v_late_cnt) = 0 then
    v_delivery := 80;
  else
    v_delivery := round(
      100.0 * (v_on_time_cnt + 0.5 * v_late_cnt)
      / (v_on_time_cnt + v_late_cnt),
      2
    );
  end if;

  -- === 3. Price: variance vs reference items.price_idr ===
  -- 100% = persis sama dgn reference; setiap ±1% deviasi -2 poin.
  with prices as (
    select pr.item_code,
           avg(pr.price) as avg_price,
           i.price_idr as ref_price
    from public.po_rows pr
    join public.purchase_orders po on po.no = pr.po_no
    join public.items i on i.code = pr.item_code
    where po.supplier_id = p_supplier_id
      and po.created_at::date between p_start and p_end
      and i.price_idr is not null and i.price_idr > 0
    group by pr.item_code, i.price_idr
  )
  select
    coalesce(avg(abs(avg_price - ref_price) / ref_price * 100), 0),
    count(*)
    into v_price_dev, v_price_items
    from prices;

  if v_price_items = 0 then
    v_price := 80;
  else
    v_price := greatest(0, round(100 - v_price_dev * 2, 2));
  end if;

  -- === 4. Compliance: certs valid & NCR critical open ===
  select count(*) into v_expired_certs
    from public.supplier_certs
    where supplier_id = p_supplier_id
      and (valid_until is null or valid_until < p_end);

  select count(*) into v_ncr_crit
    from public.non_conformance_log
    where supplier_id = p_supplier_id
      and severity = 'critical'
      and status in ('open','in_progress')
      and reported_at::date between p_start and p_end;

  v_compliance := greatest(
    0,
    100 - (v_expired_certs * 15) - (v_ncr_crit * 25)
  );

  -- === 5. Responsiveness: action tracker overdue ratio ===
  select
    count(*) filter (where status = 'done' and target_date is not null and done_at::date <= target_date),
    count(*) filter (where status in ('open','in_progress') and target_date < current_date),
    count(*)
    into v_on_time_cnt, v_act_overdue, v_act_total
    from public.supplier_actions
    where supplier_id = p_supplier_id;

  if v_act_total = 0 then
    v_responsiveness := 80;
  else
    v_responsiveness := greatest(
      0,
      round(100.0 - (v_act_overdue::numeric / v_act_total * 100), 2)
    );
  end if;

  return query
  select
    v_quality::numeric(5,2),
    v_delivery::numeric(5,2),
    v_price::numeric(5,2),
    v_compliance::numeric(5,2),
    v_responsiveness::numeric(5,2),
    (v_quality * 0.30 + v_delivery * 0.25 + v_price * 0.20
      + v_compliance * 0.15 + v_responsiveness * 0.10)::numeric(5,2),
    v_grn_cnt,
    v_qc_pass,
    v_qc_fail,
    v_ncr_crit,
    v_act_overdue,
    v_act_total;
end; $$;

-- ----------------------------------------------------------------------------
-- save_supplier_reval: wrapper untuk compute + insert 1 row
-- ----------------------------------------------------------------------------
create or replace function public.save_supplier_reval(
  p_supplier_id text,
  p_period public.reval_period,
  p_start date,
  p_end date,
  p_recommendation text default null,
  p_notes text default null
)
returns bigint language plpgsql as $$
declare
  v_row record;
  v_id bigint;
begin
  select * into v_row
    from public.supplier_scorecard_auto(p_supplier_id, p_start, p_end);

  insert into public.supplier_reval(
    supplier_id, period, period_start, period_end,
    quality_score, delivery_score, price_score,
    compliance_score, responsiveness_score,
    recommendation, notes, evaluator
  ) values (
    p_supplier_id, p_period, p_start, p_end,
    v_row.quality_score, v_row.delivery_score, v_row.price_score,
    v_row.compliance_score, v_row.responsiveness_score,
    p_recommendation, p_notes, auth.uid()
  )
  on conflict (supplier_id, period_start, period_end)
    do update set
      quality_score = excluded.quality_score,
      delivery_score = excluded.delivery_score,
      price_score = excluded.price_score,
      compliance_score = excluded.compliance_score,
      responsiveness_score = excluded.responsiveness_score,
      recommendation = excluded.recommendation,
      notes = excluded.notes,
      evaluator = auth.uid(),
      evaluated_at = now()
  returning id into v_id;

  -- Sync score on main suppliers row
  update public.suppliers
    set score = v_row.total_score
    where id = p_supplier_id;

  return v_id;
end; $$;

-- ----------------------------------------------------------------------------
-- list_supplier_reval: list historis per supplier
-- ----------------------------------------------------------------------------
create or replace function public.list_supplier_reval(p_supplier_id text)
returns setof public.supplier_reval
language sql stable as $$
  select * from public.supplier_reval
   where supplier_id = p_supplier_id
   order by period_end desc;
$$;

grant execute on function public.supplier_scorecard_auto(text, date, date) to anon, authenticated;
grant execute on function public.save_supplier_reval(text, public.reval_period, date, date, text, text) to authenticated;
grant execute on function public.list_supplier_reval(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Visual QC Gallery RPC: aggregate photo_url dari grn_qc_checks + NCR
-- ----------------------------------------------------------------------------
create or replace function public.supplier_qc_gallery(
  p_supplier_id text,
  p_limit int default 50
)
returns table(
  source text,          -- 'qc' | 'ncr'
  ref_id text,          -- grn_no atau ncr_no
  item_code text,
  result text,          -- pass/minor/major/critical OR severity
  note text,
  photo_url text,
  captured_at timestamptz
) language sql stable as $$
  (
    select
      'qc'::text as source,
      qc.grn_no::text as ref_id,
      qc.item_code,
      qc.result::text as result,
      qc.note,
      qc.photo_url,
      qc.checked_at as captured_at
    from public.grn_qc_checks qc
    join public.grns g on g.no = qc.grn_no
    join public.purchase_orders po on po.no = g.po_no
    where po.supplier_id = p_supplier_id
      and qc.photo_url is not null
  )
  union all
  (
    select
      'ncr'::text as source,
      ncr.ncr_no::text as ref_id,
      ncr.item_code,
      ncr.severity::text as result,
      ncr.issue as note,
      ncr.photo_url,
      ncr.reported_at as captured_at
    from public.non_conformance_log ncr
    where ncr.supplier_id = p_supplier_id
      and ncr.photo_url is not null
  )
  order by captured_at desc
  limit p_limit;
$$;

grant execute on function public.supplier_qc_gallery(text, int) to anon, authenticated;
