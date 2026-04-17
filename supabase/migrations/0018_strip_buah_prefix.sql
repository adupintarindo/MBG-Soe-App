-- =============================================================================
-- 0018 · Strip "Buah - " prefix dari items.code (+ cascade ke semua FK children)
-- -----------------------------------------------------------------------------
-- Background: seed awal pakai code 'Buah - Pisang', 'Buah - Pepaya', dll untuk
-- grouping visual. Display sekarang minta code bersih ('Pisang', 'Pepaya', ...).
-- Migrasi ini rename items.code + propagate ke semua tabel anak via dynamic
-- drop → update (anak + parent) → re-add FK.
--
-- Idempoten: aman re-run — kalau tidak ada lagi row yang match 'Buah - %',
-- loop update jadi no-op.
--
-- v2 fix (2026-04-17): fase dipisah (drop ALL → update ALL → re-add ALL).
-- Versi sebelumnya re-add FK sebelum parent diupdate, jadi FK gagal karena
-- child sudah 'Pisang' tapi items.code masih 'Buah - Pisang'.
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

  -- Tampung metadata semua FK yang reference items(code) supaya bisa dipakai
  -- di fase DROP dan fase RE-ADD (tanpa re-query information_schema setelah
  -- constraint-nya hilang).
  create temporary table _buah_fk_snapshot on commit drop as
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
    and ccu.column_name    = 'code';

  -- Fase 1: DROP semua FK dulu.
  for fk in select * from _buah_fk_snapshot loop
    execute format(
      'alter table %I.%I drop constraint %I',
      fk.table_schema, fk.table_name, fk.constraint_name
    );
  end loop;

  -- Fase 2a: update semua child columns.
  for fk in select * from _buah_fk_snapshot loop
    execute format(
      'update %I.%I set %I = regexp_replace(%I, ''^Buah - '', '''') where %I like ''Buah - %%''',
      fk.table_schema, fk.table_name, fk.column_name, fk.column_name, fk.column_name
    );
  end loop;

  -- Fase 2b: update parent items.code.
  update public.items
     set code = regexp_replace(code, '^Buah - ', '')
   where code like 'Buah - %';

  -- Fase 3: re-add semua FK (sekarang child & parent sudah sinkron).
  for fk in select * from _buah_fk_snapshot loop
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
      'alter table %I.%I add constraint %I foreign key (%I) references public.items(code) on delete %s on update %s',
      fk.table_schema, fk.table_name, fk.constraint_name, fk.column_name,
      v_delete_rule, v_update_rule
    );
  end loop;
end$$;

-- Bonus cleanup: kolom deskripsi bebas yang menyebut 'Buah - X' secara literal.
update public.suppliers
   set commodity = regexp_replace(commodity, 'Buah - ', '', 'g')
 where commodity like '%Buah - %';
