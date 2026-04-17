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

-- Supplier onboarding action tracker (dari Onboarding MBG Suppliers docx + MoM)
create type public.action_status as enum (
  'open','in_progress','blocked','done','cancelled'
);
create type public.action_priority as enum ('low','medium','high','critical');
create type public.action_source as enum (
  'onboarding','mom','field','audit','ad_hoc'
);

create table public.supplier_actions (
  id bigserial primary key,
  supplier_id text references public.suppliers(id) on delete cascade,
  -- Untuk action lintas-supplier (contoh: "Set up dual sourcing") simpan daftar
  -- commodity/area yang terkait tanpa kunci hard ke suppliers
  related_scope text,
  title text not null,
  description text,
  category text,                          -- dual_sourcing, logistics, qc, pricing, admin, legal, lta, capacity
  priority public.action_priority not null default 'medium',
  status public.action_status not null default 'open',
  owner text not null default 'IFSR-WFP',
  owner_user_id uuid references auth.users(id),
  target_date date,
  done_at timestamptz,
  done_by uuid references auth.users(id),
  blocked_reason text,
  output_notes text,                      -- deliverable yang diharapkan
  source public.action_source not null default 'onboarding',
  source_ref text,                        -- mis. "Onboarding 30 Mar 2026 R1"
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create index idx_supaction_sup on public.supplier_actions(supplier_id);
create index idx_supaction_status on public.supplier_actions(status);
create index idx_supaction_prio on public.supplier_actions(priority, target_date);
create index idx_supaction_target on public.supplier_actions(target_date) where status in ('open','in_progress','blocked');

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
create trigger trg_supaction_touch before update on public.supplier_actions
  for each row execute function public.touch_updated_at();

-- Auto-stamp done_at ketika status berubah ke 'done'
create or replace function public.stamp_action_done()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.done_at = now();
    if new.done_by is null then
      new.done_by = auth.uid();
    end if;
  elsif new.status <> 'done' then
    new.done_at = null;
    new.done_by = null;
  end if;
  return new;
end; $$;

create trigger trg_supaction_done before update on public.supplier_actions
  for each row execute function public.stamp_action_done();

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
