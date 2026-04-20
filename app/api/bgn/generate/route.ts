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
import * as XLSX from "xlsx";
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
  @page { size: A4; margin: 15mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0b0f14; font-size: 11px; line-height: 1.4; margin: 0; padding: 18px; background: #fafafa; }
  .page { max-width: 780px; margin: 0 auto; background: #fff; padding: 24px 28px; border: 1px solid #e2e3e6; }
  h1 { font-size: 14px; margin: 0 0 4px 0; letter-spacing: .02em; text-transform: uppercase; border-bottom: 2px solid #0b0f14; padding-bottom: 6px; }
  h2 { font-size: 12px; margin: 14px 0 6px 0; color: #1b1e24; }
  .meta { font-size: 10.5px; color: #4b525c; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10.5px; }
  th, td { border: 1px solid #b7bbc2; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #ecedef; font-weight: 700; text-transform: uppercase; font-size: 9.5px; letter-spacing: .04em; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: "SF Mono", Menlo, monospace; }
  .footer { margin-top: 22px; font-size: 10px; color: #4b525c; display: flex; justify-content: space-between; }
  .sig-area { margin-top: 28px; display: flex; gap: 36px; }
  .sig-box { flex: 1; border-top: 1px dashed #4b525c; padding-top: 4px; text-align: center; font-size: 10px; color: #1b1e24; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 9.5px; font-weight: 700; }
  .b-ok { background: #d1fae5; color: #065f46; }
  .b-bad { background: #fee2e2; color: #991b1b; }
  .b-warn { background: #fef3c7; color: #92400e; }
  .b-info { background: #dbeafe; color: #1e40af; }
  .no-print { margin-top: 18px; padding: 10px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; font-size: 11px; }
  .no-print button { padding: 6px 14px; font-weight: 700; cursor: pointer; background: #0b0f14; color: #fff; border: 0; border-radius: 6px; }
  @media print {
    .no-print { display: none; }
    body { background: #fff; padding: 0; }
    .page { border: 0; padding: 0; }
  }
</style>
</head>
<body>
<div class="no-print">
  <strong>📄 Dokumen siap cetak.</strong> Klik tombol <button onclick="window.print()">Print / Save as PDF</button> untuk mengekspor ke PDF.
</div>
<div class="page">
  <h1>${escHtml(title)}</h1>
  <div class="meta">${meta}</div>
  ${bodyInner}
  <div class="footer">
    <div>SPPG Nunumeu, Soe — Timor Tengah Selatan, NTT</div>
    <div>SK Ka BGN 401.1/2025</div>
  </div>
</div>
</body>
</html>`;
}

function xlsxResponse(
  wb: XLSX.WorkBook,
  filename: string
): { body: Blob; size: number } {
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const u8 = new Uint8Array(buf as ArrayBuffer);
  const blob = new Blob([u8], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  void filename;
  return { body: blob, size: u8.byteLength };
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
/*                                XLSX builders                               */
/* -------------------------------------------------------------------------- */

function coverSheet(title: string, from: string, to: string, extra: Array<[string, string]> = []): XLSX.WorkSheet {
  const cover: (string | number)[][] = [
    [title.toUpperCase()],
    [],
    ["Periode Awal", from],
    ["Periode Akhir", to],
    ["Digenerate", new Date().toISOString().slice(0, 19).replace("T", " ")],
    ["Lokasi", "SPPG Nunumeu, Soe — Timor Tengah Selatan, NTT"],
    ["Kepatuhan", "SK Ka BGN 401.1/2025"],
    []
  ];
  extra.forEach(([k, v]) => cover.push([k, v]));
  const ws = XLSX.utils.aoa_to_sheet(cover);
  ws["!cols"] = [{ wch: 24 }, { wch: 60 }];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  return ws;
}

function buildSampelXlsx(
  data: Awaited<ReturnType<typeof loadSampel>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const schMap = Object.fromEntries(data.schools.map((s) => [s.id, s]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 30a — Log Sampel Makanan", from, to, [
      ["Total Log", String(data.logs.length)]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    [
      "Tanggal",
      "Seq",
      "Sekolah",
      "Tgl Menu",
      "Petugas",
      "Sampel Disimpan",
      "Catatan"
    ]
  ];
  data.logs.forEach((l) => {
    const off = l.officer_id ? staffMap[l.officer_id] : undefined;
    const sch = l.school_id ? schMap[l.school_id] : undefined;
    aoa.push([
      l.delivery_date,
      l.delivery_seq,
      sch?.name ?? "",
      l.menu_assign_date ?? "",
      off?.full_name ?? "",
      l.sample_kept ? "YA" : "TIDAK",
      l.notes ?? ""
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 6 },
    { wch: 28 },
    { wch: 12 },
    { wch: 22 },
    { wch: 10 },
    { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Sampel");
  return wb;
}

function buildOrganoleptikXlsx(
  data: Awaited<ReturnType<typeof loadOrganoleptik>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const schMap = Object.fromEntries(data.schools.map((s) => [s.id, s]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 26 — Uji Organoleptik", from, to, [
      ["Total Uji", String(data.tests.length)]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    [
      "Tanggal",
      "Fase",
      "Sekolah",
      "Rasa",
      "Warna",
      "Aroma",
      "Tekstur",
      "Verdict",
      "Petugas",
      "Catatan"
    ]
  ];
  data.tests.forEach((t: OrganolepticTest) => {
    const off = t.officer_id ? staffMap[t.officer_id] : undefined;
    const sch = t.school_id ? schMap[t.school_id] : undefined;
    aoa.push([
      t.test_date,
      t.test_phase,
      sch?.name ?? "",
      t.rasa ?? "",
      t.warna ?? "",
      t.aroma ?? "",
      t.tekstur ?? "",
      t.verdict,
      off?.full_name ?? "",
      t.notes ?? ""
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 28 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 8 },
    { wch: 10 },
    { wch: 22 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Organoleptik");
  return wb;
}

function buildTimXlsx(
  data: Awaited<ReturnType<typeof loadTim>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const total = data.staff.reduce(
    (s, r) => s + Number(r.gaji_pokok ?? 0),
    0
  );
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 27 — Daftar Tim SPPG", from, to, [
      ["Total Staff Aktif", String(data.staff.length)],
      ["Total Gaji Pokok", idr(total)]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    [
      "#",
      "Nama Lengkap",
      "Posisi",
      "NIK",
      "HP",
      "Email",
      "Bank",
      "No. Rekening",
      "Gaji Pokok"
    ]
  ];
  data.staff.forEach((s: SppgStaff) => {
    aoa.push([
      s.seq_no ?? "",
      s.full_name,
      sppgRoleLabel(s.role, "ID"),
      s.nik ?? "",
      s.phone ?? "",
      s.email ?? "",
      s.bank_name ?? "",
      s.bank_account ?? "",
      Number(s.gaji_pokok)
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 4 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Staff");
  return wb;
}

function buildGajiXlsx(
  data: Awaited<ReturnType<typeof loadGaji>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const wb = XLSX.utils.book_new();
  const totalNet = data.slips.reduce(
    (s, r) => s + Number(r.penerimaan_bersih ?? 0),
    0
  );
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 28 — Slip Gaji", from, to, [
      ["Periode", data.period?.period_label ?? "—"],
      ["Total Slip", String(data.slips.length)],
      ["Total Penerimaan Bersih", idr(totalNet)]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    [
      "Staff",
      "Posisi",
      "Gaji Pokok",
      "Hari Kerja",
      "Tunjangan",
      "Insentif Kehadiran",
      "Insentif Kinerja",
      "Lain-lain",
      "Lembur (jam)",
      "Total Lembur",
      "Potongan Kehadiran",
      "BPJS Kes",
      "BPJS TK",
      "Potongan Lain",
      "Penerimaan Kotor",
      "Penerimaan Bersih",
      "Status"
    ]
  ];
  data.slips.forEach((sl: PayrollSlip) => {
    const st = sl.staff_id ? staffMap[sl.staff_id] : undefined;
    aoa.push([
      st?.full_name ?? "",
      st ? sppgRoleLabel(st.role, "ID") : "",
      Number(sl.gaji_pokok),
      sl.hari_kerja,
      Number(sl.tunjangan),
      Number(sl.insentif_kehadiran),
      Number(sl.insentif_kinerja),
      Number(sl.lain_lain),
      Number(sl.lembur_jam),
      Number(sl.total_lembur),
      Number(sl.potongan_kehadiran),
      Number(sl.potongan_bpjs_kes),
      Number(sl.potongan_bpjs_tk),
      Number(sl.potongan_lain),
      Number(sl.penerimaan_kotor),
      Number(sl.penerimaan_bersih),
      sl.paid ? "Terbayar" : "Pending"
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 28 }, { wch: 22 }, ...Array(14).fill({ wch: 14 }), { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws, "Slip");
  return wb;
}

function buildInsentifKaderXlsx(
  data: Awaited<ReturnType<typeof loadInsentifKader>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const posMap = Object.fromEntries(
    data.posyanduList.map((p) => [p.id, p])
  );
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const wb = XLSX.utils.book_new();
  const total = data.kader.reduce(
    (s, r) => s + Number(r.total_amount ?? 0),
    0
  );
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 29a — Insentif Kader Posyandu", from, to, [
      ["Total Baris", String(data.kader.length)],
      ["Grand Total", idr(total)]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    [
      "Periode Awal",
      "Periode Akhir",
      "Posyandu",
      "Kader",
      "Porsi Senin",
      "Porsi Kamis",
      "Unit Cost",
      "Total",
      "Status"
    ]
  ];
  data.kader.forEach((k: KaderIncentive) => {
    const py = k.posyandu_id ? posMap[k.posyandu_id] : undefined;
    const st = k.kader_staff_id ? staffMap[k.kader_staff_id] : undefined;
    aoa.push([
      k.period_start,
      k.period_end,
      py?.name ?? "",
      st?.full_name ?? "",
      k.porsi_senin,
      k.porsi_kamis,
      Number(k.unit_cost),
      Number(k.total_amount),
      k.paid ? "Terbayar" : "Pending"
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Kader");
  return wb;
}

function buildInsentifPicXlsx(
  data: Awaited<ReturnType<typeof loadInsentifPic>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const psMap = Object.fromEntries(
    data.picSchoolList.map((p) => [p.id, p])
  );
  const staffMap = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const schMap = Object.fromEntries(data.schools.map((s) => [s.id, s]));
  const wb = XLSX.utils.book_new();
  const total = data.pic.reduce(
    (s, r) => s + Number(r.total_amount ?? 0),
    0
  );
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 29b — Insentif PIC Sekolah", from, to, [
      ["Total Baris", String(data.pic.length)],
      ["Grand Total", idr(total)]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    [
      "Periode Awal",
      "Periode Akhir",
      "Sekolah",
      "PIC",
      "Total Porsi",
      "Unit Cost",
      "Total",
      "Status"
    ]
  ];
  data.pic.forEach((r: PicIncentive) => {
    const ps = r.pic_school_id ? psMap[r.pic_school_id] : undefined;
    const sch = ps?.school_id ? schMap[ps.school_id] : undefined;
    const picStaff = ps?.pic_staff_id ? staffMap[ps.pic_staff_id] : undefined;
    aoa.push([
      r.period_start,
      r.period_end,
      sch?.name ?? "",
      picStaff?.full_name ?? "",
      r.total_porsi,
      Number(r.unit_cost),
      Number(r.total_amount),
      r.paid ? "Terbayar" : "Pending"
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 28 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "PIC");
  return wb;
}

function buildKasHarianXlsx(
  data: Awaited<ReturnType<typeof loadKasHarian>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const coaMap = Object.fromEntries(data.coa.map((a) => [a.code, a.name]));
  const wb = XLSX.utils.book_new();
  const totalMasuk = data.logs.reduce(
    (s, r) => s + Number(r.uang_masuk ?? 0),
    0
  );
  const totalKeluar = data.logs.reduce(
    (s, r) => s + Number(r.uang_keluar ?? 0),
    0
  );
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 30b — Kas Harian", from, to, [
      ["Total Masuk", idr(totalMasuk)],
      ["Total Keluar", idr(totalKeluar)],
      ["Saldo Bersih", idr(totalMasuk - totalKeluar)]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    [
      "Tanggal",
      "Waktu",
      "Kategori",
      "Nama Akun",
      "PO",
      "Keterangan",
      "Uang Masuk",
      "Uang Keluar",
      "Saldo Akhir"
    ]
  ];
  data.logs.forEach((l: DailyCashLog) => {
    aoa.push([
      l.log_date,
      l.log_time ?? "",
      l.category ?? "",
      l.category ? coaMap[l.category] ?? "" : "",
      l.po_no ?? "",
      l.keterangan ?? "",
      Number(l.uang_masuk),
      Number(l.uang_keluar),
      l.saldo_akhir != null ? Number(l.saldo_akhir) : ""
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 28 },
    { wch: 16 },
    { wch: 40 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Kas");
  return wb;
}

function buildPettyCashXlsx(
  data: Awaited<ReturnType<typeof loadPettyCash>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const totalMasuk = data.txs
    .filter((r) => r.direction === "masuk")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalKeluar = data.txs
    .filter((r) => r.direction === "keluar")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 30f — Kas Kecil", from, to, [
      ["Total Masuk", idr(totalMasuk)],
      ["Total Keluar", idr(totalKeluar)],
      ["Saldo Bersih", idr(totalMasuk - totalKeluar)]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    ["Tanggal", "Waktu", "Arah", "Keterangan", "Jumlah", "Saldo Setelah"]
  ];
  data.txs.forEach((r: PettyCash) => {
    aoa.push([
      r.tx_date,
      r.tx_time ?? "",
      r.direction,
      r.description ?? "",
      Number(r.amount),
      r.balance_after != null ? Number(r.balance_after) : ""
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 40 },
    { wch: 14 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Petty Cash");
  return wb;
}

function buildBukuBesarXlsx(
  data: Awaited<ReturnType<typeof loadBukuBesar>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const acctName = Object.fromEntries(
    data.accounts.map((a: ChartOfAccount) => [a.code, a.name])
  );
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 30e — Buku Besar + Neraca", from, to, [
      ["Jumlah Akun", String(data.accounts.length)],
      ["Jumlah Jurnal", String(data.entries.length)]
    ]),
    "Info"
  );

  // COA sheet
  const coaAoa: (string | number)[][] = [
    ["Code", "Akun", "Kategori", "Parent", "Aktif", "Catatan"]
  ];
  data.accounts.forEach((a: ChartOfAccount) => {
    coaAoa.push([
      a.code,
      a.name,
      a.category,
      a.parent_code ?? "",
      a.active ? "Ya" : "Tidak",
      a.notes ?? ""
    ]);
  });
  const wsCoa = XLSX.utils.aoa_to_sheet(coaAoa);
  wsCoa["!cols"] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 12 },
    { wch: 10 },
    { wch: 6 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCoa, "COA");

  // GL sheet
  const glAoa: (string | number)[][] = [
    [
      "Tanggal",
      "Keterangan",
      "Debit Code",
      "Debit Akun",
      "Credit Code",
      "Credit Akun",
      "Jumlah",
      "Sumber"
    ]
  ];
  data.entries.forEach((e: GlEntry) => {
    glAoa.push([
      e.entry_date,
      e.description ?? "",
      e.debit_account ?? "",
      e.debit_account ? acctName[e.debit_account] ?? "" : "",
      e.credit_account ?? "",
      e.credit_account ? acctName[e.credit_account] ?? "" : "",
      Number(e.amount),
      e.source_type ?? ""
    ]);
  });
  const wsGl = XLSX.utils.aoa_to_sheet(glAoa);
  wsGl["!cols"] = [
    { wch: 12 },
    { wch: 36 },
    { wch: 10 },
    { wch: 24 },
    { wch: 10 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsGl, "Jurnal");

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
  const tbAoa: (string | number)[][] = [
    ["Code", "Akun", "Kategori", "Debit", "Credit", "Saldo"]
  ];
  Object.values(rows).forEach((r) => {
    tbAoa.push([r.code, r.name, r.category, r.debit, r.credit, r.balance]);
  });
  const wsTb = XLSX.utils.aoa_to_sheet(tbAoa);
  wsTb["!cols"] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTb, "Neraca");

  return wb;
}

function buildLamp28cXlsx(
  data: Awaited<ReturnType<typeof loadGaji>>,
  from: string,
  to: string
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 28c — Log Absensi Harian", from, to, [
      ["Periode", data.period?.period_label ?? "—"],
      ["Jumlah Staff", String(data.staff.length)]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    ["#", "Nama", "Posisi", "Hadir", "Sakit", "Izin", "Alpa", "Off", "Lembur (jam)"]
  ];
  data.staff.forEach((s: SppgStaff) => {
    aoa.push([
      s.seq_no ?? "",
      s.full_name,
      sppgRoleLabel(s.role, "ID"),
      "",
      "",
      "",
      "",
      "",
      ""
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 4 },
    { wch: 28 },
    { wch: 22 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Absensi");
  return wb;
}

function buildLamp20Xlsx(from: string, to: string): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    coverSheet("Lampiran 20 — Tanda Terima Bantuan MBG", from, to, [
      ["Jenis", "Template serah-terima per pengiriman"]
    ]),
    "Info"
  );
  const aoa: (string | number)[][] = [
    [
      "Tanggal",
      "PO / Rit",
      "Sekolah",
      "Menu Tgl",
      "Porsi",
      "Kondisi",
      "Catatan",
      "TTD Pengantar",
      "TTD Penerima"
    ]
  ];
  for (let i = 0; i < 20; i++) aoa.push(["", "", "", "", "", "", "", "", ""]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 30 },
    { wch: 16 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Tanda Terima");
  return wb;
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
    let wb: XLSX.WorkBook | null = null;

    switch (lampiran) {
      case "20": {
        if (format === "pdf") html = renderLamp20Html(from, to);
        else wb = buildLamp20Xlsx(from, to);
        break;
      }
      case "26": {
        const d = await loadOrganoleptik(ctx);
        if (format === "pdf") html = renderOrganoleptikHtml(d, from, to);
        else wb = buildOrganoleptikXlsx(d, from, to);
        break;
      }
      case "27": {
        const d = await loadTim(ctx);
        if (format === "pdf") html = renderTimHtml(d);
        else wb = buildTimXlsx(d, from, to);
        break;
      }
      case "28": {
        const d = await loadGaji(ctx);
        if (format === "pdf") html = renderGajiHtml(d);
        else wb = buildGajiXlsx(d, from, to);
        break;
      }
      case "28c": {
        const d = await loadGaji(ctx);
        if (format === "pdf") html = renderLamp28cHtml(d, from, to);
        else wb = buildLamp28cXlsx(d, from, to);
        break;
      }
      case "29a": {
        const d = await loadInsentifKader(ctx);
        if (format === "pdf") html = renderInsentifKaderHtml(d, from, to);
        else wb = buildInsentifKaderXlsx(d, from, to);
        break;
      }
      case "29b": {
        const d = await loadInsentifPic(ctx);
        if (format === "pdf") html = renderInsentifPicHtml(d, from, to);
        else wb = buildInsentifPicXlsx(d, from, to);
        break;
      }
      case "30a": {
        const d = await loadSampel(ctx);
        if (format === "pdf") html = renderSampelHtml(d, from, to);
        else wb = buildSampelXlsx(d, from, to);
        break;
      }
      case "30b": {
        const d = await loadKasHarian(ctx);
        if (format === "pdf") html = renderKasHarianHtml(d, from, to);
        else wb = buildKasHarianXlsx(d, from, to);
        break;
      }
      case "30e": {
        const d = await loadBukuBesar(ctx);
        if (format === "pdf") html = renderBukuBesarHtml(d, from, to);
        else wb = buildBukuBesarXlsx(d, from, to);
        break;
      }
      case "30f": {
        const d = await loadPettyCash(ctx);
        if (format === "pdf") html = renderPettyCashHtml(d, from, to);
        else wb = buildPettyCashXlsx(d, from, to);
        break;
      }
    }

    // Log generation (best-effort — don't fail the response if log fails)
    const sizeBytes =
      format === "pdf"
        ? new TextEncoder().encode(html ?? "").byteLength
        : wb
          ? (() => {
              const b = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
              return (b as ArrayBuffer).byteLength;
            })()
          : 0;
    // touch audit log — retrieval of recent is free
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

    const filename = `lampiran-${lampiran}-${from}-${to}.${format === "pdf" ? "html" : "xlsx"}`;

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
    if (format === "xlsx" && wb) {
      const { body } = xlsxResponse(wb, filename);
      return new NextResponse(body, {
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
