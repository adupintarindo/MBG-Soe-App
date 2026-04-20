-- =============================================================================
-- 0031 · Stock batches + expiry tracking + FIFO consumption
-- -----------------------------------------------------------------------------
-- Masalah: stock.qty tunggal, tidak ada jejak lot. Food safety (recall ikan/
-- telur) dan compliance WFP/SNI 8152 butuh tracebility per batch dengan
-- tanggal kedaluwarsa + FIFO discipline.
--
-- Desain:
--   stock_batches  : 1 row per line GRN (atau manual) dengan expiry + sisa
--   trg_grn_fill_batches : auto-generate batch row saat GRN ok/partial
--   stock_consume_fifo(item, qty) : RPC yang iterasi oldest-expiry-first
--   expiring_batches(days)        : batch H-N untuk dashboard alert
--   v_stock_on_hand_by_item       : view sum qty_remaining per item
--
-- Idempoten: IF NOT EXISTS, DROP TRIGGER IF EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
create table if not exists public.stock_batches (
  id bigserial primary key,
  item_code text not null references public.items(code) on delete restrict,
  grn_no text references public.grns(no) on delete set null,
  supplier_id text references public.suppliers(id) on delete set null,
  batch_code text,                              -- lot/batch dari pemasok, opsional
  qty_received numeric(12,3) not null check (qty_received > 0),
  qty_remaining numeric(12,3) not null
    check (qty_remaining >= 0 and qty_remaining <= qty_received),
  unit text not null,
  received_date date not null,
  expiry_date date,                             -- null = non-perishable
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_batch_item_exp
  on public.stock_batches(item_code, expiry_date nulls last)
  where qty_remaining > 0;
create index if not exists idx_batch_grn
  on public.stock_batches(grn_no) where grn_no is not null;
create index if not exists idx_batch_expiring
  on public.stock_batches(expiry_date) where qty_remaining > 0 and expiry_date is not null;

drop trigger if exists trg_batch_touch on public.stock_batches;
create trigger trg_batch_touch
  before update on public.stock_batches
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 2. RLS
-- -----------------------------------------------------------------------------
alter table public.stock_batches enable row level security;

drop policy if exists "batches: staff read" on public.stock_batches;
create policy "batches: staff read" on public.stock_batches
  for select using (
    auth.uid() is not null and public.current_role() in
      ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "batches: supplier read own" on public.stock_batches;
create policy "batches: supplier read own" on public.stock_batches
  for select using (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  );

drop policy if exists "batches: op/admin write" on public.stock_batches;
create policy "batches: op/admin write" on public.stock_batches
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- -----------------------------------------------------------------------------
-- 3. Auto-generate batches dari GRN (hook ke grn_sync_stock)
-- -----------------------------------------------------------------------------
create or replace function public.grn_fill_batches()
returns trigger language plpgsql as $$
declare
  v_exists int;
  v_po text;
  v_supplier text;
  v_has_rows boolean;
  r record;
begin
  if new.status not in ('ok','partial') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('ok','partial') then
    return new;
  end if;

  -- Idempotency: skip kalau sudah pernah insert untuk GRN ini
  select count(*) into v_exists from public.stock_batches where grn_no = new.no;
  if v_exists > 0 then
    return new;
  end if;

  v_po := new.po_no;
  if v_po is not null then
    select supplier_id into v_supplier
      from public.purchase_orders where no = v_po;
  end if;

  select exists(select 1 from public.grn_rows where grn_no = new.no)
    into v_has_rows;

  if v_has_rows then
    for r in
      select gr.item_code, gr.qty_received as qty, gr.unit
        from public.grn_rows gr
       where gr.grn_no = new.no
         and gr.qty_received > 0
       order by gr.line_no
    loop
      insert into public.stock_batches(
        item_code, grn_no, supplier_id, qty_received, qty_remaining, unit,
        received_date, created_by
      ) values (
        r.item_code, new.no, v_supplier, r.qty, r.qty, r.unit,
        new.grn_date, auth.uid()
      );
    end loop;
  elsif v_po is not null then
    for r in
      select item_code, qty, unit
        from public.po_rows
       where po_no = v_po
       order by line_no
    loop
      insert into public.stock_batches(
        item_code, grn_no, supplier_id, qty_received, qty_remaining, unit,
        received_date, created_by
      ) values (
        r.item_code, new.no, v_supplier, r.qty, r.qty, r.unit,
        new.grn_date, auth.uid()
      );
    end loop;
  end if;

  return new;
end; $$;

drop trigger if exists trg_grn_fill_batches_ins on public.grns;
create trigger trg_grn_fill_batches_ins
  after insert on public.grns
  for each row execute function public.grn_fill_batches();

drop trigger if exists trg_grn_fill_batches_upd on public.grns;
create trigger trg_grn_fill_batches_upd
  after update of status on public.grns
  for each row execute function public.grn_fill_batches();

-- -----------------------------------------------------------------------------
-- 4. FIFO consumption RPC
-- -----------------------------------------------------------------------------
create or replace function public.stock_consume_fifo(
  p_item_code text,
  p_qty numeric,
  p_ref_doc text default 'menu_consumption',
  p_ref_no text default null,
  p_note text default null
)
returns table (batch_id bigint, consumed numeric, remaining_after numeric)
language plpgsql as $$
declare
  v_role public.user_role;
  v_remaining numeric := p_qty;
  v_take numeric;
  r record;
begin
  v_role := public.current_role();
  if v_role not in ('admin','operator') then
    raise exception 'stock_consume_fifo: role % tidak punya akses', v_role;
  end if;
  if p_qty <= 0 then
    raise exception 'stock_consume_fifo: qty harus > 0';
  end if;

  for r in
    select id, qty_remaining
      from public.stock_batches
     where item_code = p_item_code
       and qty_remaining > 0
     order by expiry_date nulls last, received_date, id
  loop
    exit when v_remaining <= 0;

    v_take := least(r.qty_remaining, v_remaining);

    update public.stock_batches
       set qty_remaining = qty_remaining - v_take,
           updated_at = now()
     where id = r.id;

    batch_id := r.id;
    consumed := v_take;
    remaining_after := r.qty_remaining - v_take;
    return next;

    v_remaining := v_remaining - v_take;
  end loop;

  -- Catat stock_move tunggal (bukan per batch) supaya trg_moves_apply
  -- tetap menurunkan stock.qty secara aggregate.
  if (p_qty - v_remaining) > 0 then
    insert into public.stock_moves(
      item_code, delta, reason, ref_doc, ref_no, note, created_by
    ) values (
      p_item_code,
      -(p_qty - v_remaining),
      'consumption'::public.move_reason,
      coalesce(p_ref_doc, 'menu_consumption'),
      p_ref_no,
      coalesce(p_note, 'FIFO consume'),
      auth.uid()
    );
  end if;

  if v_remaining > 0 then
    raise warning 'stock_consume_fifo: kurang % % untuk %', v_remaining,
      (select unit from public.items where code = p_item_code), p_item_code;
  end if;
end; $$;

grant execute on function public.stock_consume_fifo(text, numeric, text, text, text)
  to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Expiring batches RPC untuk dashboard alert
-- -----------------------------------------------------------------------------
create or replace function public.expiring_batches(p_days int default 14)
returns table (
  id bigint,
  item_code text,
  item_name text,
  grn_no text,
  supplier_id text,
  supplier_name text,
  qty_remaining numeric,
  unit text,
  expiry_date date,
  days_left int,
  status text                          -- 'expired','urgent','soon'
)
language sql stable as $$
  select
    b.id,
    b.item_code,
    i.name_en,
    b.grn_no,
    b.supplier_id,
    s.name,
    b.qty_remaining,
    b.unit,
    b.expiry_date,
    (b.expiry_date - current_date) as days_left,
    case
      when b.expiry_date < current_date then 'expired'
      when (b.expiry_date - current_date) <= 3 then 'urgent'
      else 'soon'
    end as status
  from public.stock_batches b
  left join public.items i on i.code = b.item_code
  left join public.suppliers s on s.id = b.supplier_id
  where b.qty_remaining > 0
    and b.expiry_date is not null
    and b.expiry_date <= (current_date + make_interval(days => greatest(p_days, 0)))
  order by b.expiry_date, b.received_date;
$$;

grant execute on function public.expiring_batches(int) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. View · on-hand per item dari batches (untuk rekonsiliasi dengan stock.qty)
-- -----------------------------------------------------------------------------
create or replace view public.v_stock_on_hand_by_item as
  select
    i.code as item_code,
    i.unit,
    coalesce(sum(b.qty_remaining), 0) as qty_batches,
    coalesce((select qty from public.stock where item_code = i.code), 0) as qty_aggregate,
    count(b.id) filter (where b.qty_remaining > 0) as active_batches,
    min(b.expiry_date) filter (where b.qty_remaining > 0) as nearest_expiry
  from public.items i
  left join public.stock_batches b on b.item_code = i.code and b.qty_remaining > 0
  group by i.code, i.unit;

grant select on public.v_stock_on_hand_by_item to authenticated;

-- =============================================================================
-- END 0031
-- =============================================================================
