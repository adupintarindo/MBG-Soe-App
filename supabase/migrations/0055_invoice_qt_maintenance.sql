-- 0055_invoice_qt_maintenance.sql
-- Scheduled maintenance RPCs:
--   1) invoices_flag_overdue()   → flip 'issued' → 'overdue' jika due_date < today
--   2) quotations_flag_expired() → flip draft|sent|responded → 'expired' jika valid_until < today
-- Idempotent, stateless, aman dipanggil berulang.

create or replace function public.invoices_flag_overdue()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.invoices
     set status = 'overdue'
   where status = 'issued'
     and due_date is not null
     and due_date < current_date;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.quotations_flag_expired()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.quotations
     set status = 'expired'
   where status in ('draft','sent','responded')
     and valid_until is not null
     and valid_until < current_date
     and converted_po_no is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.invoices_flag_overdue()   from public;
revoke all on function public.quotations_flag_expired() from public;

grant execute on function public.invoices_flag_overdue()   to authenticated, service_role;
grant execute on function public.quotations_flag_expired() to authenticated, service_role;

comment on function public.invoices_flag_overdue()
  is 'Flip invoice issued → overdue ketika due_date sudah lewat. Return jumlah baris terupdate.';
comment on function public.quotations_flag_expired()
  is 'Flip quotation draft/sent/responded → expired ketika valid_until lewat dan belum converted. Return jumlah baris terupdate.';
