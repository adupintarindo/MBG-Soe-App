-- =============================================================================
-- 0019 · Storage Buckets · receipts + supplier_docs + avatars
-- -----------------------------------------------------------------------------
-- Bucket policies pakai storage.foldername(name) → path-prefix untuk per-supplier
-- isolation. Naming convention:
--   receipts/{yyyy-mm}/{tx_id}.{ext}        → nota pembelian/invoice (operator)
--   supplier_docs/{supplier_id}/{kind}.{ext} → cert, NIB, LTA (admin + supplier)
--   avatars/{user_id}.{ext}                  → profile pic (self)
--
-- RLS di storage.objects: Supabase sudah aktifkan by default. Kita cuma add
-- policies spesifik per bucket. Bucket dibuat via INSERT ke storage.buckets.
-- Idempotent: ON CONFLICT DO NOTHING.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Buckets (private — tidak public browsable; akses via signed URL / policy)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('receipts',      'receipts',      false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('supplier_docs', 'supplier_docs', false, 20971520, array['image/jpeg','image/png','application/pdf']),
  ('avatars',       'avatars',       true,   2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Policies · RECEIPTS (operator write, semua auth read)
-- -----------------------------------------------------------------------------
drop policy if exists "receipts: auth read"   on storage.objects;
create policy "receipts: auth read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and auth.uid() is not null
  );

drop policy if exists "receipts: ops write"  on storage.objects;
create policy "receipts: ops write" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and public.current_role() in ('admin','operator')
  );

drop policy if exists "receipts: ops update" on storage.objects;
create policy "receipts: ops update" on storage.objects
  for update using (
    bucket_id = 'receipts'
    and public.current_role() in ('admin','operator')
  );

drop policy if exists "receipts: admin delete" on storage.objects;
create policy "receipts: admin delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 3. Policies · SUPPLIER_DOCS
--    Path: supplier_docs/{supplier_id}/{kind}.{ext}
--    - admin/operator: CRUD semua
--    - supplier role: CRUD hanya folder supplier_id mereka sendiri
--    - auth lain: read-only
-- -----------------------------------------------------------------------------
drop policy if exists "supplier_docs: auth read" on storage.objects;
create policy "supplier_docs: auth read" on storage.objects
  for select using (
    bucket_id = 'supplier_docs'
    and auth.uid() is not null
  );

drop policy if exists "supplier_docs: admin write" on storage.objects;
create policy "supplier_docs: admin write" on storage.objects
  for all using (
    bucket_id = 'supplier_docs'
    and public.current_role() in ('admin','operator')
  ) with check (
    bucket_id = 'supplier_docs'
    and public.current_role() in ('admin','operator')
  );

drop policy if exists "supplier_docs: supplier own write" on storage.objects;
create policy "supplier_docs: supplier own write" on storage.objects
  for all using (
    bucket_id = 'supplier_docs'
    and public.current_role() = 'supplier'
    and (storage.foldername(name))[1] = public.current_supplier_id()
  ) with check (
    bucket_id = 'supplier_docs'
    and public.current_role() = 'supplier'
    and (storage.foldername(name))[1] = public.current_supplier_id()
  );

-- -----------------------------------------------------------------------------
-- 4. Policies · AVATARS (public bucket, but write is self-only)
-- -----------------------------------------------------------------------------
drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars: self write" on storage.objects;
create policy "avatars: self write" on storage.objects
  for all using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- END 0019
-- =============================================================================
