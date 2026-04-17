import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import {
  formatIDR,
  listSupplierReval,
  supplierScorecardAuto
} from "@/lib/engine";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

function isoDate(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

function addMonths(d: Date, n: number): Date {
  const c = new Date(d);
  c.setMonth(c.getMonth() + n);
  return c;
}

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(req: NextRequest, { params }: Params) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const { id } = params;
  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? isoDate(new Date());
  const end =
    url.searchParams.get("end") ?? isoDate(addMonths(new Date(), 12));

  const [supRes, itemsRes, certsRes, reval, scorecard] = await Promise.all([
    supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("supplier_items")
      .select("item_code, is_main, price_idr, lead_time_days")
      .eq("supplier_id", id),
    supabase
      .from("supplier_certs")
      .select("id, name, valid_until")
      .eq("supplier_id", id)
      .order("valid_until", { ascending: true }),
    listSupplierReval(supabase, id),
    supplierScorecardAuto(supabase, id, start, end)
  ]);

  if (!supRes.data) {
    return NextResponse.json({ error: "supplier_not_found" }, { status: 404 });
  }

  const sup = supRes.data;
  const supItems = itemsRes.data ?? [];
  const certs = certsRes.data ?? [];
  const latestReval = reval[0] ?? null;

  const contractNo = `LTA-${id}-${new Date().getFullYear()}`;
  const today = new Date();
  const endDate = addMonths(today, 12);

  const itemsRows = supItems
    .map(
      (si) => `
        <tr>
          <td>${escapeHtml(si.item_code)}</td>
          <td>${si.is_main ? "Utama" : "Alternatif"}</td>
          <td style="text-align:right">${
            si.price_idr != null ? formatIDR(Number(si.price_idr)) : "—"
          }</td>
          <td style="text-align:right">${
            si.lead_time_days != null ? `${si.lead_time_days} hari` : "—"
          }</td>
        </tr>`
    )
    .join("");

  const certsRows = certs
    .map(
      (c) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${c.valid_until ?? "—"}</td>
        </tr>`
    )
    .join("");

  const scorecardHtml = `
    <table class="tbl">
      <tr>
        <th>Dimensi</th><th>Skor (0-100)</th><th>Bobot</th>
      </tr>
      <tr><td>Quality</td><td>${Number(scorecard.quality_score).toFixed(1)}</td><td>30%</td></tr>
      <tr><td>Delivery</td><td>${Number(scorecard.delivery_score).toFixed(1)}</td><td>25%</td></tr>
      <tr><td>Price</td><td>${Number(scorecard.price_score).toFixed(1)}</td><td>20%</td></tr>
      <tr><td>Compliance</td><td>${Number(scorecard.compliance_score).toFixed(1)}</td><td>15%</td></tr>
      <tr><td>Responsiveness</td><td>${Number(scorecard.responsiveness_score).toFixed(1)}</td><td>10%</td></tr>
      <tr class="total"><th>Total</th><th>${Number(scorecard.total_score).toFixed(1)}</th><th>100%</th></tr>
    </table>`;

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<title>LTA · ${escapeHtml(sup.name)} · ${contractNo}</title>
<style>
  :root { --ink:#0f172a; --ink2:#475569; --border:#cbd5e1; --accent:#0369a1; }
  * { box-sizing: border-box; }
  body {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: var(--ink);
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 48px;
    line-height: 1.55;
    font-size: 12pt;
    background: white;
  }
  h1 { font-size: 20pt; text-align: center; margin: 0 0 8px; letter-spacing: .02em; }
  h2 { font-size: 14pt; border-bottom: 1px solid var(--border); padding-bottom: 4px; margin-top: 28px; }
  h3 { font-size: 12pt; margin-top: 18px; }
  .sub { text-align: center; color: var(--ink2); font-size: 11pt; margin-bottom: 24px; }
  .meta { background: #f1f5f9; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; font-size: 11pt; }
  .meta b { display: inline-block; min-width: 160px; }
  .tbl { width: 100%; border-collapse: collapse; margin: 8px 0 18px; font-size: 10.5pt; }
  .tbl th, .tbl td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
  .tbl th { background: #f8fafc; font-weight: 700; }
  .tbl tr.total th, .tbl tr.total td { background: #fef9c3; }
  .sig { display: flex; gap: 40px; margin-top: 60px; }
  .sig > div { flex: 1; text-align: center; }
  .sig .line { border-top: 1px solid var(--ink); margin: 70px 0 6px; }
  ol li { margin-bottom: 8px; }
  .muted { color: var(--ink2); font-size: 10pt; }
  @media print {
    body { padding: 20px 30px; }
    .no-print { display: none !important; }
  }
  .toolbar {
    position: sticky;
    top: 0;
    background: #0f172a;
    color: white;
    margin: -40px -48px 24px;
    padding: 12px 48px;
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }
  .toolbar button {
    background: #0369a1; color: white; border: 0; padding: 8px 16px;
    border-radius: 6px; font-weight: bold; cursor: pointer;
  }
  .toolbar a { color: #93c5fd; text-decoration: none; font-size: 10pt; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <div>📄 <b>${contractNo}</b> · Draft LTA</div>
    <div>
      <a href="/suppliers/${escapeHtml(id)}">← Kembali</a>
      <button onclick="window.print()">🖨️ Cetak / Save as PDF</button>
    </div>
  </div>

  <h1>PERJANJIAN KERJA SAMA JANGKA PANJANG</h1>
  <h1 style="font-size:14pt; margin-top: 0">(LONG-TERM AGREEMENT)</h1>
  <p class="sub">Nomor: <b>${contractNo}</b> · Dokumen Draft · ${today.toLocaleDateString("id-ID")}</p>

  <div class="meta">
    <div><b>Pihak Pertama</b>: SPPG Nunumeu, Soe</div>
    <div><b>Pihak Kedua</b>: ${escapeHtml(sup.name)} (${escapeHtml(sup.id)})</div>
    <div><b>Tipe Badan</b>: ${escapeHtml(sup.type)}</div>
    ${sup.address ? `<div><b>Alamat</b>: ${escapeHtml(sup.address)}</div>` : ""}
    ${sup.pic ? `<div><b>PIC</b>: ${escapeHtml(sup.pic)}</div>` : ""}
    ${sup.phone ? `<div><b>Telepon</b>: ${escapeHtml(sup.phone)}</div>` : ""}
    ${sup.email ? `<div><b>Email</b>: ${escapeHtml(sup.email)}</div>` : ""}
    <div><b>Periode Kontrak</b>: ${isoDate(today)} s/d ${isoDate(endDate)}</div>
  </div>

  <h2>Pasal 1 · Ruang Lingkup</h2>
  <p>
    Pihak Kedua menyanggupi untuk memasok komoditas pangan kepada Pihak Pertama
    sesuai kebutuhan program <b>Makan Bergizi Gratis</b> di bawah koordinasi WFP × IFSR × FFI
    untuk SPPG Nunumeu, Kabupaten Timor Tengah Selatan (TTS), Provinsi Nusa Tenggara Timur.
  </p>

  <h2>Pasal 2 · Komoditas, Harga, dan Lead Time</h2>
  ${
    supItems.length === 0
      ? `<p class="muted">Belum ada mapping komoditas di sistem. Lampiran ini akan dilengkapi setelah onboarding item.</p>`
      : `<table class="tbl">
          <tr>
            <th>Item</th><th>Peran</th><th>Harga (IDR)</th><th>Lead Time</th>
          </tr>
          ${itemsRows}
        </table>`
  }

  <h2>Pasal 3 · Standar Mutu (QC)</h2>
  <p>
    Setiap pengiriman wajib melalui proses <b>Goods Receipt Note (GRN)</b> dan QC
    Check di SPPG. Tolak-terima mengacu pada checklist kategori komoditas yang
    berlaku. Bila terjadi <b>Non-Conformance (NCR)</b>, Pihak Kedua wajib
    memberikan corrective action dalam <b>3 × 24 jam</b>.
  </p>

  <h2>Pasal 4 · Scorecard Evaluasi Kinerja</h2>
  <p>
    Evaluasi periodik (default: kuartalan) menggunakan 5 dimensi dengan bobot
    berikut. Skor hasil evaluasi di bawah 55 akan memicu <b>exit plan</b>.
  </p>
  ${scorecardHtml}
  ${
    latestReval
      ? `<p class="muted">Evaluasi terakhir: periode ${latestReval.period_start} → ${latestReval.period_end}, total skor <b>${Number(latestReval.total_score).toFixed(1)}</b>${latestReval.recommendation ? `, rekomendasi <b>${escapeHtml(latestReval.recommendation)}</b>` : ""}.</p>`
      : `<p class="muted">Belum ada riwayat evaluasi periodik.</p>`
  }

  <h2>Pasal 5 · Sertifikasi dan Compliance</h2>
  ${
    certs.length === 0
      ? `<p class="muted">Belum ada sertifikat terdaftar. Pihak Kedua wajib menyerahkan dokumen legal & halal/mutu sesuai jenis komoditas.</p>`
      : `<table class="tbl">
          <tr><th>Sertifikat</th><th>Berlaku Sampai</th></tr>
          ${certsRows}
        </table>`
  }

  <h2>Pasal 6 · Pembayaran</h2>
  <p>
    Termin pembayaran: <b>Net 14 hari</b> terhitung sejak invoice diterima,
    bersamaan dengan GRN status <i>ok</i> atau <i>partial</i>. Pembayaran
    dilakukan via transfer bank resmi Pihak Kedua.
  </p>

  <h2>Pasal 7 · Force Majeure</h2>
  <p>
    Bila terjadi keadaan kahar (bencana alam, konflik, pandemi, dll.) Pihak Kedua
    wajib memberitahu Pihak Pertama dalam 24 jam serta menyediakan alternatif
    sourcing selama masa force majeure.
  </p>

  <h2>Pasal 8 · Penutup</h2>
  <ol>
    <li>Perjanjian ini berlaku 12 bulan dan dapat diperpanjang berdasarkan hasil
    evaluasi Pasal 4.</li>
    <li>Perubahan atas perjanjian ini harus disepakati tertulis oleh kedua belah
    pihak.</li>
    <li>Sengketa diselesaikan secara musyawarah; bila tidak tercapai, melalui
    pengadilan negeri di Kabupaten TTS.</li>
  </ol>

  <div class="sig">
    <div>
      <div><b>Pihak Pertama</b><br/>SPPG Nunumeu</div>
      <div class="line"></div>
      <div class="muted">Nama &amp; Jabatan</div>
    </div>
    <div>
      <div><b>Pihak Kedua</b><br/>${escapeHtml(sup.name)}</div>
      <div class="line"></div>
      <div class="muted">${escapeHtml(sup.pic ?? "Nama &amp; Jabatan")}</div>
    </div>
  </div>

  <p class="muted" style="margin-top:40px; text-align:center">
    Dokumen otomatis · MBG Soe App · ${new Date().toLocaleString("id-ID")}
  </p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
