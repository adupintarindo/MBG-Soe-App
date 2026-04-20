-- ============================================================================
-- Rollback · module drops per feature migration
-- ----------------------------------------------------------------------------
-- Gunakan blok sesuai migrasi yang ingin dibatalkan. Semua DROP IF EXISTS
-- supaya aman dijalankan berulang atau partial.
-- ============================================================================

-- 0007 supplier_certs
drop table if exists public.supplier_certs cascade;

-- 0008 school_attendance
drop table if exists public.school_attendance cascade;

-- 0009 grn_qc
drop table if exists public.non_conformance_log cascade;
drop table if exists public.grn_qc_checks cascade;
drop table if exists public.qc_checklist_templates cascade;
drop type  if exists public.ncr_status cascade;
drop type  if exists public.ncr_severity cascade;
drop type  if exists public.qc_result cascade;

-- 0010 quotations
drop table if exists public.quotation_rows cascade;
drop table if exists public.quotations cascade;
drop type  if exists public.quotation_status cascade;

-- 0014 supplier_reval
drop table if exists public.supplier_reval cascade;
drop type  if exists public.reval_period cascade;

-- 0015 sop_runs
drop table if exists public.sop_runs cascade;

-- 0017 weekly price list
drop table if exists public.supplier_prices cascade;
drop table if exists public.price_weeks cascade;
drop table if exists public.price_periods cascade;

-- 0020 purchase_requisitions
drop table if exists public.pr_allocations cascade;
drop table if exists public.pr_rows cascade;
drop table if exists public.purchase_requisitions cascade;
drop type  if exists public.pr_status cascade;

-- 0021 supplier_forecast
drop table if exists public.supplier_forecast cascade;

-- 0028 grn_rows
drop table if exists public.grn_rows cascade;

-- 0031 stock_batches
drop table if exists public.stock_batches cascade;

-- 0032 payments_cashflow
drop table if exists public.cash_receipts cascade;
drop table if exists public.payments cascade;
drop type  if exists public.cash_source cascade;
drop type  if exists public.payment_method cascade;

-- 0033 deliveries
drop table if exists public.delivery_stops cascade;
drop table if exists public.deliveries cascade;
drop type  if exists public.delivery_status cascade;

-- 0034 audit_events
drop table if exists public.audit_events cascade;
drop type  if exists public.audit_action cascade;

-- 0035 budgets
drop table if exists public.budgets cascade;

-- 0036 supplier_portal
drop table if exists public.invoice_uploads cascade;
drop table if exists public.supplier_messages cascade;
drop table if exists public.po_acknowledgements cascade;
drop type  if exists public.invoice_upload_status cascade;
drop type  if exists public.po_ack_decision cascade;
