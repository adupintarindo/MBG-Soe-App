-- ============================================================================
-- Row-Level Security policies
-- Role matrix:
--   admin      → full CRUD everything
--   operator   → read everything, write stock/po/grn/invoice/receipt/transaction/menu_assign
--   ahli_gizi  → read everything, write menus/menu_bom/custom_menus/items/settings
--   supplier   → read hanya yang ref supplier_id = dirinya (PO, GRN, invoice, items yg dia jual)
--   viewer     → read-only semua (kecuali invites & profiles orang lain)
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.invites        enable row level security;
alter table public.items          enable row level security;
alter table public.menus          enable row level security;
alter table public.menu_bom       enable row level security;
alter table public.schools        enable row level security;
alter table public.suppliers      enable row level security;
alter table public.supplier_items enable row level security;
alter table public.menu_assign    enable row level security;
alter table public.custom_menus   enable row level security;
alter table public.non_op_days    enable row level security;
alter table public.stock          enable row level security;
alter table public.stock_moves    enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_rows        enable row level security;
alter table public.grns           enable row level security;
alter table public.invoices       enable row level security;
alter table public.receipts       enable row level security;
alter table public.transactions   enable row level security;
alter table public.settings       enable row level security;

-- ============================================================================
-- PROFILES
-- ============================================================================
create policy "profiles: self read" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: admin all read" on public.profiles
  for select using (public.is_admin());
create policy "profiles: self update own basics" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles: admin full write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- INVITES (admin-only)
-- ============================================================================
create policy "invites: admin full" on public.invites
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- MASTER DATA · ITEMS / MENUS / BOM / SCHOOLS
-- ============================================================================
-- Read: authenticated apapun
create policy "items: auth read" on public.items for select using (auth.uid() is not null);
create policy "menus: auth read" on public.menus for select using (auth.uid() is not null);
create policy "bom: auth read"   on public.menu_bom for select using (auth.uid() is not null);
create policy "schools: auth read" on public.schools for select using (auth.uid() is not null);

-- Write: admin atau ahli_gizi
create policy "items: gz/admin write" on public.items
  for all using (public.current_role() in ('admin','ahli_gizi'))
  with check (public.current_role() in ('admin','ahli_gizi'));
create policy "menus: gz/admin write" on public.menus
  for all using (public.current_role() in ('admin','ahli_gizi'))
  with check (public.current_role() in ('admin','ahli_gizi'));
create policy "bom: gz/admin write" on public.menu_bom
  for all using (public.current_role() in ('admin','ahli_gizi'))
  with check (public.current_role() in ('admin','ahli_gizi'));
create policy "schools: admin write" on public.schools
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
-- Read: authenticated (supplier juga boleh lihat semua supplier untuk comparing)
create policy "suppliers: auth read" on public.suppliers for select using (auth.uid() is not null);
create policy "suppliers: admin write" on public.suppliers
  for all using (public.is_admin()) with check (public.is_admin());

-- supplier_items: supplier boleh read miliknya; admin/operator read semua
create policy "supitems: read own or staff" on public.supplier_items
  for select using (
    auth.uid() is not null and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier' and supplier_id = public.current_supplier_id())
    )
  );
create policy "supitems: admin write" on public.supplier_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- PLANNING
-- ============================================================================
create policy "menu_assign: auth read" on public.menu_assign for select using (auth.uid() is not null);
create policy "menu_assign: op/gz/admin write" on public.menu_assign
  for all using (public.current_role() in ('admin','operator','ahli_gizi'))
  with check (public.current_role() in ('admin','operator','ahli_gizi'));

create policy "custom: auth read" on public.custom_menus for select using (auth.uid() is not null);
create policy "custom: gz/admin write" on public.custom_menus
  for all using (public.current_role() in ('admin','ahli_gizi'))
  with check (public.current_role() in ('admin','ahli_gizi'));

create policy "nonop: auth read" on public.non_op_days for select using (auth.uid() is not null);
create policy "nonop: op/admin write" on public.non_op_days
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- ============================================================================
-- STOCK & MOVES
-- ============================================================================
create policy "stock: auth read" on public.stock for select using (auth.uid() is not null);
create policy "stock: op/admin write" on public.stock
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

create policy "moves: auth read" on public.stock_moves for select using (auth.uid() is not null);
create policy "moves: op/admin insert" on public.stock_moves
  for insert with check (public.current_role() in ('admin','operator'));

-- ============================================================================
-- PO / GRN / INVOICE / RECEIPT
-- ============================================================================
-- Supplier hanya lihat yang milik dia
create policy "po: read staff or own-supplier" on public.purchase_orders
  for select using (
    auth.uid() is not null and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier' and supplier_id = public.current_supplier_id())
    )
  );
create policy "po: op/admin write" on public.purchase_orders
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

create policy "po_rows: read via parent" on public.po_rows
  for select using (exists (select 1 from public.purchase_orders p where p.no = po_no));
create policy "po_rows: op/admin write" on public.po_rows
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

create policy "grn: read staff or own-supplier" on public.grns
  for select using (
    auth.uid() is not null and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier' and exists (
        select 1 from public.purchase_orders p
        where p.no = grns.po_no and p.supplier_id = public.current_supplier_id()
      ))
    )
  );
create policy "grn: op/admin write" on public.grns
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));
-- Supplier boleh update status QC sendiri (ok/partial/rejected) pada GRN PO miliknya
create policy "grn: supplier update own status" on public.grns
  for update using (
    public.current_role() = 'supplier' and exists (
      select 1 from public.purchase_orders p
      where p.no = grns.po_no and p.supplier_id = public.current_supplier_id()
    )
  ) with check (
    public.current_role() = 'supplier' and exists (
      select 1 from public.purchase_orders p
      where p.no = grns.po_no and p.supplier_id = public.current_supplier_id()
    )
  );

create policy "invoice: read staff or own-supplier" on public.invoices
  for select using (
    auth.uid() is not null and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier' and supplier_id = public.current_supplier_id())
    )
  );
create policy "invoice: op/admin write" on public.invoices
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

create policy "receipts: auth read" on public.receipts for select using (auth.uid() is not null);
create policy "receipts: op/admin insert" on public.receipts
  for insert with check (public.current_role() in ('admin','operator'));
create policy "receipts: op/admin update" on public.receipts
  for update using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));
create policy "receipts: admin delete" on public.receipts
  for delete using (public.is_admin());

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
create policy "tx: read staff or own-supplier" on public.transactions
  for select using (
    auth.uid() is not null and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier' and supplier_id = public.current_supplier_id())
    )
  );
create policy "tx: op/admin insert" on public.transactions
  for insert with check (public.current_role() in ('admin','operator'));

-- ============================================================================
-- SETTINGS
-- ============================================================================
create policy "settings: auth read" on public.settings for select using (auth.uid() is not null);
create policy "settings: gz/admin write" on public.settings
  for all using (public.current_role() in ('admin','ahli_gizi'))
  with check (public.current_role() in ('admin','ahli_gizi'));
