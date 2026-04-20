-- =============================================================================
-- 0036 · Supplier portal expansion
-- -----------------------------------------------------------------------------
-- Masalah: supplier hanya punya /forecast. Butuh: ack PO, upload foto delivery,
-- upload scan invoice, chat thread per PO, lihat status payment.
--
-- Desain:
--   po_acknowledgements     : supplier ack PO (accept/reject + reason)
--   supplier_messages       : chat thread per PO (supplier ↔ operator)
--   invoice_uploads         : supplier upload scan invoice sebelum invoice di-approve operator
--   RPC supplier_po_inbox, supplier_payment_status
-- =============================================================================

create type public.po_ack_decision as enum ('accepted','rejected','partial','pending');

create table if not exists public.po_acknowledgements (
  po_no text primary key references public.purchase_orders(no) on delete cascade,
  decision public.po_ack_decision not null default 'pending',
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  supplier_id text references public.suppliers(id),
  note text,
  alt_delivery_date date,                         -- usulan tanggal alternatif kalau reject tanggal
  updated_at timestamptz not null default now()
);
create index if not exists idx_po_ack_supplier on public.po_acknowledgements(supplier_id, decided_at desc);

drop trigger if exists trg_po_ack_touch on public.po_acknowledgements;
create trigger trg_po_ack_touch
  before update on public.po_acknowledgements
  for each row execute function public.touch_updated_at();

alter table public.po_acknowledgements enable row level security;

drop policy if exists "po_ack: staff read" on public.po_acknowledgements;
create policy "po_ack: staff read" on public.po_acknowledgements
  for select using (
    auth.uid() is not null and public.current_role() in
      ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "po_ack: supplier read own" on public.po_acknowledgements;
create policy "po_ack: supplier read own" on public.po_acknowledgements
  for select using (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  );

drop policy if exists "po_ack: supplier upsert own" on public.po_acknowledgements;
create policy "po_ack: supplier upsert own" on public.po_acknowledgements
  for insert with check (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
    and exists (
      select 1 from public.purchase_orders p
       where p.no = po_no and p.supplier_id = public.current_supplier_id()
    )
  );

drop policy if exists "po_ack: supplier update own" on public.po_acknowledgements;
create policy "po_ack: supplier update own" on public.po_acknowledgements
  for update using (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  ) with check (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  );

drop policy if exists "po_ack: admin write" on public.po_acknowledgements;
create policy "po_ack: admin write" on public.po_acknowledgements
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- -----------------------------------------------------------------------------
-- supplier_messages · chat thread per PO
-- -----------------------------------------------------------------------------
create table if not exists public.supplier_messages (
  id bigserial primary key,
  po_no text references public.purchase_orders(no) on delete cascade,
  supplier_id text not null references public.suppliers(id),
  sender_id uuid references auth.users(id),
  sender_role public.user_role,
  body text not null check (length(body) > 0 and length(body) <= 4000),
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_msg_po on public.supplier_messages(po_no, created_at desc);
create index if not exists idx_msg_supplier on public.supplier_messages(supplier_id, created_at desc);

alter table public.supplier_messages enable row level security;

drop policy if exists "msg: staff read" on public.supplier_messages;
create policy "msg: staff read" on public.supplier_messages
  for select using (
    auth.uid() is not null and public.current_role() in
      ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "msg: supplier read own" on public.supplier_messages;
create policy "msg: supplier read own" on public.supplier_messages
  for select using (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  );

drop policy if exists "msg: supplier insert own" on public.supplier_messages;
create policy "msg: supplier insert own" on public.supplier_messages
  for insert with check (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
    and sender_id = auth.uid()
  );

drop policy if exists "msg: staff insert" on public.supplier_messages;
create policy "msg: staff insert" on public.supplier_messages
  for insert with check (
    public.current_role() in ('admin','operator') and sender_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- invoice_uploads · scan invoice dari supplier → di-approve operator
-- -----------------------------------------------------------------------------
create type public.invoice_upload_status as enum ('pending','approved','rejected');

create table if not exists public.invoice_uploads (
  id bigserial primary key,
  po_no text references public.purchase_orders(no) on delete set null,
  grn_no text references public.grns(no) on delete set null,
  supplier_id text not null references public.suppliers(id),
  invoice_no_supplier text,                       -- no invoice dari supplier (bukan internal)
  total numeric(14,2) not null check (total > 0),
  file_url text not null,                         -- storage path PDF/JPG
  status public.invoice_upload_status not null default 'pending',
  approved_invoice_no text references public.invoices(no) on delete set null,
  rejected_reason text,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
create index if not exists idx_inv_upload_sup on public.invoice_uploads(supplier_id, uploaded_at desc);
create index if not exists idx_inv_upload_status on public.invoice_uploads(status)
  where status = 'pending';

alter table public.invoice_uploads enable row level security;

drop policy if exists "inv_up: staff read" on public.invoice_uploads;
create policy "inv_up: staff read" on public.invoice_uploads
  for select using (
    auth.uid() is not null and public.current_role() in
      ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "inv_up: supplier read own" on public.invoice_uploads;
create policy "inv_up: supplier read own" on public.invoice_uploads
  for select using (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  );

drop policy if exists "inv_up: supplier insert own" on public.invoice_uploads;
create policy "inv_up: supplier insert own" on public.invoice_uploads
  for insert with check (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
    and uploaded_by = auth.uid()
  );

drop policy if exists "inv_up: staff update" on public.invoice_uploads;
create policy "inv_up: staff update" on public.invoice_uploads
  for update using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- -----------------------------------------------------------------------------
-- RPC · supplier_po_inbox (untuk supplier dashboard)
-- -----------------------------------------------------------------------------
create or replace function public.supplier_po_inbox(p_limit int default 30)
returns table (
  po_no text,
  po_date date,
  delivery_date date,
  total numeric,
  po_status public.po_status,
  ack_decision public.po_ack_decision,
  ack_at timestamptz,
  grn_status public.grn_status,
  invoice_status public.invoice_status,
  unread_msg int
)
language sql
security definer
set search_path = public
stable as $$
  select
    p.no,
    p.po_date,
    p.delivery_date,
    p.total,
    p.status,
    coalesce(a.decision, 'pending'::public.po_ack_decision),
    a.decided_at,
    (select g.status from public.grns g where g.po_no = p.no
       order by g.grn_date desc limit 1),
    (select i.status from public.invoices i where i.po_no = p.no
       order by i.inv_date desc limit 1),
    coalesce((select count(*)::int from public.supplier_messages m
       where m.po_no = p.no
         and m.sender_role in ('admin','operator')
         and m.read_at is null), 0)
  from public.purchase_orders p
  left join public.po_acknowledgements a on a.po_no = p.no
  where p.supplier_id = public.current_supplier_id()
     or public.current_role() in ('admin','operator','viewer')
  order by p.po_date desc, p.no desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.supplier_po_inbox(int) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC · supplier_payment_status (outstanding per supplier untuk portal)
-- -----------------------------------------------------------------------------
create or replace function public.supplier_payment_status()
returns table (
  invoice_no text,
  po_no text,
  inv_date date,
  due_date date,
  total numeric,
  paid numeric,
  outstanding numeric,
  status public.invoice_status
)
language sql
security definer
set search_path = public
stable as $$
  select
    i.no,
    i.po_no,
    i.inv_date,
    i.due_date,
    i.total,
    coalesce((select sum(amount) from public.payments p
              where p.invoice_no = i.no), 0),
    i.total - coalesce((select sum(amount) from public.payments p
                        where p.invoice_no = i.no), 0),
    i.status
  from public.invoices i
  where i.supplier_id = public.current_supplier_id()
     or public.current_role() in ('admin','operator','viewer')
  order by i.inv_date desc, i.no desc
  limit 200;
$$;

grant execute on function public.supplier_payment_status() to authenticated;

-- =============================================================================
-- END 0036
-- =============================================================================
