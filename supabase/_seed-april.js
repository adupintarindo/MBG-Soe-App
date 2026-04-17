#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// One-shot: populate menu_assign untuk April 2026 (rolling M1..Mn, skip weekend+libur+non-op).
const { createClient } = require("@supabase/supabase-js");

const HOLIDAYS_APR_2026 = new Set([
  "2026-04-03", // Wafat Isa Almasih
  "2026-04-05"  // Hari Paskah
]);

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib ada di env.");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const year = 2026, month = 4;
  const start = `${year}-04-01`;
  const end = `${year}-04-30`;

  const [menusRes, nonOpRes, existRes] = await Promise.all([
    sb.from("menus").select("id").eq("active", true).order("id"),
    sb.from("non_op_days").select("op_date").gte("op_date", start).lte("op_date", end),
    sb.from("menu_assign").select("assign_date").gte("assign_date", start).lte("assign_date", end)
  ]);
  if (menusRes.error) throw menusRes.error;
  if (nonOpRes.error) throw nonOpRes.error;
  if (existRes.error) throw existRes.error;

  const menus = menusRes.data ?? [];
  if (menus.length === 0) {
    console.error("menus kosong — jalankan migrasi 0012 dulu.");
    process.exit(1);
  }
  const nonOp = new Set((nonOpRes.data ?? []).map((r) => r.op_date));
  const existing = new Set((existRes.data ?? []).map((r) => r.assign_date));

  const rows = [];
  const last = new Date(year, month, 0).getDate();
  let idx = 0;
  for (let day = 1; day <= last; day++) {
    const d = new Date(year, month - 1, day);
    const iso = toIso(d);
    const dow = d.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) continue;
    if (HOLIDAYS_APR_2026.has(iso)) continue;
    if (nonOp.has(iso)) continue;
    if (existing.has(iso)) continue;
    rows.push({ assign_date: iso, menu_id: menus[idx % menus.length].id, note: null });
    idx++;
  }

  if (rows.length === 0) {
    console.log("✓ April 2026 sudah ter-assign semua — tidak ada yang diupdate.");
    return;
  }

  const { error } = await sb
    .from("menu_assign")
    .upsert(rows, { onConflict: "assign_date" });
  if (error) throw error;

  console.log(`✓ Upsert ${rows.length} baris:`);
  for (const r of rows) console.log(`  ${r.assign_date} → M${r.menu_id}`);
}

main().catch((err) => {
  console.error("✗ gagal:", err.message ?? err);
  process.exit(1);
});
