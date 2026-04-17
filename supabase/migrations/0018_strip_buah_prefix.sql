-- =============================================================================
-- 0018 · Strip "Buah - " prefix dari items.code (+ cascade ke semua FK children)
-- -----------------------------------------------------------------------------
-- Background: seed awal pakai code 'Buah - Pisang', 'Buah - Pepaya', dll untuk
-- grouping visual. Display sekarang minta code bersih ('Pisang', 'Pepaya', ...).
-- Migrasi ini rename items.code + propagate ke semua tabel anak via dynamic
-- drop/update/re-add FK (karena FK existing tidak pakai ON UPDATE CASCADE).
--
-- Idempoten: aman re-run — kalau tidak ada lagi row yang match 'Buah - %',
-- loop update jadi no-op.
-- =============================================================================

do $$
declare
  fk record;
  v_delete_rule text;
  v_update_rule text;
begin
  -- Kalau tidak ada lagi items dengan prefix 'Buah - ', skip (idempotency).
  if not exists (select 1 from public.items where code like 'Buah - %') then
    return;
  end if;

  -- Loop semua FK constraint yang reference public.items(code), drop dulu,
  -- update kolom anak, lalu re-add dengan aturan delete/update yang sama.
  for fk in
    select
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      rc.delete_rule,
      rc.update_rule
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name
     and kcu.table_schema    = tc.table_schema
    join information_schema.referential_constraints rc
      on rc.constraint_name   = tc.constraint_name
     and rc.constraint_schema = tc.constraint_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name   = rc.unique_constraint_name
     and ccu.constraint_schema = rc.unique_constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_schema   = 'public'
      and ccu.table_name     = 'items'
      and ccu.column_name    = 'code'
  loop
    v_delete_rule := case fk.delete_rule
      when 'CASCADE'     then 'cascade'
      when 'SET NULL'    then 'set null'
      when 'SET DEFAULT' then 'set default'
      when 'RESTRICT'    then 'restrict'
      else 'no action'
    end;
    v_update_rule := case fk.update_rule
      when 'CASCADE'     then 'cascade'
      when 'SET NULL'    then 'set null'
      when 'SET DEFAULT' then 'set default'
      when 'RESTRICT'    then 'restrict'
      else 'no action'
    end;

    execute format(
      'alter table %I.%I drop constraint %I',
      fk.table_schema, fk.table_name, fk.constraint_name
    );

    execute format(
      'update %I.%I set %I = regexp_replace(%I, ''^Buah - '', '''') where %I like ''Buah - %%''',
      fk.table_schema, fk.table_name, fk.column_name, fk.column_name, fk.column_name
    );

    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references public.items(code) on delete %s on update %s',
      fk.table_schema, fk.table_name, fk.constraint_name, fk.column_name,
      v_delete_rule, v_update_rule
    );
  end loop;

  -- Terakhir, rename di parent (items.code itu sendiri).
  update public.items
     set code = regexp_replace(code, '^Buah - ', '')
   where code like 'Buah - %';
end$$;

-- Bonus cleanup: kolom deskripsi bebas yang menyebut 'Buah - X' secara literal.
update public.suppliers
   set commodity = regexp_replace(commodity, 'Buah - ', '', 'g')
 where commodity like '%Buah - %';
