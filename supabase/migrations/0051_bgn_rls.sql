-- =============================================================================
-- 0051 · RLS policies untuk tabel BGN (0050)
-- -----------------------------------------------------------------------------
-- Matriks akses (mirror 0029_rls_tighten.sql):
--
--   Tabel                 admin ahli_gizi operator viewer supplier
--   sppg_staff            RW    R         R        R      DENY
--   food_sample_log       RW    RW        RW       R      DENY
--   organoleptic_test     RW    RW        RW       R      DENY
--   posyandu              RW    R         R        R      DENY
--   kader_incentive       RW    R         R        R      DENY
--   pic_school            RW    R         R        R      DENY
--   pic_incentive         RW    R         R        R      DENY
--   daily_cash_log        RW    R         RW       R      DENY
--   chart_of_accounts     RW    R         R        R      DENY
--   gl_entry              RW    R         RW       R      DENY
--   petty_cash            RW    R         RW       R      DENY
--   payroll_period        RW    R         R        R      DENY
--   payroll_attendance    RW    R         RW       R      DENY
--   payroll_slip          RW    R         R        R      DENY
--   bgn_generation_log    RW    RW        RW       R      DENY
--
-- Idempoten via drop policy if exists.
-- =============================================================================

-- Helper macro (inline SQL) tidak ada di PG, jadi policy ditulis eksplisit.

-- =============================================================================
-- 1. SPPG Staff
-- =============================================================================
alter table public.sppg_staff enable row level security;

drop policy if exists "sppg_staff: staff read" on public.sppg_staff;
create policy "sppg_staff: staff read" on public.sppg_staff
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "sppg_staff: admin write" on public.sppg_staff;
create policy "sppg_staff: admin write" on public.sppg_staff
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- =============================================================================
-- 2. Food Sample Log (Lamp 21)
-- =============================================================================
alter table public.food_sample_log enable row level security;

drop policy if exists "food_sample_log: staff read" on public.food_sample_log;
create policy "food_sample_log: staff read" on public.food_sample_log
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "food_sample_log: ops write" on public.food_sample_log;
create policy "food_sample_log: ops write" on public.food_sample_log
  for all using (
    public.current_role() in ('admin','operator','ahli_gizi')
  )
  with check (
    public.current_role() in ('admin','operator','ahli_gizi')
  );

-- =============================================================================
-- 3. Organoleptic Test (Lamp 22)
-- =============================================================================
alter table public.organoleptic_test enable row level security;

drop policy if exists "organoleptic_test: staff read" on public.organoleptic_test;
create policy "organoleptic_test: staff read" on public.organoleptic_test
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "organoleptic_test: ops write" on public.organoleptic_test;
create policy "organoleptic_test: ops write" on public.organoleptic_test
  for all using (
    public.current_role() in ('admin','operator','ahli_gizi')
  )
  with check (
    public.current_role() in ('admin','operator','ahli_gizi')
  );

-- =============================================================================
-- 4. Posyandu + Kader Incentive (Lamp 26)
-- =============================================================================
alter table public.posyandu enable row level security;

drop policy if exists "posyandu: staff read" on public.posyandu;
create policy "posyandu: staff read" on public.posyandu
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "posyandu: admin write" on public.posyandu;
create policy "posyandu: admin write" on public.posyandu
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

alter table public.kader_incentive enable row level security;

drop policy if exists "kader_incentive: staff read" on public.kader_incentive;
create policy "kader_incentive: staff read" on public.kader_incentive
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "kader_incentive: admin write" on public.kader_incentive;
create policy "kader_incentive: admin write" on public.kader_incentive
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- =============================================================================
-- 5. PIC School + PIC Incentive (Lamp 27)
-- =============================================================================
alter table public.pic_school enable row level security;

drop policy if exists "pic_school: staff read" on public.pic_school;
create policy "pic_school: staff read" on public.pic_school
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "pic_school: admin write" on public.pic_school;
create policy "pic_school: admin write" on public.pic_school
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

alter table public.pic_incentive enable row level security;

drop policy if exists "pic_incentive: staff read" on public.pic_incentive;
create policy "pic_incentive: staff read" on public.pic_incentive
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "pic_incentive: admin write" on public.pic_incentive;
create policy "pic_incentive: admin write" on public.pic_incentive
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- =============================================================================
-- 6. Daily Cash Log (Lamp 30b)
-- =============================================================================
alter table public.daily_cash_log enable row level security;

drop policy if exists "daily_cash_log: staff read" on public.daily_cash_log;
create policy "daily_cash_log: staff read" on public.daily_cash_log
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "daily_cash_log: ops write" on public.daily_cash_log;
create policy "daily_cash_log: ops write" on public.daily_cash_log
  for all using (
    public.current_role() in ('admin','operator')
  )
  with check (
    public.current_role() in ('admin','operator')
  );

-- =============================================================================
-- 7. Chart of Accounts + GL Entry (Lamp 30e)
-- =============================================================================
alter table public.chart_of_accounts enable row level security;

drop policy if exists "coa: staff read" on public.chart_of_accounts;
create policy "coa: staff read" on public.chart_of_accounts
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "coa: admin write" on public.chart_of_accounts;
create policy "coa: admin write" on public.chart_of_accounts
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

alter table public.gl_entry enable row level security;

drop policy if exists "gl_entry: staff read" on public.gl_entry;
create policy "gl_entry: staff read" on public.gl_entry
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "gl_entry: ops write" on public.gl_entry;
create policy "gl_entry: ops write" on public.gl_entry
  for all using (
    public.current_role() in ('admin','operator')
  )
  with check (
    public.current_role() in ('admin','operator')
  );

-- =============================================================================
-- 8. Petty Cash (Lamp 30f)
-- =============================================================================
alter table public.petty_cash enable row level security;

drop policy if exists "petty_cash: staff read" on public.petty_cash;
create policy "petty_cash: staff read" on public.petty_cash
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "petty_cash: ops write" on public.petty_cash;
create policy "petty_cash: ops write" on public.petty_cash
  for all using (
    public.current_role() in ('admin','operator')
  )
  with check (
    public.current_role() in ('admin','operator')
  );

-- =============================================================================
-- 9. Payroll Period + Attendance + Slip
-- =============================================================================
alter table public.payroll_period enable row level security;

drop policy if exists "payroll_period: staff read" on public.payroll_period;
create policy "payroll_period: staff read" on public.payroll_period
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "payroll_period: admin write" on public.payroll_period;
create policy "payroll_period: admin write" on public.payroll_period
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

alter table public.payroll_attendance enable row level security;

drop policy if exists "payroll_attendance: staff read" on public.payroll_attendance;
create policy "payroll_attendance: staff read" on public.payroll_attendance
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "payroll_attendance: ops write" on public.payroll_attendance;
create policy "payroll_attendance: ops write" on public.payroll_attendance
  for all using (
    public.current_role() in ('admin','operator')
  )
  with check (
    public.current_role() in ('admin','operator')
  );

alter table public.payroll_slip enable row level security;

drop policy if exists "payroll_slip: staff read" on public.payroll_slip;
create policy "payroll_slip: staff read" on public.payroll_slip
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "payroll_slip: admin write" on public.payroll_slip;
create policy "payroll_slip: admin write" on public.payroll_slip
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- =============================================================================
-- 10. BGN Generation Log
-- =============================================================================
alter table public.bgn_generation_log enable row level security;

drop policy if exists "bgn_gen_log: staff read" on public.bgn_generation_log;
create policy "bgn_gen_log: staff read" on public.bgn_generation_log
  for select using (
    public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "bgn_gen_log: ops write" on public.bgn_generation_log;
create policy "bgn_gen_log: ops write" on public.bgn_generation_log
  for all using (
    public.current_role() in ('admin','operator','ahli_gizi')
  )
  with check (
    public.current_role() in ('admin','operator','ahli_gizi')
  );

-- =============================================================================
-- END 0051
-- =============================================================================
