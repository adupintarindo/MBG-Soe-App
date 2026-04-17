-- =============================================================================
-- 0029 · RLS tightening (Prioritas 3 dari DB_REVIEW.md)
-- -----------------------------------------------------------------------------
-- Isu: Policies existing memberi `auth.uid() is not null` read untuk banyak
-- tabel sensitif (suppliers, schools) termasuk role supplier — artinya supplier
-- bisa lihat competitor + school detail WFP program. Selain itu, UPDATE policy
-- supplier di grns / supplier_actions / quotations tidak membatasi kolom
-- (supplier bisa ubah po_no, supplier_id, total, dll).
--
-- Fix:
--   1. suppliers  · supplier role hanya lihat own row
--   2. schools    · supplier role tidak boleh read sama sekali
--   3. Column-whitelist triggers untuk supplier UPDATE:
--        - grns              → hanya status, qc_note
--        - supplier_actions  → hanya status, output_notes, blocked_reason, done_at
--        - quotations        → hanya status, notes, responded_at, responded_by
--        - quotation_rows    → hanya price_quoted, qty_quoted, note
--
-- Idempoten: DROP POLICY / TRIGGER / FUNCTION IF EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. suppliers · supplier role scoped to own record
-- -----------------------------------------------------------------------------
drop policy if exists "suppliers: auth read" on public.suppliers;

drop policy if exists "suppliers: staff read" on public.suppliers;
create policy "suppliers: staff read" on public.suppliers
  for select using (
    auth.uid() is not null
    and public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

drop policy if exists "suppliers: supplier read own" on public.suppliers;
create policy "suppliers: supplier read own" on public.suppliers
  for select using (
    public.current_role() = 'supplier'
    and id = public.current_supplier_id()
  );

-- Supplier boleh update kontak / alamat profil sendiri (bukan rating/status).
-- Enforce kolom via trigger di bawah (trg_suppliers_supplier_whitelist).
drop policy if exists "suppliers: supplier update own" on public.suppliers;
create policy "suppliers: supplier update own" on public.suppliers
  for update using (
    public.current_role() = 'supplier'
    and id = public.current_supplier_id()
  ) with check (
    public.current_role() = 'supplier'
    and id = public.current_supplier_id()
  );

-- -----------------------------------------------------------------------------
-- 2. schools · supplier role tidak boleh akses
-- -----------------------------------------------------------------------------
drop policy if exists "schools: auth read" on public.schools;

drop policy if exists "schools: staff read" on public.schools;
create policy "schools: staff read" on public.schools
  for select using (
    auth.uid() is not null
    and public.current_role() in ('admin','operator','ahli_gizi','viewer')
  );

-- -----------------------------------------------------------------------------
-- 3. Column-whitelist triggers · supplier UPDATE hanya ubah kolom tertentu
-- -----------------------------------------------------------------------------

-- 3a. grns: supplier hanya boleh ubah status + qc_note
create or replace function public.enforce_supplier_update_grns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'supplier' then
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

drop trigger if exists trg_grns_supplier_whitelist on public.grns;
create trigger trg_grns_supplier_whitelist
  before update on public.grns
  for each row execute function public.enforce_supplier_update_grns();

-- 3b. supplier_actions: supplier hanya update status, output_notes, blocked_reason, done_at
create or replace function public.enforce_supplier_update_supactions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'supplier' then
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

drop trigger if exists trg_supactions_supplier_whitelist on public.supplier_actions;
create trigger trg_supactions_supplier_whitelist
  before update on public.supplier_actions
  for each row execute function public.enforce_supplier_update_supactions();

-- 3c. quotations: supplier hanya ubah status (->'responded'), notes, responded_at/by
create or replace function public.enforce_supplier_update_quotations()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'supplier' then
    return new;
  end if;
  if new.no              is distinct from old.no
  or new.supplier_id     is distinct from old.supplier_id
  or new.quote_date      is distinct from old.quote_date
  or new.valid_until     is distinct from old.valid_until
  or new.need_date       is distinct from old.need_date
  or new.total           is distinct from old.total  -- recomputed via trigger
  or new.converted_po_no is distinct from old.converted_po_no
  or new.created_at      is distinct from old.created_at
  or new.created_by      is distinct from old.created_by then
    raise exception 'supplier only allowed to update status / notes / responded_at / responded_by';
  end if;
  -- Status transition: supplier can only move sent → responded (or keep responded)
  if new.status is distinct from old.status
     and not (old.status = 'sent' and new.status = 'responded')
     and not (old.status = 'responded' and new.status = 'responded') then
    raise exception 'supplier status transition % → % not allowed', old.status, new.status;
  end if;
  return new;
end; $$;

drop trigger if exists trg_quotations_supplier_whitelist on public.quotations;
create trigger trg_quotations_supplier_whitelist
  before update on public.quotations
  for each row execute function public.enforce_supplier_update_quotations();

-- 3d. quotation_rows: supplier hanya ubah price_quoted, qty_quoted, note
create or replace function public.enforce_supplier_update_qt_rows()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'supplier' then
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

drop trigger if exists trg_qt_rows_supplier_whitelist on public.quotation_rows;
create trigger trg_qt_rows_supplier_whitelist
  before update on public.quotation_rows
  for each row execute function public.enforce_supplier_update_qt_rows();

-- 3e. suppliers: supplier hanya ubah contact fields (bukan rating/status/scoring).
--     Kolom suppliers per 0001: id, name, type, commodity, pic, phone, address,
--     email, notes, score, status, active, created_at.
--     Whitelist utk supplier role: pic, phone, email, address, notes.
create or replace function public.enforce_supplier_update_suppliers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'supplier' then
    return new;
  end if;
  if new.id         is distinct from old.id
  or new.name       is distinct from old.name
  or new.type       is distinct from old.type
  or new.commodity  is distinct from old.commodity
  or new.score      is distinct from old.score
  or new.status     is distinct from old.status
  or new.active     is distinct from old.active
  or new.created_at is distinct from old.created_at then
    raise exception 'supplier only allowed to update contact fields (pic, phone, email, address, notes)';
  end if;
  return new;
end; $$;

drop trigger if exists trg_suppliers_supplier_whitelist on public.suppliers;
create trigger trg_suppliers_supplier_whitelist
  before update on public.suppliers
  for each row execute function public.enforce_supplier_update_suppliers();

-- =============================================================================
-- END 0029
-- =============================================================================
