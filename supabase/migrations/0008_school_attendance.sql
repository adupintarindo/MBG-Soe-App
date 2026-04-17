-- ============================================================================
-- 0008 · School attendance forecast (perkiraan kehadiran siswa 7 hari ke depan)
-- Panel operator mengisi angka kehadiran per sekolah per tanggal; engine
-- porsi_counts memakai nilai ini jika ada, fallback ke schools.students/kelas.
-- ============================================================================

create table if not exists public.school_attendance (
  school_id text not null references public.schools(id) on delete cascade,
  att_date date not null,
  qty int not null check (qty >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (school_id, att_date)
);

create index if not exists idx_school_att_date on public.school_attendance(att_date);

alter table public.school_attendance enable row level security;

drop policy if exists "sch_att: auth read" on public.school_attendance;
create policy "sch_att: auth read" on public.school_attendance
  for select using (auth.uid() is not null);

drop policy if exists "sch_att: operator write" on public.school_attendance;
create policy "sch_att: operator write" on public.school_attendance
  for all
  using (public.current_role() in ('admin','operator'))
  with check (public.current_role() in ('admin','operator'));

-- ----------------------------------------------------------------------------
-- Patch porsi_counts: consult school_attendance first, fallback to full roster.
-- Per sekolah, rasio hadir = att.qty / schools.students. Rasio ini diterapkan
-- proporsional ke kelas13/kelas46/guru sekolah tersebut. Jika qty tidak ada,
-- sekolah dihitung full roster (perilaku lama).
-- ----------------------------------------------------------------------------
create or replace function public.porsi_counts(p_date date)
returns table(kecil int, besar int, guru int, total int, operasional boolean)
language plpgsql stable as $$
declare
  v_kecil int := 0;
  v_besar int := 0;
  v_guru  int := 0;
  v_nonop boolean := false;
begin
  select true into v_nonop from public.non_op_days where op_date = p_date;
  if coalesce(v_nonop, false) then
    return query select 0,0,0,0,false;
    return;
  end if;

  if extract(dow from p_date) in (0,6) then
    return query select 0,0,0,0,false;
    return;
  end if;

  with roster as (
    select
      s.id,
      s.level,
      s.students,
      s.kelas13,
      s.kelas46,
      s.guru,
      a.qty as att_qty,
      case
        when a.qty is null then 1.0
        when s.students <= 0 then 0.0
        else least(a.qty::numeric / nullif(s.students,0)::numeric, 1.0)
      end as ratio
    from public.schools s
    left join public.school_attendance a
      on a.school_id = s.id and a.att_date = p_date
    where s.active = true
  )
  select
    coalesce(sum(
      case
        when level = 'PAUD/TK' then round(students * ratio)
        when level = 'SD'      then round(kelas13 * ratio)
        else 0
      end
    ), 0)::int,
    coalesce(sum(
      case
        when level = 'SD'                    then round(kelas46 * ratio)
        when level in ('SMP','SMA','SMK')    then round(students * ratio)
        else 0
      end
    ), 0)::int,
    coalesce(sum(round(guru * ratio)), 0)::int
  into v_kecil, v_besar, v_guru
  from roster;

  return query select v_kecil, v_besar, v_guru, (v_kecil + v_besar + v_guru), true;
end; $$;
