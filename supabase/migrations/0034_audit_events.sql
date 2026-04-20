-- =============================================================================
-- 0034 · Generic audit log untuk tabel kritikal
-- -----------------------------------------------------------------------------
-- Masalah: tidak ada jejak "siapa ubah apa kapan". Supplier punya write access,
-- admin butuh audit untuk compliance WFP + internal investigation.
--
-- Desain:
--   audit_events(id, actor_id, actor_email, actor_role, table_name, row_pk,
--                action, diff, ts, user_agent, ip)
--   trg_audit_generic (row-level, before/after JSON diff)
--   RPC list_audit, audit_for_row
--
-- Tabel yang di-attach trigger: items, suppliers, menus, menu_bom, menu_assign,
--   purchase_orders, po_rows, grns, invoices, payments, supplier_prices,
--   settings (harga bahan & konfigurasi = high-stakes).
-- =============================================================================

create type public.audit_action as enum ('INSERT','UPDATE','DELETE');

create table if not exists public.audit_events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  actor_id uuid,                                -- auth.uid() — null kalau service role
  actor_email text,
  actor_role public.user_role,
  table_name text not null,
  row_pk text,                                  -- PK sebagai text (serialize composite jadi json)
  action public.audit_action not null,
  diff jsonb not null,                          -- {"before": {...}, "after": {...}, "changed": ["col1",...]}
  request_id text,                              -- set dari app layer kalau perlu
  user_agent text,
  ip text
);
create index if not exists idx_audit_ts on public.audit_events(ts desc);
create index if not exists idx_audit_table_ts on public.audit_events(table_name, ts desc);
create index if not exists idx_audit_actor on public.audit_events(actor_id, ts desc);
create index if not exists idx_audit_row on public.audit_events(table_name, row_pk);

alter table public.audit_events enable row level security;

drop policy if exists "audit: admin+viewer read" on public.audit_events;
create policy "audit: admin+viewer read" on public.audit_events
  for select using (
    public.current_role() in ('admin','viewer')
  );

-- Tidak ada write policy → insert hanya via trigger (security definer)

-- -----------------------------------------------------------------------------
-- Helper: resolve PK value jadi text (untuk single-col PK)
-- -----------------------------------------------------------------------------
create or replace function public._audit_row_pk(
  p_table regclass, p_row jsonb
) returns text language plpgsql stable as $$
declare
  v_pks text[];
  v_parts text[];
  k text;
begin
  select array_agg(a.attname::text order by a.attnum)
    into v_pks
  from pg_index i
  join pg_attribute a
    on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
  where i.indrelid = p_table and i.indisprimary;

  if v_pks is null or array_length(v_pks, 1) is null then
    return null;
  end if;

  v_parts := array(select coalesce(p_row ->> k, 'null') from unnest(v_pks) k);
  return array_to_string(v_parts, '|');
end; $$;

-- -----------------------------------------------------------------------------
-- Generic audit trigger function
-- -----------------------------------------------------------------------------
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after  jsonb;
  v_pk text;
  v_role public.user_role;
  v_email text;
  v_changed text[];
begin
  if tg_op = 'INSERT' then
    v_after := to_jsonb(new);
    v_pk := public._audit_row_pk(tg_relid, v_after);
  elsif tg_op = 'DELETE' then
    v_before := to_jsonb(old);
    v_pk := public._audit_row_pk(tg_relid, v_before);
  else  -- UPDATE
    v_before := to_jsonb(old);
    v_after  := to_jsonb(new);
    v_pk := public._audit_row_pk(tg_relid, v_after);
    -- Skip kalau tidak ada kolom yang berubah (mis. touch trigger trivial)
    select array_agg(k) into v_changed
      from (
        select k from jsonb_each(v_after) j(k, v)
        where j.v is distinct from (v_before -> j.k)
      ) diff
     where k not in ('updated_at','created_at');
    if v_changed is null or array_length(v_changed, 1) is null then
      return null;
    end if;
  end if;

  begin
    select role, email into v_role, v_email
      from public.profiles where id = auth.uid();
  exception when others then
    v_role := null; v_email := null;
  end;

  insert into public.audit_events(
    actor_id, actor_email, actor_role, table_name, row_pk, action, diff
  ) values (
    auth.uid(), v_email, v_role,
    tg_table_name, v_pk, tg_op::public.audit_action,
    jsonb_build_object(
      'before', v_before,
      'after',  v_after,
      'changed', v_changed
    )
  );
  return null;
end; $$;

-- -----------------------------------------------------------------------------
-- Attach trigger ke tabel kritikal (idempoten)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'items','suppliers','supplier_items','menus','menu_bom','menu_assign',
    'custom_menus','purchase_orders','po_rows','grns','grn_rows','invoices',
    'payments','cash_receipts','settings','supplier_prices',
    'profiles','invites','stock_batches','deliveries','delivery_stops'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format(
      'create trigger trg_audit after insert or update or delete on public.%I
         for each row execute function public.audit_trigger()', t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- RPC · list_audit dengan filter
-- -----------------------------------------------------------------------------
create or replace function public.list_audit(
  p_table text default null,
  p_actor uuid default null,
  p_action public.audit_action default null,
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now(),
  p_limit int default 200
)
returns setof public.audit_events
language sql stable as $$
  select *
    from public.audit_events
   where ts between p_from and p_to
     and (p_table is null or table_name = p_table)
     and (p_actor is null or actor_id = p_actor)
     and (p_action is null or action = p_action)
   order by ts desc
   limit greatest(p_limit, 1);
$$;

grant execute on function public.list_audit(text, uuid, public.audit_action, timestamptz, timestamptz, int)
  to authenticated;

-- =============================================================================
-- END 0034
-- =============================================================================
