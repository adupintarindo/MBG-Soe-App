-- ============================================================================
-- 0011 · GRN → Stock auto-sync
-- Saat GRN di-mark status='ok', otomatis iterasi po_rows untuk generate
-- stock_moves (reason='receipt'). trg_moves_apply existing akan update stock.
-- Idempotent: cek dulu kalau sudah ada stock_moves dengan ref_doc='grn' dan
-- ref_no=GRN.no — kalau ada, skip (jangan double-insert).
-- Untuk status='partial', qty tetap dipakai full dari po_rows (approximation);
-- operator bisa manual adjustment lewat stock_moves kalau ada selisih real.
-- Untuk status='rejected' → tidak insert apapun.
-- ============================================================================

create or replace function public.grn_sync_stock()
returns trigger language plpgsql as $$
declare
  v_exists int;
  v_po text;
  r record;
begin
  -- Hanya kalau transisi ke 'ok' atau 'partial'
  if new.status not in ('ok','partial') then
    return new;
  end if;
  -- Skip kalau status lama sudah ok/partial (tidak re-sync)
  if tg_op = 'UPDATE' and old.status in ('ok','partial') then
    return new;
  end if;

  v_po := new.po_no;
  if v_po is null then
    return new;
  end if;

  -- Idempotency guard: sudah pernah insert stock_moves untuk GRN ini?
  select count(*) into v_exists
    from public.stock_moves
    where ref_doc = 'grn' and ref_no = new.no;
  if v_exists > 0 then
    return new;
  end if;

  for r in
    select item_code, qty, unit
      from public.po_rows
      where po_no = v_po
      order by line_no
  loop
    insert into public.stock_moves(
      item_code, delta, reason, ref_doc, ref_no, note, created_by
    ) values (
      r.item_code,
      r.qty,          -- qty positif = masuk stock
      'receipt',
      'grn',
      new.no,
      'Auto-sync dari GRN ' || new.no || ' (PO ' || v_po || ')',
      auth.uid()
    );
  end loop;

  return new;
end; $$;

drop trigger if exists trg_grn_sync_stock_ins on public.grns;
create trigger trg_grn_sync_stock_ins
  after insert on public.grns
  for each row execute function public.grn_sync_stock();

drop trigger if exists trg_grn_sync_stock_upd on public.grns;
create trigger trg_grn_sync_stock_upd
  after update of status on public.grns
  for each row execute function public.grn_sync_stock();

-- ----------------------------------------------------------------------------
-- Optional: saat PO di-deliver, auto-set status.
-- ----------------------------------------------------------------------------
create or replace function public.po_mark_delivered_on_grn()
returns trigger language plpgsql as $$
begin
  if new.status in ('ok','partial') and new.po_no is not null then
    update public.purchase_orders
      set status = 'delivered'
      where no = new.po_no
        and status in ('draft','sent','confirmed');
  end if;
  return new;
end; $$;

drop trigger if exists trg_po_delivered_from_grn on public.grns;
create trigger trg_po_delivered_from_grn
  after insert or update of status on public.grns
  for each row execute function public.po_mark_delivered_on_grn();
