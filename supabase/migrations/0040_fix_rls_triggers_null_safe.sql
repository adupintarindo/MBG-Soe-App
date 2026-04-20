-- =============================================================================
-- 0040 · Fix NULL-unsafe RLS whitelist triggers dari 0029_rls_tighten.sql
-- -----------------------------------------------------------------------------
-- Problem identik dengan yang sudah di-patch untuk enforce_supplier_update_suppliers
-- di migrasi 0039. 4 trigger lain dari 0029 pakai pola yang sama:
--
--   if public.current_role() <> 'supplier' then
--     return new;
--   end if;
--
-- current_role() return NULL saat session bukan auth user (CLI / postgres
-- superuser / service_role tanpa JWT). NULL <> 'supplier' → NULL → IF treated
-- as false → guard jalan untuk semua session non-supplier, block admin/CLI.
--
-- 4 trigger yang di-patch:
--   · enforce_supplier_update_grns        (0029 line 70)
--   · enforce_supplier_update_supactions  (0029 line 92)
--   · enforce_supplier_update_quotations  (0029 line 124)
--   · enforce_supplier_update_qt_rows     (0029 line 156)
--
-- Fix: tambah `is null or` di awal check supaya NULL session lolos guard.
-- Idempoten via CREATE OR REPLACE FUNCTION.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. grns: supplier hanya boleh ubah status + qc_note
-- -----------------------------------------------------------------------------
create or replace function public.enforce_supplier_update_grns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() is null or public.current_role() <> 'supplier' then
    return new;
  end if;
  if new.no          is distinct from old.no
  or new.po_no       is distinct from old.po_no
  or new.grn_date    is distinct from old.grn_date
  or new.created_at  is distinct from old.created_at
  or new.created_by  is distinct from old.created_by then
    raise exception 'supplier only allowed to update status / qc_note on grns';
  end if;
  return new;
end; $$;

-- -----------------------------------------------------------------------------
-- 2. supplier_actions: supplier hanya update status/output_notes/blocked_reason/done_at
-- -----------------------------------------------------------------------------
create or replace function public.enforce_supplier_update_supactions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() is null or public.current_role() <> 'supplier' then
    return new;
  end if;
  if new.id              is distinct from old.id
  or new.supplier_id     is distinct from old.supplier_id
  or new.related_scope   is distinct from old.related_scope
  or new.title           is distinct from old.title
  or new.description     is distinct from old.description
  or new.category        is distinct from old.category
  or new.priority        is distinct from old.priority
  or new.owner           is distinct from old.owner
  or new.owner_user_id   is distinct from old.owner_user_id
  or new.target_date     is distinct from old.target_date
  or new.done_by         is distinct from old.done_by
  or new.source          is distinct from old.source
  or new.source_ref      is distinct from old.source_ref
  or new.created_at      is distinct from old.created_at
  or new.created_by      is distinct from old.created_by then
    raise exception 'supplier only allowed to update status / output_notes / blocked_reason / done_at';
  end if;
  return new;
end; $$;

-- -----------------------------------------------------------------------------
-- 3. quotations: supplier hanya ubah status/notes/responded_at+by
-- -----------------------------------------------------------------------------
create or replace function public.enforce_supplier_update_quotations()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() is null or public.current_role() <> 'supplier' then
    return new;
  end if;
  if new.no              is distinct from old.no
  or new.supplier_id     is distinct from old.supplier_id
  or new.quote_date      is distinct from old.quote_date
  or new.valid_until     is distinct from old.valid_until
  or new.need_date       is distinct from old.need_date
  or new.total           is distinct from old.total
  or new.converted_po_no is distinct from old.converted_po_no
  or new.created_at      is distinct from old.created_at
  or new.created_by      is distinct from old.created_by then
    raise exception 'supplier only allowed to update status / notes / responded_at / responded_by';
  end if;
  if new.status is distinct from old.status
     and not (old.status = 'sent' and new.status = 'responded')
     and not (old.status = 'responded' and new.status = 'responded') then
    raise exception 'supplier status transition % → % not allowed', old.status, new.status;
  end if;
  return new;
end; $$;

-- -----------------------------------------------------------------------------
-- 4. quotation_rows: supplier hanya ubah price_quoted / qty_quoted / note
-- -----------------------------------------------------------------------------
create or replace function public.enforce_supplier_update_qt_rows()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() is null or public.current_role() <> 'supplier' then
    return new;
  end if;
  if new.qt_no            is distinct from old.qt_no
  or new.line_no          is distinct from old.line_no
  or new.item_code        is distinct from old.item_code
  or new.qty              is distinct from old.qty
  or new.unit             is distinct from old.unit
  or new.price_suggested  is distinct from old.price_suggested then
    raise exception 'supplier only allowed to update price_quoted / qty_quoted / note';
  end if;
  return new;
end; $$;

-- =============================================================================
-- Verifikasi inline: pastikan 4 function masih ada + SECURITY DEFINER
-- =============================================================================
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'enforce_supplier_update_grns',
      'enforce_supplier_update_supactions',
      'enforce_supplier_update_quotations',
      'enforce_supplier_update_qt_rows'
    )
    and p.prosecdef = true;
  raise notice '0040 applied: % / 4 RLS whitelist functions patched (NULL-safe + SECURITY DEFINER)', v_count;
end $$;

-- =============================================================================
-- END 0040
-- =============================================================================
