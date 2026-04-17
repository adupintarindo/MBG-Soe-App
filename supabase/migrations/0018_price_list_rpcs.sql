-- =============================================================================
-- 0018 · Weekly Price List · RPC helpers (upsert + bulk import)
-- -----------------------------------------------------------------------------
-- 1) upsert_supplier_price   : satu sel edit dari grid Next.js
-- 2) import_price_list_json  : bulk import dari HTML dashboard localStorage
--                              (format: STATE.priceList dump)
-- 3) set_items_price_from_latest : sync items.price_idr dari minggu terbaru
--
-- Semua RPC pakai role user (bukan SECURITY DEFINER) → RLS policies 0017
-- yang menentukan siapa boleh write.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. upsert_supplier_price
-- -----------------------------------------------------------------------------
create or replace function public.upsert_supplier_price(
  p_week_id         bigint,
  p_supplier_id     text,
  p_commodity       public.price_commodity,
  p_ingredient_name text,
  p_price_per_kg    numeric(14,2) default null,
  p_price_per_item  numeric(14,2) default null,
  p_unit            text default 'kg',
  p_item_code       text default null,
  p_notes           text default null
)
returns public.supplier_prices
language plpgsql
as $$
declare
  v_row public.supplier_prices;
begin
  -- Guard: minimal satu harga harus ada
  if p_price_per_kg is null and p_price_per_item is null then
    -- null semua → interpret sebagai "clear cell" (delete)
    delete from public.supplier_prices
     where week_id = p_week_id
       and supplier_id = p_supplier_id
       and commodity = p_commodity
       and ingredient_name = p_ingredient_name
    returning * into v_row;
    return v_row;
  end if;

  insert into public.supplier_prices (
    week_id, supplier_id, commodity, ingredient_name,
    item_code, price_per_kg, price_per_item, unit, notes, created_by
  )
  values (
    p_week_id, p_supplier_id, p_commodity, p_ingredient_name,
    p_item_code, p_price_per_kg, p_price_per_item, coalesce(p_unit,'kg'),
    p_notes, auth.uid()
  )
  on conflict (week_id, supplier_id, commodity, ingredient_name)
  do update set
    price_per_kg   = excluded.price_per_kg,
    price_per_item = excluded.price_per_item,
    unit           = excluded.unit,
    item_code      = coalesce(excluded.item_code, supplier_prices.item_code),
    notes          = coalesce(excluded.notes, supplier_prices.notes),
    updated_at     = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.upsert_supplier_price(
  bigint, text, public.price_commodity, text,
  numeric, numeric, text, text, text
) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. import_price_list_json
-- -----------------------------------------------------------------------------
-- Input shape (matches STATE.priceList di HTML dashboard):
-- [
--   {
--     "commodity":"BERAS", "ingredient":"Beras Premium",
--     "supplier":"UD Karya Sukses", "unit":"kg",
--     "pricePerItem": null,
--     "weekly":[12000,12100,12200,null,null,null,null,null,null,null,null,null],
--     "notes":""
--   }, ...
-- ]
-- Plus p_period_id target. Supplier name akan di-resolve ke suppliers.id via
-- lower(name) match; kalau nggak ketemu → skip row dan laporkan di summary.
-- -----------------------------------------------------------------------------
create or replace function public.import_price_list_json(
  p_period_id smallint,
  p_payload   jsonb
)
returns table (
  rows_processed int,
  cells_upserted int,
  suppliers_missing text[]
)
language plpgsql
as $$
declare
  v_row jsonb;
  v_week_row record;
  v_weeks bigint[];
  v_supplier_id text;
  v_price numeric;
  v_missing text[] := array[]::text[];
  v_rows_cnt int := 0;
  v_cells_cnt int := 0;
  v_weekly jsonb;
  v_commodity public.price_commodity;
  i int;
begin
  -- Pre-fetch week ids urutan week_no
  select array_agg(id order by week_no) into v_weeks
  from public.price_weeks
  where period_id = p_period_id;

  if v_weeks is null or array_length(v_weeks,1) is null then
    raise exception 'Period % belum punya week rows', p_period_id;
  end if;

  for v_row in select * from jsonb_array_elements(p_payload)
  loop
    v_rows_cnt := v_rows_cnt + 1;

    -- Resolve supplier by name (case-insensitive)
    select id into v_supplier_id
    from public.suppliers
    where lower(name) = lower(v_row->>'supplier')
    limit 1;

    if v_supplier_id is null then
      v_missing := array_append(v_missing, v_row->>'supplier');
      continue;
    end if;

    -- Cast commodity
    begin
      v_commodity := (v_row->>'commodity')::public.price_commodity;
    exception when others then
      continue; -- skip invalid commodity
    end;

    v_weekly := v_row->'weekly';

    for i in 0..least(jsonb_array_length(v_weekly)-1, array_length(v_weeks,1)-1)
    loop
      if jsonb_typeof(v_weekly->i) = 'number' then
        v_price := (v_weekly->>i)::numeric;
        perform public.upsert_supplier_price(
          v_weeks[i+1],
          v_supplier_id,
          v_commodity,
          coalesce(v_row->>'ingredient',''),
          v_price,
          case when (v_row->>'pricePerItem') ~ '^[0-9.]+$'
               then (v_row->>'pricePerItem')::numeric else null end,
          coalesce(v_row->>'unit','kg'),
          null,
          nullif(v_row->>'notes','')
        );
        v_cells_cnt := v_cells_cnt + 1;
      end if;
    end loop;
  end loop;

  return query select v_rows_cnt, v_cells_cnt,
    (select array_agg(distinct m) from unnest(v_missing) m);
end;
$$;

grant execute on function public.import_price_list_json(smallint, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. items_price_from_latest
-- -----------------------------------------------------------------------------
-- Untuk setiap (commodity, ingredient_name) ambil median harga per-kg dari
-- minggu terbaru yang sudah ter-isi; pakai sebagai reference. Kembalikan tabel
-- supaya UI bisa preview dulu sebelum update master items.
-- -----------------------------------------------------------------------------
create or replace function public.price_list_latest_benchmark(p_period_id smallint)
returns table (
  commodity       public.price_commodity,
  ingredient_name text,
  latest_week_no  smallint,
  supplier_cnt    int,
  median_per_kg   numeric,
  min_per_kg      numeric,
  max_per_kg      numeric
)
language sql stable as $$
  with latest as (
    select sp.commodity, sp.ingredient_name, pw.week_no, sp.price_per_kg
    from public.supplier_prices sp
    join public.price_weeks pw on pw.id = sp.week_id
    where pw.period_id = p_period_id and sp.price_per_kg is not null
  ),
  per_group_latest as (
    select commodity, ingredient_name, max(week_no) as latest_week_no
    from latest
    group by commodity, ingredient_name
  )
  select l.commodity,
         l.ingredient_name,
         p.latest_week_no,
         count(*)::int                                                  as supplier_cnt,
         round(percentile_cont(0.5) within group (order by l.price_per_kg)::numeric, 2) as median_per_kg,
         min(l.price_per_kg)                                            as min_per_kg,
         max(l.price_per_kg)                                            as max_per_kg
  from latest l
  join per_group_latest p
    on p.commodity = l.commodity
   and p.ingredient_name = l.ingredient_name
   and p.latest_week_no = l.week_no
  group by l.commodity, l.ingredient_name, p.latest_week_no;
$$;

grant execute on function public.price_list_latest_benchmark(smallint) to authenticated;

-- =============================================================================
-- END 0018
-- =============================================================================
