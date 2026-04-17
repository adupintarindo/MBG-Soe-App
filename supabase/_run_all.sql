-- ============================================================================
-- MBG Soe Supply Chain · Supabase Schema · Round 6 Phase 1
-- Target: SPPG Nunumeu, Soe · WFP × IFSR × FFI
-- Port dari Dashboard_SupplyChain_MBG_Soe.html (localStorage) ke Postgres
-- ============================================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 0. ROLES & PROFILES
-- ============================================================================
create type public.user_role as enum (
  'admin',       -- Full akses (Alfatehan + Kepala SPPG)
  'operator',    -- Harian: stok, PO, GRN, invoice, receipt foto
  'ahli_gizi',   -- Menu master, BOM, kalender, custom menu
  'supplier',    -- Read PO/GRN/Invoice milik sendiri, update status GRN
  'viewer'       -- Read-only: WFP PIC, auditor
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'viewer',
  supplier_id text,                       -- Jika role=supplier, link ke suppliers.id
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  invited_by uuid references auth.users(id),
  last_login_at timestamptz
);
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_supplier on public.profiles(supplier_id) where supplier_id is not null;

-- Invite flow (admin-only create, token disumption saat magic-link dipakai)
create table public.invites (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  role public.user_role not null,
  supplier_id text,
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id)
);
create index idx_invites_email on public.invites(lower(email));
create index idx_invites_token on public.invites(token);

-- ============================================================================
-- 1. MASTER DATA: ITEMS, MENUS, BOM, SCHOOLS, SUPPLIERS
-- ============================================================================

-- Kategori bahan (BERAS, HEWANI, NABATI, SAYUR_HIJAU, SAYUR, UMBI, BUMBU, REMPAH, BUAH, SEMBAKO)
create type public.item_category as enum (
  'BERAS','HEWANI','NABATI','SAYUR_HIJAU','SAYUR','UMBI',
  'BUMBU','REMPAH','BUAH','SEMBAKO','LAIN'
);

create table public.items (
  code text primary key,                  -- mis. "Beras Putih", "Ikan Tuna"
  name_en text,
  unit text not null,                     -- kg, butir, lt, dll
  category public.item_category not null,
  price_idr numeric(12,2) not null default 0,
  vol_weekly numeric(12,3) default 0,     -- volume mingguan acuan untuk VS NNA
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_items_cat on public.items(category);

create table public.menus (
  id smallint primary key,                -- 1..14 siklus
  name text not null,
  name_en text,
  cycle_day smallint,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- BOM: berapa gram per porsi untuk tiap item di tiap menu
create table public.menu_bom (
  menu_id smallint not null references public.menus(id) on delete cascade,
  item_code text not null references public.items(code) on delete restrict,
  grams_per_porsi numeric(10,3) not null,
  primary key (menu_id, item_code)
);
create index idx_bom_item on public.menu_bom(item_code);

create type public.school_level as enum ('PAUD/TK','SD','SMP','SMA','SMK');

create table public.schools (
  id text primary key,                    -- SCH-01..09
  name text not null,
  level public.school_level not null,
  students int not null default 0,
  kelas13 int not null default 0,         -- SD kelas 1-3 (porsi kecil)
  kelas46 int not null default 0,         -- SD kelas 4-6 (porsi besar)
  guru int not null default 0,
  distance_km numeric(5,2),
  pic text,
  phone text,
  address text,
  active boolean not null default true
);

create type public.supplier_type as enum (
  'BUMN','PT','CV','UD','KOPERASI','POKTAN','TOKO','KIOS','INFORMAL'
);
create type public.supplier_status as enum ('signed','awaiting','rejected','draft');

create table public.suppliers (
  id text primary key,                    -- SUP-01..
  name text not null,
  type public.supplier_type not null,
  commodity text,                         -- comma/semicolon-separated (legacy)
  pic text,
  phone text,
  address text,
  email text,
  notes text,
  score numeric(5,2),
  status public.supplier_status not null default 'draft',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Map supplier → items yang dia jual (multi-source per item)
create table public.supplier_items (
  supplier_id text not null references public.suppliers(id) on delete cascade,
  item_code text not null references public.items(code) on delete restrict,
  is_main boolean not null default false,
  price_idr numeric(12,2),
  lead_time_days smallint,
  primary key (supplier_id, item_code)
);

-- ============================================================================
-- 2. PLANNING: MENU_ASSIGN, CUSTOM_MENUS, NON_OP
-- ============================================================================
create table public.menu_assign (
  assign_date date primary key,
  menu_id smallint not null references public.menus(id) on delete restrict,
  note text,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now()
);

create table public.custom_menus (
  menu_date date primary key,
  karbo jsonb not null default '[]'::jsonb,    -- ["Beras Putih"]
  protein jsonb not null default '[]'::jsonb,
  sayur jsonb not null default '[]'::jsonb,
  buah jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.non_op_days (
  op_date date primary key,
  reason text not null,                   -- "Libur Umum", "UAS", "Rapat", dll
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. STOCK & MOVES
-- ============================================================================
create table public.stock (
  item_code text primary key references public.items(code) on delete cascade,
  qty numeric(12,3) not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create type public.move_reason as enum (
  'receipt','consumption','adjustment','waste','transfer_in','transfer_out','opening'
);

create table public.stock_moves (
  id bigserial primary key,
  item_code text not null references public.items(code) on delete restrict,
  delta numeric(12,3) not null,           -- + untuk masuk, − untuk keluar
  reason public.move_reason not null,
  ref_doc text,                           -- 'po','grn','menu_consumption','manual'
  ref_no text,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_moves_item_date on public.stock_moves(item_code, created_at desc);
create index idx_moves_ref on public.stock_moves(ref_doc, ref_no);

-- ============================================================================
-- 4. PROCUREMENT: PO → GRN → INVOICE → RECEIPT
-- ============================================================================
create type public.po_status as enum ('draft','sent','confirmed','delivered','closed','cancelled');

create table public.purchase_orders (
  no text primary key,                    -- 'PO-2026-001'
  po_date date not null,
  supplier_id text not null references public.suppliers(id),
  delivery_date date,
  total numeric(14,2) not null default 0,
  status public.po_status not null default 'draft',
  ref_contract text,
  pay_method text,
  top text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_po_sup_date on public.purchase_orders(supplier_id, po_date desc);

create table public.po_rows (
  po_no text not null references public.purchase_orders(no) on delete cascade,
  line_no smallint not null,
  item_code text not null references public.items(code),
  qty numeric(12,3) not null,
  unit text not null,
  price numeric(12,2) not null,
  subtotal numeric(14,2) generated always as (qty*price) stored,
  primary key (po_no, line_no)
);

create type public.grn_status as enum ('pending','ok','partial','rejected');

create table public.grns (
  no text primary key,                    -- 'GRN-2026-001'
  po_no text references public.purchase_orders(no),
  grn_date date not null,
  status public.grn_status not null default 'pending',
  qc_note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create type public.invoice_status as enum ('issued','paid','overdue','cancelled');

create table public.invoices (
  no text primary key,
  po_no text references public.purchase_orders(no),
  inv_date date not null,
  supplier_id text not null references public.suppliers(id),
  total numeric(14,2) not null,
  due_date date,
  status public.invoice_status not null default 'issued',
  created_at timestamptz not null default now()
);

-- Foto bukti barang diterima
create table public.receipts (
  id uuid primary key default uuid_generate_v4(),
  ref text not null,                      -- invoice no atau po no
  note text,
  photo_url text,                         -- Supabase Storage public URL
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_receipts_ref on public.receipts(ref);

-- ============================================================================
-- 5. TRANSACTIONS LEDGER (laporan rantai pasok 50 terakhir)
-- ============================================================================
create type public.tx_type as enum (
  'po','grn','invoice','payment','adjustment','receipt'
);

create table public.transactions (
  id bigserial primary key,
  tx_date date not null,
  tx_type public.tx_type not null,
  ref_no text,
  supplier_id text references public.suppliers(id),
  amount numeric(14,2),
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_tx_date on public.transactions(tx_date desc);
create index idx_tx_sup on public.transactions(supplier_id, tx_date desc);

-- ============================================================================
-- 6. SETTINGS (porsi weight, holidays, preferences)
-- ============================================================================
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Default porsi weight: kecil=0.7, besar=1.0
insert into public.settings(key,value) values
  ('porsi_weight', '{"kecil":0.7,"besar":1.0}'::jsonb),
  ('active_cycle_days', '14'::jsonb),
  ('go_live_date', '"2026-05-04"'::jsonb)
on conflict (key) do nothing;

-- ============================================================================
-- 7. AUDIT HELPERS
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_items_touch before update on public.items
  for each row execute function public.touch_updated_at();
create trigger trg_stock_touch before update on public.stock
  for each row execute function public.touch_updated_at();
create trigger trg_settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- Auto-sync stock saat stock_moves insert
create or replace function public.apply_stock_move()
returns trigger language plpgsql as $$
begin
  insert into public.stock(item_code, qty, updated_at, updated_by)
    values (new.item_code, new.delta, now(), new.created_by)
  on conflict (item_code) do update
    set qty = public.stock.qty + new.delta,
        updated_at = now(),
        updated_by = new.created_by;
  return new;
end; $$;

create trigger trg_moves_apply after insert on public.stock_moves
  for each row execute function public.apply_stock_move();

-- Helper: current user role
create or replace function public.current_role()
returns public.user_role language sql stable as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.current_supplier_id()
returns text language sql stable as $$
  select supplier_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(public.current_role() = 'admin', false);
$$;
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
-- ============================================================================
-- Engine functions & RPC
-- Port dari Dashboard_SupplyChain_MBG_Soe.html (MBG_ENGINE) ke SQL
-- ============================================================================

-- Hitung jumlah porsi kecil/besar/guru untuk tanggal tertentu
create or replace function public.porsi_counts(p_date date)
returns table(kecil int, besar int, guru int, total int, operasional boolean)
language plpgsql stable as $$
declare
  v_kecil int := 0;
  v_besar int := 0;
  v_guru int := 0;
  v_nonop boolean := false;
begin
  -- non-op?
  select true into v_nonop from public.non_op_days where op_date = p_date;
  if coalesce(v_nonop,false) then
    return query select 0,0,0,0,false;
    return;
  end if;

  -- weekend?
  if extract(dow from p_date) in (0,6) then
    return query select 0,0,0,0,false;
    return;
  end if;

  select
    coalesce(sum(case when level in ('PAUD/TK') then students else 0 end),0)
    + coalesce(sum(case when level = 'SD' then kelas13 else 0 end),0),
    coalesce(sum(case when level = 'SD' then kelas46 else 0 end),0)
    + coalesce(sum(case when level in ('SMP','SMA','SMK') then students else 0 end),0),
    coalesce(sum(guru),0)
  into v_kecil, v_besar, v_guru
  from public.schools where active = true;

  return query select v_kecil, v_besar, v_guru, (v_kecil+v_besar+v_guru), true;
end; $$;

-- Porsi effective (untuk scaling BOM): kecil*w_kecil + (besar+guru)*w_besar
create or replace function public.porsi_effective(p_date date)
returns numeric language plpgsql stable as $$
declare
  v_cnt record;
  v_wk numeric;
  v_wb numeric;
begin
  select kecil, besar, guru into v_cnt
    from public.porsi_counts(p_date);
  if v_cnt is null then return 0; end if;

  select (value->>'kecil')::numeric into v_wk from public.settings where key='porsi_weight';
  select (value->>'besar')::numeric into v_wb from public.settings where key='porsi_weight';
  v_wk := coalesce(v_wk, 0.7);
  v_wb := coalesce(v_wb, 1.0);

  return coalesce(v_cnt.kecil,0) * v_wk + (coalesce(v_cnt.besar,0) + coalesce(v_cnt.guru,0)) * v_wb;
end; $$;

-- Kebutuhan bahan per tanggal (kg per item, scaled oleh porsi_effective)
create or replace function public.requirement_for_date(p_date date)
returns table(item_code text, qty numeric, unit text, category public.item_category, price_idr numeric)
language plpgsql stable as $$
declare
  v_menu smallint;
  v_eff numeric;
begin
  v_eff := public.porsi_effective(p_date);
  if v_eff <= 0 then
    return;
  end if;

  -- Resolve menu: custom_menus dulu, lalu menu_assign
  if exists (select 1 from public.custom_menus where menu_date = p_date) then
    -- Custom menu: tidak refer menus.id, return dari jsonb (flatten)
    return query
      select
        it.code as item_code,
        (100.0 * v_eff / 1000.0)::numeric as qty,  -- default 100g/porsi untuk item custom
        it.unit,
        it.category,
        it.price_idr
      from public.custom_menus cm,
           jsonb_array_elements_text(cm.karbo || cm.protein || cm.sayur || cm.buah) as elem(val)
           join public.items it on it.code = elem.val
      where cm.menu_date = p_date;
    return;
  end if;

  select menu_id into v_menu from public.menu_assign where assign_date = p_date;
  if v_menu is null then
    return;
  end if;

  return query
    select
      b.item_code,
      (b.grams_per_porsi * v_eff / 1000.0)::numeric as qty,
      it.unit,
      it.category,
      it.price_idr
    from public.menu_bom b
    join public.items it on it.code = b.item_code
    where b.menu_id = v_menu;
end; $$;

-- Shortage scan: per tanggal, return item dimana kebutuhan > stok saat ini
create or replace function public.stock_shortage_for_date(p_date date)
returns table(item_code text, required numeric, on_hand numeric, gap numeric, unit text)
language plpgsql stable as $$
begin
  return query
    select r.item_code,
           r.qty as required,
           coalesce(s.qty, 0) as on_hand,
           greatest(r.qty - coalesce(s.qty, 0), 0) as gap,
           r.unit
    from public.requirement_for_date(p_date) r
    left join public.stock s on s.item_code = r.item_code
    order by gap desc;
end; $$;

-- Upcoming shortages (horizon N hari ke depan, return tanggal2 dengan shortage)
create or replace function public.upcoming_shortages(p_horizon int default 14)
returns table(op_date date, short_items int, total_gap_kg numeric)
language plpgsql stable as $$
declare
  d date;
  i int := 0;
begin
  d := current_date;
  while i < p_horizon loop
    return query
      select d as op_date,
             count(*)::int,
             sum(gap)
      from public.stock_shortage_for_date(d)
      where gap > 0
      group by 1
      having count(*) > 0;
    d := d + 1;
    i := i + 1;
  end loop;
end; $$;

-- ============================================================================
-- Invite/accept flow: admin create invite, user klaim via token
-- ============================================================================
-- Admin buat invite (dipanggil dari app via service client atau RPC)
create or replace function public.create_invite(
  p_email text,
  p_role public.user_role,
  p_supplier_id text default null
) returns text language plpgsql security definer as $$
declare
  v_token text;
  v_caller_role public.user_role;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is distinct from 'admin' then
    raise exception 'Only admin can create invites';
  end if;

  insert into public.invites(email, role, supplier_id, created_by)
  values (lower(trim(p_email)), p_role, p_supplier_id, auth.uid())
  returning token into v_token;

  return v_token;
end; $$;

-- Saat user login pertama kali via magic link, trigger ini populate profiles
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_invite record;
begin
  select * into v_invite from public.invites
    where lower(email) = lower(new.email)
      and used_at is null
      and expires_at > now()
    order by created_at desc limit 1;

  if v_invite is null then
    -- Tanpa invite → default viewer, nonaktif, admin harus aktifkan manual
    insert into public.profiles(id, email, full_name, role, active)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'viewer', false);
  else
    insert into public.profiles(id, email, full_name, role, supplier_id, active, invited_by)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name',
            v_invite.role, v_invite.supplier_id, true, v_invite.created_by);
    update public.invites set used_at = now(), used_by = new.id where id = v_invite.id;
  end if;

  return new;
end; $$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- ============================================================================
-- Seed data · MBG Soe
-- Port dari Dashboard_SupplyChain_MBG_Soe.html (SCHOOLS, SUPPLIERS ringkas)
-- Jalankan SETELAH 0001..0003. Untuk dev local / first deploy.
-- ============================================================================

-- ---- SCHOOLS (9 sekolah cluster Soe) --------------------------------------
insert into public.schools(id,name,level,students,kelas13,kelas46,guru,distance_km,pic,phone,address) values
 ('SCH-01','PAUD FETO MONE','PAUD/TK',45,0,0,5,1.0,'Kepala PAUD FETO MONE','+62 852-3700-1101','Kota Soe · TTS'),
 ('SCH-02','PAUD GENERASI UNGGUL','PAUD/TK',19,0,0,3,1.2,'Kepala PAUD Generasi Unggul','+62 852-3700-1102','Kota Soe · TTS'),
 ('SCH-03','PAUD TALENTA','PAUD/TK',14,0,0,4,1.4,'Kepala PAUD Talenta','+62 852-3700-1103','Kota Soe · TTS'),
 ('SCH-04','SD INPRES KOBELETE','SD',372,188,184,16,2.1,'Kepala SD Inpres Kobelete','+62 813-3700-2201','Kobelete · TTS'),
 ('SCH-05','SD INPRES NUNUMEU','SD',405,212,193,26,0.4,'Kepala SD Inpres Nunumeu','+62 813-3700-2202','Jl. Nunumeu · Kota Soe'),
 ('SCH-06','SD NEGERI OEKLANI','SD',76,39,37,4,3.6,'Kepala SD Negeri Oeklani','+62 813-3700-2203','Oeklani · TTS'),
 ('SCH-07','SMP KRISTEN 1 SOE','SMP',252,0,0,7,1.8,'Kepala SMP Kristen 1 Soe','+62 812-3700-3301','Kota Soe · TTS'),
 ('SCH-08','SMA NEGERI 1 SOE','SMA',859,0,0,33,2.0,'Kepala SMA Negeri 1 Soe','+62 812-3700-3302','Jl. Soekarno-Hatta · Soe'),
 ('SCH-09','SMK CAHAYA LENTERA','SMK',13,0,0,7,2.5,'Kepala SMK Cahaya Lentera','+62 812-3700-3303','Kota Soe · TTS')
on conflict (id) do update set
  students=excluded.students, kelas13=excluded.kelas13, kelas46=excluded.kelas46,
  guru=excluded.guru, distance_km=excluded.distance_km;

-- ---- ITEMS (subset · tambahkan sesuai master di HTML) ---------------------
-- Karbohidrat
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Beras Putih','White Rice','kg','BERAS',14000,450),
 ('Fortification Rice','Fortified Rice','kg','BERAS',16000,0),
 ('Kentang','Potato','kg','UMBI',18000,85),
 ('Ubi Jalar','Sweet Potato','kg','UMBI',12000,40)
on conflict (code) do nothing;

-- Protein hewani
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Ayam Segar','Fresh Chicken','kg','HEWANI',45000,170),
 ('Telur Ayam','Chicken Egg','kg','HEWANI',32000,90),
 ('Ikan Tuna','Tuna','kg','HEWANI',55000,60),
 ('Ikan Tongkol','Skipjack','kg','HEWANI',42000,50),
 ('Ikan Kembung','Mackerel','kg','HEWANI',38000,40),
 ('Daging Sapi','Beef','kg','HEWANI',130000,20)
on conflict (code) do nothing;

-- Protein nabati
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Tahu','Tofu','kg','NABATI',12000,60),
 ('Tempe','Tempeh','kg','NABATI',14000,55)
on conflict (code) do nothing;

-- Sayur
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Wortel','Carrot','kg','SAYUR',15000,70),
 ('Buncis','Green Bean','kg','SAYUR',18000,40),
 ('Kacang Panjang','Long Bean','kg','SAYUR',16000,35),
 ('Bayam','Spinach','kg','SAYUR_HIJAU',12000,55),
 ('Sawi Hijau','Mustard Greens','kg','SAYUR_HIJAU',13000,50),
 ('Kangkung','Water Spinach','kg','SAYUR_HIJAU',10000,40),
 ('Labu Siam','Chayote','kg','SAYUR',9000,25),
 ('Jagung Manis','Sweet Corn','kg','SAYUR',14000,30)
on conflict (code) do nothing;

-- Bumbu & Rempah
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Bawang Merah','Shallot','kg','BUMBU',38000,20),
 ('Bawang Putih','Garlic','kg','BUMBU',42000,18),
 ('Cabai Merah','Red Chili','kg','BUMBU',55000,10),
 ('Jahe','Ginger','kg','REMPAH',25000,8),
 ('Kunyit','Turmeric','kg','REMPAH',22000,6),
 ('Garam','Salt','kg','SEMBAKO',8000,12),
 ('Gula Pasir','Sugar','kg','SEMBAKO',16000,15),
 ('Minyak Goreng','Cooking Oil','lt','SEMBAKO',18000,40),
 ('Kecap Manis','Sweet Soy','lt','SEMBAKO',28000,8)
on conflict (code) do nothing;

-- Buah
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Buah - Pisang','Banana','kg','BUAH',12000,80),
 ('Buah - Pepaya','Papaya','kg','BUAH',10000,60),
 ('Buah - Melon','Melon','kg','BUAH',18000,40),
 ('Buah - Semangka','Watermelon','kg','BUAH',9000,70),
 ('Buah - Jeruk','Orange','kg','BUAH',22000,50)
on conflict (code) do nothing;

-- ---- MENUS (14-day cycle ringkas · tambah BOM nanti via UI) ---------------
insert into public.menus(id,name,name_en,cycle_day) values
 (1,'Nasi Ayam Wortel Jagung','Rice w/ Chicken & Veg',1),
 (2,'Nasi Ikan Tuna Tumis Sayur','Rice w/ Tuna & Stir-fry',2),
 (3,'Nasi Telur Balado Buncis','Rice w/ Egg Balado & Green Bean',3),
 (4,'Nasi Ikan Kembung Kangkung','Rice w/ Mackerel & Water Spinach',4),
 (5,'Nasi Ayam Kecap Bayam','Rice w/ Soy Chicken & Spinach',5),
 (6,'Nasi Tahu Tempe Sawi','Rice w/ Tofu-Tempeh & Mustard',6),
 (7,'Nasi Ikan Tongkol Labu Siam','Rice w/ Skipjack & Chayote',7),
 (8,'Nasi Telur Dadar Wortel','Rice w/ Omelette & Carrot',8),
 (9,'Nasi Ayam Goreng Kacang Panjang','Rice w/ Fried Chicken & Long Bean',9),
 (10,'Nasi Daging Cincang Sayur Asem','Rice w/ Minced Beef & Veg Soup',10),
 (11,'Nasi Ikan Tuna Bumbu Kuning','Rice w/ Yellow Tuna',11),
 (12,'Nasi Ayam Sayur Lodeh','Rice w/ Chicken & Coconut Veg',12),
 (13,'Nasi Tahu Rica Sawi','Rice w/ Spicy Tofu & Mustard',13),
 (14,'Nasi Ikan Kembung Bayam','Rice w/ Mackerel & Spinach',14)
on conflict (id) do nothing;

-- ---- SIMPLIFIED BOM (gram per porsi) ---------------
-- NOTE: nilai ini placeholder; validasi dengan ahli gizi sebelum go-live.
insert into public.menu_bom(menu_id,item_code,grams_per_porsi) values
 (1,'Beras Putih',100),(1,'Ayam Segar',45),(1,'Wortel',30),(1,'Jagung Manis',25),(1,'Minyak Goreng',5),(1,'Bawang Merah',3),(1,'Bawang Putih',2),(1,'Garam',1),(1,'Buah - Pisang',80),
 (2,'Beras Putih',100),(2,'Ikan Tuna',50),(2,'Kangkung',35),(2,'Bawang Putih',2),(2,'Cabai Merah',1),(2,'Minyak Goreng',5),(2,'Buah - Pepaya',80),
 (3,'Beras Putih',100),(3,'Telur Ayam',55),(3,'Buncis',35),(3,'Cabai Merah',2),(3,'Bawang Merah',3),(3,'Minyak Goreng',5),(3,'Buah - Melon',80),
 (4,'Beras Putih',100),(4,'Ikan Kembung',50),(4,'Kangkung',35),(4,'Bawang Putih',2),(4,'Minyak Goreng',5),(4,'Buah - Semangka',80),
 (5,'Beras Putih',100),(5,'Ayam Segar',45),(5,'Bayam',35),(5,'Kecap Manis',5),(5,'Bawang Putih',2),(5,'Minyak Goreng',5),(5,'Buah - Jeruk',80),
 (6,'Beras Putih',100),(6,'Tahu',40),(6,'Tempe',30),(6,'Sawi Hijau',35),(6,'Bawang Merah',3),(6,'Kecap Manis',3),(6,'Minyak Goreng',5),(6,'Buah - Pisang',80),
 (7,'Beras Putih',100),(7,'Ikan Tongkol',50),(7,'Labu Siam',35),(7,'Bawang Putih',2),(7,'Minyak Goreng',5),(7,'Buah - Pepaya',80),
 (8,'Beras Putih',100),(8,'Telur Ayam',55),(8,'Wortel',30),(8,'Bawang Merah',3),(8,'Minyak Goreng',5),(8,'Buah - Melon',80),
 (9,'Beras Putih',100),(9,'Ayam Segar',45),(9,'Kacang Panjang',35),(9,'Bawang Putih',2),(9,'Minyak Goreng',6),(9,'Buah - Semangka',80),
 (10,'Beras Putih',100),(10,'Daging Sapi',35),(10,'Wortel',25),(10,'Kacang Panjang',20),(10,'Bawang Merah',3),(10,'Bawang Putih',2),(10,'Garam',1),(10,'Buah - Jeruk',80),
 (11,'Beras Putih',100),(11,'Ikan Tuna',50),(11,'Kunyit',1),(11,'Jahe',1),(11,'Bawang Merah',3),(11,'Minyak Goreng',5),(11,'Buncis',30),(11,'Buah - Pisang',80),
 (12,'Beras Putih',100),(12,'Ayam Segar',45),(12,'Labu Siam',25),(12,'Wortel',20),(12,'Bawang Merah',3),(12,'Bawang Putih',2),(12,'Minyak Goreng',5),(12,'Buah - Pepaya',80),
 (13,'Beras Putih',100),(13,'Tahu',50),(13,'Sawi Hijau',35),(13,'Cabai Merah',3),(13,'Bawang Merah',3),(13,'Minyak Goreng',5),(13,'Buah - Melon',80),
 (14,'Beras Putih',100),(14,'Ikan Kembung',50),(14,'Bayam',35),(14,'Bawang Putih',2),(14,'Minyak Goreng',5),(14,'Buah - Semangka',80)
on conflict (menu_id,item_code) do nothing;

-- ---- SUPPLIERS (12 · hasil Vendor Matrix) ----------------------------------
insert into public.suppliers(id,name,type,commodity,pic,phone,address,email,notes,score,status) values
 ('SUP-01','Bulog NTT','BUMN','Beras medium, Beras premium','Kepala Bulog NTT','+62 380-821-833','Kupang · NTT','bulog.ntt@bulog.co.id','Backbone beras · 14.323 kg Mar-Jun · ⏳ LTA awaiting sign',87.6,'awaiting'),
 ('SUP-02','CV Lintas Cakrawala','CV','Ayam segar, Telur ayam, Ikan Tuna, Ikan Tongkol, Ikan Kembung','Direktur CV Lintas Cakrawala','+62 812-3888-1100','Kupang · NTT','info@lintascakrawala.co.id','Protein hewani utama',82.3,'signed'),
 ('SUP-03','UD Kurnia Jaya','UD','Kentang, Wortel, Buncis, Kacang Panjang, Bawang Merah, Bawang Putih','Pemilik UD Kurnia Jaya','+62 813-3801-2202','Soe · TTS','kurniajaya.soe@gmail.com','Sayur & bumbu segar',78.1,'signed'),
 ('SUP-04','Koperasi Fetomone','KOPERASI','Sayur hijau, Bayam, Sawi, Kangkung','Ketua Koperasi Fetomone','+62 852-3700-4401','Soe · TTS','koperasi.fetomone@gmail.com','Produk lokal petani',74.5,'signed'),
 ('SUP-05','UD Buah Sehat','UD','Buah - Pisang, Buah - Pepaya, Buah - Melon, Buah - Semangka, Buah - Jeruk','Pemilik UD Buah Sehat','+62 813-3801-5503','Kupang · NTT','buahsehat.nt@gmail.com','Buah segar harian',79.2,'signed'),
 ('SUP-06','CV Rajawali Pangan','CV','Tahu, Tempe, Minyak goreng, Gula, Garam','Direktur CV Rajawali','+62 812-3888-6601','Kupang · NTT','rajawali@gmail.com','Sembako & nabati',76.0,'signed'),
 ('SUP-07','Poktan Tunas Harapan','POKTAN','Jagung manis, Labu siam, Ubi jalar','Ketua Poktan Tunas Harapan','+62 852-3700-7703','Oeklani · TTS','poktan.tunas@gmail.com','Petani lokal',71.2,'signed'),
 ('SUP-08','Toko Sumber Rejeki','TOKO','Cabai, Jahe, Kunyit, Lengkuas, Sereh, Ketumbar','Pemilik Toko Sumber Rejeki','+62 813-3801-8804','Soe · TTS','sumberejeki.soe@gmail.com','Bumbu & rempah',72.8,'signed'),
 ('SUP-09','PT Nutri Fortifikasi','PT','Fortification rice','GM PT Nutri Fortifikasi','+62 21-555-9901','Jakarta','info@nutrifortifikasi.co.id','Fortification rice khusus MBG',80.5,'signed'),
 ('SUP-10','CV Mandiri Daging','CV','Daging sapi','Direktur CV Mandiri Daging','+62 812-3888-1010','Kupang · NTT','mandiridaging@gmail.com','Daging sapi mingguan',77.4,'signed'),
 ('SUP-11','Glory Supplier','CV','—','—','—','—','—','❌ Rejected (Vendor Matrix score <70)',58.0,'rejected'),
 ('SUP-12','Kios Louis','KIOS','—','—','—','—','—','❌ Rejected (non-compliant)',52.0,'rejected')
on conflict (id) do nothing;

-- supplier_items map (contoh untuk item utama)
insert into public.supplier_items(supplier_id,item_code,is_main,price_idr) values
 ('SUP-01','Beras Putih',true,14000),
 ('SUP-02','Ayam Segar',true,45000),
 ('SUP-02','Telur Ayam',true,32000),
 ('SUP-02','Ikan Tuna',true,55000),
 ('SUP-02','Ikan Tongkol',true,42000),
 ('SUP-02','Ikan Kembung',true,38000),
 ('SUP-03','Kentang',true,18000),
 ('SUP-03','Wortel',true,15000),
 ('SUP-03','Buncis',true,18000),
 ('SUP-03','Kacang Panjang',true,16000),
 ('SUP-03','Bawang Merah',true,38000),
 ('SUP-03','Bawang Putih',true,42000),
 ('SUP-04','Bayam',true,12000),
 ('SUP-04','Sawi Hijau',true,13000),
 ('SUP-04','Kangkung',true,10000),
 ('SUP-05','Buah - Pisang',true,12000),
 ('SUP-05','Buah - Pepaya',true,10000),
 ('SUP-05','Buah - Melon',true,18000),
 ('SUP-05','Buah - Semangka',true,9000),
 ('SUP-05','Buah - Jeruk',true,22000),
 ('SUP-06','Tahu',true,12000),
 ('SUP-06','Tempe',true,14000),
 ('SUP-06','Minyak Goreng',true,18000),
 ('SUP-06','Gula Pasir',true,16000),
 ('SUP-06','Garam',true,8000),
 ('SUP-06','Kecap Manis',true,28000),
 ('SUP-07','Jagung Manis',true,14000),
 ('SUP-07','Labu Siam',true,9000),
 ('SUP-07','Ubi Jalar',true,12000),
 ('SUP-08','Cabai Merah',true,55000),
 ('SUP-08','Jahe',true,25000),
 ('SUP-08','Kunyit',true,22000),
 ('SUP-09','Fortification Rice',true,16000),
 ('SUP-10','Daging Sapi',true,130000)
on conflict (supplier_id,item_code) do nothing;

-- Opening stock (kosong sementara; operator input via UI sebelum go-live)

-- ---- MENU_ASSIGN go-live (14-day cycle dari 2026-05-04) --------------------
-- Mon=1 Tue=2 ... skip weekend; auto 14-day rotation
do $$
declare
  d date;
  i int := 0;
  m smallint := 1;
begin
  d := date '2026-05-04';
  while d < date '2026-07-31' loop
    if extract(dow from d) not in (0,6) then
      insert into public.menu_assign(assign_date, menu_id)
      values (d, m)
      on conflict (assign_date) do nothing;
      m := m + 1; if m > 14 then m := 1; end if;
      i := i + 1;
    end if;
    d := d + 1;
  end loop;
end $$;
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
