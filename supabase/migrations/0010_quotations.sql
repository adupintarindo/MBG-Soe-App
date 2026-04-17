-- ============================================================================
-- 0010 · Quotations / RFQ
-- Alur: Menu → porsi_counts (+ attendance) → requirement_for_date (kg) →
-- Operator drafting quotation ke supplier (suggested price) → Supplier
-- review → Quotation accepted → convert ke PO.
-- ============================================================================

create type public.quotation_status as enum (
  'draft',        -- baru dibuat operator, belum dikirim
  'sent',         -- sudah dikirim ke supplier
  'responded',    -- supplier sudah balas (harga/qty disesuaikan)
  'accepted',     -- operator terima, siap convert ke PO
  'converted',    -- sudah jadi PO
  'rejected',     -- ditolak salah satu pihak
  'expired'       -- lewat valid_until
);

create table if not exists public.quotations (
  no text primary key,                          -- 'QT-2026-001'
  supplier_id text not null references public.suppliers(id),
  quote_date date not null default current_date,
  valid_until date,
  need_date date,                               -- tanggal menu butuh barangnya
  status public.quotation_status not null default 'draft',
  total numeric(14,2) not null default 0,
  notes text,
  converted_po_no text references public.purchase_orders(no),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  responded_at timestamptz,
  responded_by uuid references auth.users(id)
);
create index if not exists idx_qt_sup_date on public.quotations(supplier_id, quote_date desc);
create index if not exists idx_qt_status on public.quotations(status);
create index if not exists idx_qt_need on public.quotations(need_date);

create table if not exists public.quotation_rows (
  qt_no text not null references public.quotations(no) on delete cascade,
  line_no smallint not null,
  item_code text not null references public.items(code),
  qty numeric(12,3) not null,                   -- kebutuhan (kg/lt/btr)
  unit text not null,
  price_suggested numeric(12,2),                -- harga saran operator
  price_quoted numeric(12,2),                   -- harga final supplier
  qty_quoted numeric(12,3),                     -- qty final supplier (kalau beda)
  note text,
  subtotal numeric(14,2) generated always as (
    coalesce(qty_quoted, qty) * coalesce(price_quoted, price_suggested, 0)
  ) stored,
  primary key (qt_no, line_no)
);

-- Auto-recompute quotation.total saat rows berubah
create or replace function public.recalc_quotation_total()
returns trigger language plpgsql as $$
declare
  v_qt text;
  v_sum numeric(14,2);
begin
  v_qt := coalesce(new.qt_no, old.qt_no);
  select coalesce(sum(subtotal), 0) into v_sum
  from public.quotation_rows
  where qt_no = v_qt;
  update public.quotations set total = v_sum where no = v_qt;
  return null;
end; $$;

drop trigger if exists trg_qt_rows_recalc on public.quotation_rows;
create trigger trg_qt_rows_recalc
  after insert or update or delete on public.quotation_rows
  for each row execute function public.recalc_quotation_total();

-- Auto-assign quotation number (QT-YYYY-NNN)
create or replace function public.assign_quotation_no()
returns trigger language plpgsql as $$
declare
  v_year text;
  v_seq int;
begin
  if new.no is null or new.no = '' then
    v_year := to_char(coalesce(new.quote_date, current_date), 'YYYY');
    select coalesce(max(
      nullif(regexp_replace(no, 'QT-' || v_year || '-', ''), '')::int
    ), 0) + 1
    into v_seq
    from public.quotations
    where no like 'QT-' || v_year || '-%';
    new.no := 'QT-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  end if;
  return new;
end; $$;

drop trigger if exists trg_qt_assign on public.quotations;
create trigger trg_qt_assign
  before insert on public.quotations
  for each row execute function public.assign_quotation_no();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.quotations     enable row level security;
alter table public.quotation_rows enable row level security;

-- Quotations: staff read semua, supplier read only own
drop policy if exists "qt: read staff or own-supplier" on public.quotations;
create policy "qt: read staff or own-supplier" on public.quotations
  for select using (
    auth.uid() is not null and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier' and supplier_id = public.current_supplier_id())
    )
  );

drop policy if exists "qt: op/admin write" on public.quotations;
create policy "qt: op/admin write" on public.quotations
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

drop policy if exists "qt: supplier respond" on public.quotations;
create policy "qt: supplier respond" on public.quotations
  for update using (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
    and status in ('sent','responded')
  )
  with check (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  );

-- Quotation rows: inherit access via parent quotation
drop policy if exists "qt_rows: read via parent" on public.quotation_rows;
create policy "qt_rows: read via parent" on public.quotation_rows
  for select using (
    auth.uid() is not null and exists (
      select 1 from public.quotations q
      where q.no = quotation_rows.qt_no
        and (
          public.current_role() in ('admin','operator','ahli_gizi','viewer')
          or (public.current_role() = 'supplier' and q.supplier_id = public.current_supplier_id())
        )
    )
  );

drop policy if exists "qt_rows: op/admin write" on public.quotation_rows;
create policy "qt_rows: op/admin write" on public.quotation_rows
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

drop policy if exists "qt_rows: supplier respond" on public.quotation_rows;
create policy "qt_rows: supplier respond" on public.quotation_rows
  for update using (
    public.current_role() = 'supplier'
    and exists (
      select 1 from public.quotations q
      where q.no = quotation_rows.qt_no
        and q.supplier_id = public.current_supplier_id()
        and q.status in ('sent','responded')
    )
  )
  with check (
    public.current_role() = 'supplier'
    and exists (
      select 1 from public.quotations q
      where q.no = quotation_rows.qt_no
        and q.supplier_id = public.current_supplier_id()
    )
  );

-- ============================================================================
-- RPC: Convert quotation → Purchase Order
-- Ambil harga & qty final (quoted) dari quotation_rows → buat PO baru, lock
-- quotation ke status='converted' + set converted_po_no.
-- ============================================================================
create or replace function public.convert_quotation_to_po(p_qt_no text)
returns text
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_qt record;
  v_po_no text;
  v_year text;
  v_seq int;
  v_line smallint := 1;
  v_total numeric(14,2) := 0;
  r record;
begin
  if public.current_role() not in ('admin','operator') then
    raise exception 'forbidden';
  end if;

  select * into v_qt from public.quotations where no = p_qt_no;
  if not found then
    raise exception 'quotation % not found', p_qt_no;
  end if;
  if v_qt.status = 'converted' and v_qt.converted_po_no is not null then
    return v_qt.converted_po_no;  -- idempotent
  end if;
  if v_qt.status not in ('accepted','responded') then
    raise exception 'quotation % status % cannot be converted', p_qt_no, v_qt.status;
  end if;

  v_year := to_char(current_date, 'YYYY');
  select coalesce(max(
    nullif(regexp_replace(no, 'PO-' || v_year || '-', ''), '')::int
  ), 0) + 1
  into v_seq
  from public.purchase_orders
  where no like 'PO-' || v_year || '-%';
  v_po_no := 'PO-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.purchase_orders(
    no, po_date, supplier_id, delivery_date, status, notes, created_by
  ) values (
    v_po_no, current_date, v_qt.supplier_id, v_qt.need_date, 'draft',
    'Dari ' || p_qt_no || coalesce(' · ' || v_qt.notes, ''),
    auth.uid()
  );

  for r in
    select
      item_code,
      unit,
      coalesce(qty_quoted, qty) as qty_final,
      coalesce(price_quoted, price_suggested, 0) as price_final
    from public.quotation_rows
    where qt_no = p_qt_no
    order by line_no
  loop
    insert into public.po_rows(po_no, line_no, item_code, qty, unit, price)
    values (v_po_no, v_line, r.item_code, r.qty_final, r.unit, r.price_final);
    v_total := v_total + r.qty_final * r.price_final;
    v_line := v_line + 1;
  end loop;

  update public.purchase_orders set total = v_total where no = v_po_no;

  update public.quotations
    set status = 'converted', converted_po_no = v_po_no
    where no = p_qt_no;

  return v_po_no;
end; $$;

grant execute on function public.convert_quotation_to_po(text) to authenticated;

-- ============================================================================
-- RPC: Pre-fill quotation rows dari requirement_for_date
-- Dipakai UI untuk seed items berdasarkan menu di tanggal tertentu.
-- ============================================================================
create or replace function public.quotation_seed_from_date(
  p_date date
)
returns table(item_code text, qty numeric, unit text, price_suggested numeric)
language sql stable as $$
  select
    r.item_code,
    round(r.qty::numeric, 3) as qty,
    r.unit,
    coalesce(
      -- saran harga = last PO price dari item ini (semua supplier)
      (select pr.price
         from public.po_rows pr
         join public.purchase_orders po on po.no = pr.po_no
         where pr.item_code = r.item_code
         order by po.po_date desc
         limit 1),
      -- fallback: price_idr dari BOM/items catalog
      r.price_idr
    ) as price_suggested
  from public.requirement_for_date(p_date) r
  order by r.item_code;
$$;

grant execute on function public.quotation_seed_from_date(date) to authenticated;
