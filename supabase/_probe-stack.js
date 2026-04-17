#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log("[1] quotation_seed_from_date('2026-04-20'):");
  const r1 = await sb.rpc("quotation_seed_from_date", { p_date: "2026-04-20" });
  console.log("  err:", r1.error?.message ?? "OK");
  console.log("  rows:", r1.data?.length ?? 0);

  console.log("\n[2] insert quotations (draft):");
  const { data: sup } = await sb.from("suppliers").select("id").limit(1).single();
  if (!sup) { console.log("  no supplier"); return; }
  const r2 = await sb
    .from("quotations")
    .insert({ supplier_id: sup.id, quote_date: "2026-04-17", status: "draft" })
    .select("no")
    .single();
  console.log("  err:", r2.error?.message ?? "OK");
  if (r2.data?.no) {
    console.log("  no:", r2.data.no);
    const r3 = await sb
      .from("quotation_rows")
      .insert({ qt_no: r2.data.no, line_no: 1, item_code: "Beras", qty: 10, unit: "kg", price_suggested: 12000 });
    console.log("\n[3] insert quotation_rows:");
    console.log("  err:", r3.error?.message ?? "OK");
    await sb.from("quotations").delete().eq("no", r2.data.no);
    console.log("  (cleanup) deleted test quotation");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
