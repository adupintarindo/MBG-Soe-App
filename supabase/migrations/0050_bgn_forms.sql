-- =============================================================================
-- 0050 · BGN MBG Forms (SK Ka BGN 401.1 Tahun 2025)
-- -----------------------------------------------------------------------------
-- Goal: single-input → multi-output (PDF/Word/Excel) untuk 13 lampiran BGN
-- + payroll + daily cash. Semua data 1× masuk ke Postgres → generator stream
-- ke template .docx/.xlsx di Supabase Storage bucket 'bgn-templates'.
--
-- Tables baru (15):
--   sppg_staff             · Tim SPPG (Ka, Pengawas, Cook, Relawan)
--   food_sample_log        · Lamp 21 checklist sampel makanan
--   organoleptic_test      · Lamp 22 uji organoleptik
--   posyandu               · Master posyandu distribusi
--   kader_incentive        · Lamp 26 insentif kader
--   pic_school             · PIC per satuan pendidikan
--   pic_incentive          · Lamp 27 insentif PIC
--   daily_cash_log         · Lamp 30b + LAPORAN KEUANGAN
--   chart_of_accounts      · COA untuk buku besar
--   gl_entry               · Lamp 30e buku neraca besar
--   petty_cash             · Lamp 30f kas kecil
--   payroll_period         · Periode penggajian 2-mingguan
--   payroll_attendance     · Absensi harian per period
--   payroll_slip           · Slip gaji per karyawan per period
--   bgn_generation_log     · Audit trail generator dokumen
--
-- Enrichment ke tabel existing:
--   schools: + recipient_group, + pic_school_id
--   grns:    + condition_flag, + qc_officer_id (sudah ada qc_note)
--
-- Idempoten via IF NOT EXISTS / DROP IF EXISTS.
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'sppg_role') then
    create type public.sppg_role as enum (
      'kepala_sppg',
      'pengawas_gizi',
      'pengawas_keuangan',
      'jurutama_masak',
      'asisten_lapangan',
      'persiapan_makanan',
      'pemrosesan_makanan',
      'pengemasan',
      'pemorsian',
      'distribusi',
      'pencucian_alat',
      'pencucian',
      'sanitasi',
      'kader_posyandu'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'recipient_group') then
    create type public.recipient_group as enum (
      'peserta_didik',
      'pendidik_nakes',
      'non_peserta_posyandu'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'organoleptic_phase') then
    create type public.organoleptic_phase as enum (
      'before_dispatch',
      'on_arrival',
      'before_consumption'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'organoleptic_verdict') then
    create type public.organoleptic_verdict as enum ('aman', 'tidak_aman');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'cash_flow_direction') then
    create type public.cash_flow_direction as enum ('masuk', 'keluar');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'coa_category') then
    create type public.coa_category as enum ('asset', 'liability', 'equity', 'revenue', 'expense');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'payroll_status') then
    create type public.payroll_status as enum ('draft', 'finalized', 'paid');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type public.attendance_status as enum ('H', 'S', 'I', 'A', 'OFF');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'grn_condition') then
    create type public.grn_condition as enum ('baik', 'rusak', 'expired', 'other');
  end if;
end $$;

-- =============================================================================
-- 1. SPPG Staff (Tim SPPG + 48 Relawan)
-- =============================================================================

create table if not exists public.sppg_staff (
  id           uuid primary key default gen_random_uuid(),
  seq_no       int,
  full_name    text not null,
  nik          text,
  phone        text,
  email        text,
  role         public.sppg_role not null default 'persiapan_makanan',
  role_label   text,
  bank_name    text,
  bank_account text,
  start_date   date default current_date,
  end_date     date,
  active       boolean not null default true,
  gaji_pokok   numeric(12,2) default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists sppg_staff_role_idx on public.sppg_staff(role);
create index if not exists sppg_staff_active_idx on public.sppg_staff(active) where active = true;

-- =============================================================================
-- 2. Schools enrichment
-- =============================================================================

alter table public.schools
  add column if not exists recipient_group public.recipient_group not null default 'peserta_didik';

-- pic_school_id FK akan dibuat setelah pic_school tabelnya ada (section 4).

-- =============================================================================
-- 3. QC: Food Sample Log (Lamp 21)
-- =============================================================================

create table if not exists public.food_sample_log (
  id                   uuid primary key default gen_random_uuid(),
  delivery_date        date not null,
  delivery_seq         smallint not null check (delivery_seq between 1 and 3),
  school_id            text references public.schools(id) on delete set null,
  menu_assign_date     date, -- FK ke menu_assign(assign_date), nullable
  officer_id           uuid references public.sppg_staff(id) on delete set null,
  officer_signature_url text,
  sample_kept          boolean not null default true,
  notes                text,
  created_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id)
);
create index if not exists food_sample_date_idx on public.food_sample_log(delivery_date);
create index if not exists food_sample_school_idx on public.food_sample_log(school_id);

-- =============================================================================
-- 4. QC: Organoleptic Test (Lamp 22)
-- =============================================================================

create table if not exists public.organoleptic_test (
  id             uuid primary key default gen_random_uuid(),
  test_date      date not null,
  test_phase     public.organoleptic_phase not null,
  school_id      text references public.schools(id) on delete set null,
  menu_assign_date date,
  rasa           smallint check (rasa between 1 and 5),
  warna          smallint check (warna between 1 and 5),
  aroma          smallint check (aroma between 1 and 5),
  tekstur        smallint check (tekstur between 1 and 5),
  verdict        public.organoleptic_verdict not null default 'aman',
  officer_id     uuid references public.sppg_staff(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id)
);
create index if not exists organoleptic_date_idx on public.organoleptic_test(test_date);

-- =============================================================================
-- 5. Posyandu + Kader Incentive (Lamp 26)
-- =============================================================================

create table if not exists public.posyandu (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  village   text,
  district  text default 'Amanuban Tengah',
  lat       numeric,
  lng       numeric,
  active    boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.kader_incentive (
  id             uuid primary key default gen_random_uuid(),
  posyandu_id    uuid references public.posyandu(id) on delete set null,
  kader_staff_id uuid references public.sppg_staff(id) on delete set null,
  period_start   date not null,
  period_end     date not null,
  porsi_senin    int not null default 0,
  porsi_kamis    int not null default 0,
  unit_cost      numeric(12,2) not null default 0,
  total_amount   numeric(14,2) generated always as
                   ((porsi_senin + porsi_kamis) * unit_cost) stored,
  paid           boolean not null default false,
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists kader_incentive_period_idx on public.kader_incentive(period_start, period_end);

-- =============================================================================
-- 6. PIC per Satuan Pendidikan + Insentif (Lamp 27)
-- =============================================================================

create table if not exists public.pic_school (
  id            uuid primary key default gen_random_uuid(),
  school_id     text references public.schools(id) on delete cascade,
  pic_staff_id  uuid references public.sppg_staff(id) on delete restrict,
  active        boolean not null default true,
  start_date    date default current_date,
  end_date      date,
  created_at    timestamptz not null default now()
);
create unique index if not exists pic_school_unique_active
  on public.pic_school(school_id) where active = true;

-- Backfill FK ke schools (null-safe).
alter table public.schools
  add column if not exists pic_school_id uuid references public.pic_school(id);

create table if not exists public.pic_incentive (
  id              uuid primary key default gen_random_uuid(),
  pic_school_id   uuid references public.pic_school(id) on delete cascade,
  period_start    date not null,
  period_end      date not null,
  total_porsi     int not null default 0,
  unit_cost       numeric(12,2) not null default 0,
  total_amount    numeric(14,2) generated always as (total_porsi * unit_cost) stored,
  paid            boolean not null default false,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists pic_incentive_period_idx on public.pic_incentive(period_start, period_end);

-- =============================================================================
-- 7. Daily Cash Log (Lamp 30b + LAPORAN KEUANGAN)
-- =============================================================================

create table if not exists public.daily_cash_log (
  id             uuid primary key default gen_random_uuid(),
  log_date       date not null,
  log_time       time,
  uang_masuk     numeric(14,2) not null default 0,
  uang_keluar    numeric(14,2) not null default 0,
  saldo_akhir    numeric(14,2),
  keterangan     text,
  bukti_nota_url text,
  category       text, -- maps ke chart_of_accounts.code (nullable)
  po_no          text references public.purchase_orders(no) on delete set null,
  po_line_no     smallint, -- composite ref to po_rows (no FK, soft link)
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id)
);
create index if not exists daily_cash_date_idx on public.daily_cash_log(log_date);
create index if not exists daily_cash_category_idx on public.daily_cash_log(category);
create index if not exists daily_cash_po_idx on public.daily_cash_log(po_no);

-- =============================================================================
-- 8. Chart of Accounts + General Ledger (Lamp 30e)
-- =============================================================================

create table if not exists public.chart_of_accounts (
  code        text primary key,
  name        text not null,
  category    public.coa_category not null,
  parent_code text references public.chart_of_accounts(code),
  active      boolean not null default true,
  notes       text
);

create table if not exists public.gl_entry (
  id             uuid primary key default gen_random_uuid(),
  entry_date     date not null,
  description    text,
  debit_account  text references public.chart_of_accounts(code),
  credit_account text references public.chart_of_accounts(code),
  amount         numeric(14,2) not null check (amount >= 0),
  source_type    text, -- 'po'|'grn'|'invoice'|'payroll'|'cash'|'petty'|'manual'
  source_id      uuid,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id)
);
create index if not exists gl_entry_date_idx on public.gl_entry(entry_date);
create index if not exists gl_entry_source_idx on public.gl_entry(source_type, source_id);

-- =============================================================================
-- 9. Petty Cash (Lamp 30f)
-- =============================================================================

create table if not exists public.petty_cash (
  id             uuid primary key default gen_random_uuid(),
  tx_date        date not null,
  tx_time        time,
  direction      public.cash_flow_direction not null,
  amount         numeric(12,2) not null check (amount > 0),
  description    text,
  bukti_url      text,
  balance_after  numeric(12,2),
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id)
);
create index if not exists petty_cash_date_idx on public.petty_cash(tx_date);

-- =============================================================================
-- 10. Payroll (Gaji Karyawan SPPG)
-- =============================================================================

create table if not exists public.payroll_period (
  id           uuid primary key default gen_random_uuid(),
  period_label text not null, -- e.g. "19 Jan - 01 Feb 2026"
  start_date   date not null,
  end_date     date not null,
  status       public.payroll_status not null default 'draft',
  finalized_at timestamptz,
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id)
);
create index if not exists payroll_period_range_idx on public.payroll_period(start_date, end_date);

create table if not exists public.payroll_attendance (
  id              uuid primary key default gen_random_uuid(),
  period_id       uuid references public.payroll_period(id) on delete cascade,
  staff_id        uuid references public.sppg_staff(id) on delete cascade,
  attendance_date date not null,
  status          public.attendance_status not null default 'OFF',
  lembur_hours    numeric(4,2) not null default 0,
  notes           text,
  created_at      timestamptz not null default now()
);
create unique index if not exists payroll_attendance_unique
  on public.payroll_attendance(period_id, staff_id, attendance_date);

create table if not exists public.payroll_slip (
  id                     uuid primary key default gen_random_uuid(),
  period_id              uuid references public.payroll_period(id) on delete cascade,
  staff_id               uuid references public.sppg_staff(id) on delete restrict,
  gaji_pokok             numeric(12,2) not null default 0,
  hari_kerja             int not null default 0,
  upah_per_hari          numeric(10,2) not null default 0,
  nilai_gaji             numeric(12,2) not null default 0,
  tunjangan              numeric(10,2) not null default 0,
  insentif_kehadiran     numeric(10,2) not null default 0,
  insentif_kinerja       numeric(10,2) not null default 0,
  lain_lain              numeric(10,2) not null default 0,
  lembur_jam             numeric(5,2)  not null default 0,
  upah_lembur_jam        numeric(10,2) not null default 0,
  total_lembur           numeric(12,2) not null default 0,
  potongan_kehadiran     numeric(10,2) not null default 0,
  potongan_bpjs_kes      numeric(10,2) not null default 0,
  potongan_bpjs_tk       numeric(10,2) not null default 0,
  potongan_lain          numeric(10,2) not null default 0,
  penerimaan_kotor       numeric(14,2) not null default 0,
  penerimaan_bersih      numeric(14,2) not null default 0,
  paid                   boolean not null default false,
  paid_at                timestamptz,
  transfer_ref           text,
  created_at             timestamptz not null default now()
);
create unique index if not exists payroll_slip_unique
  on public.payroll_slip(period_id, staff_id);

-- =============================================================================
-- 11. BGN Generation Log (audit trail dokumen)
-- =============================================================================

create table if not exists public.bgn_generation_log (
  id             uuid primary key default gen_random_uuid(),
  lampiran_code  text not null, -- '19','20','21','22','26','27','30a','30b','30c','30d','30e','30f','30g','30h','30i','payroll'
  format         text not null check (format in ('pdf','docx','xlsx')),
  period_start   date,
  period_end     date,
  scope_school_id text references public.schools(id),
  generated_at   timestamptz not null default now(),
  generated_by   uuid references auth.users(id),
  file_url       text,
  file_size_bytes bigint
);
create index if not exists bgn_gen_log_lampiran_idx on public.bgn_generation_log(lampiran_code, generated_at desc);

-- =============================================================================
-- 12. GRN enrichment (Lamp 20 support)
-- =============================================================================

alter table public.grns
  add column if not exists condition_flag public.grn_condition default 'baik';

alter table public.grns
  add column if not exists qc_officer_id uuid references public.sppg_staff(id);

-- =============================================================================
-- 13. Views untuk generator
-- =============================================================================

-- Rekap porsi per bulan (Lamp 30a)
-- menu_assign di SPPG ini SPPG-wide (1 menu per tanggal, disajikan ke semua sekolah aktif)
create or replace view public.v_bgn_rekap_porsi as
select
  date_trunc('month', ma.assign_date)::date as month,
  s.id as school_id,
  s.name as school_name,
  s.recipient_group,
  count(distinct ma.assign_date) as total_days,
  sum(s.students) as total_porsi
from public.menu_assign ma
cross join public.schools s
where s.active = true
group by 1, 2, 3, 4;

-- Laporan bulanan penerima manfaat (Lamp 30d)
create or replace view public.v_bgn_penerima_bulanan as
select
  date_trunc('month', ma.assign_date)::date as month,
  s.recipient_group,
  count(distinct s.id) as jumlah_sekolah,
  count(distinct ma.assign_date) * sum(s.students) / greatest(count(distinct s.id), 1) as total_porsi
from public.menu_assign ma
cross join public.schools s
where s.active = true
group by 1, 2;

-- Cash daily dengan saldo berjalan (Lamp 30b)
create or replace view public.v_bgn_cash_daily as
select
  dcl.*,
  sum(uang_masuk - uang_keluar) over (
    order by log_date, log_time, id
    rows between unbounded preceding and current row
  ) as running_balance
from public.daily_cash_log dcl;

-- =============================================================================
-- 14. Audit trigger hooks (memakai admin.log_event yang sudah ada di 0034)
-- =============================================================================

-- Trigger log INSERT/UPDATE/DELETE di tabel sensitive ke audit_events.
-- Fungsi public.audit_trigger() sudah eksis di 0034_audit_events.sql.

do $$ begin
  if exists (select 1 from pg_proc where proname = 'audit_trigger' and pronamespace = 'public'::regnamespace) then
    if not exists (select 1 from pg_trigger where tgname = 'audit_sppg_staff') then
      create trigger audit_sppg_staff after insert or update or delete on public.sppg_staff
        for each row execute function public.audit_trigger();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'audit_payroll_slip') then
      create trigger audit_payroll_slip after insert or update or delete on public.payroll_slip
        for each row execute function public.audit_trigger();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'audit_daily_cash_log') then
      create trigger audit_daily_cash_log after insert or update or delete on public.daily_cash_log
        for each row execute function public.audit_trigger();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'audit_gl_entry') then
      create trigger audit_gl_entry after insert or update or delete on public.gl_entry
        for each row execute function public.audit_trigger();
    end if;
  end if;
end $$;

-- =============================================================================
-- END 0050
-- =============================================================================
