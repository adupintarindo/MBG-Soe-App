-- =============================================================================
-- 0017 · Weekly Price List (benchmarking multi-supplier per komoditas)
-- -----------------------------------------------------------------------------
-- Port dari Weekly_Price_List_Template.xlsx:
--   - 1 period (April–Juni 2026) berisi 12 minggu
--   - 6 kategori komoditas (BERAS, SAYURAN, BUAH, PROTEIN_HEWANI,
--     PROTEIN_NABATI, BUMBU_KERING) × banyak supplier × 12 minggu
--   - Dual price: per-item (mis. Rp/ekor, Rp/butir) + per-kg (setelah konversi)
--   - Tujuan: Kepala SPPG & Ahli Gizi bisa bandingin harga minggu-ke-minggu
--     antar supplier untuk negosiasi PO & update items.price_idr
--
-- Idempoten: semua drop/create pakai `if exists` / `if not exists`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM kategori komoditas (subset item_category, eksplisit untuk UI grid)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'price_commodity') then
    create type public.price_commodity as enum (
      'BERAS',
      'SAYURAN',
      'BUAH',
      'PROTEIN_HEWANI',
      'PROTEIN_NABATI',
      'BUMBU_KERING'
    );
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------

-- Period: rentang penelusuran harga (mis. April–Juni 2026, Juli–Sep 2026, dst)
create table if not exists public.price_periods (
  id           smallserial primary key,
  name         text not null,                  -- "April–Juni 2026"
  start_date   date not null,
  end_date     date not null,
  active       boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint price_periods_range_chk check (end_date >= start_date)
);
create unique index if not exists ux_price_periods_name on public.price_periods(lower(name));

-- Weeks: pecahan 7-harian dalam satu period (template = 12 weeks)
create table if not exists public.price_weeks (
  id           bigserial primary key,
  period_id    smallint not null references public.price_periods(id) on delete cascade,
  week_no      smallint not null,              -- 1..12 (atau lebih)
  start_date   date not null,
  end_date     date not null,
  label        text not null,                  -- "Wk 1: 06-12 Apr"
  created_at   timestamptz not null default now(),
  constraint price_weeks_range_chk check (end_date >= start_date),
  constraint price_weeks_unique_no unique (period_id, week_no)
);
create index if not exists idx_price_weeks_period on public.price_weeks(period_id);

-- Supplier price observations per minggu
create table if not exists public.supplier_prices (
  id                bigserial primary key,
  week_id           bigint not null references public.price_weeks(id) on delete cascade,
  supplier_id       text not null references public.suppliers(id) on delete cascade,
  commodity         public.price_commodity not null,
  ingredient_name   text not null,             -- "Beras Premium", "Ayam Broiler", "Pisang Ambon"
  item_code         text references public.items(code) on delete set null, -- optional FK ke master
  price_per_item    numeric(14,2),             -- Rp/ekor, Rp/butir, Rp/ikat, dll
  price_per_kg      numeric(14,2),             -- Rp/kg (baseline untuk banding)
  unit              text,                      -- "kg", "butir", "ekor", "ikat"
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint supplier_prices_has_price_chk
    check (price_per_item is not null or price_per_kg is not null),
  constraint supplier_prices_unique_observation
    unique (week_id, supplier_id, commodity, ingredient_name)
);
create index if not exists idx_supplier_prices_supplier on public.supplier_prices(supplier_id);
create index if not exists idx_supplier_prices_week     on public.supplier_prices(week_id);
create index if not exists idx_supplier_prices_commodity on public.supplier_prices(commodity);
create index if not exists idx_supplier_prices_item     on public.supplier_prices(item_code) where item_code is not null;

-- -----------------------------------------------------------------------------
-- 3. updated_at triggers (ikut pola yang dipakai 0001)
-- -----------------------------------------------------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_price_periods_touch  on public.price_periods;
create trigger trg_price_periods_touch
  before update on public.price_periods
  for each row execute function public.tg_touch_updated_at();

drop trigger if exists trg_supplier_prices_touch on public.supplier_prices;
create trigger trg_supplier_prices_touch
  before update on public.supplier_prices
  for each row execute function public.tg_touch_updated_at();

-- -----------------------------------------------------------------------------
-- 4. VIEW: pivot harga per-kg ke kolom mingguan (mirror layout Excel)
-- -----------------------------------------------------------------------------
-- v_price_list_matrix: 1 row per (supplier × commodity × ingredient × period),
-- 12 kolom w1..w12 = price_per_kg minggu ke-n, plus avg_per_kg & latest_per_kg.
drop view if exists public.v_price_list_matrix;
create view public.v_price_list_matrix as
with base as (
  select
    sp.supplier_id,
    s.name            as supplier_name,
    sp.commodity,
    sp.ingredient_name,
    sp.item_code,
    pw.period_id,
    pp.name           as period_name,
    pw.week_no,
    sp.price_per_kg,
    sp.price_per_item,
    sp.unit,
    sp.notes
  from public.supplier_prices sp
  join public.price_weeks     pw on pw.id = sp.week_id
  join public.price_periods   pp on pp.id = pw.period_id
  join public.suppliers       s  on s.id  = sp.supplier_id
)
select
  supplier_id,
  supplier_name,
  commodity,
  ingredient_name,
  item_code,
  period_id,
  period_name,
  max(case when week_no = 1  then price_per_kg end) as w1,
  max(case when week_no = 2  then price_per_kg end) as w2,
  max(case when week_no = 3  then price_per_kg end) as w3,
  max(case when week_no = 4  then price_per_kg end) as w4,
  max(case when week_no = 5  then price_per_kg end) as w5,
  max(case when week_no = 6  then price_per_kg end) as w6,
  max(case when week_no = 7  then price_per_kg end) as w7,
  max(case when week_no = 8  then price_per_kg end) as w8,
  max(case when week_no = 9  then price_per_kg end) as w9,
  max(case when week_no = 10 then price_per_kg end) as w10,
  max(case when week_no = 11 then price_per_kg end) as w11,
  max(case when week_no = 12 then price_per_kg end) as w12,
  round(avg(price_per_kg)::numeric, 2)              as avg_per_kg,
  max(price_per_kg) filter (where week_no is not null) as max_per_kg,
  min(price_per_kg) filter (where week_no is not null) as min_per_kg
from base
group by
  supplier_id, supplier_name, commodity, ingredient_name,
  item_code, period_id, period_name;

comment on view public.v_price_list_matrix is
  'Pivot Weekly Price List: 12 kolom mingguan (Rp/kg) per supplier × commodity × ingredient';

-- -----------------------------------------------------------------------------
-- 5. RLS
-- -----------------------------------------------------------------------------
alter table public.price_periods    enable row level security;
alter table public.price_weeks      enable row level security;
alter table public.supplier_prices  enable row level security;

-- READ: semua authenticated (operator, ahli_gizi, admin, viewer, supplier)
drop policy if exists "price_periods: auth read"   on public.price_periods;
create policy "price_periods: auth read" on public.price_periods
  for select using (auth.uid() is not null);

drop policy if exists "price_weeks: auth read"     on public.price_weeks;
create policy "price_weeks: auth read" on public.price_weeks
  for select using (auth.uid() is not null);

drop policy if exists "supplier_prices: auth read" on public.supplier_prices;
create policy "supplier_prices: auth read" on public.supplier_prices
  for select using (auth.uid() is not null);

-- WRITE periods & weeks: admin + ahli_gizi
drop policy if exists "price_periods: admin/gz write" on public.price_periods;
create policy "price_periods: admin/gz write" on public.price_periods
  for all using (public.current_role() in ('admin','ahli_gizi'))
  with check (public.current_role() in ('admin','ahli_gizi'));

drop policy if exists "price_weeks: admin/gz write" on public.price_weeks;
create policy "price_weeks: admin/gz write" on public.price_weeks
  for all using (public.current_role() in ('admin','ahli_gizi'))
  with check (public.current_role() in ('admin','ahli_gizi'));

-- WRITE observations: admin/operator/ahli_gizi full; supplier hanya baris sendiri
drop policy if exists "supplier_prices: ops write" on public.supplier_prices;
create policy "supplier_prices: ops write" on public.supplier_prices
  for all using (public.current_role() in ('admin','operator','ahli_gizi'))
  with check (public.current_role() in ('admin','operator','ahli_gizi'));

drop policy if exists "supplier_prices: supplier self write" on public.supplier_prices;
create policy "supplier_prices: supplier self write" on public.supplier_prices
  for all using (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  ) with check (
    public.current_role() = 'supplier'
    and supplier_id = public.current_supplier_id()
  );

-- Grant view ke authenticated
grant select on public.v_price_list_matrix to authenticated;

-- -----------------------------------------------------------------------------
-- 6. SEED: Period "April–Juni 2026" + 12 minggu auto-generated
--    Base Monday = 2026-04-06 → Week 12 = 2026-06-22..2026-06-28
-- -----------------------------------------------------------------------------
insert into public.price_periods (name, start_date, end_date, active, notes)
values (
  'April–Juni 2026',
  date '2026-04-06',
  date '2026-06-28',
  true,
  'Seed awal Weekly Price List (port dari Weekly_Price_List_Template.xlsx)'
)
on conflict (lower(name)) do nothing;

do $$
declare
  v_period_id smallint;
  v_week_start date;
  v_month_label text;
  i int;
begin
  select id into v_period_id
  from public.price_periods
  where lower(name) = lower('April–Juni 2026');

  if v_period_id is null then
    return;
  end if;

  for i in 1..12 loop
    v_week_start := date '2026-04-06' + ((i - 1) * 7);
    v_month_label := to_char(v_week_start, 'FMDD Mon') || '–' ||
                     to_char(v_week_start + 6, 'FMDD Mon');
    insert into public.price_weeks (period_id, week_no, start_date, end_date, label)
    values (
      v_period_id,
      i,
      v_week_start,
      v_week_start + 6,
      'Wk ' || i || ': ' || v_month_label
    )
    on conflict (period_id, week_no) do nothing;
  end loop;
end$$;

-- -----------------------------------------------------------------------------
-- 7. Notifikasi: log ke public.events (kalau ada) biar dashboard tahu
-- -----------------------------------------------------------------------------
-- (opsional, skip kalau events table belum ada di migrasi lain)

-- =============================================================================
-- END 0017
-- =============================================================================
