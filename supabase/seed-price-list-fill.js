#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// MBG Soe · Price-List fill seeder
// ----------------------------------------------------------------------------
// Top-up data supaya UI /price-list terlihat realistis:
//   1. Buat historical period "Januari–Maret 2026" (inactive) + 12 weeks
//   2. Spread supplier_prices ke semua minggu (w2..w12) dari active period
//      dengan variance ±4–10% (mimic fluktuasi harga pasar)
//   3. Salin subset harga ke historical period sebagai baseline Q1
//
// Idempotent: skip insert kalau (week_id, supplier_id, commodity, ingredient)
// sudah ada. Aman dijalankan ulang.
// ============================================================================

const { createClient } = require("@supabase/supabase-js");

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// Deterministic variance: slight oscillation per week_no so matrix looks alive
function variance(weekNo, seed) {
  const phase = ((seed * 13 + weekNo * 7) % 31) / 31; // 0..1
  const amp = 0.04 + (((seed * 3) % 7) / 100); // 4–10%
  const sign = weekNo % 2 === 0 ? 1 : -1;
  return 1 + sign * amp * phase;
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ Env NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib.");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // --------------------------------------------------------------------------
  // 1. Historical period (Jan–Mar 2026, inactive)
  // --------------------------------------------------------------------------
  console.log("→ ensuring historical period Januari–Maret 2026 ...");
  const histName = "Januari–Maret 2026";
  const histStart = new Date("2026-01-05T00:00:00Z"); // Monday
  const { data: existingHist } = await sb
    .from("price_periods")
    .select("id")
    .ilike("name", histName)
    .maybeSingle();

  let histPeriodId = existingHist?.id ?? null;
  if (!histPeriodId) {
    const { data: ins, error } = await sb
      .from("price_periods")
      .insert({
        name: histName,
        start_date: isoDate(histStart),
        end_date: isoDate(addDays(histStart, 12 * 7 - 1)),
        active: false,
        notes: "Seed demo · historical baseline Q1 2026"
      })
      .select("id")
      .single();
    if (error) {
      console.error("  ✗ gagal insert period:", error.message);
      process.exit(1);
    }
    histPeriodId = ins.id;
    console.log(`  ✓ period id=${histPeriodId}`);
  } else {
    console.log(`  • period sudah ada (id=${histPeriodId})`);
  }

  // Weeks for historical period
  const { data: existingWeeks } = await sb
    .from("price_weeks")
    .select("id,week_no")
    .eq("period_id", histPeriodId);
  const haveWeek = new Set((existingWeeks ?? []).map((w) => w.week_no));
  const weekInsert = [];
  for (let i = 1; i <= 12; i++) {
    if (haveWeek.has(i)) continue;
    const ws = addDays(histStart, (i - 1) * 7);
    const we = addDays(ws, 6);
    const monStart = ws.toLocaleString("en-GB", { month: "short", day: "numeric" });
    const monEnd = we.toLocaleString("en-GB", { month: "short", day: "numeric" });
    weekInsert.push({
      period_id: histPeriodId,
      week_no: i,
      start_date: isoDate(ws),
      end_date: isoDate(we),
      label: `Wk ${i}: ${monStart}–${monEnd}`
    });
  }
  if (weekInsert.length) {
    const { error: wErr } = await sb.from("price_weeks").insert(weekInsert);
    if (wErr) console.warn("  ⚠ week insert:", wErr.message);
    else console.log(`  ✓ weeks +${weekInsert.length}`);
  } else {
    console.log("  • weeks lengkap (12)");
  }

  // --------------------------------------------------------------------------
  // 2. Load active period + weeks + baseline prices (week 1 of active)
  // --------------------------------------------------------------------------
  const { data: activePeriods } = await sb
    .from("price_periods")
    .select("id,name")
    .eq("active", true)
    .order("id", { ascending: true });
  if (!activePeriods?.length) {
    console.error("❌ No active period");
    process.exit(1);
  }
  const activePeriodId = activePeriods[0].id;

  const { data: allWeeks } = await sb
    .from("price_weeks")
    .select("id,period_id,week_no")
    .in("period_id", [activePeriodId, histPeriodId])
    .order("week_no");
  const weekMap = {}; // `${periodId}:${weekNo}` -> weekId
  for (const w of allWeeks) weekMap[`${w.period_id}:${w.week_no}`] = w.id;

  const { data: baseRows } = await sb
    .from("supplier_prices")
    .select("week_id,supplier_id,commodity,ingredient_name,item_code,price_per_item,price_per_kg,unit,notes")
    .eq("week_id", weekMap[`${activePeriodId}:1`]);

  if (!baseRows?.length) {
    console.error("❌ Week 1 active period kosong — apply migration 0025 dulu.");
    process.exit(1);
  }
  console.log(`→ baseline rows (active w1): ${baseRows.length}`);

  // --------------------------------------------------------------------------
  // 3. Spread baseline ke w2..w12 active + w1..w12 historical (idempotent)
  // --------------------------------------------------------------------------
  // Load existing to skip
  const { data: existing } = await sb
    .from("supplier_prices")
    .select("week_id,supplier_id,commodity,ingredient_name");
  const existingKey = new Set(
    (existing ?? []).map(
      (r) => `${r.week_id}|${r.supplier_id}|${r.commodity}|${r.ingredient_name}`
    )
  );

  function buildRow(base, weekId, factor) {
    const perItem =
      base.price_per_item == null ? null : Math.max(100, Math.round(Number(base.price_per_item) * factor));
    const perKg =
      base.price_per_kg == null ? null : Math.max(100, Math.round(Number(base.price_per_kg) * factor));
    return {
      week_id: weekId,
      supplier_id: base.supplier_id,
      commodity: base.commodity,
      ingredient_name: base.ingredient_name,
      item_code: base.item_code,
      price_per_item: perItem,
      price_per_kg: perKg,
      unit: base.unit,
      notes: null
    };
  }

  const toInsert = [];

  // Active: w2..w12 with variance
  for (const base of baseRows) {
    const seed = hash(`${base.supplier_id}|${base.commodity}|${base.ingredient_name}`);
    for (let w = 2; w <= 12; w++) {
      const weekId = weekMap[`${activePeriodId}:${w}`];
      if (!weekId) continue;
      const key = `${weekId}|${base.supplier_id}|${base.commodity}|${base.ingredient_name}`;
      if (existingKey.has(key)) continue;
      toInsert.push(buildRow(base, weekId, variance(w, seed)));
    }
  }

  // Historical: all 12 weeks, prices ~5-15% lebih rendah dari baseline (Q1 lebih murah)
  for (const base of baseRows) {
    const seed = hash(`${base.supplier_id}|${base.commodity}|${base.ingredient_name}`) + 11;
    for (let w = 1; w <= 12; w++) {
      const weekId = weekMap[`${histPeriodId}:${w}`];
      if (!weekId) continue;
      const key = `${weekId}|${base.supplier_id}|${base.commodity}|${base.ingredient_name}`;
      if (existingKey.has(key)) continue;
      const f = 0.88 + ((seed + w * 3) % 11) / 100; // 0.88..0.99
      toInsert.push(buildRow(base, weekId, f));
    }
  }

  console.log(`→ inserting ${toInsert.length} supplier_prices ...`);
  if (toInsert.length) {
    const CHUNK = 500;
    let ok = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const slice = toInsert.slice(i, i + CHUNK);
      const { error } = await sb.from("supplier_prices").insert(slice);
      if (error) {
        console.warn(`  ⚠ chunk ${i}:`, error.message);
      } else {
        ok += slice.length;
      }
    }
    console.log(`  ✓ inserted ${ok}/${toInsert.length}`);
  } else {
    console.log("  • sudah penuh, tidak ada yang perlu di-insert");
  }

  // --------------------------------------------------------------------------
  // 4. Summary
  // --------------------------------------------------------------------------
  const { count: finalCount } = await sb
    .from("supplier_prices")
    .select("id", { count: "exact", head: true });
  const { count: periodCount } = await sb
    .from("price_periods")
    .select("id", { count: "exact", head: true });
  console.log(`\n✅ Price list demo ready. periods=${periodCount}, supplier_prices=${finalCount}`);
}

main().catch((err) => {
  console.error("✗ seed gagal:", err.message || err);
  process.exit(1);
});
