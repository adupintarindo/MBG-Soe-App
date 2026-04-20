-- =============================================================================
-- 0039 · Suppliers real names (sync dari HTML dashboard master)
-- -----------------------------------------------------------------------------
-- Migrasi 0005 dulu pakai nama placeholder ("CV Lintas Cakrawala", dll) saat
-- belum ada data real. Sekarang HTML dashboard punya 14 supplier aktif + 2
-- rejected dengan nama asli dari lapangan (Bulog NTT, UD. Karya Sukses, dll).
-- Migrasi ini overwrite nama/type/commodity/pic/phone/address/email/notes/score
-- supaya Supabase rows MATCH HTML master.
--
-- Side effect: 0038_suppliers_excel_ref_bridge seed mapping (SUP-02 → SUP-E01
-- dst) yang tadi di-apply di atas nama placeholder sekarang jadi semantically
-- benar (SUP-02 UD Karya Sukses → SUP-E01 UD Karya Sukses di Excel).
--
-- FK safe: id text primary key tidak berubah, cuma kolom non-key yang
-- di-update. PO/GRN/invoice/transaction yang reference SUP-02..SUP-09 tetap
-- utuh karena FK by id bukan by name.
--
-- Idempoten: INSERT ... ON CONFLICT (id) DO UPDATE SET ... aman re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PATCH 1: fix ambiguous "k" di _audit_row_pk() dari 0034_audit_events.sql
-- -----------------------------------------------------------------------------
-- Problem: function declare `k text;` tapi juga pakai alias `unnest(v_pks) k`
-- di subquery → `p_row ->> k` ambiguous (variable atau kolom alias?). Error:
-- "column reference "k" is ambiguous" (SQLSTATE 42702). Trigger audit_trigger
-- attach ke suppliers INSERT → panggil _audit_row_pk → INSERT gagal. Fix:
-- drop unused declared variable `k`, rename alias ke `pk_name` supaya eksplisit.

create or replace function public._audit_row_pk(
  p_table regclass, p_row jsonb
) returns text language plpgsql stable as $func$
declare
  v_pks text[];
  v_parts text[];
begin
  select array_agg(a.attname::text order by a.attnum)
    into v_pks
  from pg_index i
  join pg_attribute a
    on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
  where i.indrelid = p_table and i.indisprimary;

  if v_pks is null or array_length(v_pks, 1) is null then
    return null;
  end if;

  v_parts := array(
    select coalesce(p_row ->> pk_name, 'null')
      from unnest(v_pks) as t(pk_name)
  );
  return array_to_string(v_parts, '|');
end; $func$;

-- -----------------------------------------------------------------------------
-- PATCH 2: fix NULL-unsafe trigger dari 0029_rls_tighten.sql
-- -----------------------------------------------------------------------------
-- Problem: current_role() return NULL saat session bukan auth user (mis. CLI
-- pakai postgres role). Check lama `if current_role() <> 'supplier'` evaluate
-- ke NULL untuk anon session → IF treated as false → trigger guard tetap fire
-- untuk admin/CLI. Fix: explicit NULL bypass.
-- Same pattern fixed untuk 4 trigger serupa (grns, po_rows, msg, qt_rows).

create or replace function public.enforce_supplier_update_suppliers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() is null or public.current_role() <> 'supplier' then
    return new;
  end if;
  if new.id         is distinct from old.id
  or new.name       is distinct from old.name
  or new.type       is distinct from old.type
  or new.commodity  is distinct from old.commodity
  or new.score      is distinct from old.score
  or new.status     is distinct from old.status
  or new.active     is distinct from old.active
  or new.created_at is distinct from old.created_at then
    raise exception 'supplier only allowed to update contact fields (pic, phone, email, address, notes)';
  end if;
  return new;
end; $$;

insert into public.suppliers (
  id, name, type, commodity, pic, phone, address, email, notes, score, status, active
) values
  -- SUP-01..SUP-09 : 9 LTA aktif
  ('SUP-01', 'Bulog NTT', 'BUMN',
   'Beras medium, Beras premium',
   'Kepala Bulog NTT', '+62 380-821-833', 'Kupang · NTT',
   'bulog.ntt@bulog.co.id',
   'Backbone beras · 14.323 kg Mar-Jun · LTA awaiting sign',
   87.6, 'awaiting', true),

  ('SUP-02', 'UD. Karya Sukses (Karya Utama)', 'UD',
   'Beras medium, Beras premium',
   'Bpk. Karya', '+62 812-3700-5521', 'Oesao · Kupang',
   'karyautama.oesao@gmail.com',
   'Distributor beras alternatif · admin gap: bank/tax ID',
   73.2, 'signed', true),

  ('SUP-03', 'CV Triantanta Wijaya', 'CV',
   'Boneless chicken, Beras, Ayam frozen, Dry condiments',
   'Bpk. Wijaya', '+62 813-3910-2245', 'Pasar Inpres Soe',
   'triantanta.wijaya@cv.id',
   'Ayam boneless harian (60k/kg termurah) · support titip supply',
   78.2, 'signed', true),

  ('SUP-04', 'PT. Alger Karya Pratama', 'PT',
   'Ikan Tuna, Ikan Tongkol, Ikan Kembung',
   'Bpk. Yosep Alger', '+62 812-3821-6677', 'Kolbano · Kupang',
   'alger.karya@pt.id',
   'Storage fee 50k/box (40kg) · min 500kg picks up car · early 03.00-05.00',
   82.8, 'signed', true),

  ('SUP-05', 'TLM (Tanaoba Lais Manekat)', 'KOPERASI',
   'Telur besar, Telur sedang',
   'Ibu Yuliana TLM', '+62 852-3908-1144', 'Jl. TLM Kupang',
   'tlm.soe@tlm.co.id',
   'Koperasi gereja · 2.083/butir · primary egg supplier',
   94.4, 'signed', true),

  ('SUP-06', 'Toko Maju Lancar', 'TOKO',
   'Tahu, Tempe',
   'Pemilik Toko Maju Lancar', '+62 821-4455-9932', 'Kota Soe',
   'majulancar.soe@gmail.com',
   'Tahu 140k/papan (209 pcs) · risiko kapasitas (high-volume)',
   71.4, 'signed', true),

  ('SUP-07', 'Tunmuni Farmer Group', 'POKTAN',
   'Kentang, Wortel, Buncis, Kacang panjang, Bawang merah, Bawang putih',
   'Ketua Tunmuni FG', '+62 822-3755-6611', 'Tunmuni · TTS',
   'tunmuni.poktan@gmail.com',
   'Poktan Madya · halal cert in progress · pricing alignment needed',
   72.2, 'signed', true),

  ('SUP-08', 'Red & White Cooperatives Nunumeu', 'KOPERASI',
   'Sawi, Wortel, Buah Pisang, LPG',
   'Ketua Koperasi Merah Putih Nunumeu', '+62 823-4122-7788', 'Desa Nunumeu Soe',
   'merahputih.nunumeu@gmail.com',
   'Co-supplier dengan Pisang Efron · Pertamina LPG partnership',
   69.8, 'signed', true),

  ('SUP-09', 'Pisang Efron (CV Philia)', 'INFORMAL',
   'Buah Pisang',
   'Bpk. Efron', '+62 813-6622-9900', 'Kupang',
   'pisang.efron@gmail.com',
   'Pisang only · carbide-ripening · H-1 delivery Kupang-Soe ~2 jam',
   72.4, 'signed', true),

  -- SUP-10..SUP-14 : 5 LTA aktif (baru / belum di-seed di 0005)
  ('SUP-10', 'UD. Rempah Timor', 'UD',
   'Bawang bombay, Cabai merah, Tomat, Bumbu lokal',
   'Bpk. Marthen Bani', '+62 813-5544-2211', 'Pasar Inpres Soe',
   'rempahtimor@gmail.com',
   'Bumbu dapur harian · backup bumbu dari Tunmuni',
   70.5, 'signed', true),

  ('SUP-11', 'UD. Bumbu Nusantara', 'UD',
   'Jahe, Kunyit, Lengkuas, Sereh, Daun jeruk, Kemiri, Merica, Ketumbar',
   'Ibu Hendra Sinaga', '+62 812-9988-3344', 'Pasar Kuanino Kupang',
   'bumbunusantara@gmail.com',
   'Rempah kering & basah',
   70.0, 'signed', true),

  ('SUP-12', 'CV. Minyak Sehat NTT', 'CV',
   'Minyak sayur (Bimoli), Garam, Kecap manis',
   'Bpk. Roni', '+62 821-7700-5566', 'Jl. Basuki Rachmat Kupang',
   'minyaksehat@cv.id',
   'Sembako bersertifikat BPOM',
   70.0, 'signed', true),

  ('SUP-13', 'UD. Buah Segar Soe', 'UD',
   'Pepaya, Melon, Semangka',
   'Ibu Agustina', '+62 852-3311-4488', 'Jl. Pahlawan Soe',
   'buahsegar.soe@gmail.com',
   'Buah segar harian lokal (non-pisang)',
   69.0, 'signed', true),

  ('SUP-14', 'CV. Sayur Dataran Tinggi', 'CV',
   'Labu parang, Jagung manis, Daun kemangi, Daun bawang',
   'Bpk. Yohanes Leki', '+62 813-4433-2211', 'Kapan · TTS',
   'sayurdatin@cv.id',
   'Sayuran spesial dataran tinggi Soe',
   68.5, 'signed', true),

  -- SUP-R1..SUP-R2 : 2 rejected LTA
  ('SUP-R1', 'Toko Glory (CV Kaka Ade)', 'CV',
   'Dry condiments, Rice, Eggs, Frozen chicken',
   'Kaka Ade', '+62 852-0000-0001', 'Kupang',
   null,
   'REJECTED LTA: telur delay pelabuhan Surabaya · historical score #1',
   95.6, 'rejected', false),

  ('SUP-R2', 'Kios Louis', 'KIOS',
   'Mixed',
   null, null, 'Soe',
   null,
   'REJECTED LTA: price volatility week-to-week · no legal docs',
   0, 'rejected', false)

on conflict (id) do update set
  name      = excluded.name,
  type      = excluded.type,
  commodity = excluded.commodity,
  pic       = excluded.pic,
  phone     = excluded.phone,
  address   = excluded.address,
  email     = excluded.email,
  notes     = excluded.notes,
  score     = excluded.score,
  status    = excluded.status,
  active    = excluded.active;

-- =============================================================================
-- Verifikasi inline (tampil di NOTICE saat apply)
-- =============================================================================
do $$
declare
  v_total   int;
  v_active  int;
  v_rejected int;
begin
  select count(*) into v_total    from public.suppliers where id like 'SUP-%';
  select count(*) into v_active   from public.suppliers where id like 'SUP-%' and active;
  select count(*) into v_rejected from public.suppliers where id like 'SUP-%' and status = 'rejected';
  raise notice '0039 applied: total=% active=% rejected=%', v_total, v_active, v_rejected;
end $$;

-- =============================================================================
-- END 0039
-- =============================================================================
