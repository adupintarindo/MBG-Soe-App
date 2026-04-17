-- ============================================================================
-- 0009 · GRN QC Checklist (dinamis per kategori) + Non-Conformance Log
-- Source: SOP-OPR-003 PENERIMAAN MATERIAL + STANDAR PENERIMAAN BAHAN BAKU
-- ============================================================================

-- ----------------------------------------------------------------------------
-- QC checklist template: standar penerimaan per kategori bahan
-- Satu kategori punya banyak checkpoint (mis. BERAS → warna, bau, kutu, kadar air)
-- ----------------------------------------------------------------------------
create table if not exists public.qc_checklist_templates (
  id bigserial primary key,
  category public.item_category not null,
  item_code text references public.items(code) on delete cascade,
  checkpoint text not null,               -- "Warna putih bersih"
  expected text,                          -- "tidak kekuningan / abu-abu"
  is_critical boolean not null default false,
  sort_order smallint not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_qc_tmpl_cat on public.qc_checklist_templates(category) where active;
create index if not exists idx_qc_tmpl_item on public.qc_checklist_templates(item_code) where active;

-- ----------------------------------------------------------------------------
-- GRN QC check: hasil pengecekan per GRN + checkpoint
-- ----------------------------------------------------------------------------
create type public.qc_result as enum ('pass','minor','major','critical','na');

create table if not exists public.grn_qc_checks (
  id bigserial primary key,
  grn_no text not null references public.grns(no) on delete cascade,
  item_code text references public.items(code),
  checkpoint text not null,
  is_critical boolean not null default false,
  result public.qc_result not null default 'pass',
  note text,
  photo_url text,
  checked_by uuid references auth.users(id),
  checked_at timestamptz not null default now()
);
create index if not exists idx_grn_qc_grn on public.grn_qc_checks(grn_no);
create index if not exists idx_grn_qc_result on public.grn_qc_checks(result) where result <> 'pass';

-- ----------------------------------------------------------------------------
-- Non-Conformance Log: masalah kualitas yg perlu follow-up (NCR)
-- ----------------------------------------------------------------------------
create type public.ncr_severity as enum ('minor','major','critical');
create type public.ncr_status   as enum ('open','in_progress','resolved','waived');

create table if not exists public.non_conformance_log (
  id bigserial primary key,
  ncr_no text unique,                     -- NCR-2026-001 (auto)
  grn_no text references public.grns(no) on delete set null,
  supplier_id text references public.suppliers(id) on delete set null,
  item_code text references public.items(code) on delete set null,
  severity public.ncr_severity not null default 'minor',
  status public.ncr_status not null default 'open',
  issue text not null,                    -- deskripsi masalah
  root_cause text,
  corrective_action text,
  qty_affected numeric(12,3),
  unit text,
  cost_impact_idr numeric(14,2),
  reported_at timestamptz not null default now(),
  reported_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  photo_url text,
  linked_action_id bigint references public.supplier_actions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ncr_status on public.non_conformance_log(status);
create index if not exists idx_ncr_sup on public.non_conformance_log(supplier_id);
create index if not exists idx_ncr_grn on public.non_conformance_log(grn_no);

-- Auto-assign NCR number
create or replace function public.assign_ncr_no()
returns trigger language plpgsql as $$
declare
  v_year text;
  v_seq int;
begin
  if new.ncr_no is null or new.ncr_no = '' then
    v_year := to_char(coalesce(new.reported_at, now()), 'YYYY');
    select coalesce(max(
      nullif(regexp_replace(ncr_no, 'NCR-' || v_year || '-', ''), '')::int
    ), 0) + 1
    into v_seq
    from public.non_conformance_log
    where ncr_no like 'NCR-' || v_year || '-%';
    new.ncr_no := 'NCR-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  end if;
  return new;
end; $$;

drop trigger if exists trg_ncr_assign on public.non_conformance_log;
create trigger trg_ncr_assign
  before insert on public.non_conformance_log
  for each row execute function public.assign_ncr_no();

-- Auto-stamp resolved_at
create or replace function public.stamp_ncr_resolved()
returns trigger language plpgsql as $$
begin
  if new.status in ('resolved','waived') and
     (old.status is distinct from 'resolved' and old.status is distinct from 'waived') then
    new.resolved_at := now();
    if new.resolved_by is null then
      new.resolved_by := auth.uid();
    end if;
  elsif new.status = 'open' or new.status = 'in_progress' then
    new.resolved_at := null;
    new.resolved_by := null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_ncr_resolve on public.non_conformance_log;
create trigger trg_ncr_resolve
  before update on public.non_conformance_log
  for each row execute function public.stamp_ncr_resolved();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.qc_checklist_templates enable row level security;
alter table public.grn_qc_checks          enable row level security;
alter table public.non_conformance_log    enable row level security;

-- Templates: semua auth read, admin/ahli_gizi write (standar ditentukan gizi)
drop policy if exists "qc_tmpl: auth read" on public.qc_checklist_templates;
create policy "qc_tmpl: auth read" on public.qc_checklist_templates
  for select using (auth.uid() is not null);

drop policy if exists "qc_tmpl: gz/admin write" on public.qc_checklist_templates;
create policy "qc_tmpl: gz/admin write" on public.qc_checklist_templates
  for all using (public.current_role() in ('admin','ahli_gizi'))
  with check (public.current_role() in ('admin','ahli_gizi'));

-- Checks: staff read semua, supplier read hanya GRN milik dia
drop policy if exists "qc_check: read staff or own-supplier" on public.grn_qc_checks;
create policy "qc_check: read staff or own-supplier" on public.grn_qc_checks
  for select using (
    auth.uid() is not null and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier' and exists (
        select 1 from public.grns g
        join public.purchase_orders p on p.no = g.po_no
        where g.no = grn_qc_checks.grn_no
          and p.supplier_id = public.current_supplier_id()
      ))
    )
  );

drop policy if exists "qc_check: op/admin write" on public.grn_qc_checks;
create policy "qc_check: op/admin write" on public.grn_qc_checks
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- NCR: staff read semua, supplier read only own
drop policy if exists "ncr: read staff or own-supplier" on public.non_conformance_log;
create policy "ncr: read staff or own-supplier" on public.non_conformance_log
  for select using (
    auth.uid() is not null and (
      public.current_role() in ('admin','operator','ahli_gizi','viewer')
      or (public.current_role() = 'supplier' and supplier_id = public.current_supplier_id())
    )
  );

drop policy if exists "ncr: op/admin write" on public.non_conformance_log;
create policy "ncr: op/admin write" on public.non_conformance_log
  for all using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- ============================================================================
-- RPCs
-- ============================================================================
-- Fetch template yang berlaku untuk suatu item (item-specific OR category-level)
create or replace function public.qc_template_for_item(p_item text)
returns table (
  id bigint,
  category public.item_category,
  checkpoint text,
  expected text,
  is_critical boolean,
  sort_order smallint
) language sql stable as $$
  select t.id, t.category, t.checkpoint, t.expected, t.is_critical, t.sort_order
  from public.qc_checklist_templates t
  join public.items i on i.code = p_item
  where t.active = true
    and (t.item_code = p_item or (t.item_code is null and t.category = i.category))
  order by t.sort_order, t.id;
$$;

-- Summary check untuk satu GRN (berapa pass/minor/major/critical)
create or replace function public.grn_qc_summary(p_grn_no text)
returns table (
  total int,
  pass int,
  minor int,
  major int,
  critical int,
  fail_total int,
  has_critical boolean
) language sql stable as $$
  select
    count(*)::int,
    count(*) filter (where result = 'pass')::int,
    count(*) filter (where result = 'minor')::int,
    count(*) filter (where result = 'major')::int,
    count(*) filter (where result = 'critical')::int,
    count(*) filter (where result in ('minor','major','critical'))::int,
    bool_or(result = 'critical')
  from public.grn_qc_checks
  where grn_no = p_grn_no;
$$;

-- Open NCR snapshot (dashboard)
create or replace function public.ncr_open_snapshot()
returns table (
  total int,
  open_cnt int,
  in_progress_cnt int,
  resolved_cnt int,
  critical_open int,
  avg_resolve_days numeric
) language sql stable as $$
  select
    count(*)::int,
    count(*) filter (where status = 'open')::int,
    count(*) filter (where status = 'in_progress')::int,
    count(*) filter (where status = 'resolved')::int,
    count(*) filter (where status in ('open','in_progress') and severity = 'critical')::int,
    round(avg(extract(epoch from (resolved_at - reported_at))/86400.0)::numeric, 1)
  from public.non_conformance_log;
$$;

grant execute on function public.qc_template_for_item(text)     to authenticated;
grant execute on function public.grn_qc_summary(text)           to authenticated;
grant execute on function public.ncr_open_snapshot()            to authenticated;

-- ============================================================================
-- Seed template QC: standar penerimaan minimal per kategori
-- ============================================================================
insert into public.qc_checklist_templates (category, checkpoint, expected, is_critical, sort_order) values
  -- BERAS
  ('BERAS', 'Fisik biji utuh, tidak pecah >10%', 'butir pecah < 10%', true, 10),
  ('BERAS', 'Warna putih/sesuai varietas', 'tidak kekuningan, tidak abu-abu', false, 20),
  ('BERAS', 'Bau normal, tidak apek/tengik', 'bau beras segar', true, 30),
  ('BERAS', 'Bebas kutu/hama', 'tidak ada serangga/larva', true, 40),
  ('BERAS', 'Bebas benda asing', 'tidak ada batu/logam/sekam', true, 50),
  ('BERAS', 'Kadar air <14%', '<14% (tidak lembab)', false, 60),
  -- HEWANI (daging/ikan/telur)
  ('HEWANI', 'Warna sesuai standar', 'merah segar (daging) / tidak kusam (ikan)', true, 10),
  ('HEWANI', 'Bau segar, tidak amis berlebih', 'tidak busuk/asam', true, 20),
  ('HEWANI', 'Tekstur kenyal, elastis', 'ditekan kembali ke bentuk semula', false, 30),
  ('HEWANI', 'Suhu terima sesuai cold chain', 'daging/ikan segar <5°C, beku <-15°C', true, 40),
  ('HEWANI', 'Bebas memar/luka/parasit', 'fisik utuh, tidak ada cacing/larva', true, 50),
  ('HEWANI', 'Kemasan tidak bocor', 'vakum/plastik utuh', false, 60),
  -- NABATI (tahu/tempe/kacang)
  ('NABATI', 'Tidak berlendir', 'permukaan kering/tidak slimy', true, 10),
  ('NABATI', 'Bau normal (tahu/tempe)', 'bau fermentasi wajar', false, 20),
  ('NABATI', 'Warna sesuai (putih/krem)', 'tidak kehijauan/kehitaman', true, 30),
  ('NABATI', 'Tekstur padat (tahu) / kompak (tempe)', 'tidak rapuh', false, 40),
  -- SAYUR_HIJAU & SAYUR
  ('SAYUR_HIJAU', 'Segar, tidak layu', 'daun tegak, tidak menguning', true, 10),
  ('SAYUR_HIJAU', 'Tidak busuk/berlendir', 'tidak ada bercak hitam/basah', true, 20),
  ('SAYUR_HIJAU', 'Bebas hama/ulat', 'tidak ada serangga hidup', true, 30),
  ('SAYUR_HIJAU', 'Ukuran seragam', 'diameter/panjang ~sama', false, 40),
  ('SAYUR', 'Segar, tidak lembek', 'kerenyahan sesuai jenis', true, 10),
  ('SAYUR', 'Bebas bercak/jamur', 'permukaan bersih', true, 20),
  ('SAYUR', 'Ukuran seragam', 'sesuai standar grade', false, 30),
  -- UMBI
  ('UMBI', 'Keras, tidak lunak', 'tidak bertunas, tidak berjamur', true, 10),
  ('UMBI', 'Warna kulit normal', 'tidak menghitam', false, 20),
  -- BUAH
  ('BUAH', 'Segar, tingkat kematangan sesuai', 'tidak over-ripe, tidak busuk', true, 10),
  ('BUAH', 'Bebas memar', 'fisik utuh', false, 20),
  ('BUAH', 'Ukuran seragam', 'berat/volume sesuai grade', false, 30),
  -- BUMBU & REMPAH
  ('BUMBU', 'Kering (rempah kering) / segar (basah)', 'tidak lembab / tidak layu', false, 10),
  ('BUMBU', 'Bau aromatic sesuai', 'tidak apek, tidak berjamur', true, 20),
  ('REMPAH', 'Kering, bau aromatic', 'tidak berjamur', true, 10),
  -- SEMBAKO (minyak, gula, garam, tepung)
  ('SEMBAKO', 'Kemasan tersegel utuh', 'segel pabrik tidak rusak', true, 10),
  ('SEMBAKO', 'Expire date >3 bulan', 'minimum 3 bulan sebelum expire', true, 20),
  ('SEMBAKO', 'Label lengkap (BPOM, komposisi)', 'label jelas dan terbaca', false, 30)
on conflict do nothing;
