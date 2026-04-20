"use client";

/**
 * DashboardAnalytics — section grafik di bawah dashboard utama.
 * 3 tab: Penerima Manfaat / Supply Chain / Keuangan.
 *
 * Client component karena tab state di-manage lokal (useState). Data
 * di-fetch di server (app/dashboard/page.tsx) lalu di-pass sebagai props.
 */

import { useMemo, useState } from "react";
import {
  StackedBarChart,
  LineChart,
  HBarChart,
  BulletBarChart,
  ChartFrame,
  ChartLegend
} from "@/components/mini-chart";
import { formatNumber, type Lang } from "@/lib/i18n";

/* ---------------- input types (keep rendered-ready, serializable) ---------------- */

export interface BeneficiaryDay {
  op_date: string;
  dateLabel: string;
  operasional: boolean;
  schools: number;
  students: number;
  pregnant: number;
  toddler: number;
  total: number;
}

export interface SchoolBreakdownInput {
  school_name: string;
  level: string;
  qty: number;
}

export interface CommodityInput {
  code: string;
  total_kg: number;
}

export interface StockGapInput {
  item_code: string;
  required: number;
  on_hand: number;
  gap: number;
  unit: string;
}

export interface SupplierSpendInput {
  supplier_name: string;
  total_spend: number;
  invoice_count: number;
}

export interface CashflowPoint {
  period: string; // "YYYY-MM" atau ISO
  cash_in: number;
  cash_out: number;
  net: number;
}

export interface BudgetSnapshot {
  period: string;
  budget_total: number;
  spent_po: number;
  spent_invoice: number;
  spent_paid: number;
}

export interface CostPerPortionPoint {
  op_date: string;
  cost_per_portion: number;
  target: number | null;
}

export interface DashboardAnalyticsProps {
  lang: Lang;
  beneficiary: BeneficiaryDay[];
  beneficiaryToday: SchoolBreakdownInput[];
  commodities: CommodityInput[];
  stockGaps: StockGapInput[];
  topSuppliers: SupplierSpendInput[];
  cashflow: CashflowPoint[];
  budget: BudgetSnapshot | null;
  costPerPortion: CostPerPortionPoint[];
}

/* ---------------- constants ---------------- */

const C = {
  blue: "#1d4ed8",
  blueLight: "#93c5fd",
  emerald: "#047857",
  emeraldLight: "#86efac",
  amber: "#b45309",
  amberLight: "#fcd34d",
  violet: "#6d28d9",
  rose: "#be123c",
  slate: "#334155",
  teal: "#0f766e",
  red: "#dc2626"
} as const;

type TabId = "beneficiary" | "supply" | "finance";

/* ---------------- helpers ---------------- */

function fmtIDRCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${sign}Rp${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}Rp${abs.toLocaleString("id-ID")}`;
}

function fmtKgCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}t`;
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}kg`;
}

const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function periodLabel(p: string): string {
  // "YYYY-MM-..." → "Mmm yy"
  const m = p.match(/^(\d{4})-(\d{2})/);
  if (!m) return p;
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${months[Number(m[2]) - 1]} ${m[1].slice(2)}`;
}

/* ---------------- main ---------------- */

export function DashboardAnalytics(props: DashboardAnalyticsProps) {
  const [tab, setTab] = useState<TabId>("beneficiary");

  const TABS: Array<{ id: TabId; icon: string; label: string }> = [
    { id: "beneficiary", icon: "👥", label: "Penerima Manfaat" },
    { id: "supply", icon: "📦", label: "Supply Chain" },
    { id: "finance", icon: "💰", label: "Keuangan" }
  ];

  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-card">
      <header className="relative flex flex-wrap items-center justify-center gap-3 bg-ink px-4 py-1.5 text-center">
        <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white">
          Analytics Dashboard
        </h2>
      </header>

      <div className="p-5">
        {/* tabs */}
        <nav
          aria-label="Analytics tab"
          className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-paper/60 p-1.5 ring-1 ring-primary/5"
        >
          {TABS.map((tb) => {
            const active = tb.id === tab;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-bold transition min-w-[140px] ${
                  active
                    ? "bg-primary-gradient text-white shadow-cardlg ring-1 ring-gold/40"
                    : "bg-white/70 text-primary hover:bg-white hover:shadow-card"
                }`}
              >
                <span aria-hidden>{tb.icon}</span>
                <span>{tb.label}</span>
              </button>
            );
          })}
        </nav>

        {tab === "beneficiary" && <BeneficiaryTab {...props} />}
        {tab === "supply" && <SupplyTab {...props} />}
        {tab === "finance" && <FinanceTab {...props} />}
      </div>
    </section>
  );
}

/* ---------------- Beneficiary Tab ---------------- */

function BeneficiaryTab({
  beneficiary,
  beneficiaryToday,
  lang
}: DashboardAnalyticsProps) {
  const opDays = useMemo(
    () => beneficiary.filter((d) => d.operasional && d.total > 0).slice(0, 10),
    [beneficiary]
  );

  const trendSeries = useMemo(
    () => [
      {
        key: "total",
        label: "Total Penerima",
        color: C.blue,
        values: opDays.map((d) => ({
          label: shortDate(d.op_date),
          value: d.total
        }))
      }
    ],
    [opDays]
  );

  const stackedRows = useMemo(
    () =>
      opDays.map((d) => ({
        label: shortDate(d.op_date),
        segments: [
          { key: "students", value: d.students },
          { key: "pregnant", value: d.pregnant },
          { key: "toddler", value: d.toddler }
        ]
      })),
    [opDays]
  );

  const stackedKeys = [
    { key: "students", label: "Siswa", color: C.blue },
    { key: "pregnant", label: "Ibu Hamil/Menyusui", color: C.amber },
    { key: "toddler", label: "Balita", color: C.emerald }
  ];

  const bySchool = useMemo(
    () =>
      [...beneficiaryToday]
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10)
        .map((s) => ({
          label: s.school_name,
          value: s.qty,
          sub: s.level
        })),
    [beneficiaryToday]
  );

  const totalToday = bySchool.reduce((s, x) => s + x.value, 0);
  const totalTrend = opDays.reduce((s, x) => s + x.total, 0);
  const avgTrend = opDays.length > 0 ? Math.round(totalTrend / opDays.length) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartFrame
        title="Tren Penerima Manfaat"
        subtitle={`${opDays.length} hari operasional · rata-rata ${formatNumber(avgTrend, lang)} porsi/hari`}
        accent="blue"
      >
        <LineChart series={trendSeries} format={(v) => formatNumber(v, lang)} />
      </ChartFrame>

      <ChartFrame
        title="Breakdown per Jenis Penerima"
        subtitle="Siswa · Ibu Hamil/Menyusui · Balita"
        accent="emerald"
      >
        <StackedBarChart
          rows={stackedRows}
          keys={stackedKeys}
          format={(v) => formatNumber(v, lang)}
        />
      </ChartFrame>

      <ChartFrame
        title="Penerima per Sekolah (Hari Ini)"
        subtitle={
          totalToday > 0
            ? `Top ${bySchool.length} sekolah · total ${formatNumber(totalToday, lang)} porsi`
            : "Belum ada data kehadiran hari ini"
        }
        accent="violet"
      >
        <HBarChart
          rows={bySchool}
          color={C.violet}
          format={(v) => formatNumber(v, lang)}
        />
      </ChartFrame>

      <ChartFrame
        title="Jumlah Sekolah Terlayani"
        subtitle="Sekolah dengan kehadiran > 0 per hari"
        accent="amber"
      >
        <LineChart
          series={[
            {
              key: "schools",
              label: "Sekolah",
              color: C.amber,
              values: opDays.map((d) => ({
                label: shortDate(d.op_date),
                value: d.schools
              }))
            }
          ]}
          format={(v) => String(v)}
        />
      </ChartFrame>
    </div>
  );
}

/* ---------------- Supply Chain Tab ---------------- */

function SupplyTab({
  commodities,
  stockGaps,
  topSuppliers,
  lang
}: DashboardAnalyticsProps) {
  const topComm = useMemo(
    () =>
      [...commodities]
        .sort((a, b) => b.total_kg - a.total_kg)
        .slice(0, 10)
        .map((c) => ({
          label: c.code.replace(/^Buah\s*-\s*/i, ""),
          value: Math.round(c.total_kg),
          sub: "kg"
        })),
    [commodities]
  );

  const gaps = useMemo(
    () =>
      [...stockGaps]
        .filter((s) => s.gap > 0)
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 10)
        .map((s) => ({
          label: s.item_code.replace(/^Buah\s*-\s*/i, ""),
          required: s.required,
          actual: s.on_hand,
          unit: s.unit
        })),
    [stockGaps]
  );

  const sup = useMemo(
    () =>
      [...topSuppliers]
        .sort((a, b) => b.total_spend - a.total_spend)
        .slice(0, 10)
        .map((s) => ({
          label: s.supplier_name,
          value: s.total_spend,
          sub: `${s.invoice_count} inv`
        })),
    [topSuppliers]
  );

  const totalSpend = sup.reduce((s, x) => s + x.value, 0);
  const totalKg = commodities.reduce((s, x) => s + x.total_kg, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartFrame
        title="Top 10 Komoditas · 4 Bulan Ke Depan"
        subtitle={`Total kebutuhan horizon: ${fmtKgCompact(totalKg)}`}
        accent="emerald"
      >
        <HBarChart
          rows={topComm}
          color={C.emerald}
          format={(v) => `${formatNumber(v, lang)} kg`}
        />
      </ChartFrame>

      <ChartFrame
        title="Stock Gap Hari Ini"
        subtitle={gaps.length > 0 ? `${gaps.length} item perlu restock` : "Stock aman"}
        accent="amber"
        footer={
          gaps.length > 0 ? (
            <ChartLegend
              items={[
                { label: "Butuh", color: "#fcd34d" },
                { label: "Ada", color: C.red }
              ]}
            />
          ) : null
        }
      >
        {gaps.length === 0 ? (
          <div className="flex h-[120px] items-center justify-center text-[12px] text-emerald-700">
            ✅ Semua komoditas cukup stok
          </div>
        ) : (
          <BulletBarChart
            rows={gaps}
            format={(v) => formatNumber(Math.round(v), lang)}
          />
        )}
      </ChartFrame>

      <ChartFrame
        title="Top Supplier · Nilai Belanja"
        subtitle={`Total: ${fmtIDRCompact(totalSpend)} bulan ini`}
        accent="violet"
      >
        <HBarChart rows={sup} color={C.violet} format={fmtIDRCompact} />
      </ChartFrame>

      <ChartFrame
        title="Kebutuhan Mingguan · Konversi Ton"
        subtitle="Volume top komoditas dalam ton"
        accent="slate"
      >
        <HBarChart
          rows={topComm.map((c) => ({
            label: c.label,
            value: Number((c.value / 1000).toFixed(2)),
            sub: "ton"
          }))}
          color={C.slate}
          format={(v) => `${v.toFixed(2)} t`}
        />
      </ChartFrame>
    </div>
  );
}

/* ---------------- Finance Tab ---------------- */

function FinanceTab({
  cashflow,
  budget,
  costPerPortion,
  lang
}: DashboardAnalyticsProps) {
  const cfRows = useMemo(() => {
    const rows = cashflow.slice(-12);
    return rows;
  }, [cashflow]);

  const cashflowStacked = useMemo(
    () =>
      cfRows.map((c) => ({
        label: periodLabel(c.period),
        segments: [
          { key: "in", value: Math.max(0, c.cash_in) },
          { key: "out", value: Math.max(0, c.cash_out) }
        ]
      })),
    [cfRows]
  );

  const netSeries = useMemo(
    () => [
      {
        key: "net",
        label: "Net",
        color: C.violet,
        values: cfRows.map((c) => ({
          label: periodLabel(c.period),
          value: c.net
        }))
      }
    ],
    [cfRows]
  );

  const cppSeries = useMemo(() => {
    const rows = costPerPortion
      .filter((c) => c.cost_per_portion > 0)
      .slice(-14);
    return [
      {
        key: "cpp",
        label: "Cost/Porsi",
        color: C.teal,
        values: rows.map((c) => ({
          label: shortDate(c.op_date),
          value: Math.round(c.cost_per_portion)
        }))
      }
    ];
  }, [costPerPortion]);

  const cppTarget = useMemo(() => {
    const withTarget = costPerPortion.find(
      (c) => c.target != null && c.target > 0
    );
    return withTarget?.target ?? 15000;
  }, [costPerPortion]);

  const cfIn = cfRows.reduce((s, x) => s + x.cash_in, 0);
  const cfOut = cfRows.reduce((s, x) => s + x.cash_out, 0);
  const cfNet = cfIn - cfOut;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartFrame
        title="Cashflow Bulanan"
        subtitle={`In ${fmtIDRCompact(cfIn)} · Out ${fmtIDRCompact(cfOut)} · Net ${fmtIDRCompact(cfNet)}`}
        accent="emerald"
      >
        <StackedBarChart
          rows={cashflowStacked}
          keys={[
            { key: "in", label: "Cash In", color: C.emerald },
            { key: "out", label: "Cash Out", color: C.rose }
          ]}
          format={fmtIDRCompact}
        />
      </ChartFrame>

      <ChartFrame
        title="Tren Net Cashflow"
        subtitle="Cash In dikurangi Cash Out"
        accent="violet"
      >
        <LineChart series={netSeries} format={fmtIDRCompact} />
      </ChartFrame>

      <ChartFrame
        title="Budget Absorption"
        subtitle={
          budget
            ? `Periode ${periodLabel(budget.period)} · Pagu ${fmtIDRCompact(budget.budget_total)}`
            : "Belum ada anggaran terdaftar"
        }
        accent="amber"
      >
        {budget ? (
          <BudgetAbsorption budget={budget} lang={lang} />
        ) : (
          <div className="flex h-[120px] items-center justify-center text-[12px] text-ink2/60">
            Set pagu anggaran di modul Keuangan
          </div>
        )}
      </ChartFrame>

      <ChartFrame
        title="Cost per Porsi Harian"
        subtitle={`Target BGN ${fmtIDRCompact(cppTarget)}/porsi`}
        accent="slate"
      >
        <LineChart
          series={cppSeries}
          format={fmtIDRCompact}
          benchmark={{ value: cppTarget, label: `Target ${fmtIDRCompact(cppTarget)}` }}
        />
      </ChartFrame>
    </div>
  );
}

function BudgetAbsorption({
  budget,
  lang
}: {
  budget: BudgetSnapshot;
  lang: Lang;
}) {
  const { budget_total, spent_po, spent_invoice, spent_paid } = budget;
  const total = Math.max(budget_total, 1);
  const pctPo = Math.min(100, (spent_po / total) * 100);
  const pctInv = Math.min(100, (spent_invoice / total) * 100);
  const pctPaid = Math.min(100, (spent_paid / total) * 100);
  const remaining = Math.max(0, budget_total - spent_po);

  const rows = [
    {
      label: "Komitmen PO",
      pct: pctPo,
      value: spent_po,
      color: C.amber
    },
    {
      label: "Invoice Diterima",
      pct: pctInv,
      value: spent_invoice,
      color: C.violet
    },
    {
      label: "Sudah Dibayar",
      pct: pctPaid,
      value: spent_paid,
      color: C.emerald
    }
  ];

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between text-[11.5px]">
            <span className="font-semibold text-ink">{r.label}</span>
            <span className="tabular-nums font-bold text-ink">
              {fmtIDRCompact(r.value)}{" "}
              <span className="font-normal text-ink2/70">
                ({r.pct.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-ink/5">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${r.pct}%`, background: r.color }}
            />
          </div>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-[12px] ring-1 ring-emerald-200">
        <span className="font-semibold text-emerald-900">Sisa pagu</span>
        <span className="tabular-nums font-bold text-emerald-900">
          {fmtIDRCompact(remaining)} · {formatNumber(Math.round((remaining / total) * 100), lang)}%
        </span>
      </div>
    </div>
  );
}
