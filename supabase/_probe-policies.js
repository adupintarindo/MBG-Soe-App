#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Cari admin/operator untuk simulasi.
  const { data: profs } = await sb
    .from("profiles")
    .select("id, email, role, active, full_name")
    .in("role", ["admin", "operator"])
    .eq("active", true)
    .limit(5);
  console.log("profiles admin/operator:", profs);

  // Daftar SEMUA policies+functions via RPC atau query langsung tidak tersedia.
  // Coba invoke rpc dengan jwt si admin (butuh password). Skip, cuma log role helpers.

  const { data: rtst, error: rtErr } = await sb.rpc("current_role");
  console.log("\ncurrent_role() via service role:", { data: rtst, err: rtErr?.message });

  const { data: isad, error: isAdErr } = await sb.rpc("is_admin");
  console.log("is_admin() via service role:", { data: isad, err: isAdErr?.message });
}
main().catch((e) => { console.error(e); process.exit(1); });
