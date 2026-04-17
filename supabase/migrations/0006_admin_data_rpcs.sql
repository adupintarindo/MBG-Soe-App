-- ============================================================================
-- 0006 · Admin Data RPCs
-- 3 reset operations + role guard. Master data CRUD goes through normal table
-- writes (RLS-gated by 0002), so no extra RPC needed for that.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Reset transaksi (procurement + ledger + stock movements)
--    Wipe: receipts, transactions, invoices, grns, po_rows, purchase_orders,
--          stock_moves. Reset stock.qty = 0 for all items.
--    Keep: items, menus, menu_bom, schools, suppliers, supplier_items,
--          menu_assign, custom_menus, non_op_days, settings, profiles.
-- ----------------------------------------------------------------------------
create or replace function public.admin_reset_transactional()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.user_role;
  v_counts jsonb;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is distinct from 'admin' then
    raise exception 'Only admin can reset data';
  end if;

  v_counts := jsonb_build_object(
    'receipts',        (select count(*) from public.receipts),
    'transactions',    (select count(*) from public.transactions),
    'invoices',        (select count(*) from public.invoices),
    'grns',            (select count(*) from public.grns),
    'po_rows',         (select count(*) from public.po_rows),
    'purchase_orders', (select count(*) from public.purchase_orders),
    'stock_moves',     (select count(*) from public.stock_moves),
    'stock_zeroed',    (select count(*) from public.stock where qty <> 0)
  );

  -- Truncate respects FK ordering. po_rows cascades from purchase_orders.
  delete from public.receipts;
  delete from public.transactions;
  delete from public.invoices;
  delete from public.grns;
  delete from public.purchase_orders;  -- cascades po_rows
  delete from public.stock_moves;
  update public.stock set qty = 0, updated_at = now(), updated_by = auth.uid()
   where qty <> 0;

  return v_counts;
end; $$;

-- ----------------------------------------------------------------------------
-- 2. Reset stok saja
--    Set stock.qty = 0 untuk semua item, log opening move biar ada audit.
--    Keep semua dokumen procurement & transaksi.
-- ----------------------------------------------------------------------------
create or replace function public.admin_reset_stock()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.user_role;
  v_affected int;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is distinct from 'admin' then
    raise exception 'Only admin can reset stock';
  end if;

  -- Insert 'opening' moves dengan delta negatif untuk meng-net ke 0.
  -- trg_moves_apply akan otomatis update stock.qty.
  insert into public.stock_moves(item_code, delta, reason, ref_doc, note, created_by)
  select s.item_code, -s.qty, 'opening', 'reset', 'admin reset stock', auth.uid()
    from public.stock s
   where s.qty <> 0;

  get diagnostics v_affected = row_count;

  return jsonb_build_object('items_reset', v_affected);
end; $$;

-- ----------------------------------------------------------------------------
-- 3. Reset master data
--    Hapus items, menus, menu_bom, suppliers, supplier_items, schools.
--    REQUIRED PRECONDITION: tabel transaksi sudah kosong (PO/GRN/invoice/stock
--    refer ke master). Kalau belum, raise exception.
-- ----------------------------------------------------------------------------
create or replace function public.admin_reset_master()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.user_role;
  v_blockers jsonb;
  v_blocking int;
  v_counts jsonb;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is distinct from 'admin' then
    raise exception 'Only admin can reset master data';
  end if;

  v_blockers := jsonb_build_object(
    'purchase_orders', (select count(*) from public.purchase_orders),
    'grns',            (select count(*) from public.grns),
    'invoices',        (select count(*) from public.invoices),
    'stock_moves',     (select count(*) from public.stock_moves),
    'transactions',    (select count(*) from public.transactions),
    'menu_assign',     (select count(*) from public.menu_assign),
    'custom_menus',    (select count(*) from public.custom_menus)
  );

  v_blocking :=
      (select count(*) from public.purchase_orders)
    + (select count(*) from public.grns)
    + (select count(*) from public.invoices)
    + (select count(*) from public.stock_moves)
    + (select count(*) from public.transactions)
    + (select count(*) from public.menu_assign)
    + (select count(*) from public.custom_menus);

  if v_blocking > 0 then
    raise exception 'Master data masih dipakai. Hapus transaksi & assignment dulu (Reset Transaksi). Detail: %', v_blockers;
  end if;

  v_counts := jsonb_build_object(
    'menu_bom',       (select count(*) from public.menu_bom),
    'menus',          (select count(*) from public.menus),
    'supplier_items', (select count(*) from public.supplier_items),
    'suppliers',      (select count(*) from public.suppliers),
    'schools',        (select count(*) from public.schools),
    'stock',          (select count(*) from public.stock),
    'items',          (select count(*) from public.items)
  );

  delete from public.menu_bom;
  delete from public.menus;
  delete from public.supplier_items;
  delete from public.suppliers;
  delete from public.schools;
  delete from public.stock;     -- FK ke items
  delete from public.items;

  return v_counts;
end; $$;

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
revoke all on function public.admin_reset_transactional() from public;
revoke all on function public.admin_reset_stock()         from public;
revoke all on function public.admin_reset_master()        from public;

grant execute on function public.admin_reset_transactional() to authenticated;
grant execute on function public.admin_reset_stock()         to authenticated;
grant execute on function public.admin_reset_master()        to authenticated;
