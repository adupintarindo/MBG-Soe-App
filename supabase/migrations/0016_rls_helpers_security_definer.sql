-- =============================================================================
-- 0016 · Fix RLS recursion → "stack depth limit exceeded"
-- -----------------------------------------------------------------------------
-- Problem: helper RLS (current_role, current_supplier_id, is_admin) query
-- public.profiles tanpa SECURITY DEFINER. Policy "profiles: admin all read"
-- memanggil is_admin() → current_role() → SELECT profiles → kembali evaluasi
-- policy → rekursi sampai max_stack_depth.
--
-- Fix: ubah 3 helper ke SECURITY DEFINER + lock search_path. Helper jadi
-- bypass RLS saat query profiles, memutus loop tanpa mengubah semantik
-- (function cuma baca role/supplier_id user aktif, bukan enforcement point).
--
-- Tambahan: trg_qt_rows_recalc diberi guard pg_trigger_depth() supaya UPDATE
-- quotations dari trigger tidak pernah fire chain trigger lain (defense in
-- depth, tidak strictly needed tapi murah).
-- =============================================================================

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.current_supplier_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select supplier_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

-- Re-grant (SECURITY DEFINER tidak pengaruh EXECUTE grant, tapi memastikan).
grant execute on function public.current_role()        to authenticated, anon;
grant execute on function public.current_supplier_id() to authenticated, anon;
grant execute on function public.is_admin()            to authenticated, anon;

-- -----------------------------------------------------------------------------
-- Defense in depth: quotation total recalc trigger tidak perlu rekursif.
-- -----------------------------------------------------------------------------
create or replace function public.recalc_quotation_total()
returns trigger language plpgsql as $$
declare
  v_qt text;
  v_sum numeric(14,2);
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  v_qt := coalesce(new.qt_no, old.qt_no);
  select coalesce(sum(subtotal), 0) into v_sum
  from public.quotation_rows
  where qt_no = v_qt;
  update public.quotations set total = v_sum where no = v_qt;
  return null;
end; $$;
