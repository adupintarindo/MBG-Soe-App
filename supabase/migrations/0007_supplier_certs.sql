-- ============================================================================
-- 0007 · Supplier certifications (untuk modal rincian supplier)
-- ============================================================================
create table if not exists public.supplier_certs (
  id bigserial primary key,
  supplier_id text not null references public.suppliers(id) on delete cascade,
  name text not null,
  valid_until date,
  created_at timestamptz not null default now()
);

create index if not exists idx_sup_certs on public.supplier_certs(supplier_id);

alter table public.supplier_certs enable row level security;

drop policy if exists "sup_certs: auth read" on public.supplier_certs;
create policy "sup_certs: auth read" on public.supplier_certs
  for select using (auth.uid() is not null);

drop policy if exists "sup_certs: admin write" on public.supplier_certs;
create policy "sup_certs: admin write" on public.supplier_certs
  for all using (public.is_admin()) with check (public.is_admin());
