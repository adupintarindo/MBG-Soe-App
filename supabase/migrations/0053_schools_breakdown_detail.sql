-- =============================================================================
-- 0053 · schools_breakdown — perinci porsi kecil / besar / guru / total
-- -----------------------------------------------------------------------------
-- Konteks: Modal "Rincian Sekolah" sebelumnya hanya menampilkan kolom Porsi (qty
--          attendance). Untuk dashboard SPPG, operator perlu melihat breakdown
--          per-sekolah: kecil (PAUD/TK & SD kelas 1-3), besar (SD kelas 4-6 +
--          SMP/SMA/SMK), guru, dan total porsi (kecil+besar+guru). Logika di sini
--          mengikuti rumus pada porsi_counts (0052) supaya konsisten.
-- =============================================================================

drop function if exists public.schools_breakdown(date);

create or replace function public.schools_breakdown(p_date date)
returns table(
  school_id    text,
  school_name  text,
  level        text,
  kecil        int,
  besar        int,
  guru         int,
  total        int,
  students     int
)
language sql stable as $$
  with roster as (
    select
      s.id, s.name, s.level, s.students, s.kelas13, s.kelas46, s.guru as guru_count,
      a.qty,
      case
        when a.qty is null then 1.0
        when s.students <= 0 then 0.0
        else least(a.qty::numeric / nullif(s.students,0)::numeric, 1.0)
      end as ratio
    from public.schools s
    left join public.school_attendance a
      on a.school_id = s.id and a.att_date = p_date
    where s.active = true
      and (a.qty is null or a.qty > 0)
  ),
  computed as (
    select
      id, name, level, students,
      case
        when level = 'PAUD/TK' then round(students * ratio)::int
        when level = 'SD'      then round(kelas13 * ratio)::int
        else 0
      end as kecil,
      case
        when level = 'SD'                 then round(kelas46 * ratio)::int
        when level in ('SMP','SMA','SMK') then round(students * ratio)::int
        else 0
      end as besar,
      round(guru_count * ratio)::int as guru
    from roster
  )
  select
    id, name, level,
    kecil, besar, guru,
    (kecil + besar + guru)::int as total,
    students::int
  from computed
  order by name;
$$;

grant execute on function public.schools_breakdown(date) to authenticated;
