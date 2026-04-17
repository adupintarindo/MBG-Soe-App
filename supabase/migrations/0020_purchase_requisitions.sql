-- =============================================================================
-- 0017 · Purchase Requisitions (PR) + Split-Allocation per Supplier
-- -----------------------------------------------------------------------------
-- Konsep: satu kebutuhan tanggal X bisa dipecah ke N supplier dengan qty
-- absolut (bukan %). PR jadi parent, alokasi per (item × supplier) jadi anak.
-- Generate N quotations (1 per supplier) sekali klik; operator manual
-- re-alokasi gap kalau supplier balasan-nya qty < planned.
--
-- Alur:
--   draft → (add allocations) → allocated → (generate_quotations)
--        → quotations_issued → (all quotations accepted/converted) → completed
-- =============================================================================

create type public.pr_status as enum (
  'draft',
  'allocated',
  'quotations_issued',
  'completed',
  'cancelled'
);

create table if not exists public.purchase_requisitions (
  no text primary key,
  need_date date not null,
  status public.pr_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists idx_pr_need_date on public.purchase_requisitions(need_date);
create index if not exists idx_pr_status on public.purchase_requisitions(status);

create table if not exists public.pr_rows (
  pr_no text not null references public.purchase_requisitions(no) on delete cascade,
  line_no smallint not null,
  item_code text not null references public.items(code),
  qty_total numeric(12,3) not null,
  unit text not null,
  note text,
  primary key (pr_no, line_no)
);
create index if not exists idx_pr_rows_item on public.pr_rows(item_code);

create table if not exists public.pr_allocations (
  id bigserial primary key,
  pr_no text not null,
  line_no smallint not null,
  supplier_id text not null references public.suppliers(id),
  qty_planned numeric(12,3) not null check (qty_planned > 0),
  quotation_no text references public.quotations(no) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  foreign key (pr_no, line_no)
    references public.pr_rows(pr_no, line_no) on delete cascade,
  unique (pr_no, line_no, supplier_id)
);
create index if not exists idx_pr_alloc_pr on public.pr_allocations(pr_no);
create index if not exists idx_pr_alloc_sup on public.pr_allocations(supplier_id);
create index if not exists idx_pr_alloc_qt on public.pr_allocations(quotation_no);

-- Link quotation ↔ PR (nullable: manual quotation tetap bisa ada)
alter table public.quotations
  add column if not exists pr_no text references public.purchase_requisitions(no);
create index if not exists idx_qt_pr on public.quotations(pr_no);

-- Auto-assign PR number (PR-YYYY-NNN)
create or replace function public.assign_pr_no()
returns trigger language plpgsql as $$
declare
  v_year text;
  v_seq int;
begin
  if new.no is null or new.no = '' then
    v_year := to_char(coalesce(new.created_at, now()), 'YYYY');
    select coalesce(max(
      nullif(regexp_replace(no, 'PR-' || v_year || '-', ''), '')::int
    ), 0) + 1
    into v_seq
    from public.purchase_requisitions
    where no like 'PR-' || v_year || '-%';
    new.no := 'PR-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  end if;
  return new;
end; $$;

drop trigger if exists trg_pr_assign on public.purchase_requisitions;
create trigger trg_pr_assign
  before insert on public.purchase_requisitions
  for each row execute function public.assign_pr_no();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.purchase_requisitions enable row level security;
alter table public.pr_rows               enable row level security;
alter table public.pr_allocations        enable row level security;

-- PR + rows: staff read, op/admin write. Supplier TIDAK baca PR langsung —
-- mereka baca lewat quotation yang sudah dispawn (RLS quotations sudah handle).
drop policy if exists "pr: staff read" on public.purchase_requisitions;
create policy "pr: staff read" on public.purchase_requisitions
  for select using (
    auth.uid() is not null
    and public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "pr: op/admin write" on public.purchase_requisitions;
create policy "pr: op/admin write" on public.purchase_requisitions
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

drop policy if exists "pr_rows: staff read" on public.pr_rows;
create policy "pr_rows: staff read" on public.pr_rows
  for select using (
    auth.uid() is not null
    and public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "pr_rows: op/admin write" on public.pr_rows;
create policy "pr_rows: op/admin write" on public.pr_rows
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

drop policy if exists "pr_alloc: staff read" on public.pr_allocations;
create policy "pr_alloc: staff read" on public.pr_allocations
  for select using (
    auth.uid() is not null
    and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier'
          and supplier_id = public.current_supplier_id())
    )
  );

drop policy if exists "pr_alloc: op/admin write" on public.pr_allocations;
create policy "pr_alloc: op/admin write" on public.pr_allocations
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- =============================================================================
-- RPC 1 · Seed PR dari requirement_for_date
-- =============================================================================
create or replace function public.pr_seed_from_date(
  p_need_date date,
  p_notes text default null
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_pr_no text;
  v_line smallint := 1;
  r record;
begin
  if public.current_role() not in ('admin','operator') then
    raise exception 'forbidden';
  end if;

  insert into public.purchase_requisitions(need_date, notes, status, created_by)
  values (p_need_date, p_notes, 'draft', auth.uid())
  returning no into v_pr_no;

  for r in
    select item_code, round(qty::numeric, 3) as qty, unit
    from public.requirement_for_date(p_need_date)
    where qty > 0
    order by item_code
  loop
    insert into public.pr_rows(pr_no, line_no, item_code, qty_total, unit)
    values (v_pr_no, v_line, r.item_code, r.qty, r.unit);
    v_line := v_line + 1;
  end loop;

  return v_pr_no;
end; $$;

grant execute on function public.pr_seed_from_date(date, text) to authenticated;

-- =============================================================================
-- RPC 2 · Generate quotations dari PR
-- Group allocations by supplier → 1 quotation per supplier (multi-line).
-- Harga saran: last PO price supplier+item → last PO any supplier → katalog.
-- Idempotent: hanya alokasi dengan quotation_no IS NULL yang dispawn.
-- =============================================================================
create or replace function public.pr_generate_quotations(p_pr_no text)
returns text[]
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_pr record;
  v_qt_no text;
  v_line smallint;
  v_created text[] := '{}';
  v_sug numeric;
  r_sup record;
  r_alloc record;
begin
  if public.current_role() not in ('admin','operator') then
    raise exception 'forbidden';
  end if;

  select * into v_pr from public.purchase_requisitions where no = p_pr_no;
  if not found then raise exception 'PR % not found', p_pr_no; end if;

  for r_sup in
    select distinct supplier_id
    from public.pr_allocations
    where pr_no = p_pr_no and quotation_no is null
  loop
    insert into public.quotations(
      supplier_id, quote_date, valid_until, need_date, notes, status, pr_no, created_by
    )
    values (
      r_sup.supplier_id, current_date, current_date + 7, v_pr.need_date,
      'Dari ' || p_pr_no, 'draft', p_pr_no, auth.uid()
    )
    returning no into v_qt_no;

    v_line := 1;

    for r_alloc in
      select a.id, a.line_no, a.qty_planned, pr.item_code, pr.unit
      from public.pr_allocations a
      join public.pr_rows pr
        on pr.pr_no = a.pr_no and pr.line_no = a.line_no
      where a.pr_no = p_pr_no
        and a.supplier_id = r_sup.supplier_id
        and a.quotation_no is null
      order by a.line_no
    loop
      -- Price suggestion cascade
      select price into v_sug
      from public.po_rows prow
      join public.purchase_orders po on po.no = prow.po_no
      where prow.item_code = r_alloc.item_code
        and po.supplier_id = r_sup.supplier_id
      order by po.po_date desc
      limit 1;

      if v_sug is null then
        select price into v_sug
        from public.po_rows prow
        join public.purchase_orders po on po.no = prow.po_no
        where prow.item_code = r_alloc.item_code
        order by po.po_date desc
        limit 1;
      end if;

      if v_sug is null then
        select price_idr into v_sug from public.items where code = r_alloc.item_code;
      end if;

      insert into public.quotation_rows(
        qt_no, line_no, item_code, qty, unit, price_suggested
      )
      values (
        v_qt_no, v_line, r_alloc.item_code, r_alloc.qty_planned, r_alloc.unit, v_sug
      );

      update public.pr_allocations
        set quotation_no = v_qt_no
        where id = r_alloc.id;

      v_line := v_line + 1;
    end loop;

    v_created := v_created || v_qt_no;
  end loop;

  if array_length(v_created, 1) is not null then
    update public.purchase_requisitions
      set status = 'quotations_issued'
      where no = p_pr_no;
  end if;

  return v_created;
end; $$;

grant execute on function public.pr_generate_quotations(text) to authenticated;

-- =============================================================================
-- RPC 3 · Allocation summary per PR-line
-- qty_planned_sum = total alokasi operator
-- qty_quoted_sum  = total qty_quoted dari quotation aktif (responded/accepted/converted)
-- qty_po_sum      = total qty di PO hasil convert
-- gap             = qty_total − qty_planned_sum (tersisa untuk di-alokasi)
-- =============================================================================
create or replace function public.pr_allocation_summary(p_pr_no text)
returns table(
  line_no smallint,
  item_code text,
  unit text,
  qty_total numeric,
  qty_planned_sum numeric,
  qty_quoted_sum numeric,
  qty_po_sum numeric,
  gap numeric
)
language sql stable as $$
  with alloc_plan as (
    select line_no, sum(qty_planned) as s
    from public.pr_allocations
    where pr_no = p_pr_no
    group by line_no
  ),
  alloc_quoted as (
    select a.line_no, sum(coalesce(qr.qty_quoted, qr.qty)) as s
    from public.pr_allocations a
    join public.quotations q on q.no = a.quotation_no
    join public.pr_rows pr on pr.pr_no = a.pr_no and pr.line_no = a.line_no
    join public.quotation_rows qr
      on qr.qt_no = a.quotation_no and qr.item_code = pr.item_code
    where a.pr_no = p_pr_no
      and q.status in ('responded','accepted','converted')
    group by a.line_no
  ),
  alloc_po as (
    select a.line_no, sum(por.qty) as s
    from public.pr_allocations a
    join public.quotations q on q.no = a.quotation_no
    join public.purchase_orders po on po.no = q.converted_po_no
    join public.pr_rows pr on pr.pr_no = a.pr_no and pr.line_no = a.line_no
    join public.po_rows por on por.po_no = po.no and por.item_code = pr.item_code
    where a.pr_no = p_pr_no
    group by a.line_no
  )
  select
    pr.line_no,
    pr.item_code,
    pr.unit,
    pr.qty_total,
    coalesce(ap.s, 0) as qty_planned_sum,
    coalesce(aq.s, 0) as qty_quoted_sum,
    coalesce(apo.s, 0) as qty_po_sum,
    (pr.qty_total - coalesce(ap.s, 0)) as gap
  from public.pr_rows pr
  left join alloc_plan ap  on ap.line_no = pr.line_no
  left join alloc_quoted aq on aq.line_no = pr.line_no
  left join alloc_po apo   on apo.line_no = pr.line_no
  where pr.pr_no = p_pr_no
  order by pr.line_no;
$$;

grant execute on function public.pr_allocation_summary(text) to authenticated;

-- =============================================================================
-- Trigger: auto-update PR.status ke 'allocated' saat allocation pertama masuk
-- =============================================================================
create or replace function public.pr_touch_status()
returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  update public.purchase_requisitions
    set status = 'allocated'
    where no = new.pr_no
      and status = 'draft';
  return null;
end; $$;

drop trigger if exists trg_pr_alloc_touch on public.pr_allocations;
create trigger trg_pr_alloc_touch
  after insert on public.pr_allocations
  for each row execute function public.pr_touch_status();
