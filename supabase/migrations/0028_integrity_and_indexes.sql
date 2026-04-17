-- =============================================================================
-- 0028 · Data integrity + missing indexes (Prioritas 2 dari DB_REVIEW.md)
-- -----------------------------------------------------------------------------
-- 1. grn_rows: actual received qty per line (hilangkan approximation partial)
-- 2. grn_sync_stock v2: prefer grn_rows, fallback po_rows (backward compat)
-- 3. stock.qty non-negative check (conditional — skip kalau ada data negatif)
-- 4. profiles.supplier_id FK ke suppliers(id) on delete set null
-- 5. Auto-recalc purchase_orders.total dari po_rows
-- 6. Missing indexes untuk high-traffic joins
--
-- Semua idempoten: IF NOT EXISTS, DROP TRIGGER IF EXISTS, DROP POLICY IF EXISTS.
-- Tidak break data existing: grn_rows opsional, constraint conditional.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. grn_rows · actual received qty per line item (parallel po_rows)
-- -----------------------------------------------------------------------------
create table if not exists public.grn_rows (
  grn_no text not null references public.grns(no) on delete cascade,
  line_no smallint not null,
  item_code text not null references public.items(code) on delete restrict,
  qty_ordered numeric(12,3) not null default 0,      -- snapshot dari po_rows
  qty_received numeric(12,3) not null default 0
    check (qty_received >= 0),
  qty_rejected numeric(12,3) not null default 0
    check (qty_rejected >= 0),
  unit text not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  primary key (grn_no, line_no)
);
create index if not exists idx_grn_rows_item on public.grn_rows(item_code);
create index if not exists idx_grn_rows_grn  on public.grn_rows(grn_no);

alter table public.grn_rows enable row level security;

drop policy if exists "grn_rows: read staff or own-supplier" on public.grn_rows;
create policy "grn_rows: read staff or own-supplier" on public.grn_rows
  for select using (
    auth.uid() is not null and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier' and exists (
        select 1 from public.grns g
        join public.purchase_orders p on p.no = g.po_no
        where g.no = grn_rows.grn_no
          and p.supplier_id = public.current_supplier_id()
      ))
    )
  );

drop policy if exists "grn_rows: op/admin write" on public.grn_rows;
create policy "grn_rows: op/admin write" on public.grn_rows
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- -----------------------------------------------------------------------------
-- 2. grn_sync_stock v2: prefer grn_rows, fallback po_rows
-- -----------------------------------------------------------------------------
create or replace function public.grn_sync_stock()
returns trigger language plpgsql as $$
declare
  v_exists int;
  v_po text;
  v_has_rows boolean;
  r record;
begin
  if new.status not in ('ok','partial') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('ok','partial') then
    return new;
  end if;

  v_po := new.po_no;

  -- Idempotency guard
  select count(*) into v_exists
    from public.stock_moves
    where ref_doc = 'grn' and ref_no = new.no;
  if v_exists > 0 then
    return new;
  end if;

  -- Prefer grn_rows (actual received) — accurate untuk partial
  select exists(select 1 from public.grn_rows where grn_no = new.no)
    into v_has_rows;

  if v_has_rows then
    for r in
      select item_code, qty_received as qty, unit
        from public.grn_rows
        where grn_no = new.no
          and qty_received > 0
        order by line_no
    loop
      insert into public.stock_moves(
        item_code, delta, reason, ref_doc, ref_no, note, created_by
      ) values (
        r.item_code, r.qty, 'receipt', 'grn', new.no,
        'Auto-sync dari GRN ' || new.no || ' (grn_rows)',
        auth.uid()
      );
    end loop;
  elsif v_po is not null then
    -- Fallback: po_rows (pre-0028 behavior, approximation)
    for r in
      select item_code, qty, unit
        from public.po_rows
        where po_no = v_po
        order by line_no
    loop
      insert into public.stock_moves(
        item_code, delta, reason, ref_doc, ref_no, note, created_by
      ) values (
        r.item_code, r.qty, 'receipt', 'grn', new.no,
        'Auto-sync dari GRN ' || new.no || ' (PO ' || v_po || ' fallback)',
        auth.uid()
      );
    end loop;
  end if;

  return new;
end; $$;

-- -----------------------------------------------------------------------------
-- 3. stock.qty non-negative check (conditional: skip kalau ada negatif existing)
-- -----------------------------------------------------------------------------
do $$
declare
  v_neg int;
begin
  select count(*) into v_neg from public.stock where qty < 0;
  if v_neg > 0 then
    raise notice 'Skip stock_qty_nonneg: ditemukan % baris dengan qty < 0. '
                 'Reconcile data dulu, baru jalankan: '
                 'alter table public.stock add constraint stock_qty_nonneg check (qty >= 0);',
                 v_neg;
  else
    begin
      alter table public.stock
        add constraint stock_qty_nonneg check (qty >= 0);
    exception when duplicate_object then
      null;  -- sudah ada
    end;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. profiles.supplier_id FK
-- -----------------------------------------------------------------------------
-- Cleanup orphan dulu (profile.supplier_id tidak match suppliers.id)
update public.profiles p
   set supplier_id = null
 where supplier_id is not null
   and not exists (select 1 from public.suppliers s where s.id = p.supplier_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'profiles_supplier_id_fkey'
       and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_supplier_id_fkey
      foreign key (supplier_id) references public.suppliers(id)
      on delete set null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Auto-recalc purchase_orders.total dari po_rows
-- -----------------------------------------------------------------------------
create or replace function public.recalc_po_total()
returns trigger language plpgsql as $$
declare
  v_po text;
  v_sum numeric(14,2);
begin
  if pg_trigger_depth() > 1 then return null; end if;
  v_po := coalesce(new.po_no, old.po_no);
  select coalesce(sum(subtotal), 0) into v_sum
    from public.po_rows
    where po_no = v_po;
  update public.purchase_orders
     set total = v_sum
   where no = v_po;
  return null;
end; $$;

drop trigger if exists trg_po_rows_recalc on public.po_rows;
create trigger trg_po_rows_recalc
  after insert or update or delete on public.po_rows
  for each row execute function public.recalc_po_total();

-- Backfill existing PO totals (one-shot sync)
update public.purchase_orders po
   set total = coalesce(s.sum_sub, 0)
  from (
    select po_no, sum(subtotal) as sum_sub
      from public.po_rows
     group by po_no
  ) s
 where s.po_no = po.no
   and coalesce(po.total, 0) <> coalesce(s.sum_sub, 0);

-- -----------------------------------------------------------------------------
-- 6. Missing indexes (high-impact untuk dashboard / scorecard / RPC)
-- -----------------------------------------------------------------------------
create index if not exists idx_grns_po
  on public.grns(po_no);
create index if not exists idx_grns_date
  on public.grns(grn_date desc);
create index if not exists idx_grns_status
  on public.grns(status) where status <> 'ok';

create index if not exists idx_invoices_sup_date
  on public.invoices(supplier_id, inv_date desc);
create index if not exists idx_invoices_status_open
  on public.invoices(status) where status <> 'paid';

create index if not exists idx_po_rows_item
  on public.po_rows(item_code);

create index if not exists idx_supaction_owner_user
  on public.supplier_actions(owner_user_id)
  where owner_user_id is not null;

create index if not exists idx_supplier_items_item
  on public.supplier_items(item_code);

-- =============================================================================
-- END 0028
-- =============================================================================
