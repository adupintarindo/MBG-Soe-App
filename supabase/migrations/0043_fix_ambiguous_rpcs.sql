-- ============================================================================
-- 0043 · Fix ambiguous column references in porsi_counts & daily_planning
-- Root cause: RETURN TABLE kolom bentrok dgn alias CTE / kolom schools.*.
-- Fix: pakai alias tabel eksplisit (s.guru, s.kelas13, s.kelas46) dan
-- hindari nama kolom `operasional` yg bentrok dgn RETURN TABLE di
-- daily_planning saat memanggil porsi_counts().
-- ============================================================================

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
      s.id              as sid,
      s.level           as slevel,
      s.students        as sstudents,
      s.kelas13         as skelas13,
      s.kelas46         as skelas46,
      s.guru            as sguru,
      a.qty             as att_qty,
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
        when slevel = 'PAUD/TK' then round(sstudents * ratio)
        when slevel = 'SD'      then round(skelas13 * ratio)
        else 0
      end
    ), 0)::int,
    coalesce(sum(
      case
        when slevel = 'SD'                 then round(skelas46 * ratio)
        when slevel in ('SMP','SMA','SMK') then round(sstudents * ratio)
        else 0
      end
    ), 0)::int,
    coalesce(sum(round(sguru * ratio)), 0)::int
  into v_kecil, v_besar, v_guru
  from roster;

  return query select v_kecil, v_besar, v_guru, (v_kecil + v_besar + v_guru), true;
end; $$;


create or replace function public.daily_planning(p_horizon int default 10)
returns table(
  op_date date,
  menu_id smallint,
  menu_name text,
  porsi_total int,
  porsi_eff numeric,
  total_kg numeric,
  short_items int,
  operasional boolean
)
language plpgsql stable as $$
declare
  d date;
  i int := 0;
  v_kecil int;
  v_besar int;
  v_guru  int;
  v_op    boolean;
  v_menu  smallint;
  v_menu_name text;
  v_eff numeric;
  v_kg  numeric;
  v_short int;
begin
  d := current_date;
  while i < greatest(p_horizon, 1) loop
    -- porsi counts & operasional (hindari SELECT INTO record utk cegah name-clash)
    select pc.kecil, pc.besar, pc.guru, pc.operasional
      into v_kecil, v_besar, v_guru, v_op
      from public.porsi_counts(d) as pc;

    v_op  := coalesce(v_op, false);
    v_eff := public.porsi_effective(d);

    select ma.menu_id into v_menu
      from public.menu_assign ma
     where ma.assign_date = d;
    if v_menu is not null then
      select m.name into v_menu_name from public.menus m where m.id = v_menu;
    else
      v_menu_name := null;
    end if;

    select coalesce(sum(r.qty), 0) into v_kg
      from public.requirement_for_date(d) as r;

    select coalesce(count(*) filter (where s.gap > 0), 0)::int into v_short
      from public.stock_shortage_for_date(d) as s;

    op_date     := d;
    menu_id     := v_menu;
    menu_name   := v_menu_name;
    porsi_total := coalesce(v_kecil,0) + coalesce(v_besar,0) + coalesce(v_guru,0);
    porsi_eff   := v_eff;
    total_kg    := v_kg;
    short_items := v_short;
    operasional := v_op;
    return next;

    d := d + 1;
    i := i + 1;
  end loop;
end; $$;
