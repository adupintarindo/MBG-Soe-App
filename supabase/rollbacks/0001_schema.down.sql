-- ============================================================================
-- Rollback · 0001_schema.sql (full teardown · DESTRUCTIVE)
-- ----------------------------------------------------------------------------
-- DANGER: ini drop SEMUA tabel + type + data. Untuk fresh install saja.
-- Jalankan hanya kalau ingin reset database ke kondisi kosong.
-- Urutan: tabel yang depend ke lain di-drop dulu, baru type enum.
-- ============================================================================

begin;

drop table if exists public.settings                  cascade;
drop table if exists public.transactions              cascade;
drop table if exists public.receipts                  cascade;
drop table if exists public.invoices                  cascade;
drop table if exists public.grns                      cascade;
drop table if exists public.po_rows                   cascade;
drop table if exists public.purchase_orders           cascade;
drop table if exists public.stock_moves               cascade;
drop table if exists public.stock                     cascade;
drop table if exists public.non_op_days               cascade;
drop table if exists public.custom_menus              cascade;
drop table if exists public.menu_assign               cascade;
drop table if exists public.supplier_actions          cascade;
drop table if exists public.supplier_items            cascade;
drop table if exists public.suppliers                 cascade;
drop table if exists public.schools                   cascade;
drop table if exists public.menu_bom                  cascade;
drop table if exists public.menus                     cascade;
drop table if exists public.items                     cascade;
drop table if exists public.invites                   cascade;
drop table if exists public.profiles                  cascade;

drop type if exists public.tx_type         cascade;
drop type if exists public.invoice_status  cascade;
drop type if exists public.grn_status      cascade;
drop type if exists public.po_status       cascade;
drop type if exists public.move_reason     cascade;
drop type if exists public.action_source   cascade;
drop type if exists public.action_priority cascade;
drop type if exists public.action_status   cascade;
drop type if exists public.supplier_status cascade;
drop type if exists public.supplier_type   cascade;
drop type if exists public.school_level    cascade;
drop type if exists public.item_category   cascade;
drop type if exists public.user_role       cascade;

commit;
