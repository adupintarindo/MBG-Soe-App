#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// MBG Soe · Supplementary demo seeder
// ----------------------------------------------------------------------------
// Isi tabel yang belum tersentuh seed-demo-3mo.js:
//   - purchase_requisitions + pr_rows + pr_allocations
//   - quotations + quotation_rows
//   - budgets (Master Anggaran)
//   - cash_receipts (Penerimaan Kas)
//
// Idempotent: cek existing row sebelum insert. Aman dijalankan ulang.
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
function pad3(n) {
  return String(n).padStart(3, "0");
}
function rand(min, max) {
  return min + Math.random() * (max - min);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ Env NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib.");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  // --- Master refs ---------------------------------------------------------
  const [{ data: suppliers }, { data: items }, { data: supItems }] = await Promise.all([
    sb.from("suppliers").select("id,name,commodity").eq("active", true),
    sb.from("items").select("code,unit,category,price_idr"),
    sb.from("supplier_items").select("supplier_id,item_code")
  ]);
  if (!suppliers?.length || !items?.length) {
    console.error("❌ Master suppliers/items kosong.");
    process.exit(1);
  }
  const itemByCode = new Map(items.map((i) => [i.code, i]));
  const supplierForItem = new Map();
  for (const si of supItems || []) {
    if (!supplierForItem.has(si.item_code)) supplierForItem.set(si.item_code, []);
    supplierForItem.get(si.item_code).push(si.supplier_id);
  }
  const pickSupplier = (code) => {
    const pool = supplierForItem.get(code);
    if (pool?.length) return pick(pool);
    return pick(suppliers).id;
  };

  // Fallback price (match seeder)
  const PRICE_OVERRIDE = {
    "Beras Putih": 14500, "Fortification Rice": 17500, "Ayam Tanpa Tulang": 62000,
    "Ayam Segar": 45000, "Ikan Tuna": 48000, "Telur Ayam": 2600, "Tahu": 9000,
    "Tempe": 12000, "Minyak Goreng": 18500, "Bawang Merah": 38000, "Bawang Putih": 42000,
    "Pisang": 14000, "Pepaya": 9000, "Melon": 16000, "Semangka": 8000, "Wortel": 11000,
    "Tomat": 14000, "Sawi Putih": 8000, "Sawi Hijau": 9000, "Pakcoi": 10000,
    "Buncis": 12000, "Labu Parang": 7000, "Kentang": 15000, "Ubi Jalar": 9500
  };
  const CAT_PRICE = {
    BERAS: 14000, HEWANI: 55000, NABATI: 18000, SAYUR_HIJAU: 12000, SAYUR: 10000,
    UMBI: 9000, BUMBU: 35000, REMPAH: 65000, BUAH: 18000, SEMBAKO: 17000, LAIN: 15000
  };
  const priceOf = (code) => {
    if (PRICE_OVERRIDE[code]) return PRICE_OVERRIDE[code];
    const it = itemByCode.get(code);
    return (it?.price_idr > 0 ? it.price_idr : (CAT_PRICE[it?.category] || 15000));
  };

  // ------------------------------------------------------------------------
  // 1. Purchase Requisitions + rows + allocations
  // ------------------------------------------------------------------------
  console.log("→ seeding purchase_requisitions ...");
  const prToSeed = [];
  // 3 PR: kemarin (completed), hari ini (quotations_issued), +3 hari (draft/allocated)
  prToSeed.push({ need_date: isoDate(addDays(today, 1)), status: "completed" });
  prToSeed.push({ need_date: isoDate(addDays(today, 3)), status: "quotations_issued" });
  prToSeed.push({ need_date: isoDate(addDays(today, 5)), status: "allocated" });
  prToSeed.push({ need_date: isoDate(addDays(today, 7)), status: "draft" });

  // Menu items to requisition (variety)
  const baseItems = [
    { code: "Beras Putih", qty: 150, unit: "kg" },
    { code: "Ayam Tanpa Tulang", qty: 42, unit: "kg" },
    { code: "Telur Ayam", qty: 1250, unit: "btr" },
    { code: "Minyak Goreng", qty: 18, unit: "lt" },
    { code: "Wortel", qty: 28, unit: "kg" },
    { code: "Tomat", qty: 22, unit: "kg" },
    { code: "Bawang Merah", qty: 14, unit: "kg" },
    { code: "Tahu", qty: 30, unit: "kg" }
  ].filter((x) => itemByCode.has(x.code));

  const createdPR = [];
  for (let i = 0; i < prToSeed.length; i++) {
    const spec = prToSeed[i];
    const prNo = `PR-${year}-${pad3(i + 1)}`;
    // delete existing to make re-run clean
    await sb.from("purchase_requisitions").delete().eq("no", prNo);
    const { data: prIns, error: prErr } = await sb
      .from("purchase_requisitions")
      .insert({ no: prNo, need_date: spec.need_date, status: spec.status, notes: `Seed demo · need ${spec.need_date}` })
      .select();
    if (prErr) { console.warn("  ⚠ PR insert:", prErr.message); continue; }
    // Rows
    const rowItems = baseItems.slice(0, 4 + (i % 3));
    const rows = rowItems.map((it, idx) => ({
      pr_no: prNo, line_no: idx + 1, item_code: it.code,
      qty_total: Number((it.qty * rand(0.9, 1.1)).toFixed(3)),
      unit: it.unit, note: null
    }));
    const { error: rowErr } = await sb.from("pr_rows").insert(rows);
    if (rowErr) { console.warn("  ⚠ pr_rows:", rowErr.message); continue; }
    // Allocations: split qty_total across 1-2 suppliers
    const allocs = [];
    for (const r of rows) {
      const pool = (supplierForItem.get(r.item_code) || [pickSupplier(r.item_code)]).slice(0, 2);
      if (pool.length === 1) {
        allocs.push({ pr_no: prNo, line_no: r.line_no, supplier_id: pool[0], qty_planned: r.qty_total });
      } else {
        const splitA = Number((r.qty_total * 0.6).toFixed(3));
        const splitB = Number((r.qty_total - splitA).toFixed(3));
        allocs.push({ pr_no: prNo, line_no: r.line_no, supplier_id: pool[0], qty_planned: splitA });
        allocs.push({ pr_no: prNo, line_no: r.line_no, supplier_id: pool[1], qty_planned: splitB });
      }
    }
    if (allocs.length) {
      const { error: aErr } = await sb.from("pr_allocations").insert(allocs);
      if (aErr) console.warn("  ⚠ pr_allocations:", aErr.message);
    }
    createdPR.push({ no: prNo, status: spec.status, need_date: spec.need_date, rows });
  }
  console.log(`  ✓ purchase_requisitions: ${createdPR.length}`);

  // ------------------------------------------------------------------------
  // 2. Quotations (RFQ) — 6 entry beberapa status
  // ------------------------------------------------------------------------
  console.log("→ seeding quotations ...");
  const qtSpecs = [
    { status: "sent", needOffset: 3 },
    { status: "sent", needOffset: 3 },
    { status: "responded", needOffset: 4 },
    { status: "responded", needOffset: 4 },
    { status: "accepted", needOffset: 5 },
    { status: "draft", needOffset: 7 }
  ];
  const qtCreated = [];
  for (let i = 0; i < qtSpecs.length; i++) {
    const s = qtSpecs[i];
    const qtNo = `QT-${year}-${pad3(i + 1)}`;
    await sb.from("quotations").delete().eq("no", qtNo);
    const sup = pick(suppliers);
    const qtDate = isoDate(addDays(today, -2 + (i % 3)));
    const needDate = isoDate(addDays(today, s.needOffset));
    const { error: qErr } = await sb.from("quotations").insert({
      no: qtNo,
      supplier_id: sup.id,
      quote_date: qtDate,
      valid_until: isoDate(addDays(today, 7 + i)),
      need_date: needDate,
      status: s.status,
      notes: `Seed demo · supplier ${sup.name}`
    });
    if (qErr) { console.warn("  ⚠ qt:", qErr.message); continue; }
    // Rows: 3-5 items, price suggested, and quoted if status != draft
    const picks = baseItems.slice(0, 3 + (i % 3));
    const rows = picks.map((it, idx) => {
      const base = priceOf(it.code);
      const suggest = Math.round(base / 100) * 100;
      const quoted =
        s.status === "draft" || s.status === "sent"
          ? null
          : Math.round((base * rand(0.95, 1.08)) / 100) * 100;
      const qtyQuoted =
        s.status === "responded" || s.status === "accepted"
          ? Number((it.qty * rand(0.95, 1.05)).toFixed(3))
          : null;
      return {
        qt_no: qtNo,
        line_no: idx + 1,
        item_code: it.code,
        qty: it.qty,
        unit: it.unit,
        price_suggested: suggest,
        price_quoted: quoted,
        qty_quoted: qtyQuoted
      };
    });
    const { error: qrErr } = await sb.from("quotation_rows").insert(rows);
    if (qrErr) console.warn("  ⚠ qt_rows:", qrErr.message);
    qtCreated.push(qtNo);
  }
  console.log(`  ✓ quotations: ${qtCreated.length}`);

  // ------------------------------------------------------------------------
  // 3. Budgets (Master Anggaran) — 4 entry: Feb, Mar, Apr 2026 + Mei forecast
  // ------------------------------------------------------------------------
  console.log("→ seeding budgets ...");
  const budgetEntries = [
    { period: "2026-02", source: "dinas", source_name: "Dinas Pendidikan TTS", amount_idr: 850000000, target_cost_per_portion: 15000 },
    { period: "2026-02", source: "wfp", source_name: "WFP Indonesia", amount_idr: 120000000, target_cost_per_portion: 15000 },
    { period: "2026-03", source: "dinas", source_name: "Dinas Pendidikan TTS", amount_idr: 875000000, target_cost_per_portion: 15000 },
    { period: "2026-03", source: "wfp", source_name: "WFP Indonesia", amount_idr: 120000000, target_cost_per_portion: 15000 },
    { period: "2026-04", source: "dinas", source_name: "Dinas Pendidikan TTS", amount_idr: 900000000, target_cost_per_portion: 15500 },
    { period: "2026-04", source: "wfp", source_name: "WFP Indonesia", amount_idr: 130000000, target_cost_per_portion: 15500 },
    { period: "2026-04", source: "ifsr", source_name: "IFSR Research Fund", amount_idr: 45000000, target_cost_per_portion: 15500 },
    { period: "2026-05", source: "dinas", source_name: "Dinas Pendidikan TTS", amount_idr: 920000000, target_cost_per_portion: 16000 }
  ];
  let bOk = 0;
  for (const b of budgetEntries) {
    const payload = {
      ...b,
      allocation: { pangan: 0.7, ops: 0.2, admin: 0.1 },
      note: "Seed demo · alokasi bulanan"
    };
    const { error } = await sb.from("budgets").upsert(payload, { onConflict: "period,source" });
    if (error) console.warn("  ⚠ budget:", error.message);
    else bOk++;
  }
  console.log(`  ✓ budgets: ${bOk}`);

  // ------------------------------------------------------------------------
  // 4. Cash Receipts (Penerimaan Kas) — 6 entry
  // ------------------------------------------------------------------------
  console.log("→ seeding cash_receipts ...");
  const crEntries = [
    { offset: -55, source: "dinas", source_name: "Dinas Pendidikan TTS", amount: 425000000, period: "2026-02", ref: "DINAS-2026-02-A" },
    { offset: -40, source: "dinas", source_name: "Dinas Pendidikan TTS", amount: 425000000, period: "2026-02", ref: "DINAS-2026-02-B" },
    { offset: -25, source: "dinas", source_name: "Dinas Pendidikan TTS", amount: 900000000, period: "2026-03", ref: "DINAS-2026-03" },
    { offset: -20, source: "wfp", source_name: "WFP Country Office", amount: 120000000, period: "2026-03", ref: "WFP-Q1-TRANCHE" },
    { offset: -7, source: "dinas", source_name: "Dinas Pendidikan TTS", amount: 900000000, period: "2026-04", ref: "DINAS-2026-04" },
    { offset: -3, source: "ifsr", source_name: "IFSR Research Grant", amount: 45000000, period: "2026-04", ref: "IFSR-OP-042" }
  ];
  let crOk = 0;
  for (let i = 0; i < crEntries.length; i++) {
    const e = crEntries[i];
    const no = `CR-${year}-${pad3(i + 1)}`;
    await sb.from("cash_receipts").delete().eq("no", no);
    const { error } = await sb.from("cash_receipts").insert({
      no,
      receipt_date: isoDate(addDays(today, e.offset)),
      source: e.source,
      source_name: e.source_name,
      amount: e.amount,
      period: e.period,
      reference: e.ref,
      note: "Seed demo · penerimaan kas"
    });
    if (error) console.warn("  ⚠ cash_receipt:", error.message);
    else crOk++;
  }
  console.log(`  ✓ cash_receipts: ${crOk}`);

  console.log("\n✅ Supplementary seed selesai.");
}

main().catch((err) => {
  console.error("✗ seed gagal:", err.message || err);
  process.exit(1);
});
