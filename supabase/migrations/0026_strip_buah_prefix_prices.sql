-- =============================================================================
-- 0026 · Strip "Buah - " prefix dari supplier_prices.ingredient_name
-- -----------------------------------------------------------------------------
-- Migration 0025 (costing_sync_prices) men-seed ingredient_name dengan prefix
-- 'Buah - Melon', 'Buah - Pepaya', dll. Tampilan price list & admin menuntut
-- nama bersih ('Melon', 'Pepaya', 'Pisang', 'Semangka', 'Jeruk') — konsisten
-- dengan migrasi 0018 yang sudah strip prefix di items.code.
--
-- Idempoten: aman re-run, loop update jadi no-op kalau tidak ada row match.
-- Conflict handling: kalau sudah ada row tanpa prefix dengan composite key yang
-- sama, row berprefix akan di-delete (bukan merge — anggap entry baru win).
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from public.supplier_prices where ingredient_name like 'Buah - %'
  ) then
    return;
  end if;

  -- Hapus row berprefix yang bentrok dengan row tanpa prefix (safety net).
  delete from public.supplier_prices pe
   where pe.ingredient_name like 'Buah - %'
     and exists (
       select 1
         from public.supplier_prices clean
        where clean.week_id         = pe.week_id
          and clean.supplier_id     = pe.supplier_id
          and clean.commodity       = pe.commodity
          and clean.ingredient_name = regexp_replace(pe.ingredient_name, '^Buah - ', '')
     );

  update public.supplier_prices
     set ingredient_name = regexp_replace(ingredient_name, '^Buah - ', '')
   where ingredient_name like 'Buah - %';
end$$;
