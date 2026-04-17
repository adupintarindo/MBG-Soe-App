-- =============================================================================
-- 0019 · Align RLS write policies with calendar UI role matrix
-- -----------------------------------------------------------------------------
-- Problem: app/calendar/page.tsx menganggap ahli_gizi boleh menulis ke tabel
-- planning (`non_op_days`, `school_attendance` via CalendarGrid), tapi RLS
-- policy hanya allow admin/operator. Hasilnya tombol "Tandai Non-Op" /
-- upsert kehadiran siswa terlihat di UI lalu ditolak DB:
--   "new row violates row-level security policy for table non_op_days"
--
-- Fix: rewrite write policy untuk 2 tabel supaya include ahli_gizi.
-- Read policy tidak berubah. Idempoten (drop-create). Tidak mengubah semantik
-- tabel operasional lain (stock, PO, GRN, invoice, receipt, tx) — mereka
-- tetap admin/operator only karena bukan ranah ahli_gizi.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- non_op_days · shared planning surface (kalender menu)
-- -----------------------------------------------------------------------------
drop policy if exists "nonop: op/admin write" on public.non_op_days;
drop policy if exists "nonop: op/gz/admin write" on public.non_op_days;
create policy "nonop: op/gz/admin write" on public.non_op_days
  for all using (public.current_role() in ('admin','operator','ahli_gizi'))
  with check (public.current_role() in ('admin','operator','ahli_gizi'));

-- -----------------------------------------------------------------------------
-- school_attendance · diisi dari calendar-grid (forecast harian)
-- -----------------------------------------------------------------------------
drop policy if exists "sch_att: operator write" on public.school_attendance;
drop policy if exists "sch_att: op/gz/admin write" on public.school_attendance;
create policy "sch_att: op/gz/admin write" on public.school_attendance
  for all using (public.current_role() in ('admin','operator','ahli_gizi'))
  with check (public.current_role() in ('admin','operator','ahli_gizi'));

-- =============================================================================
-- END 0019
-- =============================================================================
