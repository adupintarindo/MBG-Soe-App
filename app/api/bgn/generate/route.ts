/**
 * /api/bgn/generate
 *
 * Generator Lampiran BGN (SK Ka BGN 401.1/2025).
 *
 * Query params:
 *   lampiran = 20|26|27|28|28c|29a|29b|30a|30b|30e|30f   (kode lampiran)
 *   format   = pdf | xlsx                                 (default: pdf = HTML print-ready)
 *   from     = YYYY-MM-DD (optional, defaults: awal bulan ini)
 *   to       = YYYY-MM-DD (optional, defaults: hari ini)
 *
 * Output:
 *   - format=xlsx : Excel workbook (Content-Type: application/vnd.openxmlformats…)
 *   - format=pdf  : HTML ready-to-print (Content-Type: text/html) + @media print CSS
 *
 * Setiap pemanggilan sukses akan di-log ke `bgn_generation_log`.
 */
import { NextResponse } from "next/server";
import {
  buildStyledXlsxBuffer,
  type StyledColumn,
  type StyledSheet
} from "@/lib/excel-export";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import {
  insertBgnGenerationLog,
  listBgnGenerationLog,
  listChartOfAccounts,
  listDailyCashLog,
  listFoodSampleLog,
  listGlEntry,
  listKaderIncentive,
  listOrganolepticTest,
  listPayrollPeriod,
  listPayrollSlip,
  listPettyCash,
  listPicIncentive,
  listPicSchool,
  listPosyandu,
  listSppgStaff,
  sppgRoleLabel,
  type ChartOfAccount,
  type CoaCategory,
  type DailyCashLog,
  type GlEntry,
  type KaderIncentive,
  type OrganolepticTest,
  type PayrollSlip,
  type PettyCash,
  type PicIncentive,
  type PicSchool,
  type Posyandu,
  type SppgStaff
} from "@/lib/bgn";

export const dynamic = "force-dynamic";

type Format = "pdf" | "xlsx";
type LampiranCode =
  | "20"
  | "26"
  | "27"
  | "28"
  | "28c"
  | "29a"
  | "29b"
  | "30a"
  | "30b"
  | "30e"
  | "30f";

const VALID_LAMPIRAN: readonly LampiranCode[] = [
  "20",
  "26",
  "27",
  "28",
  "28c",
  "29a",
  "29b",
  "30a",
  "30b",
  "30e",
  "30f"
];

const LAMPIRAN_TITLE: Record<LampiranCode, string> = {
  "20": "Tanda Terima Bantuan MBG",
  "26": "Uji Organoleptik",
  "27": "Daftar Tim SPPG",
  "28": "Slip Gaji",
  "28c": "Log Absensi Harian",
  "29a": "Insentif Kader Posyandu",
  "29b": "Insentif PIC Sekolah",
  "30a": "Log Sampel Makanan",
  "30b": "Kas Harian",
  "30e": "Buku Besar + Neraca",
  "30f": "Kas Kecil"
};

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function idr(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(v);
}

function firstOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function escHtml(s: string | number | null | undefined): string {
  if (s == null) return "—";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlShell(title: string, bodyInner: string, meta: string): string {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${escHtml(title)} · SPPG Nunumeu Soe</title>
<style>
  :root {
    --navy: #0B1E3F;
    --gold: #DFB85A;
    --ink: #111827;
    --muted: #6B7280;
    --border: #E5E7EB;
    --zebra: #F3F4F6;
    --ok-fill: #D1FADF; --ok-text: #027A48;
    --bad-fill: #FEE4E2; --bad-text: #B42318;
    --warn-fill: #FEF3C7; --warn-text: #92400E;
    --neu-fill: #E0E7FF; --neu-text: #3730A3;
  }
  @page { size: A4; margin: 15mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--ink); font-size: 11px; line-height: 1.45; margin: 0; padding: 18px; background: #F9FAFB; }
  .page { max-width: 820px; margin: 0 auto; background: #fff; padding: 0; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,.05); }
  .title-bar { background: var(--navy); color: #fff; padding: 18px 28px 14px; border-bottom: 3px solid var(--gold); }
  .title-bar h1 { font-size: 15px; margin: 0 0 4px 0; letter-spacing: .04em; text-transform: uppercase; font-weight: 700; color: #fff; }
  .title-bar .meta { font-size: 10.5px; color: rgba(255,255,255,.82); font-style: italic; margin: 0; }
  .content { padding: 20px 28px 24px; }
  h2 { font-size: 12px; margin: 18px 0 8px 0; color: var(--navy); font-weight: 700; letter-spacing: .02em; text-transform: uppercase; border-left: 3px solid var(--gold); padding-left: 8px; }
  h2:first-of-type { margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10.5px; }
  th, td { border: 1px solid var(--border); padding: 5px 7px; text-align: left; vertical-align: middle; }
  thead th { background: var(--navy); color: #fff; font-weight: 700; text-transform: uppercase; font-size: 9.5px; letter-spacing: .05em; border-color: var(--navy); border-bottom: 2px solid var(--gold); }
  tbody tr:nth-child(even) td { background: var(--zebra); }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { background: var(--navy); color: #fff; font-weight: 700; border-top: 2px solid var(--gold); border-color: var(--navy); }
  tfoot td strong { color: #fff; }
  .footer { margin-top: 22px; padding: 12px 28px 16px; font-size: 9.5px; color: var(--muted); display: flex; justify-content: space-between; border-top: 1px solid var(--border); }
  .sig-area { margin-top: 32px; display: flex; gap: 36px; }
  .sig-box { flex: 1; border-top: 1px solid var(--ink); padding-top: 6px; text-align: center; font-size: 10px; color: var(--ink); font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9.5px; font-weight: 700; letter-spacing: .02em; }
  .b-ok { background: var(--ok-fill); color: var(--ok-text); }
  .b-bad { background: var(--bad-fill); color: var(--bad-text); }
  .b-warn { background: var(--warn-fill); color: var(--warn-text); }
  .b-info { background: var(--neu-fill); color: var(--neu-text); }
  .no-print { margin: 0 auto 14px; max-width: 820px; padding: 10px 14px; background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; font-size: 11px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .no-print button { padding: 7px 16px; font-weight: 700; cursor: pointer; background: var(--navy); color: #fff; border: 0; border-radius: 6px; font-size: 11px; }
  .no-print button:hover { background: #1e3a5f; }
  @media print {
    .no-print { display: none; }
    body { background: #fff; padding: 0; }
    .page { border: 0; box-shadow: none; }
  }
</style>
</head>
<body>
<div class="no-print">
  <span><strong>Dokumen siap cetak.</strong> Gunakan Print / Save as PDF untuk mengekspor.</span>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>
<div class="page">
  <div class="title-bar">
    <h1>${escHtml(title)}</h1>
    <div class="meta">${meta}</div>
  </div>
  <div class="content">
    ${bodyInner}
  </div>
  <div class="footer">
    <div>SPPG Nunumeu, Soe — Timor Tengah Selatan, NTT</div>
    <div>SK Ka BGN 401.1/2025</div>
  </div>
</div>
</body>
</html>`;
}

function infoSheet(
  title: string,
  from: string,
  to: string,
  extra: Array<[string, string | number]> = []
): StyledSheet {
  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
  return {
    name: "Info",
    title: title.toUpperCase(),
    subtitle: `Periode ${from} s/d ${to} · SK Ka BGN 401.1/2025`,
    columns: [
      { key: "k", header: "Field", width: 26, align: "left" },
      { key: "v", header: "Value", width: 60, align: "left" }
    ],
    meta: [
      ["Periode Awal", from],
      ["Periode Akhir", to],
      ["Digenerate", generatedAt],
      ["Lokasi", "SPPG Nunumeu, Soe — Timor Tengah Selatan, NTT"],
      ["Kepatuhan", "SK Ka BGN 401.1/2025"],
      ...extra
    ],
    rows: []
  };
}

/* -------------------------------------------------------------------------- */
/*                          Per-Lampiran Data Loaders                         */
/* -------------------------------------------------------------------------- */

type Client = ReturnType<typeof createClient>;

interface Ctx {
  supabase: Client;
  from: string;
  to: string;
}

async function loadSampel(ctx: Ctx) {
  const [logs, staff, schools] = await Promise.all([
    listFoodSampleLog(ctx.supabase, { from: ctx.from, to: ctx.to, limit: 1000 }),
    listSppgStaff(ctx.supabase, { active: true }),
    ctx.supabase
      .from("schools")
      .select("id, name")
      .order("name")
      .then((r) => (r.data ?? []) as Array<{ id: string; name: string }>)
  ]);
  return { logs, staff, schools };
}

async function loadOrganoleptik(ctx: Ctx) {
  const [tests, staff, schools] = await Promise.all([
    listOrganolepticTest(ctx.supabase, {
      from: ctx.from,
      to: ctx.to,
      limit: 1000
    }),
    listSppgStaff(ctx.supabase, { active: true }),
    ctx.supabase
      .from("schools")
      .select("id, name")
      .order("name")
      .then((r) => (r.data ?? []) as Array<{ id: string; name: string }>)
  ]);
  return { tests, staff, schools };
}

async function loadTim(ctx: Ctx) {
  return { staff: await listSppgStaff(ctx.supabase, { active: true }) };
}

async function loadGaji(ctx: Ctx) {
  const periods = await listPayrollPeriod(ctx.supabase, { limit: 12 });
  const current = periods.find(
    (p) => p.start_date <= ctx.to && p.end_date >= ctx.from
  );
  const active = current ?? periods[0];
  const [slips, staff] = await Promise.all([
    active
      ? listPayrollSlip(ctx.supabase, { period_id: active.id, limit: 500 })
      : Promise.resolve([] as PayrollSlip[]),
    listSppgStaff(ctx.supabase, { active: true })
  ]);
  return { period: active, slips, staff };
}

async function loadInsentifKader(ctx: Ctx) {
  const [kader, posyanduList, staff] = await Promise.all([
    listKaderIncentive(ctx.supabase, { limit: 500 }),
    listPosyandu(ctx.supabase),
    listSppgStaff(ctx.supabase, { active: true })
  ]);
  const filtered = kader.filter(
    (r) => r.period_end >= ctx.from && r.period_start <= ctx.to
  );
  return { kader: filtered, posyanduList, staff };
}

async function loadInsentifPic(ctx: Ctx) {
  const [pic, picSchoolList, staff, schoolsRes] = await Promise.all([
    listPicIncentive(ctx.supabase, { limit: 500 }),
    listPicSchool(ctx.supabase, { active: true }),
    listSppgStaff(ctx.supabase, { active: true }),
    ctx.supabase.from("schools").select("id, name").order("name")
  ]);
  const schools = (schoolsRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const filtered = pic.filter(
    (r) => r.period_end >= ctx.from && r.period_start <= ctx.to
  );
  return { pic: filtered, picSchoolList, staff, schools };
}

async function loadKasHarian(ctx: Ctx) {
  const [logs, coa] = await Promise.all([
    listDailyCashLog(ctx.supabase, { from: ctx.from, to: ctx.to, limit: 1000 }),
    listChartOfAccounts(ctx.supabase, { active: true })
  ]);
  return { logs, coa };
}

async function loadPettyCash(ctx: Ctx) {
  const txs = await listPettyCash(ctx.supabase, {
    from: ctx.from,
    to: ctx.to,
    limit: 1000
  });
  return { txs };
}

async function loadBukuBesar(ctx: Ctx) {
  const [accounts, entries] = await Promise.all([
    listChartOfAccounts(ctx.supabase, { active: true }),
    listGlEntry(ctx.supabase, { from: ctx.from, to: ctx.to, limit: 2000 })
  ]);
  return { accounts, entries };
}

/* -------------------------------------------------------------------------- */
/*                                 Renderers                                  */
/* -------------------------------------------------------------------------- */

function renderSampelHtml(
  data: Awaited<ReturnType<typeof loadSampel>>,
  from: string,
  to: string
): string {
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const schMap = Object.fromEntries(data.schools.map((s) => [s.id, s]));
  const rows = data.logs
    .map((l) => {
      const off = l.officer_id ? staffMap[l.officer_id] : undefined;
      const sch = l.school_id ? schMap[l.school_id] : undefined;
      return `<tr>
      <td>${escHtml(l.delivery_date)}</td>
      <td class="num">${escHtml(l.delivery_seq)}</td>
      <td>${escHtml(sch?.name ?? "—")}</td>
      <td>${escHtml(l.menu_assign_date ?? "—")}</td>
      <td>${escHtml(off?.full_name ?? "—")}</td>
      <td><span class="badge ${l.sample_kept ? "b-ok" : "b-bad"}">${l.sample_kept ? "Ya" : "Tidak"}</span></td>
      <td>${escHtml(l.notes ?? "—")}</td>
    </tr>`;
    })
    .join("");
  const body = `
    <h2>Data Log Sampel Makanan</h2>
    <table>
      <thead>
        <tr>
          <th>Tanggal</th><th class="num">Seq</th><th>Sekolah</th>
          <th>Tgl Menu</th><th>Petugas</th><th>Sampel</th><th>Catatan</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="7" style="text-align:center">Tidak ada data pada periode ini.</td></tr>`}</tbody>
    </table>
    <div class="sig-area">
      <div class="sig-box">Petugas Sampling</div>
      <div class="sig-box">Pengawas Gizi</div>
      <div class="sig-box">Kepala SPPG</div>
    </div>`;
  return htmlShell(
    "Lampiran 30a — Log Sampel Makanan",
    body,
    `Periode: ${from} s/d ${to} · Total: ${data.logs.length} log`
  );
}

function renderOrganoleptikHtml(
  data: Awaited<ReturnType<typeof loadOrganoleptik>>,
  from: string,
  to: string
): string {
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const schMap = Object.fromEntries(data.schools.map((s) => [s.id, s]));
  const rows = data.tests
    .map((t) => {
      const off = t.officer_id ? staffMap[t.officer_id] : undefined;
      const sch = t.school_id ? schMap[t.school_id] : undefined;
      return `<tr>
      <td>${escHtml(t.test_date)}</td>
      <td>${escHtml(t.test_phase)}</td>
      <td>${escHtml(sch?.name ?? "—")}</td>
      <td class="num">${escHtml(t.rasa)}</td>
      <td class="num">${escHtml(t.warna)}</td>
      <td class="num">${escHtml(t.aroma)}</td>
      <td class="num">${escHtml(t.tekstur)}</td>
      <td><span class="badge ${t.verdict === "aman" ? "b-ok" : "b-bad"}">${t.verdict}</span></td>
      <td>${escHtml(off?.full_name ?? "—")}</td>
    </tr>`;
    })
    .join("");
  const body = `
    <h2>Data Uji Organoleptik</h2>
    <table>
      <thead>
        <tr>
          <th>Tanggal</th><th>Fase</th><th>Sekolah</th>
          <th class="num">Rasa</th><th class="num">Warna</th><th class="num">Aroma</th><th class="num">Tekstur</th>
          <th>Hasil</th><th>Petugas</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="9" style="text-align:center">Tidak ada data.</td></tr>`}</tbody>
    </table>
    <p style="margin-top:10px;font-size:10px;color:#4b525c">Skala 1–5: 5=Sangat baik, 1=Sangat buruk. "Aman" = layak konsumsi.</p>
    <div class="sig-area">
      <div class="sig-box">Ahli Gizi</div>
      <div class="sig-box">Pengawas Gizi</div>
      <div class="sig-box">Kepala SPPG</div>
    </div>`;
  return htmlShell(
    "Lampiran 26 — Uji Organoleptik",
    body,
    `Periode: ${from} s/d ${to} · Total: ${data.tests.length} uji`
  );
}

function renderTimHtml(
  data: Awaited<ReturnType<typeof loadTim>>
): string {
  const rows = data.staff
    .map(
      (s) => `<tr>
      <td class="num">${escHtml(s.seq_no)}</td>
      <td>${escHtml(s.full_name)}</td>
      <td>${escHtml(sppgRoleLabel(s.role, "ID"))}</td>
      <td>${escHtml(s.nik ?? "—")}</td>
      <td>${escHtml(s.phone ?? "—")}</td>
      <td>${escHtml(s.bank_name ?? "—")} ${escHtml(s.bank_account ?? "")}</td>
      <td class="num">${idr(s.gaji_pokok)}</td>
    </tr>`
    )
    .join("");
  const total = data.staff.reduce(
    (s, r) => s + Number(r.gaji_pokok ?? 0),
    0
  );
  const body = `
    <h2>Daftar Tim SPPG (Aktif)</h2>
    <table>
      <thead>
        <tr>
          <th class="num">#</th><th>Nama Lengkap</th><th>Posisi</th>
          <th>NIK</th><th>No. HP</th><th>Rekening Bank</th><th class="num">Gaji Pokok</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="7" style="text-align:center">Belum ada staff.</td></tr>`}</tbody>
      <tfoot>
        <tr>
          <td colspan="6"><strong>Total Gaji Pokok per Bulan</strong></td>
          <td class="num"><strong>${idr(total)}</strong></td>
        </tr>
      </tfoot>
    </table>
    <div class="sig-area">
      <div class="sig-box">Pengawas Keuangan</div>
      <div class="sig-box">Kepala SPPG</div>
    </div>`;
  return htmlShell(
    "Lampiran 27 — Daftar Tim SPPG",
    body,
    `Total staff aktif: ${data.staff.length}`
  );
}

function renderGajiHtml(
  data: Awaited<ReturnType<typeof loadGaji>>
): string {
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const rows = data.slips
    .map((sl) => {
      const st = sl.staff_id ? staffMap[sl.staff_id] : undefined;
      return `<tr>
      <td>${escHtml(st?.full_name ?? "—")}</td>
      <td class="num">${idr(sl.gaji_pokok)}</td>
      <td class="num">${escHtml(sl.hari_kerja)}</td>
      <td class="num">${idr(
        Number(sl.insentif_kehadiran ?? 0) +
          Number(sl.insentif_kinerja ?? 0) +
          Number(sl.lain_lain ?? 0) +
          Number(sl.tunjangan ?? 0)
      )}</td>
      <td class="num">${idr(sl.total_lembur)}</td>
      <td class="num">${idr(
        Number(sl.potongan_kehadiran ?? 0) +
          Number(sl.potongan_bpjs_kes ?? 0) +
          Number(sl.potongan_bpjs_tk ?? 0) +
          Number(sl.potongan_lain ?? 0)
      )}</td>
      <td class="num"><strong>${idr(sl.penerimaan_bersih)}</strong></td>
      <td><span class="badge ${sl.paid ? "b-ok" : "b-warn"}">${sl.paid ? "Terbayar" : "Pending"}</span></td>
    </tr>`;
    })
    .join("");
  const totalNet = data.slips.reduce(
    (s, r) => s + Number(r.penerimaan_bersih ?? 0),
    0
  );
  const periodHeader = data.period
    ? `Periode: ${data.period.period_label} (${data.period.start_date} → ${data.period.end_date})`
    : "Belum ada periode gaji";
  const body = `
    <h2>Slip Gaji — ${escHtml(data.period?.period_label ?? "—")}</h2>
    <table>
      <thead>
        <tr>
          <th>Staff</th><th class="num">Gaji Pokok</th><th class="num">Hari Kerja</th>
          <th class="num">Insentif</th><th class="num">Lembur</th><th class="num">Potongan</th>
          <th class="num">Bersih</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="8" style="text-align:center">Tidak ada slip.</td></tr>`}</tbody>
      <tfoot>
        <tr>
          <td colspan="6"><strong>Total Penerimaan Bersih</strong></td>
          <td class="num"><strong>${idr(totalNet)}</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    <div class="sig-area">
      <div class="sig-box">Pengawas Keuangan</div>
      <div class="sig-box">Kepala SPPG</div>
    </div>`;
  return htmlShell("Lampiran 28 — Slip Gaji", body, periodHeader);
}

function renderInsentifKaderHtml(
  data: Awaited<ReturnType<typeof loadInsentifKader>>,
  from: string,
  to: string
): string {
  const posMap: Record<string, Posyandu> = Object.fromEntries(
    data.posyanduList.map((p) => [p.id, p])
  );
  const staffMap: Record<string, SppgStaff> = Object.fromEntries(
    data.staff.map((s) => [s.id, s])
  );
  const rows = data.kader
    .map((k) => {
      const py = k.posyandu_id ? posMap[k.posyandu_id] : undefined;
      const st = k.kader_staff_id ? staffMap[k.kader_staff_id] : undefined;
      return `<tr>
      <td>${escHtml(k.period_start)} → ${escHtml(k.period_end)}</td>
      <td>${escHtml(py?.name ?? "—")}</td>
      <td>${escHtml(st?.full_name ?? "—")}</td>
      <td class="num">${escHtml(k.porsi_senin)}</td>
      <td class="num">${escHtml(k.porsi_kamis)}</td>
      <td class="num">${idr(k.unit_cost)}</td>
      <td class="num"><strong>${idr(k.total_amount)}</strong></td>
      <td><span class="badge ${k.paid ? "b-ok" : "b-warn"}">${k.paid ? "Terbayar" : "Pending"}</span></td>
    </tr>`;
    })
    .join("");
  const total = data.kader.reduce(
    (s, r) => s + Number(r.total_amount ?? 0),
    0
  );
  const body = `
    <h2>Insentif Kader Posyandu (Senin + Kamis)</h2>
    <table>
      <thead>
        <tr>
          <th>Periode</th><th>Posyandu</th><th>Kader</th>
          <th class="num">Porsi Senin</th><th class="num">Porsi Kamis</th>
          <th class="num">Unit</th><th class="num">Total</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="8" style="text-align:center">Tidak ada data.</td></tr>`}</tbody>
      <tfoot>
        <tr>
          <td colspan="6"><strong>Grand Total</strong></td>
          <td class="num"><strong>${idr(total)}</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    <div class="sig-area">
      <div class="sig-box">Pengawas Keuangan</div>
      <div class="sig-box">Kepala SPPG</div>
    </div>`;
  return htmlShell(
    "Lampiran 29a — Insentif Kader Posyandu",
    body,
    `Periode: ${from} s/d ${to} · ${data.kader.length} baris`
  );
}

function renderInsentifPicHtml(
  data: Awaited<ReturnType<typeof loadInsentifPic>>,
  from: string,
  to: string
): string {
  const psMap: Record<string, PicSchool> = Object.fromEntries(
    data.picSchoolList.map((p) => [p.id, p])
  );
  const staffMap: Record<string, SppgStaff> = Object.fromEntries(
    data.staff.map((s) => [s.id, s])
  );
  const schMap: Record<string, { id: string; name: string }> =
    Object.fromEntries(data.schools.map((s) => [s.id, s]));
  const rows = data.pic
    .map((r) => {
      const ps = r.pic_school_id ? psMap[r.pic_school_id] : undefined;
      const sch = ps?.school_id ? schMap[ps.school_id] : undefined;
      const picStaff = ps?.pic_staff_id ? staffMap[ps.pic_staff_id] : undefined;
      return `<tr>
      <td>${escHtml(r.period_start)} → ${escHtml(r.period_end)}</td>
      <td>${escHtml(sch?.name ?? "—")}</td>
      <td>${escHtml(picStaff?.full_name ?? "—")}</td>
      <td class="num">${escHtml(r.total_porsi)}</td>
      <td class="num">${idr(r.unit_cost)}</td>
      <td class="num"><strong>${idr(r.total_amount)}</strong></td>
      <td><span class="badge ${r.paid ? "b-ok" : "b-warn"}">${r.paid ? "Terbayar" : "Pending"}</span></td>
    </tr>`;
    })
    .join("");
  const total = data.pic.reduce(
    (s, r) => s + Number(r.total_amount ?? 0),
    0
  );
  const body = `
    <h2>Insentif PIC Sekolah</h2>
    <table>
      <thead>
        <tr>
          <th>Periode</th><th>Sekolah</th><th>PIC</th>
          <th class="num">Total Porsi</th>
          <th class="num">Unit</th><th class="num">Total</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="7" style="text-align:center">Tidak ada data.</td></tr>`}</tbody>
      <tfoot>
        <tr>
          <td colspan="5"><strong>Grand Total</strong></td>
          <td class="num"><strong>${idr(total)}</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    <div class="sig-area">
      <div class="sig-box">Pengawas Keuangan</div>
      <div class="sig-box">Kepala SPPG</div>
    </div>`;
  return htmlShell(
    "Lampiran 29b — Insentif PIC Sekolah",
    body,
    `Periode: ${from} s/d ${to} · ${data.pic.length} baris`
  );
}

function renderKasHarianHtml(
  data: Awaited<ReturnType<typeof loadKasHarian>>,
  from: string,
  to: string
): string {
  const coaMap = Object.fromEntries(data.coa.map((a) => [a.code, a.name]));
  const totalMasuk = data.logs.reduce(
    (s, r) => s + Number(r.uang_masuk ?? 0),
    0
  );
  const totalKeluar = data.logs.reduce(
    (s, r) => s + Number(r.uang_keluar ?? 0),
    0
  );
  const rows = data.logs
    .map(
      (l) => `<tr>
      <td>${escHtml(l.log_date)}${l.log_time ? " " + escHtml(l.log_time.slice(0, 5)) : ""}</td>
      <td>${escHtml(l.category ? `${l.category} · ${coaMap[l.category] ?? "?"}` : "—")}</td>
      <td>${escHtml(l.po_no ?? "—")}</td>
      <td>${escHtml(l.keterangan ?? "—")}</td>
      <td class="num">${Number(l.uang_masuk) > 0 ? idr(l.uang_masuk) : "—"}</td>
      <td class="num">${Number(l.uang_keluar) > 0 ? idr(l.uang_keluar) : "—"}</td>
    </tr>`
    )
    .join("");
  const body = `
    <h2>Kas Harian</h2>
    <table>
      <thead>
        <tr>
          <th>Tanggal</th><th>Kategori</th><th>PO</th><th>Keterangan</th>
          <th class="num">Masuk</th><th class="num">Keluar</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="6" style="text-align:center">Tidak ada transaksi.</td></tr>`}</tbody>
      <tfoot>
        <tr>
          <td colspan="4"><strong>Total</strong></td>
          <td class="num"><strong>${idr(totalMasuk)}</strong></td>
          <td class="num"><strong>${idr(totalKeluar)}</strong></td>
        </tr>
        <tr>
          <td colspan="4"><strong>Saldo Bersih</strong></td>
          <td class="num" colspan="2"><strong>${idr(totalMasuk - totalKeluar)}</strong></td>
        </tr>
      </tfoot>
    </table>
    <div class="sig-area">
      <div class="sig-box">Kasir</div>
      <div class="sig-box">Pengawas Keuangan</div>
      <div class="sig-box">Kepala SPPG</div>
    </div>`;
  return htmlShell(
    "Lampiran 30b — Kas Harian",
    body,
    `Periode: ${from} s/d ${to} · ${data.logs.length} transaksi`
  );
}

function renderPettyCashHtml(
  data: Awaited<ReturnType<typeof loadPettyCash>>,
  from: string,
  to: string
): string {
  const totalMasuk = data.txs
    .filter((r) => r.direction === "masuk")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalKeluar = data.txs
    .filter((r) => r.direction === "keluar")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const rows = data.txs
    .map(
      (r) => `<tr>
      <td>${escHtml(r.tx_date)}${r.tx_time ? " " + escHtml(r.tx_time.slice(0, 5)) : ""}</td>
      <td><span class="badge ${r.direction === "masuk" ? "b-ok" : "b-bad"}">${r.direction}</span></td>
      <td>${escHtml(r.description ?? "—")}</td>
      <td class="num">${idr(r.amount)}</td>
      <td class="num">${r.balance_after != null ? idr(r.balance_after) : "—"}</td>
    </tr>`
    )
    .join("");
  const body = `
    <h2>Kas Kecil (Petty Cash)</h2>
    <table>
      <thead>
        <tr>
          <th>Tanggal</th><th>Arah</th><th>Keterangan</th>
          <th class="num">Jumlah</th><th class="num">Saldo Setelah</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="5" style="text-align:center">Tidak ada transaksi.</td></tr>`}</tbody>
      <tfoot>
        <tr>
          <td colspan="3"><strong>Total Masuk / Keluar</strong></td>
          <td class="num"><strong>${idr(totalMasuk)} / ${idr(totalKeluar)}</strong></td>
          <td class="num"><strong>${idr(totalMasuk - totalKeluar)}</strong></td>
        </tr>
      </tfoot>
    </table>
    <div class="sig-area">
      <div class="sig-box">Pemegang Kas Kecil</div>
      <div class="sig-box">Pengawas Keuangan</div>
    </div>`;
  return htmlShell(
    "Lampiran 30f — Kas Kecil",
    body,
    `Periode: ${from} s/d ${to} · ${data.txs.length} transaksi`
  );
}

function renderBukuBesarHtml(
  data: Awaited<ReturnType<typeof loadBukuBesar>>,
  from: string,
  to: string
): string {
  const acctName = Object.fromEntries(
    data.accounts.map((a) => [a.code, a.name])
  );
  // GL entries
  const entryRows = data.entries
    .map(
      (e) => `<tr>
      <td>${escHtml(e.entry_date)}</td>
      <td>${escHtml(e.description ?? "—")}</td>
      <td>${escHtml(e.debit_account ?? "—")} ${escHtml(e.debit_account ? acctName[e.debit_account] ?? "" : "")}</td>
      <td>${escHtml(e.credit_account ?? "—")} ${escHtml(e.credit_account ? acctName[e.credit_account] ?? "" : "")}</td>
      <td class="num">${idr(e.amount)}</td>
    </tr>`
    )
    .join("");
  // Trial balance
  interface TB {
    code: string;
    name: string;
    category: CoaCategory;
    debit: number;
    credit: number;
    balance: number;
  }
  const rows: Record<string, TB> = {};
  for (const a of data.accounts) {
    if (a.parent_code === null) continue;
    rows[a.code] = {
      code: a.code,
      name: a.name,
      category: a.category,
      debit: 0,
      credit: 0,
      balance: 0
    };
  }
  for (const e of data.entries) {
    const amt = Number(e.amount ?? 0);
    if (e.debit_account && rows[e.debit_account])
      rows[e.debit_account].debit += amt;
    if (e.credit_account && rows[e.credit_account])
      rows[e.credit_account].credit += amt;
  }
  for (const r of Object.values(rows)) {
    r.balance =
      r.category === "asset" || r.category === "expense"
        ? r.debit - r.credit
        : r.credit - r.debit;
  }
  const tbRows = Object.values(rows)
    .map(
      (r) => `<tr>
      <td>${escHtml(r.code)}</td>
      <td>${escHtml(r.name)}</td>
      <td>${escHtml(r.category)}</td>
      <td class="num">${r.debit > 0 ? idr(r.debit) : "—"}</td>
      <td class="num">${r.credit > 0 ? idr(r.credit) : "—"}</td>
      <td class="num"><strong>${idr(r.balance)}</strong></td>
    </tr>`
    )
    .join("");
  const body = `
    <h2>Jurnal Umum (General Ledger)</h2>
    <table>
      <thead>
        <tr><th>Tanggal</th><th>Keterangan</th><th>Debit</th><th>Credit</th><th class="num">Jumlah</th></tr>
      </thead>
      <tbody>${entryRows || `<tr><td colspan="5" style="text-align:center">Tidak ada jurnal.</td></tr>`}</tbody>
    </table>
    <h2>Neraca Percobaan (Trial Balance)</h2>
    <table>
      <thead>
        <tr>
          <th>Code</th><th>Akun</th><th>Kategori</th>
          <th class="num">Debit</th><th class="num">Credit</th><th class="num">Saldo</th>
        </tr>
      </thead>
      <tbody>${tbRows || `<tr><td colspan="6" style="text-align:center">Belum ada akun.</td></tr>`}</tbody>
    </table>
    <div class="sig-area">
      <div class="sig-box">Pengawas Keuangan</div>
      <div class="sig-box">Kepala SPPG</div>
    </div>`;
  return htmlShell(
    "Lampiran 30e — Buku Besar + Neraca",
    body,
    `Periode: ${from} s/d ${to} · ${data.entries.length} jurnal · ${data.accounts.length} akun`
  );
}

function renderLamp20Html(from: string, to: string): string {
  // Lampiran 20 = delivery receipt template (per-delivery). Here we show
  // a blank template for the period; actual recipients are signed at delivery.
  const body = `
    <h2>Tanda Terima Bantuan MBG (Template)</h2>
    <p style="font-size:11px;color:#1b1e24">Form ini diisi saat serah-terima makanan ke sekolah.</p>
    <table>
      <tbody>
        <tr><td style="width:30%"><strong>Tanggal Pengiriman</strong></td><td>___________________</td></tr>
        <tr><td><strong>Nomor PO / Rit</strong></td><td>___________________</td></tr>
        <tr><td><strong>Sekolah / Penerima</strong></td><td>___________________</td></tr>
        <tr><td><strong>Menu Tanggal</strong></td><td>___________________</td></tr>
        <tr><td><strong>Jumlah Porsi</strong></td><td>___________________</td></tr>
        <tr><td><strong>Kondisi Pengemasan</strong></td><td>[ ] Baik  [ ] Rusak</td></tr>
        <tr><td><strong>Suhu / Organoleptik</strong></td><td>___________________</td></tr>
        <tr><td><strong>Catatan</strong></td><td>___________________</td></tr>
      </tbody>
    </table>
    <div class="sig-area">
      <div class="sig-box">Pengantar (SPPG)</div>
      <div class="sig-box">Penerima (PIC Sekolah)</div>
      <div class="sig-box">Saksi</div>
    </div>`;
  return htmlShell(
    "Lampiran 20 — Tanda Terima Bantuan MBG",
    body,
    `Template · Periode acuan: ${from} s/d ${to}`
  );
}

function renderLamp28cHtml(
  data: Awaited<ReturnType<typeof loadGaji>>,
  from: string,
  to: string
): string {
  const rows = data.staff
    .map(
      (s) => `<tr>
      <td class="num">${escHtml(s.seq_no)}</td>
      <td>${escHtml(s.full_name)}</td>
      <td>${escHtml(sppgRoleLabel(s.role, "ID"))}</td>
      <td>__ H __ S __ I __ A __ OFF</td>
      <td>______</td>
    </tr>`
    )
    .join("");
  const body = `
    <h2>Log Absensi Harian (Template Periode)</h2>
    <p style="font-size:11px;color:#1b1e24">Kode: H=Hadir, S=Sakit, I=Izin, A=Alpa, OFF=Libur.</p>
    <table>
      <thead>
        <tr><th class="num">#</th><th>Nama</th><th>Posisi</th><th>Rekap</th><th>Ttd</th></tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="5" style="text-align:center">Belum ada staff.</td></tr>`}</tbody>
    </table>
    <div class="sig-area">
      <div class="sig-box">Asisten Lapangan</div>
      <div class="sig-box">Pengawas Keuangan</div>
      <div class="sig-box">Kepala SPPG</div>
    </div>`;
  return htmlShell(
    "Lampiran 28c — Log Absensi Harian",
    body,
    `Periode: ${from} s/d ${to} · ${data.staff.length} staff`
  );
}

/* -------------------------------------------------------------------------- */
/*                               Styled builders                              */
/* -------------------------------------------------------------------------- */

function buildSampelSheets(
  data: Awaited<ReturnType<typeof loadSampel>>,
  from: string,
  to: string
): StyledSheet[] {
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const schMap = Object.fromEntries(data.schools.map((s) => [s.id, s]));
  const rows = data.logs.map((l) => {
    const off = l.officer_id ? staffMap[l.officer_id] : undefined;
    const sch = l.school_id ? schMap[l.school_id] : undefined;
    return {
      date: l.delivery_date,
      seq: l.delivery_seq,
      school: sch?.name ?? "",
      menu: l.menu_assign_date ?? "",
      officer: off?.full_name ?? "",
      kept: l.sample_kept ? "YA" : "TIDAK",
      notes: l.notes ?? ""
    };
  });
  return [
    infoSheet("Lampiran 30a — Log Sampel Makanan", from, to, [
      ["Total Log", data.logs.length]
    ]),
    {
      name: "Sampel",
      title: `LOG SAMPEL MAKANAN · ${from} s/d ${to}`,
      subtitle: "Lampiran 30a · SK Ka BGN 401.1/2025",
      columns: [
        { key: "date", header: "Tanggal", width: 12, align: "center" },
        { key: "seq", header: "Seq", width: 6, align: "center", hint: "number" },
        { key: "school", header: "Sekolah", width: 28, align: "left" },
        { key: "menu", header: "Tgl Menu", width: 12, align: "center" },
        { key: "officer", header: "Petugas", width: 22, align: "left" },
        { key: "kept", header: "Sampel Disimpan", width: 16, align: "center" },
        { key: "notes", header: "Catatan", width: 40, align: "left" }
      ],
      rows,
      cellHint: (r, k) => {
        if (k !== "kept") return undefined;
        return r.kept === "YA" ? "status-ok" : "status-bad";
      },
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildOrganoleptikSheets(
  data: Awaited<ReturnType<typeof loadOrganoleptik>>,
  from: string,
  to: string
): StyledSheet[] {
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const schMap = Object.fromEntries(data.schools.map((s) => [s.id, s]));
  const rows = data.tests.map((t) => {
    const off = t.officer_id ? staffMap[t.officer_id] : undefined;
    const sch = t.school_id ? schMap[t.school_id] : undefined;
    return {
      date: t.test_date,
      phase: t.test_phase,
      school: sch?.name ?? "",
      rasa: t.rasa ?? "",
      warna: t.warna ?? "",
      aroma: t.aroma ?? "",
      tekstur: t.tekstur ?? "",
      verdict: t.verdict,
      officer: off?.full_name ?? "",
      notes: t.notes ?? ""
    };
  });
  return [
    infoSheet("Lampiran 26 — Uji Organoleptik", from, to, [
      ["Total Uji", data.tests.length]
    ]),
    {
      name: "Organoleptik",
      title: `UJI ORGANOLEPTIK · ${from} s/d ${to}`,
      subtitle:
        "Skala 1–5: 5=Sangat baik, 1=Sangat buruk · 'aman' = layak konsumsi",
      columns: [
        { key: "date", header: "Tanggal", width: 12, align: "center" },
        { key: "phase", header: "Fase", width: 18, align: "center" },
        { key: "school", header: "Sekolah", width: 28, align: "left" },
        { key: "rasa", header: "Rasa", width: 7, align: "center", hint: "number" },
        { key: "warna", header: "Warna", width: 7, align: "center", hint: "number" },
        { key: "aroma", header: "Aroma", width: 7, align: "center", hint: "number" },
        { key: "tekstur", header: "Tekstur", width: 8, align: "center", hint: "number" },
        { key: "verdict", header: "Verdict", width: 10, align: "center" },
        { key: "officer", header: "Petugas", width: 22, align: "left" },
        { key: "notes", header: "Catatan", width: 30, align: "left" }
      ],
      rows,
      cellHint: (r, k) => {
        if (k !== "verdict") return undefined;
        return r.verdict === "aman" ? "status-ok" : "status-bad";
      },
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildTimSheets(
  data: Awaited<ReturnType<typeof loadTim>>,
  from: string,
  to: string
): StyledSheet[] {
  const total = data.staff.reduce((s, r) => s + Number(r.gaji_pokok ?? 0), 0);
  const rows = data.staff.map((s) => ({
    seq: s.seq_no ?? "",
    name: s.full_name,
    role: sppgRoleLabel(s.role, "ID"),
    nik: s.nik ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    bank: s.bank_name ?? "",
    account: s.bank_account ?? "",
    gaji: Number(s.gaji_pokok)
  }));
  return [
    infoSheet("Lampiran 27 — Daftar Tim SPPG", from, to, [
      ["Total Staff Aktif", data.staff.length],
      ["Total Gaji Pokok", idr(total)]
    ]),
    {
      name: "Staff",
      title: "DAFTAR TIM SPPG AKTIF",
      subtitle: "Lampiran 27 · Struktur + gaji pokok",
      columns: [
        { key: "seq", header: "#", width: 5, align: "center", hint: "number" },
        { key: "name", header: "Nama Lengkap", width: 28, align: "left" },
        { key: "role", header: "Posisi", width: 22, align: "left" },
        { key: "nik", header: "NIK", width: 18, align: "left" },
        { key: "phone", header: "HP", width: 14, align: "left" },
        { key: "email", header: "Email", width: 24, align: "left" },
        { key: "bank", header: "Bank", width: 12, align: "left" },
        { key: "account", header: "No. Rekening", width: 18, align: "left" },
        {
          key: "gaji",
          header: "Gaji Pokok",
          width: 16,
          align: "right",
          hint: "money",
          numFmt: '"Rp "#,##0'
        }
      ],
      rows,
      totals: {
        labelColSpan: 8,
        labelText: "TOTAL GAJI POKOK",
        values: { gaji: total }
      },
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildGajiSheets(
  data: Awaited<ReturnType<typeof loadGaji>>,
  from: string,
  to: string
): StyledSheet[] {
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const totalNet = data.slips.reduce(
    (s, r) => s + Number(r.penerimaan_bersih ?? 0),
    0
  );
  const totalGross = data.slips.reduce(
    (s, r) => s + Number(r.penerimaan_kotor ?? 0),
    0
  );
  const rows = data.slips.map((sl) => {
    const st = sl.staff_id ? staffMap[sl.staff_id] : undefined;
    return {
      staff: st?.full_name ?? "",
      role: st ? sppgRoleLabel(st.role, "ID") : "",
      pokok: Number(sl.gaji_pokok),
      hari: sl.hari_kerja,
      tunjangan: Number(sl.tunjangan),
      insentifH: Number(sl.insentif_kehadiran),
      insentifK: Number(sl.insentif_kinerja),
      lain: Number(sl.lain_lain),
      lemburJam: Number(sl.lembur_jam),
      lembur: Number(sl.total_lembur),
      potKeh: Number(sl.potongan_kehadiran),
      bpjsKes: Number(sl.potongan_bpjs_kes),
      bpjsTk: Number(sl.potongan_bpjs_tk),
      potLain: Number(sl.potongan_lain),
      kotor: Number(sl.penerimaan_kotor),
      bersih: Number(sl.penerimaan_bersih),
      status: sl.paid ? "Terbayar" : "Pending"
    };
  });
  const money = { hint: "money" as const, numFmt: '"Rp "#,##0' };
  return [
    infoSheet("Lampiran 28 — Slip Gaji", from, to, [
      ["Periode", data.period?.period_label ?? "—"],
      ["Total Slip", data.slips.length],
      ["Total Penerimaan Kotor", idr(totalGross)],
      ["Total Penerimaan Bersih", idr(totalNet)]
    ]),
    {
      name: "Slip",
      title: `SLIP GAJI · ${data.period?.period_label ?? from + " s/d " + to}`,
      subtitle: "Lampiran 28 · Rekap gaji staff SPPG",
      columns: [
        { key: "staff", header: "Staff", width: 24, align: "left" },
        { key: "role", header: "Posisi", width: 20, align: "left" },
        { key: "pokok", header: "Gaji Pokok", width: 14, align: "right", ...money },
        { key: "hari", header: "Hari Kerja", width: 10, align: "center", hint: "number" },
        { key: "tunjangan", header: "Tunjangan", width: 14, align: "right", ...money },
        { key: "insentifH", header: "Insentif Kehadiran", width: 16, align: "right", ...money },
        { key: "insentifK", header: "Insentif Kinerja", width: 16, align: "right", ...money },
        { key: "lain", header: "Lain-lain", width: 14, align: "right", ...money },
        { key: "lemburJam", header: "Lembur (jam)", width: 12, align: "right", hint: "number", numFmt: "#,##0.0" },
        { key: "lembur", header: "Total Lembur", width: 14, align: "right", ...money },
        { key: "potKeh", header: "Pot. Kehadiran", width: 14, align: "right", ...money },
        { key: "bpjsKes", header: "BPJS Kes", width: 12, align: "right", ...money },
        { key: "bpjsTk", header: "BPJS TK", width: 12, align: "right", ...money },
        { key: "potLain", header: "Pot. Lain", width: 12, align: "right", ...money },
        { key: "kotor", header: "Bruto", width: 14, align: "right", hint: "bold", numFmt: '"Rp "#,##0' },
        { key: "bersih", header: "Bersih", width: 14, align: "right", hint: "bold", numFmt: '"Rp "#,##0' },
        { key: "status", header: "Status", width: 12, align: "center" }
      ],
      rows,
      cellHint: (r, k) => {
        if (k !== "status") return undefined;
        return r.status === "Terbayar" ? "status-ok" : "status-neutral";
      },
      totals: {
        labelColSpan: 14,
        labelText: "GRAND TOTAL",
        values: { kotor: totalGross, bersih: totalNet }
      },
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildInsentifKaderSheets(
  data: Awaited<ReturnType<typeof loadInsentifKader>>,
  from: string,
  to: string
): StyledSheet[] {
  const posMap: Record<string, Posyandu> = Object.fromEntries(
    data.posyanduList.map((p) => [p.id, p])
  );
  const staffMap: Record<string, SppgStaff> = Object.fromEntries(
    data.staff.map((s) => [s.id, s])
  );
  const total = data.kader.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
  const rows = data.kader.map((k: KaderIncentive) => {
    const py = k.posyandu_id ? posMap[k.posyandu_id] : undefined;
    const st = k.kader_staff_id ? staffMap[k.kader_staff_id] : undefined;
    return {
      start: k.period_start,
      end: k.period_end,
      posyandu: py?.name ?? "",
      kader: st?.full_name ?? "",
      senin: k.porsi_senin,
      kamis: k.porsi_kamis,
      unit: Number(k.unit_cost),
      total: Number(k.total_amount),
      status: k.paid ? "Terbayar" : "Pending"
    };
  });
  return [
    infoSheet("Lampiran 29a — Insentif Kader Posyandu", from, to, [
      ["Total Baris", data.kader.length],
      ["Grand Total", idr(total)]
    ]),
    {
      name: "Kader",
      title: `INSENTIF KADER POSYANDU · ${from} s/d ${to}`,
      subtitle: "Lampiran 29a · Senin + Kamis",
      columns: [
        { key: "start", header: "Periode Awal", width: 12, align: "center" },
        { key: "end", header: "Periode Akhir", width: 12, align: "center" },
        { key: "posyandu", header: "Posyandu", width: 24, align: "left" },
        { key: "kader", header: "Kader", width: 22, align: "left" },
        { key: "senin", header: "Porsi Senin", width: 12, align: "right", hint: "number" },
        { key: "kamis", header: "Porsi Kamis", width: 12, align: "right", hint: "number" },
        {
          key: "unit",
          header: "Unit Cost",
          width: 12,
          align: "right",
          hint: "money",
          numFmt: '"Rp "#,##0'
        },
        {
          key: "total",
          header: "Total",
          width: 14,
          align: "right",
          hint: "bold",
          numFmt: '"Rp "#,##0'
        },
        { key: "status", header: "Status", width: 12, align: "center" }
      ],
      rows,
      cellHint: (r, k) => {
        if (k !== "status") return undefined;
        return r.status === "Terbayar" ? "status-ok" : "status-neutral";
      },
      totals: {
        labelColSpan: 7,
        labelText: "GRAND TOTAL",
        values: { total }
      },
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildInsentifPicSheets(
  data: Awaited<ReturnType<typeof loadInsentifPic>>,
  from: string,
  to: string
): StyledSheet[] {
  const psMap: Record<string, PicSchool> = Object.fromEntries(
    data.picSchoolList.map((p) => [p.id, p])
  );
  const staffMap: Record<string, SppgStaff> = Object.fromEntries(
    data.staff.map((s) => [s.id, s])
  );
  const schMap: Record<string, { id: string; name: string }> =
    Object.fromEntries(data.schools.map((s) => [s.id, s]));
  const total = data.pic.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
  const rows = data.pic.map((r) => {
    const ps = r.pic_school_id ? psMap[r.pic_school_id] : undefined;
    const sch = ps?.school_id ? schMap[ps.school_id] : undefined;
    const picStaff = ps?.pic_staff_id ? staffMap[ps.pic_staff_id] : undefined;
    return {
      start: r.period_start,
      end: r.period_end,
      school: sch?.name ?? "",
      pic: picStaff?.full_name ?? "",
      porsi: r.total_porsi,
      unit: Number(r.unit_cost),
      total: Number(r.total_amount),
      status: r.paid ? "Terbayar" : "Pending"
    };
  });
  return [
    infoSheet("Lampiran 29b — Insentif PIC Sekolah", from, to, [
      ["Total Baris", data.pic.length],
      ["Grand Total", idr(total)]
    ]),
    {
      name: "PIC",
      title: `INSENTIF PIC SEKOLAH · ${from} s/d ${to}`,
      subtitle: "Lampiran 29b",
      columns: [
        { key: "start", header: "Periode Awal", width: 12, align: "center" },
        { key: "end", header: "Periode Akhir", width: 12, align: "center" },
        { key: "school", header: "Sekolah", width: 28, align: "left" },
        { key: "pic", header: "PIC", width: 22, align: "left" },
        { key: "porsi", header: "Total Porsi", width: 12, align: "right", hint: "number" },
        {
          key: "unit",
          header: "Unit Cost",
          width: 12,
          align: "right",
          hint: "money",
          numFmt: '"Rp "#,##0'
        },
        {
          key: "total",
          header: "Total",
          width: 14,
          align: "right",
          hint: "bold",
          numFmt: '"Rp "#,##0'
        },
        { key: "status", header: "Status", width: 12, align: "center" }
      ],
      rows,
      cellHint: (r, k) => {
        if (k !== "status") return undefined;
        return r.status === "Terbayar" ? "status-ok" : "status-neutral";
      },
      totals: {
        labelColSpan: 6,
        labelText: "GRAND TOTAL",
        values: { total }
      },
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildKasHarianSheets(
  data: Awaited<ReturnType<typeof loadKasHarian>>,
  from: string,
  to: string
): StyledSheet[] {
  const coaMap = Object.fromEntries(data.coa.map((a) => [a.code, a.name]));
  const totalMasuk = data.logs.reduce(
    (s, r) => s + Number(r.uang_masuk ?? 0),
    0
  );
  const totalKeluar = data.logs.reduce(
    (s, r) => s + Number(r.uang_keluar ?? 0),
    0
  );
  const rows = data.logs.map((l) => ({
    date: l.log_date,
    time: l.log_time ?? "",
    category: l.category ?? "",
    account: l.category ? coaMap[l.category] ?? "" : "",
    po: l.po_no ?? "",
    keterangan: l.keterangan ?? "",
    masuk: Number(l.uang_masuk),
    keluar: Number(l.uang_keluar),
    saldo: l.saldo_akhir != null ? Number(l.saldo_akhir) : ""
  }));
  const money = { hint: "money" as const, numFmt: '"Rp "#,##0' };
  return [
    infoSheet("Lampiran 30b — Kas Harian", from, to, [
      ["Total Masuk", idr(totalMasuk)],
      ["Total Keluar", idr(totalKeluar)],
      ["Saldo Bersih", idr(totalMasuk - totalKeluar)]
    ]),
    {
      name: "Kas",
      title: `KAS HARIAN · ${from} s/d ${to}`,
      subtitle: "Lampiran 30b · Arus masuk/keluar harian",
      columns: [
        { key: "date", header: "Tanggal", width: 12, align: "center" },
        { key: "time", header: "Waktu", width: 8, align: "center" },
        { key: "category", header: "Kategori", width: 10, align: "center" },
        { key: "account", header: "Nama Akun", width: 28, align: "left" },
        { key: "po", header: "PO", width: 14, align: "left" },
        { key: "keterangan", header: "Keterangan", width: 36, align: "left" },
        { key: "masuk", header: "Masuk", width: 14, align: "right", ...money },
        { key: "keluar", header: "Keluar", width: 14, align: "right", ...money },
        { key: "saldo", header: "Saldo", width: 14, align: "right", hint: "bold", numFmt: '"Rp "#,##0' }
      ],
      rows,
      cellHint: (r, k) => {
        if (k === "masuk" && Number(r.masuk) > 0) return "status-ok";
        if (k === "keluar" && Number(r.keluar) > 0) return "status-bad";
        return undefined;
      },
      totals: {
        labelColSpan: 6,
        labelText: "GRAND TOTAL",
        values: { masuk: totalMasuk, keluar: totalKeluar, saldo: totalMasuk - totalKeluar }
      },
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildPettyCashSheets(
  data: Awaited<ReturnType<typeof loadPettyCash>>,
  from: string,
  to: string
): StyledSheet[] {
  const totalMasuk = data.txs
    .filter((r) => r.direction === "masuk")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalKeluar = data.txs
    .filter((r) => r.direction === "keluar")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const rows = data.txs.map((r) => ({
    date: r.tx_date,
    time: r.tx_time ?? "",
    direction: r.direction,
    description: r.description ?? "",
    amount: Number(r.amount),
    balance: r.balance_after != null ? Number(r.balance_after) : ""
  }));
  return [
    infoSheet("Lampiran 30f — Kas Kecil", from, to, [
      ["Total Masuk", idr(totalMasuk)],
      ["Total Keluar", idr(totalKeluar)],
      ["Saldo Bersih", idr(totalMasuk - totalKeluar)]
    ]),
    {
      name: "Petty Cash",
      title: `KAS KECIL · ${from} s/d ${to}`,
      subtitle: "Lampiran 30f · Transaksi petty cash",
      columns: [
        { key: "date", header: "Tanggal", width: 12, align: "center" },
        { key: "time", header: "Waktu", width: 8, align: "center" },
        { key: "direction", header: "Arah", width: 10, align: "center" },
        { key: "description", header: "Keterangan", width: 42, align: "left" },
        {
          key: "amount",
          header: "Jumlah",
          width: 14,
          align: "right",
          hint: "money",
          numFmt: '"Rp "#,##0'
        },
        {
          key: "balance",
          header: "Saldo Setelah",
          width: 14,
          align: "right",
          hint: "bold",
          numFmt: '"Rp "#,##0'
        }
      ],
      rows,
      cellHint: (r, k) => {
        if (k !== "direction") return undefined;
        return r.direction === "masuk" ? "status-ok" : "status-bad";
      },
      totals: {
        labelColSpan: 4,
        labelText: "GRAND TOTAL",
        values: { amount: totalMasuk - totalKeluar, balance: "" }
      },
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildBukuBesarSheets(
  data: Awaited<ReturnType<typeof loadBukuBesar>>,
  from: string,
  to: string
): StyledSheet[] {
  const acctName = Object.fromEntries(
    data.accounts.map((a: ChartOfAccount) => [a.code, a.name])
  );

  // COA rows
  const coaRows = data.accounts.map((a) => ({
    code: a.code,
    name: a.name,
    category: a.category,
    parent: a.parent_code ?? "",
    active: a.active ? "Ya" : "Tidak",
    notes: a.notes ?? ""
  }));

  // GL rows + running total
  const glTotal = data.entries.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const glRows = data.entries.map((e) => ({
    date: e.entry_date,
    description: e.description ?? "",
    debitCode: e.debit_account ?? "",
    debitName: e.debit_account ? acctName[e.debit_account] ?? "" : "",
    creditCode: e.credit_account ?? "",
    creditName: e.credit_account ? acctName[e.credit_account] ?? "" : "",
    amount: Number(e.amount),
    source: e.source_type ?? ""
  }));

  // Trial balance
  interface TB {
    code: string;
    name: string;
    category: CoaCategory;
    debit: number;
    credit: number;
    balance: number;
  }
  const tbMap: Record<string, TB> = {};
  for (const a of data.accounts) {
    if (a.parent_code === null) continue;
    tbMap[a.code] = {
      code: a.code,
      name: a.name,
      category: a.category,
      debit: 0,
      credit: 0,
      balance: 0
    };
  }
  for (const e of data.entries) {
    const amt = Number(e.amount ?? 0);
    if (e.debit_account && tbMap[e.debit_account])
      tbMap[e.debit_account].debit += amt;
    if (e.credit_account && tbMap[e.credit_account])
      tbMap[e.credit_account].credit += amt;
  }
  for (const r of Object.values(tbMap)) {
    r.balance =
      r.category === "asset" || r.category === "expense"
        ? r.debit - r.credit
        : r.credit - r.debit;
  }
  const tbValues = Object.values(tbMap);
  const tbTotalDebit = tbValues.reduce((s, r) => s + r.debit, 0);
  const tbTotalCredit = tbValues.reduce((s, r) => s + r.credit, 0);
  const tbRows: Array<Record<string, unknown>> = tbValues.map((r) => ({
    code: r.code,
    name: r.name,
    category: r.category,
    debit: r.debit,
    credit: r.credit,
    balance: r.balance
  }));

  const money = { hint: "money" as const, numFmt: '"Rp "#,##0' };

  return [
    infoSheet("Lampiran 30e — Buku Besar + Neraca", from, to, [
      ["Jumlah Akun", data.accounts.length],
      ["Jumlah Jurnal", data.entries.length],
      ["Total Amount Jurnal", idr(glTotal)]
    ]),
    {
      name: "COA",
      title: "CHART OF ACCOUNTS",
      subtitle: "Bagan akun aktif SPPG",
      columns: [
        { key: "code", header: "Code", width: 10, align: "left" },
        { key: "name", header: "Akun", width: 28, align: "left" },
        { key: "category", header: "Kategori", width: 12, align: "center" },
        { key: "parent", header: "Parent", width: 10, align: "left" },
        { key: "active", header: "Aktif", width: 8, align: "center" },
        { key: "notes", header: "Catatan", width: 30, align: "left" }
      ],
      rows: coaRows,
      cellHint: (r, k) => {
        if (k !== "active") return undefined;
        return r.active === "Ya" ? "status-ok" : "status-bad";
      },
      zebra: true,
      freezeHeader: true
    },
    {
      name: "Jurnal",
      title: `JURNAL UMUM · ${from} s/d ${to}`,
      subtitle: "General ledger entries",
      columns: [
        { key: "date", header: "Tanggal", width: 12, align: "center" },
        { key: "description", header: "Keterangan", width: 36, align: "left" },
        { key: "debitCode", header: "Debit", width: 10, align: "left" },
        { key: "debitName", header: "Akun Debit", width: 22, align: "left" },
        { key: "creditCode", header: "Credit", width: 10, align: "left" },
        { key: "creditName", header: "Akun Credit", width: 22, align: "left" },
        { key: "amount", header: "Jumlah", width: 14, align: "right", ...money },
        { key: "source", header: "Sumber", width: 12, align: "center" }
      ],
      rows: glRows,
      totals: {
        labelColSpan: 6,
        labelText: "GRAND TOTAL",
        values: { amount: glTotal }
      },
      zebra: true,
      freezeHeader: true
    },
    {
      name: "Neraca",
      title: "TRIAL BALANCE · NERACA PERCOBAAN",
      subtitle: "Saldo per akun dari seluruh jurnal periode",
      columns: [
        { key: "code", header: "Code", width: 10, align: "left" },
        { key: "name", header: "Akun", width: 28, align: "left" },
        { key: "category", header: "Kategori", width: 12, align: "center" },
        { key: "debit", header: "Debit", width: 14, align: "right", ...money },
        { key: "credit", header: "Credit", width: 14, align: "right", ...money },
        {
          key: "balance",
          header: "Saldo",
          width: 14,
          align: "right",
          hint: "bold",
          numFmt: '"Rp "#,##0'
        }
      ],
      rows: tbRows,
      totals: {
        labelColSpan: 3,
        labelText: "GRAND TOTAL",
        values: {
          debit: tbTotalDebit,
          credit: tbTotalCredit,
          balance: tbTotalDebit - tbTotalCredit
        }
      },
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildLamp28cSheets(
  data: Awaited<ReturnType<typeof loadGaji>>,
  from: string,
  to: string
): StyledSheet[] {
  const rows = data.staff.map((s) => ({
    seq: s.seq_no ?? "",
    name: s.full_name,
    role: sppgRoleLabel(s.role, "ID"),
    hadir: "",
    sakit: "",
    izin: "",
    alpa: "",
    off: "",
    lembur: ""
  }));
  return [
    infoSheet("Lampiran 28c — Log Absensi Harian", from, to, [
      ["Periode", data.period?.period_label ?? "—"],
      ["Jumlah Staff", data.staff.length],
      ["Kode", "H=Hadir, S=Sakit, I=Izin, A=Alpa, OFF=Libur"]
    ]),
    {
      name: "Absensi",
      title: `LOG ABSENSI HARIAN · ${from} s/d ${to}`,
      subtitle: "Lampiran 28c · Template rekap absensi periode",
      columns: [
        { key: "seq", header: "#", width: 5, align: "center", hint: "number" },
        { key: "name", header: "Nama", width: 28, align: "left" },
        { key: "role", header: "Posisi", width: 22, align: "left" },
        { key: "hadir", header: "Hadir", width: 7, align: "center" },
        { key: "sakit", header: "Sakit", width: 7, align: "center" },
        { key: "izin", header: "Izin", width: 7, align: "center" },
        { key: "alpa", header: "Alpa", width: 7, align: "center" },
        { key: "off", header: "Off", width: 7, align: "center" },
        { key: "lembur", header: "Lembur (jam)", width: 12, align: "center" }
      ],
      rows,
      zebra: true,
      freezeHeader: true
    }
  ];
}

function buildLamp20Sheets(from: string, to: string): StyledSheet[] {
  const emptyRow = {
    date: "",
    po: "",
    school: "",
    menu: "",
    porsi: "",
    condition: "",
    notes: "",
    sigSender: "",
    sigReceiver: ""
  };
  const rows = Array.from({ length: 20 }, () => ({ ...emptyRow }));
  return [
    infoSheet("Lampiran 20 — Tanda Terima Bantuan MBG", from, to, [
      ["Jenis", "Template serah-terima per pengiriman"],
      ["Instruksi", "Diisi saat serah-terima makanan ke sekolah"]
    ]),
    {
      name: "Tanda Terima",
      title: `TANDA TERIMA BANTUAN MBG · ${from} s/d ${to}`,
      subtitle: "Lampiran 20 · Template per-pengiriman",
      columns: [
        { key: "date", header: "Tanggal", width: 12, align: "center" },
        { key: "po", header: "PO / Rit", width: 14, align: "left" },
        { key: "school", header: "Sekolah", width: 24, align: "left" },
        { key: "menu", header: "Menu Tgl", width: 12, align: "center" },
        { key: "porsi", header: "Porsi", width: 8, align: "right" },
        { key: "condition", header: "Kondisi", width: 12, align: "center" },
        { key: "notes", header: "Catatan", width: 30, align: "left" },
        { key: "sigSender", header: "TTD Pengantar", width: 16, align: "center" },
        { key: "sigReceiver", header: "TTD Penerima", width: 16, align: "center" }
      ],
      rows,
      zebra: true,
      freezeHeader: true,
      notes: [
        "Instruksi pengisian:",
        "1. Tanggal = tanggal pengiriman aktual.",
        "2. Kondisi = Baik / Rusak (coret salah satu).",
        "3. Tanda tangan dibubuhkan di kolom TTD saat serah-terima."
      ]
    }
  ];
}

/* -------------------------------------------------------------------------- */
/*                                 GET handler                                */
/* -------------------------------------------------------------------------- */

export async function GET(req: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (
    !["admin", "operator", "viewer", "ahli_gizi"].includes(profile.role)
  ) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const lampiran = url.searchParams.get("lampiran") as LampiranCode | null;
  const format = (url.searchParams.get("format") as Format | null) ?? "pdf";
  const from = url.searchParams.get("from") ?? firstOfMonthIso();
  const to = url.searchParams.get("to") ?? todayIso();

  if (!lampiran || !VALID_LAMPIRAN.includes(lampiran)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_lampiran",
        hint: `Use one of: ${VALID_LAMPIRAN.join(", ")}`
      },
      { status: 400 }
    );
  }
  if (format !== "pdf" && format !== "xlsx") {
    return NextResponse.json(
      { ok: false, error: "invalid_format", hint: "Use pdf | xlsx" },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const ctx: Ctx = { supabase, from, to };

  try {
    let html: string | null = null;
    let sheets: StyledSheet[] | null = null;

    switch (lampiran) {
      case "20": {
        if (format === "pdf") html = renderLamp20Html(from, to);
        else sheets = buildLamp20Sheets(from, to);
        break;
      }
      case "26": {
        const d = await loadOrganoleptik(ctx);
        if (format === "pdf") html = renderOrganoleptikHtml(d, from, to);
        else sheets = buildOrganoleptikSheets(d, from, to);
        break;
      }
      case "27": {
        const d = await loadTim(ctx);
        if (format === "pdf") html = renderTimHtml(d);
        else sheets = buildTimSheets(d, from, to);
        break;
      }
      case "28": {
        const d = await loadGaji(ctx);
        if (format === "pdf") html = renderGajiHtml(d);
        else sheets = buildGajiSheets(d, from, to);
        break;
      }
      case "28c": {
        const d = await loadGaji(ctx);
        if (format === "pdf") html = renderLamp28cHtml(d, from, to);
        else sheets = buildLamp28cSheets(d, from, to);
        break;
      }
      case "29a": {
        const d = await loadInsentifKader(ctx);
        if (format === "pdf") html = renderInsentifKaderHtml(d, from, to);
        else sheets = buildInsentifKaderSheets(d, from, to);
        break;
      }
      case "29b": {
        const d = await loadInsentifPic(ctx);
        if (format === "pdf") html = renderInsentifPicHtml(d, from, to);
        else sheets = buildInsentifPicSheets(d, from, to);
        break;
      }
      case "30a": {
        const d = await loadSampel(ctx);
        if (format === "pdf") html = renderSampelHtml(d, from, to);
        else sheets = buildSampelSheets(d, from, to);
        break;
      }
      case "30b": {
        const d = await loadKasHarian(ctx);
        if (format === "pdf") html = renderKasHarianHtml(d, from, to);
        else sheets = buildKasHarianSheets(d, from, to);
        break;
      }
      case "30e": {
        const d = await loadBukuBesar(ctx);
        if (format === "pdf") html = renderBukuBesarHtml(d, from, to);
        else sheets = buildBukuBesarSheets(d, from, to);
        break;
      }
      case "30f": {
        const d = await loadPettyCash(ctx);
        if (format === "pdf") html = renderPettyCashHtml(d, from, to);
        else sheets = buildPettyCashSheets(d, from, to);
        break;
      }
    }

    const filename = `lampiran-${lampiran}-${from}-${to}.${format === "pdf" ? "html" : "xlsx"}`;

    let xlsxBuffer: Buffer | null = null;
    if (format === "xlsx" && sheets) {
      xlsxBuffer = await buildStyledXlsxBuffer({
        fileName: `lampiran-${lampiran}-${from}-${to}`,
        sheets
      });
    }

    // Log generation (best-effort — don't fail the response if log fails)
    const sizeBytes =
      format === "pdf"
        ? new TextEncoder().encode(html ?? "").byteLength
        : xlsxBuffer
          ? xlsxBuffer.byteLength
          : 0;
    void listBgnGenerationLog;
    try {
      await insertBgnGenerationLog(supabase, {
        lampiran_code: lampiran,
        format,
        period_start: from,
        period_end: to,
        scope_school_id: null,
        generated_by: profile.id,
        file_url: null,
        file_size_bytes: sizeBytes
      });
    } catch {
      // log tabel belum di-apply — skip silently
    }

    if (format === "pdf" && html) {
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": "no-store"
        }
      });
    }
    if (format === "xlsx" && xlsxBuffer) {
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store"
        }
      });
    }

    return NextResponse.json(
      { ok: false, error: "render_failed" },
      { status: 500 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: "generation_failed",
        detail: msg,
        hint:
          "Pastikan migrasi 0050/0051 sudah di-apply + seed 0050 sudah dijalankan. Lihat LAMPIRAN_TITLE untuk kode valid.",
        valid: Object.entries(LAMPIRAN_TITLE).map(([k, v]) => `${k}: ${v}`)
      },
      { status: 500 }
    );
  }
}
