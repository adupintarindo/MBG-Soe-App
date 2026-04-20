-- ============================================================================
-- 0040 · Idempotent retrofit untuk schema awal (0001_schema.sql)
-- ----------------------------------------------------------------------------
-- Migrasi 0001 memakai `create table` & `create type` tanpa "if not exists".
-- File ini aman di-run berkali-kali di fresh install untuk memastikan
-- enum & check constraint dipasang tanpa error duplicate.
--
-- Pattern yang dipakai:
--   - DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--     untuk CREATE TYPE yang tidak punya IF NOT EXISTS syntax.
--   - ALTER TABLE ... ADD COLUMN IF NOT EXISTS untuk kolom opsional.
-- ============================================================================

-- --- 1. Enum guards: bikin hanya kalau belum ada -----------------------
do $$ begin
  create type public.user_role as enum ('admin','operator','ahli_gizi','supplier','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_category as enum (
    'BERAS','HEWANI','NABATI','SAYUR_HIJAU','SAYUR','UMBI',
    'BUMBU','REMPAH','BUAH','SEMBAKO','LAIN'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.school_level as enum ('PAUD/TK','SD','SMP','SMA','SMK');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.supplier_type as enum (
    'PT','CV','UD','TOKO','KOPERASI','PERSEORANGAN','BUMDES','LAIN'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.supplier_status as enum ('signed','awaiting','rejected','draft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action_status as enum (
    'open','in_progress','resolved','cancelled','waived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action_priority as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action_source as enum (
    'manual','reval','ncr','audit','onboarding','system'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.move_reason as enum (
    'grn','consume','adjust','loss','transfer','return'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.po_status as enum ('draft','sent','confirmed','delivered','closed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.grn_status as enum ('pending','ok','partial','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('issued','paid','overdue','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tx_type as enum (
    'po','grn','invoice','payment','adjustment','receipt'
  );
exception when duplicate_object then null; end $$;

-- --- 2. Pastikan tabel core ada (idempotent wrapper) -------------------
-- Catatan: tabel core sudah di-create di 0001 tanpa "if not exists".
-- Blok ini hanya untuk fresh DB yang belum pernah apply 0001.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'viewer',
  supplier_id text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  invited_by uuid references auth.users(id),
  last_login_at timestamptz
);

-- Guard indexes (PostgreSQL mendukung IF NOT EXISTS untuk index sejak 9.5)
create index if not exists idx_profiles_role     on public.profiles(role);
create index if not exists idx_profiles_supplier on public.profiles(supplier_id) where supplier_id is not null;

-- --- 3. Settings defaults aman di-reinsert -----------------------------
insert into public.settings(key, value) values
  ('porsi_weight', '{"kecil":0.7,"besar":1.0}'::jsonb),
  ('active_cycle_days', '14'::jsonb),
  ('go_live_date', '"2026-05-04"'::jsonb),
  ('seed_demo_applied_at', to_jsonb(now()))
on conflict (key) do nothing;

-- --- 4. Marker bahwa 0040 sudah jalan ----------------------------------
insert into public.settings(key, value) values
  ('migration_0040_applied', to_jsonb(now()))
on conflict (key) do update set value = to_jsonb(now()), updated_at = now();
