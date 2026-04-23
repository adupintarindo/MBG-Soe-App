-- =============================================================================
-- 0058 · delivery_provenance — link Jadwal Kirim ↔ procurement chain
-- -----------------------------------------------------------------------------
-- Konteks: tabel deliveries (dapur → sekolah) tidak punya FK ke purchase_orders
-- atau grns. Hubungannya lewat tanggal + menu BOM saja: menu X butuh bahan Y,
-- bahan Y diterima via GRN di tanggal T-2..T.
--
-- RPC ini ambil delivery_no → resolve menu_id → expand BOM → cari GRN aktif
-- di window tanggal → return daftar provenance untuk traceability.
--
-- Window default: grn_date in [delivery_date - 3 days, delivery_date].
-- Dapur biasanya simpan stock segar 1-3 hari, jadi 1 delivery bisa pakai
-- bahan dari >1 GRN. Output sengaja tidak memaksa mapping 1:1.
--
-- Caller biasanya UI tab "Jadwal Kirim" yang butuh tombol "Lihat asal bahan".
-- =============================================================================

create or replace function public.delivery_provenance(
  p_delivery_no text,
  p_window_days int default 3
)
returns table (
  item_code     text,
  item_category text,
  grams_per_porsi numeric,
  porsi_planned int,
  grn_no        text,
  grn_date      date,
  grn_status    text,
  po_no         text,
  supplier_id   text,
  supplier_name text,
  qty_received  numeric,
  unit          text,
  price         numeric,
  line_value    numeric
)
language sql
stable
security definer
set search_path = public
as $$
with dlv as (
  select d.no,
         d.delivery_date,
         d.menu_id,
         d.total_porsi_planned
    from public.deliveries d
   where d.no = p_delivery_no
),
bom as (
  -- bahan baku yang dibutuhkan menu ini
  select mb.item_code,
         mb.grams_per_porsi,
         i.category::text as item_category
    from dlv
    join public.menu_bom mb on mb.menu_id = dlv.menu_id
    join public.items i     on i.code     = mb.item_code
),
grn_window as (
  -- GRN aktif (ok/partial) untuk item-item BOM di window tanggal
  select g.no       as grn_no,
         g.grn_date,
         g.status::text as grn_status,
         g.po_no,
         gr.item_code,
         gr.qty_received,
         gr.unit
    from dlv
    join public.grns      g  on g.po_no is not null
    join public.grn_rows  gr on gr.grn_no = g.no
   where g.status in ('ok','partial')
     and gr.qty_received > 0
     and g.grn_date between (dlv.delivery_date - (greatest(p_window_days, 0) || ' days')::interval)::date
                        and  dlv.delivery_date
     and gr.item_code in (select item_code from bom)
)
select
  b.item_code,
  b.item_category,
  b.grams_per_porsi::numeric                            as grams_per_porsi,
  coalesce((select total_porsi_planned from dlv), 0)    as porsi_planned,
  gw.grn_no,
  gw.grn_date,
  gw.grn_status,
  gw.po_no,
  po.supplier_id,
  s.name                                                as supplier_name,
  gw.qty_received::numeric                              as qty_received,
  gw.unit,
  pr.price::numeric                                     as price,
  (gw.qty_received * coalesce(pr.price, 0))::numeric(14,2) as line_value
from bom b
left join grn_window gw
       on gw.item_code = b.item_code
left join public.purchase_orders po
       on po.no = gw.po_no
left join public.suppliers s
       on s.id = po.supplier_id
left join public.po_rows pr
       on pr.po_no = gw.po_no and pr.item_code = gw.item_code
order by b.item_code, gw.grn_date desc nulls last, gw.grn_no;
$$;

revoke all on function public.delivery_provenance(text, int) from public;
grant execute on function public.delivery_provenance(text, int)
  to authenticated, service_role;

comment on function public.delivery_provenance(text, int)
  is 'Trace bahan baku delivery: expand menu BOM → match GRN aktif di window delivery_date - N..delivery_date. Return per-item × per-GRN provenance (grn_no, po_no, supplier, qty, price, line_value).';
