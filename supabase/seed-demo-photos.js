#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Seed demo photos/receipts untuk 3 tabel yang masih 0 baris:
 *   - receipts             (Bukti Terima, /procurement)
 *   - grn_qc_checks        (QC Gallery, /suppliers/[id])
 *   - delivery_stops.*     (photo_url + signature_url, /deliveries)
 *
 * Dummy image pakai Picsum.photos (seed-based, deterministic).
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Parse .env.local manually (avoid dotenv dep)
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

function picsum(seed, w = 640, h = 480) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

function sig(seed) {
  // SVG signature placeholder (data URL) — deterministic squiggle per seed
  const path = Array.from({ length: 20 }, (_, i) => {
    const x = 20 + i * 15;
    const y = 40 + Math.sin(seed.length * i * 0.37) * 15 + ((seed.charCodeAt(i % seed.length) % 10) - 5);
    return (i === 0 ? "M" : "L") + x + "," + y.toFixed(1);
  }).join(" ");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='80' viewBox='0 0 320 80'><path d='${path}' stroke='%231f3a8a' stroke-width='2.5' fill='none' stroke-linecap='round'/></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

async function seedReceipts() {
  // Ambil 20 GRN + 10 invoice terbaru utk dibuatkan receipt photos
  const [{ data: grns }, { data: invs }] = await Promise.all([
    sb.from("grns").select("no, po_no, grn_date").order("grn_date", { ascending: false }).limit(20),
    sb.from("invoices").select("no, po_no, inv_date").order("inv_date", { ascending: false }).limit(10)
  ]);

  const rows = [];
  (grns || []).forEach((g, i) => {
    rows.push({
      ref: g.no,
      note: `Foto terima barang ${g.no} — gudang pusat TTS`,
      photo_url: picsum(`grn-${g.no}`, 720, 540),
      created_at: new Date(g.grn_date + "T09:30:00Z").toISOString()
    });
    if (i % 3 === 0) {
      rows.push({
        ref: g.no,
        note: `Detail kemasan & label — ${g.no}`,
        photo_url: picsum(`grn-detail-${g.no}`, 720, 540),
        created_at: new Date(g.grn_date + "T09:35:00Z").toISOString()
      });
    }
  });
  (invs || []).forEach((inv) => {
    rows.push({
      ref: inv.no,
      note: `Invoice ${inv.no} — stempel supplier`,
      photo_url: picsum(`inv-${inv.no}`, 640, 900),
      created_at: new Date(inv.inv_date + "T10:00:00Z").toISOString()
    });
  });

  if (!rows.length) return 0;
  // Idempotent: skip refs yang sudah ada foto-nya
  const { data: existing } = await sb.from("receipts").select("ref, note");
  const seen = new Set((existing || []).map((r) => `${r.ref}::${r.note}`));
  const fresh = rows.filter((r) => !seen.has(`${r.ref}::${r.note}`));
  if (!fresh.length) return 0;
  const { error } = await sb.from("receipts").insert(fresh);
  if (error) throw new Error("receipts insert: " + error.message);
  return fresh.length;
}

async function seedGrnQc() {
  const { data: grns } = await sb
    .from("grns")
    .select("no, grn_date")
    .order("grn_date", { ascending: false })
    .limit(40);

  // Ambil contoh item_code dari po_rows
  const grnNos = (grns || []).map((g) => g.no);
  if (!grnNos.length) return 0;
  const { data: porows } = await sb
    .from("po_rows")
    .select("po_no, item_code, qty")
    .limit(500);
  const { data: grnsWithPo } = await sb
    .from("grns")
    .select("no, po_no")
    .in("no", grnNos);
  const poByGrn = new Map((grnsWithPo || []).map((g) => [g.no, g.po_no]));
  const itemsByPo = new Map();
  (porows || []).forEach((r) => {
    if (!itemsByPo.has(r.po_no)) itemsByPo.set(r.po_no, []);
    itemsByPo.get(r.po_no).push(r.item_code);
  });

  const CHECKPOINTS = [
    { cp: "Suhu penyimpanan", crit: true },
    { cp: "Kemasan utuh", crit: true },
    { cp: "Label & tanggal kadaluarsa", crit: false },
    { cp: "Kebersihan kendaraan", crit: false },
    { cp: "Kesesuaian berat", crit: true }
  ];
  const rows = [];
  (grns || []).forEach((g, gi) => {
    const poNo = poByGrn.get(g.no);
    const items = (poNo && itemsByPo.get(poNo)) || [];
    if (!items.length) return;
    const nChecks = 2 + (gi % 3);
    for (let i = 0; i < nChecks; i++) {
      const cp = CHECKPOINTS[(gi + i) % CHECKPOINTS.length];
      const item = items[i % items.length];
      const mod = (gi + i) % 10;
      const res = mod === 0 ? "critical" : mod === 1 ? "major" : mod <= 3 ? "minor" : "pass";
      const noteMap = {
        critical: "Temuan kritis: kemasan rusak sebagian, batch ditolak.",
        major: "Temuan mayor: suhu di atas batas, diterima bersyarat.",
        minor: "Temuan minor: label kurang jelas, dicatat utk pembinaan.",
        pass: "Sesuai standar QC."
      };
      rows.push({
        grn_no: g.no,
        item_code: item,
        checkpoint: cp.cp,
        is_critical: cp.crit,
        result: res,
        note: noteMap[res],
        photo_url: picsum(`qc-${g.no}-${i}`, 720, 540),
        checked_at: new Date(g.grn_date + `T${(9 + i).toString().padStart(2, "0")}:15:00Z`).toISOString()
      });
    }
  });

  if (!rows.length) return 0;
  const { error } = await sb.from("grn_qc_checks").insert(rows);
  if (error) throw new Error("grn_qc_checks insert: " + error.message);
  return rows.length;
}

async function seedDeliveryPhotos() {
  const { data: stops } = await sb
    .from("delivery_stops")
    .select("id, delivery_no, school_id, stop_order")
    .order("id", { ascending: false })
    .limit(200);

  if (!stops || !stops.length) return 0;
  // Update batch: tambah photo_url + signature_url
  let n = 0;
  for (const s of stops) {
    const seed = `${s.delivery_no}-${s.school_id}-${s.stop_order}`;
    const { error } = await sb
      .from("delivery_stops")
      .update({
        photo_url: picsum(`pod-${seed}`, 640, 480),
        signature_url: sig(seed)
      })
      .eq("id", s.id);
    if (error) throw new Error("delivery_stops update: " + error.message);
    n++;
  }
  return n;
}

(async () => {
  console.log("[photos] start");
  const r1 = await seedReceipts();
  console.log("[photos] receipts inserted:", r1);
  const r2 = await seedGrnQc();
  console.log("[photos] grn_qc_checks inserted:", r2);
  const r3 = await seedDeliveryPhotos();
  console.log("[photos] delivery_stops updated:", r3);
  console.log("[photos] done");
})().catch((e) => {
  console.error("[photos] FAIL", e.message);
  process.exit(1);
});
