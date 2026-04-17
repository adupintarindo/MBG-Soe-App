#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Ambil magic link untuk admin user → tukar token → pakai anon client bernegoisasi.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: "alfatehan2012@gmail.com"
  });
  if (linkErr) { console.error("magic link:", linkErr); process.exit(1); }
  const hashed = linkData.properties?.hashed_token;
  const tokenType = linkData.properties?.verification_type ?? "magiclink";
  console.log("got magiclink, verifying…");

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: verify, error: verErr } = await anon.auth.verifyOtp({
    type: tokenType,
    token_hash: hashed
  });
  if (verErr) { console.error("verify:", verErr); process.exit(1); }
  console.log("session as:", verify.user?.email);

  // Sekarang anon client punya user context. Ulangi flow quotation.
  const tryDates = ["2026-04-01", "2026-04-03", "2026-04-17", "2026-04-20", "2026-05-04", "2026-05-27", "2026-06-17", "2026-07-31"];
  for (const dt of tryDates) {
    const r = await anon.rpc("quotation_seed_from_date", { p_date: dt });
    console.log(` seed ${dt}:`, r.error ? `ERR=${r.error.message}` : `ok rows=${r.data?.length ?? 0}`);
  }
  const r1 = await anon.rpc("quotation_seed_from_date", { p_date: "2026-04-20" });

  const { data: sup } = await anon.from("suppliers").select("id").limit(1).single();
  if (!sup) { console.log("  no supplier"); return; }

  console.log("\n[2] insert quotations:");
  const r2 = await anon.from("quotations")
    .insert({ supplier_id: sup.id, quote_date: "2026-04-17", status: "draft" })
    .select("no").single();
  console.log("  err:", r2.error?.message ?? "OK", "no:", r2.data?.no ?? "-");

  if (r2.data?.no) {
    console.log("\n[3] insert quotation_rows (bulk 15):");
    const bulk = (r1.data ?? []).map((s, i) => ({
      qt_no: r2.data.no,
      line_no: i + 1,
      item_code: s.item_code,
      qty: Number(s.qty),
      unit: s.unit || "kg",
      price_suggested: s.price_suggested
    }));
    const r3 = await anon.from("quotation_rows").insert(bulk);
    console.log("  err:", r3.error?.message ?? "OK", "count:", bulk.length);
    await admin.from("quotations").delete().eq("no", r2.data.no);
  }
}
main().catch((e) => { console.error("fatal:", e.message ?? e); process.exit(1); });
