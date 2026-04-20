"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, CategoryBadge, IDR } from "@/components/ui";
import {
  SortableTable,
  type SortableColumn,
  type SortableTableFilter
} from "@/components/sortable-table";
import { formatKg, formatDateLong } from "@/lib/engine";
import { t, formatNumber, ti, type Lang } from "@/lib/i18n";

const displayCode = (code: string) => code.replace(/^Buah\s*-\s*/i, "");

// ============== Schedule (10-day menu + portion) ==============
export type ScheduleRow = {
  op_date: string;
  dateLabel: string;
  menu_name: string | null;
  operasional: boolean;
  schools: number;
  students: number;
  pregnant: number;
  toddler: number;
  kecil: number;
  besar: number;
  total: number;
};

export function ScheduleTable({
  rows,
  lang
}: {
  rows: ScheduleRow[];
  lang: Lang;
}) {
  const dateBounds = useMemo(() => {
    if (rows.length === 0) return { min: "", max: "" };
    let min = rows[0].op_date;
    let max = rows[0].op_date;
    for (const r of rows) {
      if (r.op_date < min) min = r.op_date;
      if (r.op_date > max) max = r.op_date;
    }
    return { min, max };
  }, [rows]);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const effectiveFrom = from || dateBounds.min;
  const effectiveTo = to || dateBounds.max;

  const filteredRows = useMemo(() => {
    if (!effectiveFrom && !effectiveTo) return rows;
    return rows.filter((r) => {
      if (effectiveFrom && r.op_date < effectiveFrom) return false;
      if (effectiveTo && r.op_date > effectiveTo) return false;
      return true;
    });
  }, [rows, effectiveFrom, effectiveTo]);

  const rangeActive =
    (from && from !== dateBounds.min) || (to && to !== dateBounds.max);

  const dateToolbar = (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{t("dashboard.hppFrom", lang)}</span>
        <input
          type="date"
          value={from}
          min={dateBounds.min || undefined}
          max={effectiveTo || dateBounds.max || undefined}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{t("dashboard.hppTo", lang)}</span>
        <input
          type="date"
          value={to}
          min={effectiveFrom || dateBounds.min || undefined}
          max={dateBounds.max || undefined}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      {rangeActive && (
        <button
          type="button"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 text-[11px] font-semibold text-ink2 transition hover:bg-ink/[0.04]"
        >
          {t("common.reset", lang)}
        </button>
      )}
    </div>
  );

  const [breakdownOpen, setBreakdownOpen] = useState<{
    date: string;
    dateLabel: string;
    tab: BreakdownTab;
  } | null>(null);

  const openBreakdown = (row: ScheduleRow, tab: BreakdownTab) => {
    if (!row.operasional) return;
    setBreakdownOpen({ date: row.op_date, dateLabel: row.dateLabel, tab });
  };

  const clickableCell = (
    row: ScheduleRow,
    value: number,
    tab: BreakdownTab,
    tone: "ink" | "emerald" | "pink" | "amber"
  ) => {
    if (!row.operasional || value === 0) {
      return (
        <span className="font-mono text-xs text-ink2/60">
          {formatNumber(value, lang)}
        </span>
      );
    }
    const toneCls = {
      ink: "text-ink hover:bg-ink/5 hover:text-ink",
      emerald: "text-emerald-800 hover:bg-emerald-50",
      pink: "text-pink-800 hover:bg-pink-50",
      amber: "text-amber-800 hover:bg-amber-50"
    }[tone];
    return (
      <button
        type="button"
        onClick={() => openBreakdown(row, tab)}
        className={`rounded px-2 py-0.5 font-mono text-xs font-bold underline-offset-2 transition hover:underline ${toneCls}`}
        title={t("dashboard.breakdownDownload", lang)}
      >
        {formatNumber(value, lang)}
      </button>
    );
  };

  const columns: SortableColumn<ScheduleRow>[] = [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "52px",
      sortable: false,
      render: (_r, i) => (
        <span className="font-mono text-xs text-ink2">{i + 1}</span>
      )
    },
    {
      key: "date",
      label: t("dashboard.tblDayDate", lang),
      align: "left",
      sortValue: (r) => r.op_date,
      searchValue: (r) => `${r.op_date} ${r.dateLabel}`,
      exportValue: (r) => r.dateLabel,
      render: (r) => <span className="font-semibold">{r.dateLabel}</span>
    },
    {
      key: "status",
      label: t("dashboard.tblStatus", lang),
      align: "center",
      sortValue: (r) => (r.operasional ? 1 : 0),
      searchValue: (r) =>
        r.operasional
          ? t("dashboard.badgeOp", lang)
          : t("dashboard.badgeNonOpLong", lang),
      exportValue: (r) =>
        r.operasional
          ? t("dashboard.badgeOp", lang)
          : t("dashboard.badgeNonOpLong", lang),
      exportHint: (r) => (r.operasional ? "status-ok" : "status-bad"),
      render: (r) =>
        r.operasional ? (
          <Badge tone="ok">{t("dashboard.badgeOp", lang)}</Badge>
        ) : (
          <Badge tone="bad">{t("dashboard.badgeNonOpLong", lang)}</Badge>
        )
    },
    {
      key: "menu",
      label: t("dashboard.tblMenuName", lang),
      align: "left",
      sortValue: (r) => r.menu_name ?? "",
      searchValue: (r) => r.menu_name ?? "",
      exportValue: (r) => r.menu_name ?? "",
      render: (r) =>
        r.menu_name ?? <span className="text-ink2/60">—</span>
    },
    {
      key: "schools",
      label: t("dashboard.tblSchools", lang),
      align: "center",
      sortValue: (r) => r.schools,
      exportValue: (r) => r.schools,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => clickableCell(r, r.schools, "schools", "ink")
    },
    {
      key: "students",
      label: t("dashboard.tblStudents", lang),
      align: "center",
      sortValue: (r) => r.students,
      exportValue: (r) => r.students,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => clickableCell(r, r.students, "schools", "emerald")
    },
    {
      key: "pregnant",
      label: t("dashboard.tblPregnant", lang),
      align: "center",
      sortValue: (r) => r.pregnant,
      exportValue: (r) => r.pregnant,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => clickableCell(r, r.pregnant, "pregnant", "pink")
    },
    {
      key: "toddler",
      label: t("dashboard.tblToddler", lang),
      align: "center",
      sortValue: (r) => r.toddler,
      exportValue: (r) => r.toddler,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => clickableCell(r, r.toddler, "toddler", "amber")
    },
    {
      key: "kecil",
      label: t("dashboard.tblPorsiKecil", lang),
      align: "center",
      sortValue: (r) => r.kecil,
      exportValue: (r) => r.kecil,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.kecil, lang)}
        </span>
      )
    },
    {
      key: "besar",
      label: t("dashboard.tblPorsiBesar", lang),
      align: "center",
      sortValue: (r) => r.besar,
      exportValue: (r) => r.besar,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.besar, lang)}
        </span>
      )
    },
    {
      key: "total",
      label: t("dashboard.tblPorsiTotal", lang),
      align: "center",
      sortValue: (r) => r.total,
      exportValue: (r) => r.total,
      exportHint: "bold",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(r.total, lang)}
        </span>
      )
    }
  ];

  const totals = filteredRows.reduce(
    (acc, r) => ({
      schools: acc.schools + r.schools,
      students: acc.students + r.students,
      pregnant: acc.pregnant + r.pregnant,
      toddler: acc.toddler + r.toddler,
      kecil: acc.kecil + r.kecil,
      besar: acc.besar + r.besar,
      total: acc.total + r.total
    }),
    {
      schools: 0,
      students: 0,
      pregnant: 0,
      toddler: 0,
      kecil: 0,
      besar: 0,
      total: 0
    }
  );

  return (
    <>
      <SortableTable<ScheduleRow>
        tableClassName="text-[11px] tabular-nums [&_th]:!px-1.5 [&_td]:!px-1.5"
        dense
        rowKey={(r) => r.op_date}
        initialSort={{ key: "date", dir: "asc" }}
        columns={columns}
        rows={filteredRows}
        searchable
        exportable
        exportFileName="menu-schedule"
        exportSheetName="Menu Schedule"
        exportTitle={t("dashboard.scheduleTitle", lang)}
        exportTotals={{
          labelColSpan: 4,
          labelText: t("common.grandTotal", lang),
          values: {
            schools: totals.schools,
            students: totals.students,
            pregnant: totals.pregnant,
            toddler: totals.toddler,
            kecil: totals.kecil,
            besar: totals.besar,
            total: totals.total
          }
        }}
        toolbarExtra={dateToolbar}
        footer={
          <tr className="border-t-2 border-ink bg-ink">
            <td
              colSpan={4}
              className="py-1.5 px-1.5 text-center text-[10.5px] font-black uppercase tracking-wide text-white"
            >
              {t("common.grandTotal", lang)}
            </td>
            <td className="py-1.5 px-1.5 text-center font-mono text-[11px] font-black text-white">
              {formatNumber(totals.schools, lang)}
            </td>
            <td className="py-1.5 px-1.5 text-center font-mono text-[11px] font-black text-white">
              {formatNumber(totals.students, lang)}
            </td>
            <td className="py-1.5 px-1.5 text-center font-mono text-[11px] font-black text-white">
              {formatNumber(totals.pregnant, lang)}
            </td>
            <td className="py-1.5 px-1.5 text-center font-mono text-[11px] font-black text-white">
              {formatNumber(totals.toddler, lang)}
            </td>
            <td className="py-1.5 px-1.5 text-center font-mono text-[11px] font-black text-white">
              {formatNumber(totals.kecil, lang)}
            </td>
            <td className="py-1.5 px-1.5 text-center font-mono text-[11px] font-black text-white">
              {formatNumber(totals.besar, lang)}
            </td>
            <td className="py-1.5 px-1.5 text-center font-mono text-[11px] font-black text-white">
              {formatNumber(totals.total, lang)}
            </td>
          </tr>
        }
      />
      {breakdownOpen && (
        <ScheduleBreakdownModal
          date={breakdownOpen.date}
          dateLabel={breakdownOpen.dateLabel}
          initialTab={breakdownOpen.tab}
          lang={lang}
          onClose={() => setBreakdownOpen(null)}
        />
      )}
    </>
  );
}

type BreakdownTab = "schools" | "pregnant" | "toddler";

interface BreakdownData {
  date: string;
  operasional: boolean;
  schools: Array<{
    school_id: string;
    school_name: string;
    level: string;
    qty: number;
    students: number;
  }>;
  pregnant: Array<{
    id: string;
    full_name: string;
    phase: "hamil" | "menyusui";
    gestational_week: number | null;
    child_age_months: number | null;
    age: number | null;
    posyandu_name: string | null;
    address: string | null;
  }>;
  toddler: Array<{
    id: string;
    full_name: string;
    dob: string | null;
    gender: "L" | "P" | null;
    mother_name: string | null;
    posyandu_name: string | null;
    address: string | null;
  }>;
}

function ScheduleBreakdownModal({
  date,
  dateLabel,
  initialTab,
  lang,
  onClose
}: {
  date: string;
  dateLabel: string;
  initialTab: BreakdownTab;
  lang: Lang;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<BreakdownTab>(initialTab);
  const [data, setData] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/beneficiary-breakdown?date=${date}`)
      .then((r) => r.json())
      .then((json: BreakdownData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/beneficiary-breakdown?date=${date}&format=xlsx`
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rincian-penerima-${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const tabs: Array<{ id: BreakdownTab; label: string; count: number }> = [
    {
      id: "schools",
      label: t("dashboard.breakdownSchools", lang),
      count: data?.schools.length ?? 0
    },
    {
      id: "pregnant",
      label: t("dashboard.breakdownPregnant", lang),
      count: data?.pregnant.length ?? 0
    },
    {
      id: "toddler",
      label: t("dashboard.breakdownToddler", lang),
      count: data?.toddler.length ?? 0
    }
  ];

  const ageFromDob = (dob: string | null): string => {
    if (!dob) return "—";
    const d = new Date(dob);
    const now = new Date();
    const months =
      (now.getFullYear() - d.getFullYear()) * 12 +
      (now.getMonth() - d.getMonth());
    if (months < 12) return `${months} bln`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} thn ${rem} bln` : `${years} thn`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-cardlg ring-1 ring-ink/10"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 bg-primary-gradient px-5 py-3 text-white">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">
              {ti("dashboard.breakdownTitle", lang, { date: dateLabel })}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("dashboard.breakdownClose", lang)}
            className="rounded-md px-2 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </header>

        <nav className="flex border-b border-ink/10 bg-paper px-2">
          {tabs.map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition ${
                  active
                    ? "text-primary"
                    : "text-ink2/70 hover:text-ink"
                }`}
              >
                <span>{tb.label}</span>
                <span
                  className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                    active
                      ? "bg-primary text-white"
                      : "bg-ink/10 text-ink2"
                  }`}
                >
                  {tb.count}
                </span>
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-xs text-ink2">
              {t("dashboard.breakdownLoading", lang)}
            </div>
          ) : !data || !data.operasional ? (
            <div className="flex h-40 items-center justify-center text-xs text-ink2">
              {t("dashboard.breakdownEmptyOp", lang)}
            </div>
          ) : tab === "schools" ? (
            <table className="w-full text-xs tabular-nums">
              <thead className="border-b border-ink/10 text-[10px] font-bold uppercase tracking-wide text-ink2">
                <tr>
                  <th className="px-2 py-1.5 text-left">
                    {t("dashboard.breakdownColName", lang)}
                  </th>
                  <th className="px-2 py-1.5 text-center">
                    {t("dashboard.breakdownColLevel", lang)}
                  </th>
                  <th className="px-2 py-1.5 text-right">
                    {t("dashboard.breakdownColQty", lang)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.schools.map((s) => (
                  <tr key={s.school_id} className="border-b border-ink/5">
                    <td className="px-2 py-1.5 font-semibold text-ink">
                      {s.school_name}
                    </td>
                    <td className="px-2 py-1.5 text-center text-ink2">
                      {s.level}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold">
                      {formatNumber(s.qty, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/20">
                  <td className="px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wide text-ink2">
                    {t("common.grandTotal", lang)}
                  </td>
                  <td />
                  <td className="px-2 py-1.5 text-right font-mono text-xs font-black text-ink">
                    {formatNumber(
                      data.schools.reduce((s, r) => s + r.qty, 0),
                      lang
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : tab === "pregnant" ? (
            <table className="w-full text-xs">
              <thead className="border-b border-ink/10 text-[10px] font-bold uppercase tracking-wide text-ink2">
                <tr>
                  <th className="px-2 py-1.5 text-left">
                    {t("dashboard.breakdownColName", lang)}
                  </th>
                  <th className="px-2 py-1.5 text-center">
                    {t("dashboard.breakdownColPhase", lang)}
                  </th>
                  <th className="px-2 py-1.5 text-center">
                    {t("dashboard.breakdownColAge", lang)}
                  </th>
                  <th className="px-2 py-1.5 text-left">
                    {t("dashboard.breakdownColPosyandu", lang)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.pregnant.map((b) => (
                  <tr key={b.id} className="border-b border-ink/5">
                    <td className="px-2 py-1.5 font-semibold text-ink">
                      {b.full_name}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge
                        tone={b.phase === "hamil" ? "info" : "warn"}
                        className="text-[10px]"
                      >
                        {b.phase === "hamil" ? "Hamil" : "Menyusui"}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono text-ink2">
                      {b.age ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-ink2">
                      {b.posyandu_name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-ink/10 text-[10px] font-bold uppercase tracking-wide text-ink2">
                <tr>
                  <th className="px-2 py-1.5 text-left">
                    {t("dashboard.breakdownColName", lang)}
                  </th>
                  <th className="px-2 py-1.5 text-center">
                    {t("dashboard.breakdownColAge", lang)}
                  </th>
                  <th className="px-2 py-1.5 text-left">
                    {t("dashboard.breakdownColMother", lang)}
                  </th>
                  <th className="px-2 py-1.5 text-left">
                    {t("dashboard.breakdownColPosyandu", lang)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.toddler.map((b) => (
                  <tr key={b.id} className="border-b border-ink/5">
                    <td className="px-2 py-1.5 font-semibold text-ink">
                      {b.full_name}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono text-ink2">
                      {ageFromDob(b.dob)}
                    </td>
                    <td className="px-2 py-1.5 text-ink2">
                      {b.mother_name ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-ink2">
                      {b.posyandu_name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink/10 bg-paper px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-ink/10 bg-white px-4 py-1.5 text-xs font-bold text-ink2 transition hover:bg-ink/[0.04]"
          >
            {t("dashboard.breakdownClose", lang)}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || loading || !data?.operasional}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-card transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            {t("dashboard.breakdownDownload", lang)}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ============== Volume matrix (commodity × month) ==============
export type VolumeRow = {
  code: string;
  category: string;
  unit: string;
  total: number;
  monthly: Record<string, number>;
};

export function VolumeMatrixTable({
  rows,
  months,
  monthLabels,
  lang
}: {
  rows: VolumeRow[];
  months: string[];
  monthLabels: Record<string, string>;
  lang: Lang;
}) {
  const monthCols: SortableColumn<VolumeRow>[] = months.map((m) => ({
    key: `m-${m}`,
    label: monthLabels[m] ?? m,
    align: "right",
    sortValue: (r) => r.monthly[m] ?? 0,
    exportValue: (r) => r.monthly[m] ?? 0,
    exportLabel: monthLabels[m] ?? m,
    exportHint: "number",
    exportNumFmt: "#,##0.0",
    render: (r) => (
      <span className="font-mono text-xs">
        {formatNumber(r.monthly[m] ?? 0, lang, { maximumFractionDigits: 1 })}
      </span>
    )
  }));

  const columns: SortableColumn<VolumeRow>[] = [
    {
      key: "rank",
      label: t("dashboard.tblNo", lang),
      width: "56px",
      sortable: false,
      render: (_r, i) => (
        <span className="font-mono text-xs text-ink2">{i + 1}</span>
      )
    },
    {
      key: "code",
      label: t("dashboard.tblCommodity", lang),
      align: "left",
      sortValue: (r) => displayCode(r.code),
      searchValue: (r) => `${displayCode(r.code)} ${r.category}`,
      exportValue: (r) => displayCode(r.code),
      render: (r) => (
        <span className="font-semibold">{displayCode(r.code)}</span>
      )
    },
    {
      key: "category",
      label: t("common.category", lang),
      align: "left",
      sortValue: (r) => r.category,
      searchValue: (r) => r.category,
      exportValue: (r) => r.category,
      render: (r) => <CategoryBadge category={r.category} size="sm" />
    },
    {
      key: "unit",
      label: t("common.unit", lang),
      align: "center",
      sortValue: (r) => r.unit,
      exportValue: (r) => r.unit,
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">{r.unit}</span>
      )
    },
    ...monthCols,
    {
      key: "total",
      label: t("dashboard.tblTotalKg", lang),
      align: "right",
      sortValue: (r) => r.total,
      exportValue: (r) => r.total,
      exportHint: "bold",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(r.total, lang, { maximumFractionDigits: 0 })}
        </span>
      )
    }
  ];

  const categoryFilter: SortableTableFilter<VolumeRow> = {
    key: "category",
    label: t("common.filterCategory", lang),
    getValue: (r) => r.category
  };

  return (
    <SortableTable<VolumeRow>
      tableClassName="text-sm tabular-nums"
      rowKey={(r) => r.code}
      initialSort={{ key: "total", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="volume-matrix"
      exportSheetName="Volume Matrix"
      exportTitle={t("dashboard.volumeTitle", lang)}
      filters={[categoryFilter]}
    />
  );
}

// ============== Planning (short) ==============
export type PlanRow = {
  op_date: string;
  menu_name: string | null;
  operasional: boolean;
  porsi_total: number;
  total_kg: number;
  short_items: number;
};

export function PlanningTable({
  rows,
  lang
}: {
  rows: PlanRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<PlanRow>[] = [
    {
      key: "date",
      label: t("common.dayDate", lang),
      align: "left",
      sortValue: (r) => r.op_date,
      searchValue: (r) => r.op_date,
      exportValue: (r) => formatDateLong(r.op_date, lang),
      render: (r) => (
        <div>
          <div className="text-[11px] font-semibold">
            {formatDateLong(r.op_date, lang)}
          </div>
          {!r.operasional && (
            <Badge tone="warn" className="mt-1">
              {t("dashboard.badgeNonOp", lang)}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: "menu",
      label: t("dashboard.tblMenu", lang),
      align: "left",
      sortValue: (r) => r.menu_name ?? "",
      searchValue: (r) => r.menu_name ?? "",
      exportValue: (r) => r.menu_name ?? "",
      render: (r) =>
        r.menu_name ?? <span className="text-ink2/60">—</span>
    },
    {
      key: "porsi",
      label: t("dashboard.tblPorsi", lang),
      align: "right",
      sortValue: (r) => r.porsi_total,
      exportValue: (r) => r.porsi_total,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.porsi_total, lang)}
        </span>
      )
    },
    {
      key: "kg",
      label: t("dashboard.tblKebutuhan", lang),
      align: "right",
      sortValue: (r) => r.total_kg,
      exportValue: (r) => Number(r.total_kg),
      exportHint: "number",
      exportNumFmt: "#,##0.0",
      render: (r) => (
        <span className="font-mono text-xs">
          {formatKg(Number(r.total_kg), 1)}
        </span>
      )
    },
    {
      key: "short",
      label: t("dashboard.tblShort", lang),
      align: "right",
      sortValue: (r) => r.short_items,
      exportValue: (r) => r.short_items,
      exportHint: (r) => (r.short_items > 0 ? "status-bad" : "status-ok"),
      exportNumFmt: "#,##0",
      render: (r) => (
        <span
          className={`font-mono text-xs font-black ${
            r.short_items > 0 ? "text-red-700" : "text-emerald-700"
          }`}
        >
          {r.short_items}
        </span>
      )
    }
  ];

  const totalPorsi = rows.reduce((s, r) => s + r.porsi_total, 0);
  const totalKg = rows.reduce((s, r) => s + Number(r.total_kg ?? 0), 0);
  const totalShort = rows.reduce((s, r) => s + r.short_items, 0);

  return (
    <SortableTable<PlanRow>
      tableClassName="text-sm tabular-nums"
      rowKey={(r) => r.op_date}
      initialSort={{ key: "date", dir: "asc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="planning"
      exportSheetName="Planning"
      exportTitle={t("dashboard.planningTitle", lang)}
      exportTotals={{
        labelColSpan: 2,
        labelText: t("common.grandTotal", lang),
        values: {
          porsi: totalPorsi,
          kg: Number(totalKg.toFixed(1)),
          short: totalShort
        }
      }}
      footer={
        <tr className="border-t-2 border-ink bg-ink">
          <td
            colSpan={2}
            className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
          >
            {t("common.grandTotal", lang)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs font-black text-white">
            {formatNumber(totalPorsi, lang)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs font-black text-white">
            {formatKg(totalKg, 1)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs font-black text-white">
            {totalShort}
          </td>
        </tr>
      }
    />
  );
}

// ============== Stock alert ==============
export type StockAlertRow = {
  item_code: string;
  category: string;
  required: number;
  on_hand: number;
  gap: number;
  unit: string;
};

export function StockAlertTable({
  rows,
  lang
}: {
  rows: StockAlertRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<StockAlertRow>[] = [
    {
      key: "item",
      label: t("dashboard.tblItem", lang),
      align: "left",
      sortValue: (r) => displayCode(r.item_code),
      searchValue: (r) => `${displayCode(r.item_code)} ${r.category}`,
      exportValue: (r) => displayCode(r.item_code),
      render: (r) => (
        <span className="font-semibold">{displayCode(r.item_code)}</span>
      )
    },
    {
      key: "category",
      label: t("common.category", lang),
      align: "left",
      sortValue: (r) => r.category,
      searchValue: (r) => r.category,
      exportValue: (r) => r.category,
      render: (r) => <CategoryBadge category={r.category} size="sm" />
    },
    {
      key: "req",
      label: t("dashboard.tblButuh", lang),
      align: "right",
      sortValue: (r) => r.required,
      exportValue: (r) => Number(r.required),
      exportHint: "number",
      exportNumFmt: "#,##0.00",
      render: (r) => (
        <span className="font-mono text-xs">
          {Number(r.required).toFixed(2)}
        </span>
      )
    },
    {
      key: "onhand",
      label: t("dashboard.tblAda", lang),
      align: "right",
      sortValue: (r) => r.on_hand,
      exportValue: (r) => Number(r.on_hand),
      exportHint: "number",
      exportNumFmt: "#,##0.00",
      render: (r) => (
        <span className="font-mono text-xs">
          {Number(r.on_hand).toFixed(2)}
        </span>
      )
    },
    {
      key: "gap",
      label: t("dashboard.tblKurang", lang),
      align: "right",
      sortValue: (r) => r.gap,
      exportValue: (r) => `${Number(r.gap).toFixed(2)} ${r.unit}`,
      exportHint: "status-bad",
      render: (r) => (
        <span className="font-mono text-xs font-black text-red-700">
          {Number(r.gap).toFixed(2)} {r.unit}
        </span>
      )
    }
  ];

  const totalRequired = rows.reduce((s, r) => s + Number(r.required ?? 0), 0);
  const totalOnHand = rows.reduce((s, r) => s + Number(r.on_hand ?? 0), 0);
  const totalGap = rows.reduce((s, r) => s + Number(r.gap ?? 0), 0);

  return (
    <SortableTable<StockAlertRow>
      tableClassName="text-sm tabular-nums"
      rowKey={(r) => r.item_code}
      initialSort={{ key: "gap", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="stock-alert"
      exportSheetName="Stock Alert"
      exportTitle={t("dashboard.stockAlertTitle", lang)}
      exportTotals={{
        labelColSpan: 2,
        labelText: t("common.grandTotal", lang),
        values: {
          req: Number(totalRequired.toFixed(2)),
          onhand: Number(totalOnHand.toFixed(2)),
          gap: Number(totalGap.toFixed(2))
        }
      }}
      footer={
        <tr className="border-t-2 border-ink bg-ink">
          <td
            colSpan={2}
            className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
          >
            {t("common.grandTotal", lang)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs font-black text-white">
            {totalRequired.toFixed(2)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs font-black text-white">
            {totalOnHand.toFixed(2)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs font-black text-white">
            {totalGap.toFixed(2)}
          </td>
        </tr>
      }
    />
  );
}

// ============== Supplier spend ==============
export type SupplierSpendRow = {
  supplier_id: string;
  supplier_name: string;
  supplier_type: string;
  invoice_count: number;
  total_spend: number;
};

export function SupplierSpendTable({
  rows,
  lang
}: {
  rows: SupplierSpendRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<SupplierSpendRow>[] = [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "48px",
      sortable: false,
      render: (_r, i) => <span className="text-ink2">{i + 1}</span>
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => r.supplier_name,
      searchValue: (r) => `${r.supplier_name} ${r.supplier_id}`,
      exportValue: (r) => r.supplier_name,
      render: (r) => <span className="font-semibold">{r.supplier_name}</span>
    },
    {
      key: "type",
      label: t("dashboard.tblType", lang),
      align: "center",
      sortValue: (r) => r.supplier_type,
      searchValue: (r) => r.supplier_type,
      exportValue: (r) => r.supplier_type,
      render: (r) => <Badge tone="neutral">{r.supplier_type}</Badge>
    },
    {
      key: "invoices",
      label: t("dashboard.tblInvoice", lang),
      align: "center",
      sortValue: (r) => r.invoice_count,
      exportValue: (r) => r.invoice_count,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs">{r.invoice_count}</span>
      )
    },
    {
      key: "spend",
      label: t("dashboard.tblTotalSpend", lang),
      align: "right",
      sortValue: (r) => r.total_spend,
      exportValue: (r) => Number(r.total_spend),
      exportHint: "money",
      exportNumFmt: '"Rp "#,##0',
      render: (r) => (
        <IDR value={Number(r.total_spend)} className="text-xs font-black" />
      )
    }
  ];

  const totalInvoices = rows.reduce((s, r) => s + r.invoice_count, 0);
  const totalSpend = rows.reduce((s, r) => s + Number(r.total_spend ?? 0), 0);

  return (
    <SortableTable<SupplierSpendRow>
      tableClassName="text-sm tabular-nums"
      rowKey={(r) => r.supplier_id}
      initialSort={{ key: "spend", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="supplier-spend"
      exportSheetName="Supplier Spend"
      exportTitle={t("dashboard.supplierSpendTitle", lang)}
      exportTotals={{
        labelColSpan: 3,
        labelText: t("common.grandTotal", lang),
        values: {
          invoices: totalInvoices,
          spend: totalSpend
        }
      }}
      footer={
        <tr className="border-t-2 border-ink bg-ink">
          <td
            colSpan={3}
            className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
          >
            {t("common.grandTotal", lang)}
          </td>
          <td className="py-2 px-3 text-center font-mono text-xs font-black text-white">
            {formatNumber(totalInvoices, lang)}
          </td>
          <td className="py-2 px-3 text-left">
            <IDR
              value={totalSpend}
              className="text-xs font-black text-white"
              prefixClassName="text-white/70"
            />
          </td>
        </tr>
      }
    />
  );
}
