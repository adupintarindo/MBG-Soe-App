-- ============================================================================
-- Engine functions & RPC
-- Port dari Dashboard_SupplyChain_MBG_Soe.html (MBG_ENGINE) ke SQL
-- ============================================================================

-- Hitung jumlah porsi kecil/besar/guru untuk tanggal tertentu
create or replace function public.porsi_counts(p_date date)
returns table(kecil int, besar int, guru int, total int, operasional boolean)
language plpgsql stable as $$
declare
  v_kecil int := 0;
  v_besar int := 0;
  v_guru int := 0;
  v_nonop boolean := false;
begin
  -- non-op?
  select true into v_nonop from public.non_op_days where op_date = p_date;
  if coalesce(v_nonop,false) then
    return query select 0,0,0,0,false;
    return;
  end if;

  -- weekend?
  if extract(dow from p_date) in (0,6) then
    return query select 0,0,0,0,false;
    return;
  end if;

  select
    coalesce(sum(case when level in ('PAUD/TK') then students else 0 end),0)
    + coalesce(sum(case when level = 'SD' then kelas13 else 0 end),0),
    coalesce(sum(case when level = 'SD' then kelas46 else 0 end),0)
    + coalesce(sum(case when level in ('SMP','SMA','SMK') then students else 0 end),0),
    coalesce(sum(guru),0)
  into v_kecil, v_besar, v_guru
  from public.schools where active = true;

  return query select v_kecil, v_besar, v_guru, (v_kecil+v_besar+v_guru), true;
end; $$;

-- Porsi effective (untuk scaling BOM): kecil*w_kecil + (besar+guru)*w_besar
create or replace function public.porsi_effective(p_date date)
returns numeric language plpgsql stable as $$
declare
  v_cnt record;
  v_wk numeric;
  v_wb numeric;
begin
  select kecil, besar, guru into v_cnt
    from public.porsi_counts(p_date);
  if v_cnt is null then return 0; end if;

  select (value->>'kecil')::numeric into v_wk from public.settings where key='porsi_weight';
  select (value->>'besar')::numeric into v_wb from public.settings where key='porsi_weight';
  v_wk := coalesce(v_wk, 0.7);
  v_wb := coalesce(v_wb, 1.0);

  return coalesce(v_cnt.kecil,0) * v_wk + (coalesce(v_cnt.besar,0) + coalesce(v_cnt.guru,0)) * v_wb;
end; $$;

-- Kebutuhan bahan per tanggal (kg per item, scaled oleh porsi_effective)
create or replace function public.requirement_for_date(p_date date)
returns table(item_code text, qty numeric, unit text, category public.item_category, price_idr numeric)
language plpgsql stable as $$
declare
  v_menu smallint;
  v_eff numeric;
begin
  v_eff := public.porsi_effective(p_date);
  if v_eff <= 0 then
    return;
  end if;

  -- Resolve menu: custom_menus dulu, lalu menu_assign
  if exists (select 1 from public.custom_menus where menu_date = p_date) then
    -- Custom menu: tidak refer menus.id, return dari jsonb (flatten)
    return query
      select
        it.code as item_code,
        (100.0 * v_eff / 1000.0)::numeric as qty,  -- default 100g/porsi untuk item custom
        it.unit,
        it.category,
        it.price_idr
      from public.custom_menus cm,
           jsonb_array_elements_text(cm.karbo || cm.protein || cm.sayur || cm.buah) as elem(val)
           join public.items it on it.code = elem.val
      where cm.menu_date = p_date;
    return;
  end if;

  select menu_id into v_menu from public.menu_assign where assign_date = p_date;
  if v_menu is null then
    return;
  end if;

  return query
    select
      b.item_code,
      (b.grams_per_porsi * v_eff / 1000.0)::numeric as qty,
      it.unit,
      it.category,
      it.price_idr
    from public.menu_bom b
    join public.items it on it.code = b.item_code
    where b.menu_id = v_menu;
end; $$;

-- Shortage scan: per tanggal, return item dimana kebutuhan > stok saat ini
create or replace function public.stock_shortage_for_date(p_date date)
returns table(item_code text, required numeric, on_hand numeric, gap numeric, unit text)
language plpgsql stable as $$
begin
  return query
    select r.item_code,
           r.qty as required,
           coalesce(s.qty, 0) as on_hand,
           greatest(r.qty - coalesce(s.qty, 0), 0) as gap,
           r.unit
    from public.requirement_for_date(p_date) r
    left join public.stock s on s.item_code = r.item_code
    order by gap desc;
end; $$;

-- Upcoming shortages (horizon N hari ke depan, return tanggal2 dengan shortage)
create or replace function public.upcoming_shortages(p_horizon int default 14)
returns table(op_date date, short_items int, total_gap_kg numeric)
language plpgsql stable as $$
declare
  d date;
  i int := 0;
begin
  d := current_date;
  while i < p_horizon loop
    return query
      select d as op_date,
             count(*)::int,
             sum(gap)
      from public.stock_shortage_for_date(d)
      where gap > 0
      group by 1
      having count(*) > 0;
    d := d + 1;
    i := i + 1;
  end loop;
end; $$;

-- ============================================================================
-- Invite/accept flow: admin create invite, user klaim via token
-- ============================================================================
-- Admin buat invite (dipanggil dari app via service client atau RPC)
create or replace function public.create_invite(
  p_email text,
  p_role public.user_role,
  p_supplier_id text default null
) returns text language plpgsql security definer as $$
declare
  v_token text;
  v_caller_role public.user_role;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is distinct from 'admin' then
    raise exception 'Only admin can create invites';
  end if;

  insert into public.invites(email, role, supplier_id, created_by)
  values (lower(trim(p_email)), p_role, p_supplier_id, auth.uid())
  returning token into v_token;

  return v_token;
end; $$;

-- Saat user login pertama kali via magic link, trigger ini populate profiles
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_invite record;
begin
  select * into v_invite from public.invites
    where lower(email) = lower(new.email)
      and used_at is null
      and expires_at > now()
    order by created_at desc limit 1;

  if v_invite is null then
    -- Tanpa invite → default viewer, nonaktif, admin harus aktifkan manual
    insert into public.profiles(id, email, full_name, role, active)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'viewer', false);
  else
    insert into public.profiles(id, email, full_name, role, supplier_id, active, invited_by)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name',
            v_invite.role, v_invite.supplier_id, true, v_invite.created_by);
    update public.invites set used_at = now(), used_by = new.id where id = v_invite.id;
  end if;

  return new;
end; $$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- SUPPLIER ACTION TRACKER RPCs
-- Sumber: Onboarding MBG Suppliers (WFP × IFSR × FFI, Soe)
-- ============================================================================

-- List actions (optional filter by supplier_id, status, source)
-- RLS tetap berlaku: supplier hanya lihat action miliknya.
create or replace function public.list_supplier_actions(
  p_supplier_id text default null,
  p_status public.action_status default null,
  p_source public.action_source default null
) returns table (
  id bigint,
  supplier_id text,
  supplier_name text,
  related_scope text,
  title text,
  description text,
  category text,
  priority public.action_priority,
  status public.action_status,
  owner text,
  target_date date,
  done_at timestamptz,
  blocked_reason text,
  output_notes text,
  source public.action_source,
  source_ref text,
  days_to_target int,
  is_overdue boolean,
  created_at timestamptz,
  updated_at timestamptz
) language sql stable as $$
  select
    a.id,
    a.supplier_id,
    s.name as supplier_name,
    a.related_scope,
    a.title,
    a.description,
    a.category,
    a.priority,
    a.status,
    a.owner,
    a.target_date,
    a.done_at,
    a.blocked_reason,
    a.output_notes,
    a.source,
    a.source_ref,
    case
      when a.target_date is null then null
      else (a.target_date - current_date)::int
    end as days_to_target,
    (a.target_date is not null
      and a.target_date < current_date
      and a.status in ('open','in_progress','blocked')) as is_overdue,
    a.created_at,
    a.updated_at
  from public.supplier_actions a
  left join public.suppliers s on s.id = a.supplier_id
  where (p_supplier_id is null or a.supplier_id = p_supplier_id)
    and (p_status is null or a.status = p_status)
    and (p_source is null or a.source = p_source)
  order by
    case a.status
      when 'blocked' then 0
      when 'open' then 1
      when 'in_progress' then 2
      when 'done' then 3
      when 'cancelled' then 4
    end,
    case a.priority
      when 'critical' then 0
      when 'high' then 1
      when 'medium' then 2
      when 'low' then 3
    end,
    a.target_date nulls last,
    a.id;
$$;

-- Update status action (admin/operator bebas, supplier hanya boleh update action miliknya via RLS)
create or replace function public.update_action_status(
  p_id bigint,
  p_status public.action_status,
  p_notes text default null,
  p_blocked_reason text default null
) returns public.supplier_actions
language plpgsql as $$
declare
  v_row public.supplier_actions;
begin
  update public.supplier_actions
     set status = p_status,
         output_notes = coalesce(p_notes, output_notes),
         blocked_reason = case
           when p_status = 'blocked' then coalesce(p_blocked_reason, blocked_reason)
           else null
         end
   where id = p_id
   returning * into v_row;

  if v_row.id is null then
    raise exception 'Action % not found or not permitted', p_id;
  end if;

  return v_row;
end; $$;

-- Readiness snapshot untuk KPI dashboard
create or replace function public.action_readiness_snapshot()
returns table (
  total int,
  open_cnt int,
  in_progress_cnt int,
  blocked_cnt int,
  done_cnt int,
  cancelled_cnt int,
  overdue_cnt int,
  high_priority_open int,
  readiness_pct numeric
) language sql stable as $$
  with base as (
    select *
    from public.supplier_actions
  )
  select
    count(*)::int as total,
    count(*) filter (where status = 'open')::int,
    count(*) filter (where status = 'in_progress')::int,
    count(*) filter (where status = 'blocked')::int,
    count(*) filter (where status = 'done')::int,
    count(*) filter (where status = 'cancelled')::int,
    count(*) filter (
      where target_date is not null
        and target_date < current_date
        and status in ('open','in_progress','blocked')
    )::int as overdue_cnt,
    count(*) filter (
      where priority in ('high','critical')
        and status in ('open','in_progress','blocked')
    )::int as high_priority_open,
    case
      when count(*) filter (where status <> 'cancelled') = 0 then 0
      else round(
        100.0 * count(*) filter (where status = 'done')::numeric
        / nullif(count(*) filter (where status <> 'cancelled'), 0),
        1
      )
    end as readiness_pct
  from base;
$$;

-- List action yang sudah lewat target (untuk alerting)
create or replace function public.overdue_actions()
returns table (
  id bigint,
  supplier_id text,
  supplier_name text,
  related_scope text,
  title text,
  priority public.action_priority,
  status public.action_status,
  target_date date,
  days_late int,
  owner text
) language sql stable as $$
  select
    a.id,
    a.supplier_id,
    s.name as supplier_name,
    a.related_scope,
    a.title,
    a.priority,
    a.status,
    a.target_date,
    (current_date - a.target_date)::int as days_late,
    a.owner
  from public.supplier_actions a
  left join public.suppliers s on s.id = a.supplier_id
  where a.target_date is not null
    and a.target_date < current_date
    and a.status in ('open','in_progress','blocked')
  order by
    (current_date - a.target_date) desc,
    case a.priority
      when 'critical' then 0
      when 'high' then 1
      when 'medium' then 2
      when 'low' then 3
    end;
$$;

grant execute on function public.list_supplier_actions(text, public.action_status, public.action_source) to authenticated;
grant execute on function public.update_action_status(bigint, public.action_status, text, text) to authenticated;
grant execute on function public.action_readiness_snapshot() to authenticated;
grant execute on function public.overdue_actions() to authenticated;
