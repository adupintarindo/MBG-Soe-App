-- =============================================================================
-- 0032 · Payments + cashflow (incoming from donor/dinas, outgoing to supplier)
-- -----------------------------------------------------------------------------
-- Masalah: invoices status 'paid/overdue' flat, tidak ada histori pembayaran,
-- tidak ada DP/termin/split-payment, dan tidak ada pencatatan kas masuk dari
-- dinas/WFP. Operator akan fallback ke Excel.
--
-- Desain:
--   payments       : pembayaran outgoing ke supplier (boleh partial)
--   cash_receipts  : penerimaan incoming dari source (dinas, WFP, donor)
--   trg_payment_update_invoice : auto-update invoice.status saat terbayar penuh
--   RPC monthly_cashflow, payment_summary_by_invoice, outstanding_by_supplier
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. payments (outgoing)
-- -----------------------------------------------------------------------------
create type public.payment_method as enum (
  'transfer','tunai','cek','giro','virtual_account','qris','lainnya'
);

create table if not exists public.payments (
  no text primary key,                          -- 'PAY-2026-001'
  invoice_no text references public.invoices(no) on delete set null,
  supplier_id text references public.suppliers(id) on delete set null,
  pay_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  method public.payment_method not null default 'transfer',
  reference text,                               -- no transfer, no giro, dsb
  bukti_url text,                               -- storage path untuk scan bukti
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_inv on public.payments(invoice_no);
create index if not exists idx_payments_sup on public.payments(supplier_id, pay_date desc);
create index if not exists idx_payments_date on public.payments(pay_date desc);

drop trigger if exists trg_payments_touch on public.payments;
create trigger trg_payments_touch
  before update on public.payments
  for each row execute function public.touch_updated_at();

alter table public.payments enable row level security;

drop policy if exists "payments: staff read" on public.payments;
create policy "payments: staff read" on public.payments
  for select using (
    auth.uid() is not null and public.current_role() in
      ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "payments: supplier read own" on public.payments;
create policy "payments: supplier read own" on public.payments
  for select using (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  );

drop policy if exists "payments: op/admin write" on public.payments;
create policy "payments: op/admin write" on public.payments
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- -----------------------------------------------------------------------------
-- 2. cash_receipts (incoming — dinas/WFP/donor)
-- -----------------------------------------------------------------------------
create type public.cash_source as enum (
  'dinas','wfp','ifsr','ffi','donor_swasta','lainnya'
);

create table if not exists public.cash_receipts (
  no text primary key,                          -- 'CR-2026-001'
  receipt_date date not null,
  source public.cash_source not null,
  source_name text,                             -- 'Dinas Pendidikan TTS'
  amount numeric(14,2) not null check (amount > 0),
  period text,                                  -- '2026-05' utk alokasi bulanan
  reference text,
  bukti_url text,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cash_receipts_date on public.cash_receipts(receipt_date desc);
create index if not exists idx_cash_receipts_period on public.cash_receipts(period);

drop trigger if exists trg_cash_receipts_touch on public.cash_receipts;
create trigger trg_cash_receipts_touch
  before update on public.cash_receipts
  for each row execute function public.touch_updated_at();

alter table public.cash_receipts enable row level security;

drop policy if exists "cash_receipts: staff read" on public.cash_receipts;
create policy "cash_receipts: staff read" on public.cash_receipts
  for select using (
    auth.uid() is not null and public.current_role() in
      ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "cash_receipts: admin write" on public.cash_receipts;
create policy "cash_receipts: admin write" on public.cash_receipts
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- -----------------------------------------------------------------------------
-- 3. Trigger: update invoice.status saat total payment ≥ invoice.total
-- -----------------------------------------------------------------------------
create or replace function public.payment_sync_invoice()
returns trigger language plpgsql as $$
declare
  v_inv text;
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_status public.invoice_status;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  v_inv := coalesce(new.invoice_no, old.invoice_no);
  if v_inv is null then return null; end if;

  select total, status into v_total, v_status
    from public.invoices where no = v_inv;
  if not found then return null; end if;

  select coalesce(sum(amount), 0) into v_paid
    from public.payments where invoice_no = v_inv;

  if v_paid >= v_total and v_status <> 'paid' then
    update public.invoices set status = 'paid' where no = v_inv;
  elsif v_paid = 0 and v_status = 'paid' then
    update public.invoices
       set status = case when due_date is not null and due_date < current_date
                         then 'overdue' else 'issued' end
     where no = v_inv;
  end if;

  return null;
end; $$;

drop trigger if exists trg_payment_sync_invoice on public.payments;
create trigger trg_payment_sync_invoice
  after insert or update or delete on public.payments
  for each row execute function public.payment_sync_invoice();

-- -----------------------------------------------------------------------------
-- 4. RPC · outstanding by supplier (invoice.total − sum(payments))
-- -----------------------------------------------------------------------------
create or replace function public.outstanding_by_supplier()
returns table (
  supplier_id text,
  supplier_name text,
  invoice_count int,
  invoice_total numeric,
  paid_total numeric,
  outstanding numeric,
  oldest_due date
)
language sql stable as $$
  with inv as (
    select i.no, i.supplier_id, i.total, i.due_date,
           coalesce((select sum(amount) from public.payments p
                     where p.invoice_no = i.no), 0) as paid
      from public.invoices i
     where i.status <> 'cancelled'
  )
  select
    inv.supplier_id,
    s.name,
    count(*)::int                              as invoice_count,
    sum(inv.total)                             as invoice_total,
    sum(inv.paid)                              as paid_total,
    sum(inv.total - inv.paid)                  as outstanding,
    min(inv.due_date) filter (where inv.total - inv.paid > 0) as oldest_due
  from inv
  left join public.suppliers s on s.id = inv.supplier_id
  where inv.total - inv.paid > 0.01
  group by inv.supplier_id, s.name
  order by outstanding desc;
$$;

grant execute on function public.outstanding_by_supplier() to authenticated;

-- -----------------------------------------------------------------------------
-- 5. RPC · monthly_cashflow (in, out, net, cumulative)
-- -----------------------------------------------------------------------------
create or replace function public.monthly_cashflow(
  p_from date default (current_date - interval '6 months')::date,
  p_to date default current_date
)
returns table (
  period text,
  cash_in numeric,
  cash_out numeric,
  net numeric,
  cumulative numeric
)
language sql stable as $$
  with months as (
    select to_char(gs, 'YYYY-MM') as period, gs::date as month_start
    from generate_series(date_trunc('month', p_from),
                         date_trunc('month', p_to),
                         interval '1 month') gs
  ),
  inflow as (
    select to_char(receipt_date, 'YYYY-MM') as period,
           coalesce(sum(amount), 0) as cash_in
      from public.cash_receipts
     where receipt_date between p_from and p_to
     group by to_char(receipt_date, 'YYYY-MM')
  ),
  outflow as (
    select to_char(pay_date, 'YYYY-MM') as period,
           coalesce(sum(amount), 0) as cash_out
      from public.payments
     where pay_date between p_from and p_to
     group by to_char(pay_date, 'YYYY-MM')
  ),
  merged as (
    select m.period,
           coalesce(i.cash_in, 0)  as cash_in,
           coalesce(o.cash_out, 0) as cash_out,
           coalesce(i.cash_in, 0) - coalesce(o.cash_out, 0) as net
      from months m
      left join inflow i  on i.period = m.period
      left join outflow o on o.period = m.period
  )
  select period,
         cash_in,
         cash_out,
         net,
         sum(net) over (order by period rows unbounded preceding) as cumulative
    from merged
   order by period;
$$;

grant execute on function public.monthly_cashflow(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. RPC · payment_summary_by_invoice (untuk detail invoice page)
-- -----------------------------------------------------------------------------
create or replace function public.payment_summary_by_invoice(p_invoice_no text)
returns table (
  invoice_no text,
  invoice_total numeric,
  paid numeric,
  outstanding numeric,
  payment_count int,
  last_payment_date date
)
language sql stable as $$
  select
    i.no,
    i.total,
    coalesce(sum(p.amount), 0),
    i.total - coalesce(sum(p.amount), 0),
    count(p.no)::int,
    max(p.pay_date)
  from public.invoices i
  left join public.payments p on p.invoice_no = i.no
  where i.no = p_invoice_no
  group by i.no, i.total;
$$;

grant execute on function public.payment_summary_by_invoice(text) to authenticated;

-- =============================================================================
-- END 0032
-- =============================================================================
