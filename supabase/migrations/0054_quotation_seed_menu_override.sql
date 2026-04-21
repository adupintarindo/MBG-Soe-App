-- ============================================================================
-- 0054 · Quotation seed with explicit menu override
-- ----------------------------------------------------------------------------
-- Motivasi: user ingin fleksibilitas — default seed pakai menu_assign(p_date),
-- tapi bisa override pakai menu_id lain (misal kalau tanggal belum di-assign
-- atau user memang mau quotation untuk menu berbeda).
-- Logika qty: sama dengan requirement_for_date tapi paksa menu_id yang dikirim,
-- tetap pakai porsi_counts_tiered(p_date) sebagai basis tier.
-- ============================================================================

create or replace function public.quotation_seed_from_menu(
  p_date date,
  p_menu_id smallint
)
returns table(item_code text, qty numeric, unit text, price_suggested numeric)
language plpgsql stable as $$
declare
  v_tier record;
begin
  if p_menu_id is null then
    return;
  end if;

  select paud, sd13, sd46, smp_plus, operasional
    into v_tier from public.porsi_counts_tiered(p_date);

  -- Kalau non-operasional, fallback 1 porsi saja supaya user tetap dapat
  -- shape BOM (qty kecil, tinggal diedit manual). Total porsi real = 0
  -- bakal bikin qty kosong dan tidak berguna.
  if not coalesce(v_tier.operasional, false) then
    v_tier.paud     := 0;
    v_tier.sd13     := 0;
    v_tier.sd46     := 1;
    v_tier.smp_plus := 0;
  end if;

  return query
    select
      b.item_code,
      round(
        (
          case
            when (coalesce(b.grams_paud,0) + coalesce(b.grams_sd13,0)
                + coalesce(b.grams_sd46,0) + coalesce(b.grams_smp,0)) > 0 then
              (coalesce(b.grams_paud,0) * v_tier.paud
             + coalesce(b.grams_sd13,0) * v_tier.sd13
             + coalesce(b.grams_sd46,0) * v_tier.sd46
             + coalesce(b.grams_smp,0)  * v_tier.smp_plus) / 1000.0
            else
              b.grams_per_porsi
              * (v_tier.paud + v_tier.sd13 + v_tier.sd46 + v_tier.smp_plus)
              / 1000.0
          end
        )::numeric, 3
      ) as qty,
      it.unit,
      coalesce(
        (select pr.price
           from public.po_rows pr
           join public.purchase_orders po on po.no = pr.po_no
          where pr.item_code = b.item_code
          order by po.po_date desc
          limit 1),
        it.price_idr
      ) as price_suggested
    from public.menu_bom b
    join public.items it on it.code = b.item_code
   where b.menu_id = p_menu_id
   order by b.item_code;
end; $$;

grant execute on function public.quotation_seed_from_menu(date, smallint) to authenticated;
