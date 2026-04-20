-- ============================================================================
-- 0041 · Notification feed RPC
-- ----------------------------------------------------------------------------
-- Return JSON array of alerts untuk navbar bell:
--   - shortage_h1      : bahan yang on_hand < kebutuhan menu H+1
--   - near_expiry_3    : batch dgn expiry dalam 3 hari
--   - near_expiry_7    : batch dgn expiry dalam 7 hari
--   - invoice_overdue  : invoice status='overdue' atau due_date < today
--   - po_waiting_grn   : PO status 'sent'/'confirmed' yang belum punya GRN
--
-- Output shape:
--   [{ kind, severity, title, detail, ref, ts }]
-- ============================================================================

create or replace function public.notification_feed(
  p_limit int default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_out jsonb := '[]'::jsonb;
  v_today date := current_date;
  v_tomorrow date := current_date + 1;
begin
  -- shortage H+1: item_code yang muncul di menu H+1 tapi stock.on_hand < qty
  v_out := v_out || coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind','shortage_h1',
      'severity','high',
      'title','Shortage bahan H+1',
      'detail', item_code || ' · butuh ' || round(need::numeric,2) || ' · ada ' || coalesce(on_hand,0),
      'ref', item_code,
      'ts', now()
    ))
    from (
      select b.item_code,
             sum((b.qty_per_100_porsi * 1000) / 100.0) as need,
             coalesce(s.on_hand,0) as on_hand
      from public.menu_assign ma
      join public.menu_bom b on b.menu_id = ma.menu_id
      left join public.stock s on s.item_code = b.item_code
      where ma.assign_date = v_tomorrow
      group by b.item_code, s.on_hand
      having coalesce(s.on_hand,0) < sum((b.qty_per_100_porsi * 1000) / 100.0)
      order by (sum((b.qty_per_100_porsi * 1000) / 100.0) - coalesce(s.on_hand,0)) desc
      limit 10
    ) x
  ), '[]'::jsonb);

  -- Near-expiry 3 hari
  v_out := v_out || coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind','near_expiry_3',
      'severity','high',
      'title','Batch kedaluwarsa ≤ 3 hari',
      'detail', item_code || ' · ' || qty_remaining || ' ' || unit || ' · exp ' || to_char(expiry_date,'DD Mon'),
      'ref', id::text,
      'ts', created_at
    ))
    from (
      select id, item_code, qty_remaining, unit, expiry_date, created_at
      from public.stock_batches
      where qty_remaining > 0
        and expiry_date is not null
        and expiry_date between v_today and v_today + 3
      order by expiry_date asc
      limit 10
    ) x
  ), '[]'::jsonb);

  -- Near-expiry 7 hari
  v_out := v_out || coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind','near_expiry_7',
      'severity','medium',
      'title','Batch kedaluwarsa 4-7 hari',
      'detail', item_code || ' · ' || qty_remaining || ' ' || unit || ' · exp ' || to_char(expiry_date,'DD Mon'),
      'ref', id::text,
      'ts', created_at
    ))
    from (
      select id, item_code, qty_remaining, unit, expiry_date, created_at
      from public.stock_batches
      where qty_remaining > 0
        and expiry_date is not null
        and expiry_date between v_today + 4 and v_today + 7
      order by expiry_date asc
      limit 10
    ) x
  ), '[]'::jsonb);

  -- Invoice overdue
  v_out := v_out || coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind','invoice_overdue',
      'severity','high',
      'title','Invoice overdue',
      'detail', no || ' · Rp ' || to_char(total,'FM999G999G999G999') || ' · due ' || to_char(due_date,'DD Mon'),
      'ref', no,
      'ts', inv_date
    ))
    from (
      select no, total, due_date, inv_date
      from public.invoices
      where (status = 'overdue') or (status = 'issued' and due_date < v_today)
      order by due_date asc
      limit 10
    ) x
  ), '[]'::jsonb);

  -- PO menunggu GRN
  v_out := v_out || coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind','po_waiting_grn',
      'severity','medium',
      'title','PO menunggu GRN',
      'detail', po_no || ' · ' || supplier_id,
      'ref', po_no,
      'ts', po_date
    ))
    from (
      select p.no as po_no, p.supplier_id, p.po_date
      from public.purchase_orders p
      left join public.grns g on g.po_no = p.no
      where p.status in ('sent','confirmed')
        and g.no is null
        and p.po_date >= v_today - interval '30 days'
      order by p.po_date desc
      limit 10
    ) x
  ), '[]'::jsonb);

  return coalesce(v_out, '[]'::jsonb);
exception when others then
  return '[]'::jsonb;
end $$;

grant execute on function public.notification_feed(int) to authenticated;
