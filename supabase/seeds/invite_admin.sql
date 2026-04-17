-- =============================================================================
-- Invite Admin Pertama · SEED HELPER
-- -----------------------------------------------------------------------------
-- Jalankan manual di Supabase SQL Editor saat first-time bootstrap — BUKAN
-- bagian dari _run_all.sql (data-dependent).
--
-- Dua skenario:
--   A. User Supabase Auth sudah ada → upgrade ke admin langsung (update profiles)
--   B. User belum ada → insert ke invites, kirim token ke email user.
--      Token di-redeem di /auth/callback?token=... (lihat /lib/supabase/auth.ts).
--
-- Ganti email di bawah dengan email admin yang sah.
-- =============================================================================

-- === OPSI A: user sudah login via magic link / SSO ===========================
-- Paling simple kalau user sudah pernah login (jadi baris di auth.users ada
-- dan profil default 'viewer' sudah ke-create lewat trigger).
-- Jalankan ini untuk promote ke admin:

-- update public.profiles
--   set role = 'admin',
--       active = true,
--       full_name = coalesce(full_name, 'Pinka Titan')
--  where email = 'pinkatitan@gmail.com';
-- select id, email, role, active, full_name from public.profiles
--  where email = 'pinkatitan@gmail.com';

-- === OPSI B: bikin invite baru + kirim token ke user via email ===============
-- Ini path ideal untuk user yang belum pernah sign in. Token bisa dipakai
-- untuk first login via /auth/accept-invite?token=<token>.

-- Ganti email target + label supplier kalau role = supplier:
do $$
declare
  v_email text := 'pinkatitan@gmail.com';
  v_role  public.user_role := 'admin';
  v_token text;
  v_invite_id uuid;
begin
  -- Hapus invite lama yang belum dipakai untuk email ini (biar clean slate)
  delete from public.invites
   where lower(email) = lower(v_email)
     and used_at is null;

  insert into public.invites (email, role, supplier_id, created_by)
  values (v_email, v_role, null, null)
  returning id, token into v_invite_id, v_token;

  raise notice 'Invite created:';
  raise notice '  ID    : %', v_invite_id;
  raise notice '  Email : %', v_email;
  raise notice '  Role  : %', v_role;
  raise notice '  Token : %', v_token;
  raise notice 'Link  : https://<APP_URL>/auth/accept-invite?token=%', v_token;
end$$;

-- Tampilkan invite yang baru dibuat:
select id, email, role, token, expires_at, created_at
  from public.invites
 where used_at is null
 order by created_at desc
 limit 5;

-- =============================================================================
-- Catatan:
-- - Expiry default 7 hari (lihat definisi table invites di 0001_schema.sql).
-- - Kalau token expire, hapus baris lama dan run ulang do-block di atas.
-- - Setelah user accept invite + sign in, baris invites.used_at / used_by
--   akan ter-populate oleh handler auth; kemudian bisa hapus baris invite
--   itu dari tabel kalau mau clean up.
-- =============================================================================
