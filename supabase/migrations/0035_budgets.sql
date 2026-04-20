-- =============================================================================
-- 0035 · Budgets + cost-per-portion tracker
-- -----------------------------------------------------------------------------
-- Masalah: alokasi bulanan dari dinas/WFP/IFSR tidak tercatat di DB. Tidak
-- ada burn-rate dashboard, tidak ada unit cost per porsi (realized vs target).
--
-- Desain:
--   budgets(period, source, amount_idr, allocation_json, target_cost_per_portion)
--   RPC budget_burn(period) → realized spend vs budget
--   RPC cost_per_portion_daily(from, to) → Σspend / Σporsi per hari
-- =============================================================================

create table if not exists public.budgets (
  id bigserial primary key,
  period text not null,                           -- 'YYYY-MM' atau 'YYYY-Q1'
  source public.cash_source not null,
  source_name text,
  amount_idr numeric(14,2) not null check (amount_idr >= 0),
  allocation jsonb not null default '{}'::jsonb,  -- {"pangan": 0.7, "ops": 0.2, "admin": 0.1}
  target_cost_per_portion numeric(10,2),          -- mis. 15000
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (period, source)
);
create index if not exists idx_budgets_period on public.budgets(period);

drop trigger if exists trg_budgets_touch on public.budgets;
create trigger trg_budgets_touch
  before update on public.budgets
  for each row execute function public.touch_updated_at();

alter table public.budgets enable row level security;

drop policy if exists "budgets: staff read" on public.budgets;
create policy "budgets: staff read" on public.budgets
  for select using (
    auth.uid() is not null and public.current_role() in
      ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "budgets: admin write" on public.budgets;
create policy "budgets: admin write" on public.budgets
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- -----------------------------------------------------------------------------
-- RPC · budget_burn per period (bulan)
-- -----------------------------------------------------------------------------
create or replace function public.budget_burn(
  p_from text default to_char(current_date - interval '6 months', 'YYYY-MM'),
  p_to text default to_char(current_date, 'YYYY-MM')
)
returns table (
  period text,
  budget_total numeric,
  spent_po numeric,                               -- total PO pada bulan itu
  spent_invoice numeric,                          -- total invoice
  spent_paid numeric,                             -- total payment out
  burn_pct numeric,                               -- paid / budget * 100
  remaining numeric
)
language sql stable as $$
  with months as (
    select distinct period
      from (
        select period from public.budgets where period between p_from and p_to
        union
        select to_char(gs, 'YYYY-MM') as period
          from generate_series(
            to_date(p_from || '-01','YYYY-MM-DD'),
            to_date(p_to || '-01','YYYY-MM-DD'),
            interval '1 month'
          ) gs
      ) u
  ),
  b as (
    select period, sum(amount_idr) as budget_total
      from public.budgets
     where period between p_from and p_to
     group by period
  ),
  po as (
    select to_char(po_date, 'YYYY-MM') as period, sum(total) as spent_po
      from public.purchase_orders
     where status <> 'cancelled'
       and po_date >= to_date(p_from || '-01','YYYY-MM-DD')
     group by to_char(po_date, 'YYYY-MM')
  ),
  inv as (
    select to_char(inv_date, 'YYYY-MM') as period, sum(total) as spent_invoice
      from public.invoices
     where status <> 'cancelled'
       and inv_date >= to_date(p_from || '-01','YYYY-MM-DD')
     group by to_char(inv_date, 'YYYY-MM')
  ),
  pay as (
    select to_char(pay_date, 'YYYY-MM') as period, sum(amount) as spent_paid
      from public.payments
     where pay_date >= to_date(p_from || '-01','YYYY-MM-DD')
     group by to_char(pay_date, 'YYYY-MM')
  )
  select
    m.period,
    coalesce(b.budget_total, 0),
    coalesce(po.spent_po, 0),
    coalesce(inv.spent_invoice, 0),
    coalesce(pay.spent_paid, 0),
    case when coalesce(b.budget_total, 0) > 0
         then round(coalesce(pay.spent_paid, 0) * 100
                    / b.budget_total, 2)
         else null end,
    coalesce(b.budget_total, 0) - coalesce(pay.spent_paid, 0)
  from months m
  left join b   on b.period   = m.period
  left join po  on po.period  = m.period
  left join inv on inv.period = m.period
  left join pay on pay.period = m.period
  order by m.period;
$$;

grant execute on function public.budget_burn(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC · cost_per_portion_daily — realized total invoice ÷ total porsi delivered
-- -----------------------------------------------------------------------------
create or replace function public.cost_per_portion_daily(
  p_from date default (current_date - interval '30 days')::date,
  p_to date default current_date
)
returns table (
  op_date date,
  total_porsi int,
  spent_po numeric,                               -- po value pada tanggal itu (approx bahan baku)
  cost_per_portion numeric,
  target numeric
)
language sql stable as $$
  with target as (
    select max(target_cost_per_portion) as target
      from public.budgets
     where target_cost_per_portion is not null
  ),
  porsi as (
    -- prefer delivery actual, fallback ke porsi_counts (planned)
    select d.delivery_date as op_date, sum(d.total_porsi_delivered) as porsi
      from public.deliveries d
     where d.delivery_date between p_from and p_to
       and d.status in ('delivered','partial')
     group by d.delivery_date
  ),
  -- PO dibandingkan bukan invoice karena invoice bisa beda tanggal
  po_daily as (
    select po_date as op_date, sum(total) as spent_po
      from public.purchase_orders
     where po_date between p_from and p_to
       and status <> 'cancelled'
     group by po_date
  ),
  dates as (
    select gs::date as op_date
      from generate_series(p_from, p_to, interval '1 day') gs
  )
  select
    d.op_date,
    coalesce(p.porsi, 0)::int                    as total_porsi,
    coalesce(pd.spent_po, 0)                     as spent_po,
    case when coalesce(p.porsi, 0) > 0
         then round(coalesce(pd.spent_po, 0) / p.porsi, 2)
         else null end                           as cost_per_portion,
    (select target from target)                  as target
  from dates d
  left join porsi    p  on p.op_date  = d.op_date
  left join po_daily pd on pd.op_date = d.op_date
  order by d.op_date;
$$;

grant execute on function public.cost_per_portion_daily(date, date) to authenticated;

-- =============================================================================
-- END 0035
-- =============================================================================
