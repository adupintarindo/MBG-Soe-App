-- 0056_three_way_match.sql
-- 3-Way Match RPC: cocokkan PO ↔ GRN ↔ Invoice per invoice.
-- Output: nominal PO, nilai GRN aktual, nominal invoice, varians, match_status.
--
-- Match_status:
--   matched   → invoice = po = grn dalam toleransi 0.5%
--   over_po   → invoice > PO  (overbilling vs kontrak)
--   over_grn  → invoice > GRN (overbilling vs barang masuk)
--   under_grn → invoice < GRN (underbilling, mungkin partial)
--   no_grn    → belum ada GRN
--   no_po     → invoice tanpa PO link
--   review    → kasus mixed lain

create or replace function public.three_way_match_snapshot(
  p_from date default null,
  p_to   date default null,
  p_limit int default 100
)
returns table (
  invoice_no    text,
  inv_date      date,
  supplier_id   text,
  supplier_name text,
  po_no         text,
  po_total      numeric,
  grn_value     numeric,
  grn_count     int,
  invoice_total numeric,
  paid          numeric,
  inv_vs_po     numeric,
  inv_vs_grn    numeric,
  match_status  text
)
language sql
stable
security definer
set search_path = public
as $$
with grn_value_per_po as (
  select g.po_no,
         count(*) filter (where g.status in ('ok','partial'))::int as grn_count,
         coalesce(sum(
           case
             when g.status not in ('ok','partial') then 0
             when exists (select 1 from public.grn_rows gr where gr.grn_no = g.no)
               then (
                 select coalesce(sum(gr.qty_received * pr.price), 0)
                   from public.grn_rows gr
                   join public.po_rows pr
                     on pr.po_no = g.po_no and pr.item_code = gr.item_code
                  where gr.grn_no = g.no
               )
             else
               -- fallback: tanpa grn_rows asumsikan ok=100%, partial=50% nilai PO
               (
                 select case g.status
                          when 'ok'      then coalesce(sum(pr.qty * pr.price), 0)
                          when 'partial' then coalesce(sum(pr.qty * pr.price), 0) / 2
                          else 0
                        end
                   from public.po_rows pr
                  where pr.po_no = g.po_no
               )
           end
         ), 0)::numeric(14,2) as grn_value
    from public.grns g
   where g.po_no is not null
   group by g.po_no
),
paid_per_inv as (
  select p.invoice_no, sum(p.amount)::numeric(14,2) as paid
    from public.payments p
   where p.invoice_no is not null
   group by p.invoice_no
)
select
  i.no                            as invoice_no,
  i.inv_date                      as inv_date,
  i.supplier_id                   as supplier_id,
  s.name                          as supplier_name,
  i.po_no                         as po_no,
  coalesce(po.total, 0)::numeric(14,2)  as po_total,
  coalesce(gv.grn_value, 0)::numeric(14,2) as grn_value,
  coalesce(gv.grn_count, 0)::int        as grn_count,
  i.total::numeric(14,2)               as invoice_total,
  coalesce(pp.paid, 0)::numeric(14,2)   as paid,
  (i.total - coalesce(po.total, 0))::numeric(14,2)    as inv_vs_po,
  (i.total - coalesce(gv.grn_value, 0))::numeric(14,2) as inv_vs_grn,
  case
    when i.po_no is null then 'no_po'
    when coalesce(gv.grn_count, 0) = 0 then 'no_grn'
    when abs(i.total - coalesce(po.total, 0))     <= greatest(po.total, 1) * 0.005
     and abs(i.total - coalesce(gv.grn_value, 0)) <= greatest(coalesce(gv.grn_value, 0), 1) * 0.005
      then 'matched'
    when i.total > coalesce(po.total, 0)     * 1.005 then 'over_po'
    when i.total > coalesce(gv.grn_value, 0) * 1.005 then 'over_grn'
    when i.total < coalesce(gv.grn_value, 0) * 0.995 then 'under_grn'
    else 'review'
  end as match_status
from public.invoices i
left join public.purchase_orders po on po.no = i.po_no
left join public.suppliers s        on s.id  = i.supplier_id
left join grn_value_per_po gv       on gv.po_no = i.po_no
left join paid_per_inv pp           on pp.invoice_no = i.no
where (p_from is null or i.inv_date >= p_from)
  and (p_to   is null or i.inv_date <= p_to)
  and i.status <> 'cancelled'
order by i.inv_date desc, i.no desc
limit greatest(p_limit, 1);
$$;

revoke all on function public.three_way_match_snapshot(date, date, int) from public;
grant execute on function public.three_way_match_snapshot(date, date, int)
  to authenticated, service_role;

comment on function public.three_way_match_snapshot(date, date, int)
  is '3-way match per invoice: PO total vs nilai GRN aktual vs invoice total + status match.';
