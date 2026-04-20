#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// MBG Soe · RLS Smoke Test
// ----------------------------------------------------------------------------
// Login sebagai 5 role test user, jalankan assertion yang harus lulus/gagal.
// Exit code 0 = semua lulus · 1 = ada yang bocor.
//
// Env:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   (anon key)
//   SUPABASE_SERVICE_ROLE_KEY              (admin; untuk bikin user test)
//
// Run:
//   node supabase/test-rls.js
//   node supabase/test-rls.js --verbose
// ============================================================================

const { createClient } = require("@supabase/supabase-js");

const VERBOSE = process.argv.includes("--verbose");

const TEST_USERS = [
  { role: "admin",     email: "test-admin@mbg-soe.test",     password: "Test1234!admin"   },
  { role: "operator",  email: "test-operator@mbg-soe.test",  password: "Test1234!oper"    },
  { role: "ahli_gizi", email: "test-nutri@mbg-soe.test",     password: "Test1234!nutri"   },
  { role: "viewer",    email: "test-viewer@mbg-soe.test",    password: "Test1234!view"    },
  { role: "supplier",  email: "test-supplier@mbg-soe.test",  password: "Test1234!supp", supplier_id: "SUP-E01" }
];

const results = [];
function record(role, name, passed, detail) {
  results.push({ role, name, passed, detail });
  const mark = passed ? "✓" : "✗";
  if (VERBOSE || !passed) {
    console.log(`  ${mark} [${role}] ${name}${detail ? " — " + detail : ""}`);
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    console.error(
      "❌ Perlu NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY + SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });

  console.log("🔐 RLS Smoke Test · setup test users…");
  await ensureUsers(admin);

  console.log("\n🧪 Running assertions…");
  for (const u of TEST_USERS) {
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: signIn, error: signErr } = await client.auth.signInWithPassword({
      email: u.email,
      password: u.password
    });
    if (signErr) {
      record(u.role, "login", false, signErr.message);
      continue;
    }
    if (!signIn.session) {
      record(u.role, "login", false, "no session returned");
      continue;
    }
    record(u.role, "login", true);
    await runAssertions(u, client);
    await client.auth.signOut();
  }

  // ---- Summary ---------------------------------------------------------
  const pass = results.filter((r) => r.passed).length;
  const fail = results.filter((r) => !r.passed).length;
  console.log(`\n📊 Total: ${pass} pass · ${fail} fail`);

  if (fail > 0) {
    console.log("\n❌ Failing checks:");
    for (const r of results.filter((x) => !x.passed)) {
      console.log(`   [${r.role}] ${r.name}: ${r.detail || ""}`);
    }
    process.exit(1);
  } else {
    console.log("✅ Semua RLS policy sehat.");
  }
}

// ------------------------------------------------------------------- users
async function ensureUsers(admin) {
  for (const u of TEST_USERS) {
    // 1. Create user (idempotent)
    let userId;
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((x) => x.email === u.email);
    if (found) {
      userId = found.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true
      });
      if (error) {
        console.error(`  ✗ createUser ${u.email}:`, error.message);
        continue;
      }
      userId = data.user.id;
    }

    // 2. Upsert profile with role
    const { error: perr } = await admin.from("profiles").upsert({
      id: userId,
      email: u.email,
      role: u.role,
      supplier_id: u.supplier_id ?? null,
      full_name: `Test ${u.role}`,
      active: true
    });
    if (perr) console.error(`  ✗ profile ${u.email}:`, perr.message);
  }
}

// --------------------------------------------------------------- assertions
async function runAssertions(u, sb) {
  // A. Tiap role bisa baca profiles sendiri
  {
    const { data, error } = await sb
      .from("profiles")
      .select("role,supplier_id")
      .limit(1);
    record(
      u.role,
      "can read own profile",
      !error && Array.isArray(data),
      error?.message
    );
  }

  // B. Tiap role bisa baca schools (public master)
  {
    const { data, error } = await sb.from("schools").select("id").limit(3);
    record(
      u.role,
      "can read schools (public master)",
      !error && (data?.length ?? 0) > 0,
      error?.message
    );
  }

  // C. Role-specific writes
  if (u.role === "admin" || u.role === "operator") {
    const { error } = await sb
      .from("transactions")
      .insert({
        tx_date: new Date().toISOString().slice(0, 10),
        tx_type: "adjustment",
        ref_no: `RLS-TEST-${u.role}-${Date.now()}`,
        amount: 1,
        description: "RLS smoke"
      });
    record(u.role, "can insert transaction", !error, error?.message);
  } else {
    const { error } = await sb.from("transactions").insert({
      tx_date: new Date().toISOString().slice(0, 10),
      tx_type: "adjustment",
      ref_no: `RLS-TEST-DENY-${u.role}-${Date.now()}`,
      amount: 1,
      description: "should be denied"
    });
    record(
      u.role,
      "CANNOT insert transaction",
      Boolean(error),
      error ? "correctly denied" : "LEAK: write allowed"
    );
  }

  // D. ahli_gizi write menu, non-ahli_gizi cannot (except admin)
  if (u.role === "ahli_gizi" || u.role === "admin") {
    const { error } = await sb
      .from("menu_assign")
      .upsert(
        { assign_date: "2099-01-01", menu_id: 1, note: "rls-test" },
        { onConflict: "assign_date" }
      );
    record(u.role, "can upsert menu_assign", !error, error?.message);
  } else {
    const { error } = await sb
      .from("menu_assign")
      .upsert(
        { assign_date: "2099-01-02", menu_id: 1, note: "rls-test-deny" },
        { onConflict: "assign_date" }
      );
    record(
      u.role,
      "CANNOT upsert menu_assign",
      Boolean(error),
      error ? "correctly denied" : "LEAK: menu write allowed"
    );
  }

  // E. Supplier isolation: supplier role hanya lihat PO miliknya
  if (u.role === "supplier") {
    const { data, error } = await sb
      .from("purchase_orders")
      .select("no,supplier_id")
      .limit(50);
    if (error) {
      record(u.role, "read PO (own only)", false, error.message);
    } else {
      const leaks = (data || []).filter((r) => r.supplier_id !== u.supplier_id);
      record(
        u.role,
        "supplier sees ONLY own PO",
        leaks.length === 0,
        leaks.length ? `LEAK: ${leaks.length} foreign PO visible` : `count=${data.length}`
      );
    }
  }

  // F. Viewer read-only — harus ditolak tulis apapun
  if (u.role === "viewer") {
    const { error } = await sb
      .from("settings")
      .upsert({ key: "rls-viewer-test", value: "{}" });
    record(
      u.role,
      "CANNOT write settings (read-only)",
      Boolean(error),
      error ? "correctly denied" : "LEAK: viewer wrote settings"
    );
  }

  // G. Admin-only: invites tabel
  if (u.role === "admin") {
    const { error } = await sb.from("invites").select("id").limit(1);
    record(u.role, "admin can read invites", !error, error?.message);
  } else {
    const { error, data } = await sb.from("invites").select("id").limit(1);
    // RLS bisa balikin data kosong (silent denial) atau error — dua-duanya OK
    record(
      u.role,
      "CANNOT list invites",
      Boolean(error) || (Array.isArray(data) && data.length === 0),
      error ? "denied" : `rows=${data?.length ?? 0}`
    );
  }
}

main().catch((err) => {
  console.error("✗ test-rls gagal:", err.message ?? err);
  process.exit(1);
});
