/**
 * Demo data injector untuk DashboardAnalytics.
 * Aktif hanya jika `?demo=1` di URL — production data tetap otoritatif.
 *
 * Semua generator deterministik (tidak pakai Math.random) supaya
 * SSR/CSR konsisten dan screenshot stabil.
 */

import type {
  BeneficiaryDay,
  BudgetSnapshot,
  CashflowPoint,
  CommodityInput,
  CostPerPortionPoint,
  SchoolBreakdownInput,
  StockGapInput,
  SupplierSpendInput
} from "@/components/dashboard-analytics";
import type { UpcomingShortage } from "@/lib/engine";

/* ---------------- helpers ---------------- */

function periodKey(y: number, mZero: number): string {
  const m = ((mZero % 12) + 12) % 12;
  const yy = y + Math.floor(mZero / 12);
  return `${yy}-${String(m + 1).padStart(2, "0")}-01`;
}

function isoPlusDays(iso: string, delta: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function isWeekend(iso: string): boolean {
  const dow = new Date(iso + "T00:00:00").getDay();
  return dow === 0 || dow === 6;
}

/* ---------------- beneficiary ---------------- */

/**
 * Split total porsi → siswa/ibu/balita (74-80 / 12-16 / 6-10 %) deterministik.
 */
function splitBeneficiary(total: number, seed: number) {
  const jitter = (seed * 37) % 60; // 0..59
  const studentsPct = 0.74 + jitter / 1000; // 0.74..0.80
  const pregnantPct = 0.15 - (jitter % 30) / 1000; // 0.12..0.15
  const students = Math.round(total * studentsPct);
  const pregnant = Math.round(total * pregnantPct);
  const toddler = Math.max(0, total - students - pregnant);
  return { students, pregnant, toddler };
}

export function demoBeneficiary(rows: BeneficiaryDay[]): BeneficiaryDay[] {
  if (rows.length === 0) return rows; // jangan fabrikasi hari kosong
  return rows.map((r, i) => {
    const hasBreakdown = r.students + r.pregnant + r.toddler > 0;
    if (hasBreakdown && r.schools > 0) return r;
    const total = r.total > 0 ? r.total : 2_100 + ((i * 73) % 260);
    const split = hasBreakdown
      ? { students: r.students, pregnant: r.pregnant, toddler: r.toddler }
      : splitBeneficiary(total, i);
    const schools = r.schools > 0 ? r.schools : 10 + (i % 5);
    return {
      ...r,
      operasional: true,
      total,
      schools,
      ...split
    };
  });
}

/* ---------------- beneficiary today (per sekolah) ---------------- */

export function demoBeneficiaryToday(): SchoolBreakdownInput[] {
  return [
    { school_name: "SDN Sukarasa 01", level: "SD", qty: 342 },
    { school_name: "SDN Cimahi 02", level: "SD", qty: 298 },
    { school_name: "SDN Leuwigajah 04", level: "SD", qty: 276 },
    { school_name: "SMPN 3 Cimahi", level: "SMP", qty: 241 },
    { school_name: "SMPN 7 Cimahi", level: "SMP", qty: 218 },
    { school_name: "SDN Baros Indah", level: "SD", qty: 203 },
    { school_name: "SDN Melong Asih", level: "SD", qty: 187 },
    { school_name: "PAUD Melati Harapan", level: "PAUD", qty: 156 },
    { school_name: "TK Tunas Bangsa", level: "TK", qty: 128 },
    { school_name: "SDN Cibabat 01", level: "SD", qty: 112 }
  ];
}

/* ---------------- commodities ---------------- */

export function demoCommodities(): CommodityInput[] {
  return [
    { code: "Beras Premium", total_kg: 28_400 },
    { code: "Ayam Karkas", total_kg: 14_800 },
    { code: "Telur Ayam Ras", total_kg: 11_200 },
    { code: "Tahu Putih", total_kg: 8_600 },
    { code: "Tempe Segar", total_kg: 7_900 },
    { code: "Wortel Orange", total_kg: 6_400 },
    { code: "Bayam Hijau", total_kg: 5_800 },
    { code: "Kentang Granola", total_kg: 5_100 },
    { code: "Buah - Pisang Ambon", total_kg: 4_600 },
    { code: "Minyak Goreng Curah", total_kg: 3_900 }
  ];
}

/* ---------------- stock gaps (optional, jarang dipakai) ---------------- */

export function demoStockGaps(): StockGapInput[] {
  return [
    { item_code: "Beras Premium", required: 120.5, on_hand: 45.25, gap: 75.25, unit: "kg" },
    { item_code: "Ayam Karkas", required: 80, on_hand: 22.5, gap: 57.5, unit: "kg" },
    { item_code: "Telur Ayam Ras", required: 60, on_hand: 18.75, gap: 41.25, unit: "kg" },
    { item_code: "Tahu Putih", required: 45, on_hand: 12, gap: 33, unit: "kg" },
    { item_code: "Wortel Orange", required: 38.5, on_hand: 10.5, gap: 28, unit: "kg" }
  ];
}

/* ---------------- suppliers ---------------- */

export function demoSuppliers(): SupplierSpendInput[] {
  return [
    { supplier_name: "CV Sumber Rejeki Pangan", total_spend: 85_400_000, invoice_count: 12 },
    { supplier_name: "UD Tani Makmur", total_spend: 62_300_000, invoice_count: 9 },
    { supplier_name: "PT Mitra Boga Nusantara", total_spend: 48_700_000, invoice_count: 7 },
    { supplier_name: "Koperasi Tani Lestari", total_spend: 34_200_000, invoice_count: 6 },
    { supplier_name: "CV Segar Pratama", total_spend: 28_900_000, invoice_count: 5 },
    { supplier_name: "UD Berkah Pangan", total_spend: 21_400_000, invoice_count: 4 },
    { supplier_name: "PT Ayam Sehat Indonesia", total_spend: 18_600_000, invoice_count: 3 },
    { supplier_name: "CV Telur Jaya", total_spend: 12_300_000, invoice_count: 3 }
  ];
}

/* ---------------- cashflow (7 bulan mundur dari monthStart) ---------------- */

export function demoCashflow(monthStart: string): CashflowPoint[] {
  const [y, m] = monthStart.split("-").map(Number);
  const out: CashflowPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const period = periodKey(y, m - 1 - i);
    const step = 6 - i;
    const cash_in = 320_000_000 + step * 14_500_000 + ((step * 71) % 40) * 1_000_000;
    const cash_out = 285_000_000 + step * 11_200_000 + ((step * 53) % 35) * 900_000;
    out.push({ period, cash_in, cash_out, net: cash_in - cash_out });
  }
  return out;
}

/* ---------------- budget ---------------- */

export function demoBudget(
  monthStart: string,
  existing: BudgetSnapshot | null
): BudgetSnapshot {
  const period = existing?.period ?? monthStart;
  const spent_po = existing?.spent_po && existing.spent_po > 0 ? existing.spent_po : 247_500_000;
  const spent_invoice =
    existing?.spent_invoice && existing.spent_invoice > 0 ? existing.spent_invoice : 181_600_000;
  const spent_paid =
    existing?.spent_paid && existing.spent_paid > 0 ? existing.spent_paid : 142_800_000;
  const budget_total =
    existing?.budget_total && existing.budget_total > 0
      ? existing.budget_total
      : Math.max(500_000_000, Math.ceil(spent_po * 1.6 / 50_000_000) * 50_000_000);
  return { period, budget_total, spent_po, spent_invoice, spent_paid };
}

/* ---------------- upcoming shortages (14 hari ke depan) ---------------- */

/**
 * Dummy forecast shortage 14 hari. Hanya generate ~6 tanggal supaya tidak
 * terasa "tiap hari bermasalah" — realistis: cluster di pertengahan horizon.
 */
export function demoUpcomingShortages(today: string): UpcomingShortage[] {
  const offsets = [2, 4, 5, 7, 9, 11, 13];
  const seeds = [3, 5, 4, 6, 7, 5, 8];
  const gaps = [48.5, 72.25, 31.0, 95.75, 54.5, 41.25, 118.0];
  return offsets
    .map((off, i) => {
      const iso = isoPlusDays(today, off);
      if (isWeekend(iso)) return null;
      return {
        op_date: iso,
        short_items: seeds[i],
        total_gap_kg: gaps[i]
      } as UpcomingShortage;
    })
    .filter((x): x is UpcomingShortage => x !== null)
    .slice(0, 6);
}

/* ---------------- cost per portion (14 hari mundur, skip weekend) ---------------- */

export function demoCostPerPortion(today: string): CostPerPortionPoint[] {
  const out: CostPerPortionPoint[] = [];
  for (let i = 18; i >= 0; i--) {
    const iso = isoPlusDays(today, -i);
    if (isWeekend(iso)) continue;
    const seed = i;
    const cost = 14_100 + ((seed * 317) % 1_600);
    out.push({ op_date: iso, cost_per_portion: cost, target: 15_000 });
    if (out.length >= 14) break;
  }
  return out;
}
