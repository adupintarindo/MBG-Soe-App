#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// MBG Soe · Demo seeder · 3 bulan historis (90 hari)
// ----------------------------------------------------------------------------
// Output kronologis:
//   - menu_assign         (90 hari, rolling menu aktif, skip weekend + libur)
//   - purchase_orders     (~ 3 PO/minggu · dipecah per supplier)
//   - po_rows             (BOM × porsi target untuk tiap PO)
//   - grns + grn_rows     (seragam 1 GRN / PO, H+1 PO)
//   - stock_batches       (1 batch / grn_row, expiry sesuai kategori)
//   - invoices            (H+1 GRN)
//   - payments            (H+TOP · 7 / 14 / 30 hari)
//   - deliveries + stops  (1 delivery / hari operasional, semua sekolah aktif)
//   - school_attendance   (hadir ~ 92-98%)
//   - transactions        (ledger PO/GRN/INV/PAY)
//
// Idempotent: pakai upsert / on conflict do update. Bisa di-run berkali-kali.
// Tahan banting: kalau data master kosong, script exit graceful + pesan jelas.
//
// Jalankan:
//   node supabase/seed-demo-3mo.js            → 90 hari mundur dari hari ini
//   node supabase/seed-demo-3mo.js --days=60  → override window
//   node supabase/seed-demo-3mo.js --reset    → hapus demo data dulu (hati-hati!)
// ============================================================================

const { createClient } = require("@supabase/supabase-js");

// ---------- Helpers ---------------------------------------------------------
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
function pad2(n) {
  return String(n).padStart(2, "0");
}
function rand(min, max) {
  return min + Math.random() * (max - min);
}
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Deterministic-ish jitter supaya angka chart tidak flat (±10%)
function jitter(v, pct = 0.1) {
  return v * (1 + rand(-pct, pct));
}

// Dummy price fallback per kategori (Rp/kg) kalau items.price_idr = 0
const DEFAULT_PRICE_BY_CAT = {
  BERAS: 14000,
  HEWANI: 55000,
  NABATI: 18000,
  SAYUR_HIJAU: 12000,
  SAYUR: 10000,
  UMBI: 9000,
  BUMBU: 35000,
  REMPAH: 65000,
  BUAH: 18000,
  SEMBAKO: 17000,
  LAIN: 15000
};
// Per-item overrides (Rp/kg atau Rp/unit kalau bukan kg)
const PRICE_OVERRIDE = {
  "Beras Putih": 14500,
  "Fortification Rice": 17500,
  "Ayam Tanpa Tulang": 62000,
  "Ayam Segar": 45000,
  "Ikan Tuna": 48000,
  "Telur Ayam": 2600,
  "Tahu": 9000,
  "Tempe": 12000,
  "Minyak Goreng": 18500,
  "Bawang Merah": 38000,
  "Bawang Putih": 42000,
  "Pisang": 14000,
  "Pepaya": 9000,
  "Melon": 16000,
  "Semangka": 8000,
  "Wortel": 11000,
  "Tomat": 14000,
  "Sawi Putih": 8000,
  "Sawi Hijau": 9000,
  "Pakcoi": 10000,
  "Buncis": 12000,
  "Labu Parang": 7000,
  "Kentang": 15000,
  "Ubi Jalar": 9500
};

function baseItemPrice(it) {
  const raw = Number(it.price_idr) || 0;
  if (raw > 0) return raw;
  if (PRICE_OVERRIDE[it.code]) return PRICE_OVERRIDE[it.code];
  return DEFAULT_PRICE_BY_CAT[it.category] || DEFAULT_PRICE_BY_CAT.LAIN;
}

// Expiry days per kategori
const EXPIRY_DAYS = {
  BERAS: 180,
  HEWANI: 3,
  NABATI: 5,
  SAYUR_HIJAU: 3,
  SAYUR: 5,
  UMBI: 21,
  BUMBU: 14,
  REMPAH: 90,
  BUAH: 5,
  SEMBAKO: 365,
  LAIN: 60
};

// ---------- Main ------------------------------------------------------------
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "❌ NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib ada di env."
    );
    process.exit(1);
  }

  const argv = process.argv.slice(2);
  const daysArg = argv.find((a) => a.startsWith("--days="));
  const DAYS = daysArg ? parseInt(daysArg.split("=")[1], 10) : 90;
  const RESET = argv.includes("--reset");

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = addDays(today, -DAYS);
  console.log(
    `🌱 Seeding demo data · ${isoDate(startDate)} → ${isoDate(today)} (${DAYS} hari)`
  );

  if (RESET) {
    await resetDemoData(sb, startDate, today);
  }

  // --- 1. Load master ---------------------------------------------------
  const [menusRes, bomRes, itemsRes, schoolsRes, supsRes, supItemsRes, nonOpRes] =
    await Promise.all([
      sb.from("menus").select("id,name").eq("active", true).order("id"),
      sb.from("menu_bom").select("menu_id,item_code,grams_per_porsi"),
      sb.from("items").select("code,name_en,unit,category,price_idr"),
      sb.from("schools").select("id,students,kelas13,kelas46").eq("active", true),
      sb
        .from("suppliers")
        .select("id,name,type,commodity")
        .eq("active", true)
        .order("id"),
      sb.from("supplier_items").select("supplier_id,item_code"),
      sb
        .from("non_op_days")
        .select("op_date")
        .gte("op_date", isoDate(startDate))
        .lte("op_date", isoDate(today))
    ]);

  for (const [name, r] of [
    ["menus", menusRes],
    ["menu_bom", bomRes],
    ["items", itemsRes],
    ["schools", schoolsRes],
    ["suppliers", supsRes],
    ["supplier_items", supItemsRes],
    ["non_op_days", nonOpRes]
  ]) {
    if (r.error) {
      console.error(`✗ gagal load ${name}:`, r.error.message);
      process.exit(1);
    }
  }
  const menus = menusRes.data ?? [];
  const bomRows = bomRes.data ?? [];
  const items = itemsRes.data ?? [];
  const schools = schoolsRes.data ?? [];
  const suppliers = supsRes.data ?? [];
  const supItems = supItemsRes.data ?? [];
  const nonOp = new Set((nonOpRes.data ?? []).map((r) => r.op_date));

  if (menus.length === 0 || items.length === 0 || suppliers.length === 0) {
    console.error(
      `❌ Master kosong: menus=${menus.length}, items=${items.length}, suppliers=${suppliers.length}. Jalankan seed.sql dulu.`
    );
    process.exit(1);
  }

  const itemByCode = new Map(items.map((i) => [i.code, i]));

  // BOM index menu_id → item_code → grams_per_porsi
  const bomByMenu = new Map();
  for (const b of bomRows) {
    if (!bomByMenu.has(b.menu_id)) bomByMenu.set(b.menu_id, new Map());
    bomByMenu.get(b.menu_id).set(b.item_code, Number(b.grams_per_porsi));
  }

  // Supplier → items mapping (fallback: kategori-based)
  const suppliersForItem = new Map();
  for (const si of supItems) {
    if (!suppliersForItem.has(si.item_code))
      suppliersForItem.set(si.item_code, []);
    suppliersForItem.get(si.item_code).push(si.supplier_id);
  }
  const pickSupplier = (itemCode) => {
    const pool = suppliersForItem.get(itemCode);
    if (pool && pool.length) return pick(pool);
    return pick(suppliers).id;
  };

  console.log(
    `  master: ${menus.length} menu · ${items.length} item · ${schools.length} sekolah · ${suppliers.length} supplier`
  );

  // --- 2. menu_assign (rolling cycle) -----------------------------------
  const menuAssignRows = [];
  let menuIdx = 0;
  const opDates = [];
  for (let i = 0; i < DAYS; i++) {
    const d = addDays(startDate, i);
    const iso = isoDate(d);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    if (nonOp.has(iso)) continue;
    opDates.push({ date: iso, menu: menus[menuIdx % menus.length] });
    menuAssignRows.push({
      assign_date: iso,
      menu_id: menus[menuIdx % menus.length].id,
      note: null
    });
    menuIdx++;
  }

  if (menuAssignRows.length) {
    const { error } = await sb
      .from("menu_assign")
      .upsert(menuAssignRows, { onConflict: "assign_date" });
    if (error) throw error;
    console.log(`  ✓ menu_assign: ${menuAssignRows.length}`);
  }

  // --- 3. Purchase Orders (~3×/minggu digabung per supplier) ------------
  // Strategi: untuk setiap 2-hari operasional, bikin 1 PO per supplier aktif.
  // Item tiap PO = BOM semua menu antara tanggal PO dan PO berikutnya, dikumpul per supplier.
  const poRows = [];
  const poRowsDetail = [];
  const grnRows = [];
  const grnRowDetail = [];
  const batchRows = [];
  const invoiceRows = [];
  const paymentRows = [];
  const txRows = [];
  const deliveryRows = [];
  const deliveryStopRows = [];
  const schoolAttRows = [];
  const stockMoveRows = [];

  const year = today.getFullYear();
  let poSeq = 1;
  let grnSeq = 1;
  let invSeq = 1;
  let paySeq = 1;

  const totalStudents = schools.reduce((s, x) => s + (x.students || 0), 0);
  const TARGET_PORSI = Math.max(100, Math.round(totalStudents * 0.95));

  // Batch op dates into delivery days (every operational day = 1 delivery)
  // Group 2 consecutive op days into a procurement cycle
  for (let i = 0; i < opDates.length; i += 2) {
    const window = opDates.slice(i, i + 2);
    if (window.length === 0) continue;
    const poDate = addDays(new Date(window[0].date + "T00:00:00"), -1);
    const poDateIso = isoDate(poDate);

    // aggregate required qty per item across this window
    const required = new Map();
    for (const w of window) {
      const menuBom = bomByMenu.get(w.menu.id);
      if (!menuBom) continue;
      const porsi = Math.round(jitter(TARGET_PORSI, 0.05));
      for (const [code, gramsPerPorsi] of menuBom.entries()) {
        // grams × porsi → kg
        const add = (gramsPerPorsi * porsi) / 1000;
        required.set(code, (required.get(code) || 0) + add);
      }
    }

    // split by supplier
    const bySupplier = new Map();
    for (const [code, qty] of required.entries()) {
      const supId = pickSupplier(code);
      if (!bySupplier.has(supId)) bySupplier.set(supId, []);
      bySupplier.get(supId).push({ code, qty });
    }

    for (const [supId, lines] of bySupplier.entries()) {
      const poNo = `PO-${year}-${pad3(poSeq++)}`;
      let total = 0;
      const rowsForPo = [];
      lines.forEach((ln, idx) => {
        const it = itemByCode.get(ln.code);
        if (!it) return;
        const qty = Math.round(ln.qty * 1000) / 1000;
        const price = Math.round(jitter(baseItemPrice(it), 0.08) / 100) * 100;
        const subtotal = Math.round(qty * price);
        total += subtotal;
        rowsForPo.push({
          po_no: poNo,
          line_no: idx + 1,
          item_code: it.code,
          qty,
          unit: it.unit,
          price
        });
      });

      if (rowsForPo.length === 0) continue;

      const deliveryDate = isoDate(addDays(poDate, 1));
      poRows.push({
        no: poNo,
        po_date: poDateIso,
        supplier_id: supId,
        delivery_date: deliveryDate,
        total,
        status: "closed",
        pay_method: "transfer",
        top: pick(["7", "14", "30"]),
        notes: "Seed demo 3 bulan"
      });
      poRowsDetail.push(...rowsForPo);
      txRows.push({
        tx_date: poDateIso,
        tx_type: "po",
        ref_no: poNo,
        supplier_id: supId,
        amount: total,
        description: `PO ${rowsForPo.length} item`
      });

      // GRN: H+1 dari PO
      const grnNo = `GRN-${year}-${pad3(grnSeq++)}`;
      grnRows.push({
        no: grnNo,
        po_no: poNo,
        grn_date: deliveryDate,
        status: Math.random() < 0.9 ? "ok" : "partial",
        qc_note: null
      });
      rowsForPo.forEach((r) => {
        const cat = itemByCode.get(r.item_code)?.category || "LAIN";
        const received =
          Math.random() < 0.05
            ? Math.round(r.qty * 0.9 * 1000) / 1000
            : r.qty;
        grnRowDetail.push({
          grn_no: grnNo,
          line_no: r.line_no,
          item_code: r.item_code,
          qty_ordered: r.qty,
          qty_received: received,
          qty_rejected: Math.round((r.qty - received) * 1000) / 1000,
          unit: r.unit,
          note: null
        });
        batchRows.push({
          item_code: r.item_code,
          grn_no: grnNo,
          supplier_id: supId,
          batch_code: `B-${deliveryDate.replace(/-/g, "")}-${r.line_no}`,
          qty_received: received,
          qty_remaining: Math.round(received * rand(0.1, 0.85) * 1000) / 1000,
          unit: r.unit,
          received_date: deliveryDate,
          expiry_date: isoDate(
            addDays(new Date(deliveryDate + "T00:00:00"), EXPIRY_DAYS[cat] || 60)
          ),
          note: null
        });
        stockMoveRows.push({
          item_code: r.item_code,
          delta: received,
          reason: "receipt",
          ref_doc: "grn",
          ref_no: grnNo,
          note: `GRN ${grnNo} · ${deliveryDate}`
        });
      });
      txRows.push({
        tx_date: deliveryDate,
        tx_type: "grn",
        ref_no: grnNo,
        supplier_id: supId,
        amount: null,
        description: `GRN dari ${poNo}`
      });

      // Invoice: H+1 dari GRN
      const invNo = `INV-${year}-${pad3(invSeq++)}`;
      const invDate = isoDate(addDays(new Date(deliveryDate + "T00:00:00"), 1));
      const topDays = parseInt(
        poRows[poRows.length - 1].top || "14",
        10
      );
      const dueDate = isoDate(
        addDays(new Date(invDate + "T00:00:00"), topDays)
      );
      const invTotal = grnRowDetail
        .filter((g) => g.grn_no === grnNo)
        .reduce((s, g) => {
          const priceRow = rowsForPo.find((p) => p.item_code === g.item_code);
          return s + (priceRow ? g.qty_received * priceRow.price : 0);
        }, 0);
      const payDate = isoDate(
        addDays(new Date(dueDate + "T00:00:00"), randInt(-3, 5))
      );
      const isPaid = new Date(payDate) <= today;
      invoiceRows.push({
        no: invNo,
        po_no: poNo,
        inv_date: invDate,
        supplier_id: supId,
        total: Math.round(invTotal),
        due_date: dueDate,
        status: isPaid ? "paid" : new Date(dueDate) < today ? "overdue" : "issued"
      });
      txRows.push({
        tx_date: invDate,
        tx_type: "invoice",
        ref_no: invNo,
        supplier_id: supId,
        amount: Math.round(invTotal),
        description: `Invoice ${poNo}`
      });

      // Payment jika sudah waktunya
      if (isPaid) {
        const payNo = `PAY-${year}-${pad3(paySeq++)}`;
        paymentRows.push({
          no: payNo,
          invoice_no: invNo,
          supplier_id: supId,
          pay_date: payDate,
          amount: Math.round(invTotal),
          method: pick(["transfer", "transfer", "transfer", "giro", "tunai"]),
          reference: `TRF-${payNo}`,
          note: "Demo seed"
        });
        txRows.push({
          tx_date: payDate,
          tx_type: "payment",
          ref_no: payNo,
          supplier_id: supId,
          amount: Math.round(invTotal),
          description: `Pembayaran ${invNo}`
        });
      }
    }
  }

  // --- 4. Deliveries (1 per hari operasional) ---------------------------
  const DRIVERS = ["Pak Yosep", "Pak Niko", "Pak Adi", "Pak Bernard"];
  const VEHICLES = ["B 9123 SOE", "B 8412 NTT", "DH 7201 TX"];
  let deliverySeq = 1;
  for (const { date, menu } of opDates) {
    const dNo = `DLV-${date.replace(/-/g, "")}-${pad2(deliverySeq++ % 99)}`;
    const totalPlanned = Math.round(jitter(TARGET_PORSI, 0.03));
    const totalDelivered = Math.random() < 0.95 ? totalPlanned : Math.round(totalPlanned * 0.97);
    const dispatchedAt = `${date}T04:30:00+08:00`;
    const completedAt = `${date}T07:15:00+08:00`;
    deliveryRows.push({
      no: dNo,
      delivery_date: date,
      menu_id: menu.id,
      driver_name: pick(DRIVERS),
      vehicle: pick(VEHICLES),
      dispatched_at: dispatchedAt,
      completed_at: completedAt,
      status: "delivered",
      total_porsi_planned: totalPlanned,
      total_porsi_delivered: totalDelivered,
      note: null
    });

    // split antar sekolah proporsional students
    let order = 1;
    for (const s of schools) {
      const share = Math.round(
        (totalDelivered * (s.students || 0)) / Math.max(1, totalStudents)
      );
      deliveryStopRows.push({
        delivery_no: dNo,
        stop_order: order++,
        school_id: s.id,
        porsi_planned: share,
        porsi_delivered: share,
        arrival_at: `${date}T${pad2(5 + (order % 3))}:${pad2((order * 7) % 60)}:00+08:00`,
        temperature_c: Math.round(rand(62, 70) * 10) / 10,
        receiver_name: `Kepala ${s.id}`,
        note: null,
        status: "delivered"
      });
      // school attendance
      const students = s.students || 0;
      const present = Math.max(0, Math.round(students * rand(0.92, 0.98)));
      schoolAttRows.push({
        school_id: s.id,
        att_date: date,
        qty: present
      });
    }
    if (deliverySeq > 98) deliverySeq = 1;
  }

  // --- 5. Upsert all in batches ----------------------------------------
  console.log(`  ✓ generated:`);
  console.log(`    PO ${poRows.length} · PO rows ${poRowsDetail.length}`);
  console.log(`    GRN ${grnRows.length} · GRN rows ${grnRowDetail.length}`);
  console.log(`    batches ${batchRows.length} · stock moves ${stockMoveRows.length}`);
  console.log(`    INV ${invoiceRows.length} · PAY ${paymentRows.length}`);
  console.log(`    deliveries ${deliveryRows.length} · stops ${deliveryStopRows.length}`);
  console.log(`    tx ${txRows.length} · attendance ${schoolAttRows.length}`);

  await upsertBatches(sb, "purchase_orders", poRows, "no");
  await upsertBatches(sb, "po_rows", poRowsDetail, "po_no,line_no");
  await upsertBatches(sb, "grns", grnRows, "no");
  await upsertBatches(sb, "grn_rows", grnRowDetail, "grn_no,line_no");
  await upsertBatches(sb, "stock_batches", batchRows, null); // bigserial PK
  await upsertBatches(sb, "invoices", invoiceRows, "no");
  await upsertBatches(sb, "payments", paymentRows, "no");
  await upsertBatches(sb, "deliveries", deliveryRows, "no");
  await upsertBatches(sb, "delivery_stops", deliveryStopRows, "delivery_no,school_id");
  await upsertBatches(sb, "school_attendance", schoolAttRows, "school_id,att_date");
  await upsertBatches(sb, "stock_moves", stockMoveRows, null);
  await upsertBatches(sb, "transactions", txRows, null);

  // --- 6. Aggregate stock.on_hand ---------------------------------------
  await refreshStockOnHand(sb, items);

  console.log(`\n✅ Seed demo 3 bulan selesai.`);
}

async function upsertBatches(sb, table, rows, onConflict) {
  if (!rows || rows.length === 0) return;
  const chunk = 500;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const opts = onConflict
      ? { onConflict }
      : { ignoreDuplicates: false };
    const { error } = onConflict
      ? await sb.from(table).upsert(slice, opts)
      : await sb.from(table).insert(slice);
    if (error) {
      // Untuk tabel tanpa PK kita: kalau error konflik, skip. Kalau bukan, lempar.
      if (error.code === "23505" && !onConflict) {
        console.warn(`  ⚠ ${table}: duplicate batch — skipping ${slice.length}`);
        continue;
      }
      console.error(`  ✗ ${table} insert error:`, error.message);
      throw error;
    }
  }
  console.log(`    ↳ ${table}: ${rows.length} rows upserted`);
}

async function refreshStockOnHand(sb, items) {
  // Hitung ulang on_hand dari sum(qty_remaining) di stock_batches
  const { data, error } = await sb
    .from("stock_batches")
    .select("item_code,qty_remaining");
  if (error) {
    console.warn("  ⚠ skip refresh stock:", error.message);
    return;
  }
  const sumByItem = new Map();
  for (const r of data || []) {
    sumByItem.set(
      r.item_code,
      (sumByItem.get(r.item_code) || 0) + Number(r.qty_remaining)
    );
  }
  const stockRows = items
    .filter((it) => sumByItem.has(it.code))
    .map((it) => ({
      item_code: it.code,
      qty: Math.round(sumByItem.get(it.code) * 1000) / 1000
    }));
  if (stockRows.length === 0) return;
  await upsertBatches(sb, "stock", stockRows, "item_code");
}

async function resetDemoData(sb, startDate, today) {
  console.log(`⚠️  --reset: hapus demo data antara ${isoDate(startDate)} → ${isoDate(today)}`);
  const start = isoDate(startDate);
  const end = isoDate(today);
  const tables = [
    ["transactions", "tx_date"],
    ["payments", "pay_date"],
    ["invoices", "inv_date"],
    ["delivery_stops", null], // cascade via deliveries
    ["deliveries", "delivery_date"],
    ["school_attendance", "att_date"],
    ["stock_moves", "move_date"],
    ["stock_batches", "received_date"],
    ["grn_rows", null], // cascade via grns
    ["grns", "grn_date"],
    ["po_rows", null], // cascade via purchase_orders
    ["purchase_orders", "po_date"]
  ];
  for (const [t, col] of tables) {
    if (!col) continue;
    const { error, count } = await sb
      .from(t)
      .delete({ count: "exact" })
      .gte(col, start)
      .lte(col, end);
    if (error) console.warn(`  ⚠ reset ${t}: ${error.message}`);
    else console.log(`  ✓ reset ${t}: ${count ?? "?"} rows`);
  }
}

main().catch((err) => {
  console.error("✗ seed gagal:", err.message ?? err);
  process.exit(1);
});
