"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Badge, CategoryBadge, IDR } from "@/components/ui";
import {
  SortableTable,
  type SortableColumn
} from "@/components/sortable-table";
import { formatKg, formatDateLong } from "@/lib/engine";
import { getHoliday } from "@/lib/holidays";
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
  lang,
  today
}: {
  rows: ScheduleRow[];
  lang: Lang;
  /** ISO date (YYYY-MM-DD) used as the anchor for the default 10-day window. Pass the server's `today` to avoid timezone drift. */
  today: string;
}) {
  // Default range: today → today + 10 days. Anchored on the server-computed
  // `today` prop so the filter applies synchronously on first render (no SSR
  // flicker showing all 90 rows) and timezone drift between server/client is
  // irrelevant.
  const defaultRange = useMemo(() => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() + 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return { from: today, to: `${y}-${m}-${day}` };
  }, [today]);

  const [from, setFrom] = useState<string>(defaultRange.from);
  const [to, setTo] = useState<string>(defaultRange.to);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (from && r.op_date < from) return false;
      if (to && r.op_date > to) return false;
      return true;
    });
  }, [rows, from, to]);

  const rangeActive = from !== defaultRange.from || to !== defaultRange.to;

  const dateToolbar = (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{t("dashboard.hppFrom", lang)}</span>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{t("dashboard.hppTo", lang)}</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      {rangeActive && (
        <button
          type="button"
          onClick={() => {
            setFrom(defaultRange.from);
            setTo(defaultRange.to);
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

  const plainCell = (value: number, operasional: boolean) => {
    if (!operasional || value === 0) {
      return (
        <span className="font-mono text-xs text-ink2/60">
          {formatNumber(value, lang)}
        </span>
      );
    }
    return (
      <span className="font-mono text-xs text-ink">
        {formatNumber(value, lang)}
      </span>
    );
  };

  const defaultBreakdownTab = (row: ScheduleRow): BreakdownTab => {
    if (row.students > 0) return "schools";
    if (row.pregnant > 0) return "pregnant";
    if (row.toddler > 0) return "toddler";
    return "schools";
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
      render: (r) => plainCell(r.schools, r.operasional)
    },
    {
      key: "students",
      label: t("dashboard.tblStudents", lang),
      align: "center",
      sortValue: (r) => r.students,
      exportValue: (r) => r.students,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => plainCell(r.students, r.operasional)
    },
    {
      key: "pregnant",
      label: t("dashboard.tblPregnant", lang),
      align: "center",
      sortValue: (r) => r.pregnant,
      exportValue: (r) => r.pregnant,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => plainCell(r.pregnant, r.operasional)
    },
    {
      key: "toddler",
      label: t("dashboard.tblToddler", lang),
      align: "center",
      sortValue: (r) => r.toddler,
      exportValue: (r) => r.toddler,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => plainCell(r.toddler, r.operasional)
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
      render: (r) => {
        const totalText = (
          <span className="font-mono text-xs font-black">
            {formatNumber(r.total, lang)}
          </span>
        );
        if (!r.operasional) return totalText;
        return (
          <button
            type="button"
            onClick={() => openBreakdown(r, defaultBreakdownTab(r))}
            aria-label={t("dashboard.breakdownOpen", lang)}
            title={t("dashboard.breakdownOpen", lang)}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-white px-2 py-0.5 text-ink transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            {totalText}
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-3 w-3 text-ink2/70"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        );
      }
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
        rowClassName={(row) => {
          if (row.operasional) return "";
          const d = new Date(row.op_date + "T00:00:00");
          const dow = d.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const holidayName = getHoliday(row.op_date);
          if (isWeekend || holidayName) return "!bg-rose-50 hover:!bg-rose-100";
          return "!bg-amber-50 hover:!bg-amber-100";
        }}
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
    kecil: number;
    besar: number;
    guru: number;
    total: number;
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

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

  if (!mounted) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/50 px-4 pt-[6vh] pb-[6vh] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-cardlg ring-1 ring-ink/10"
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
            (() => {
              const totalKecil = data.schools.reduce((s, r) => s + r.kecil, 0);
              const totalBesar = data.schools.reduce((s, r) => s + r.besar, 0);
              const totalGuru = data.schools.reduce((s, r) => s + r.guru, 0);
              const totalAll = data.schools.reduce((s, r) => s + r.total, 0);
              const dim = (v: number) =>
                v === 0 ? "text-ink2/40" : "text-ink";
              return (
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
                        {t("dashboard.breakdownColKecil", lang)}
                      </th>
                      <th className="px-2 py-1.5 text-right">
                        {t("dashboard.breakdownColBesar", lang)}
                      </th>
                      <th className="px-2 py-1.5 text-right">
                        {t("dashboard.breakdownColGuru", lang)}
                      </th>
                      <th className="px-2 py-1.5 text-right">
                        {t("dashboard.breakdownColTotal", lang)}
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
                        <td
                          className={`px-2 py-1.5 text-right font-mono ${dim(s.kecil)}`}
                        >
                          {formatNumber(s.kecil, lang)}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right font-mono ${dim(s.besar)}`}
                        >
                          {formatNumber(s.besar, lang)}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right font-mono ${dim(s.guru)}`}
                        >
                          {formatNumber(s.guru, lang)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono font-black text-ink">
                          {formatNumber(s.total, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink/20">
                      <td
                        colSpan={2}
                        className="px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wide text-ink2"
                      >
                        {t("common.grandTotal", lang)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs font-black text-ink">
                        {formatNumber(totalKecil, lang)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs font-black text-ink">
                        {formatNumber(totalBesar, lang)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs font-black text-ink">
                        {formatNumber(totalGuru, lang)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs font-black text-ink">
                        {formatNumber(totalAll, lang)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()
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

  return createPortal(overlay, document.body);
}

// ============== Volume matrix (commodity × month) ==============
export type VolumeRow = {
  code: string;
  category: string;
  unit: string;
  total: number;
  monthly: Record<string, number>;
};

const CATEGORY_ICON: Record<string, string> = {
  BERAS: "🍚",
  BUAH: "🍎",
  HEWANI: "🍗",
  NABATI: "🫘",
  SAYUR: "🥬",
  SEMBAKO: "🧂"
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
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.category) set.add(r.category);
    return Array.from(set).sort();
  }, [rows]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const c of categories) counts[c] = 0;
    for (const r of rows) counts[r.category] = (counts[r.category] ?? 0) + 1;
    return counts;
  }, [rows, categories]);

  const filteredRows = useMemo(
    () =>
      activeCategory === "all"
        ? rows
        : rows.filter((r) => r.category === activeCategory),
    [rows, activeCategory]
  );

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
      align: "center",
      sortValue: (r) => r.category,
      searchValue: (r) => r.category,
      exportValue: (r) => r.category,
      render: (r) => (
        <div className="flex justify-center">
          <CategoryBadge category={r.category} size="sm" />
        </div>
      )
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

  const shortCategoryLabel = (raw: string): string => {
    if (raw === t("common.filterCategory", lang)) {
      return lang === "EN" ? "All" : "Semua";
    }
    const upper = raw.toUpperCase();
    if (upper === "SAYUR_HIJAU" || upper === "SAYUR HIJAU") return "S. HIJAU";
    const first = upper.split(/[_\s]/)[0];
    return first;
  };

  const categoryTabs: Array<{ id: string; label: string; icon: string }> = [
    { id: "all", label: t("common.filterCategory", lang), icon: "📊" },
    ...categories.map((c) => ({
      id: c,
      label: c,
      icon: CATEGORY_ICON[c] ?? "🏷️"
    }))
  ];

  return (
    <>
      <nav
        aria-label={t("common.filterCategory", lang)}
        className="mb-4 flex w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-2xl bg-white/80 p-1.5 shadow-card ring-1 ring-primary/5 dark:bg-d-surface/70 dark:ring-d-border/30"
      >
        {categoryTabs.map((tab) => {
          const active = tab.id === activeCategory;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              aria-pressed={active}
              title={tab.label}
              className={`inline-flex flex-1 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                active
                  ? "bg-primary-gradient text-white shadow-card ring-1 ring-gold/40 dark:bg-primary-gradient-dark"
                  : "bg-paper/60 text-primary hover:bg-white hover:shadow-card dark:bg-d-surface-2/60 dark:text-d-text dark:hover:bg-d-surface-2"
              }`}
            >
              <span aria-hidden className="text-[11px]">{tab.icon}</span>
              <span className="truncate">{shortCategoryLabel(tab.label)}</span>
              <span
                className={`rounded-full px-1 font-mono text-[9.5px] font-bold leading-tight ${
                  active ? "bg-white/20 text-white" : "bg-ink/10 text-ink2"
                }`}
              >
                {categoryCounts[tab.id] ?? 0}
              </span>
            </button>
          );
        })}
      </nav>

      <SortableTable<VolumeRow>
        tableClassName="text-sm tabular-nums"
        rowKey={(r) => r.code}
        initialSort={{ key: "total", dir: "desc" }}
        columns={columns}
        rows={filteredRows}
        searchable
        exportable
        exportFileName="volume-matrix"
        exportSheetName="Volume Matrix"
        exportTitle={t("dashboard.volumeTitle", lang)}
      />
    </>
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
      label: t("common.dayDate", lang),
      align: "left",
      sortValue: (r) => r.op_date,
      searchValue: (r) => r.op_date,
      exportValue: (r) => formatDateLong(r.op_date, lang),
      render: (r) => (
        <span className="font-semibold">{formatDateLong(r.op_date, lang)}</span>
      )
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
        labelColSpan: 4,
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
            colSpan={4}
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
      align: "center",
      sortValue: (r) => r.category,
      searchValue: (r) => r.category,
      exportValue: (r) => r.category,
      render: (r) => (
        <div className="flex justify-center">
          <CategoryBadge category={r.category} size="sm" />
        </div>
      )
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
  monthly: Record<string, number>;
};

const SUPPLIER_TYPE_COLOR: Record<string, string> = {
  KOPERASI: "bg-emerald-100 text-emerald-800",
  UD: "bg-blue-100 text-blue-800",
  BUMN: "bg-violet-100 text-violet-800",
  CV: "bg-amber-100 text-amber-900",
  TOKO: "bg-sky-100 text-sky-800",
  PT: "bg-rose-100 text-rose-800",
  INFORMAL: "bg-yellow-100 text-yellow-900",
  POKTAN: "bg-teal-100 text-teal-800",
  LOKAL: "bg-lime-100 text-lime-800"
};

function supplierTypeColor(raw: string): string {
  const key = (raw ?? "").toUpperCase();
  return SUPPLIER_TYPE_COLOR[key] ?? "bg-slate-100 text-slate-700";
}

export function SupplierSpendTable({
  rows,
  months,
  monthLabels,
  lang
}: {
  rows: SupplierSpendRow[];
  months: string[];
  monthLabels: Record<string, string>;
  lang: Lang;
}) {
  const monthCols: SortableColumn<SupplierSpendRow>[] = months.map((m) => ({
    key: `m-${m}`,
    label: monthLabels[m] ?? m,
    align: "right",
    sortValue: (r) => r.monthly[m] ?? 0,
    exportValue: (r) => r.monthly[m] ?? 0,
    exportLabel: monthLabels[m] ?? m,
    exportHint: "money",
    exportNumFmt: '"Rp "#,##0',
    render: (r) => {
      const v = r.monthly[m] ?? 0;
      return v === 0 ? (
        <span className="font-mono text-[11px] text-ink2/40">—</span>
      ) : (
        <IDR value={v} className="text-[11px]" />
      );
    }
  }));

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
      render: (r) => (
        <Link
          href={`/suppliers/${encodeURIComponent(r.supplier_id)}`}
          className="font-semibold text-primary hover:text-accent-strong hover:underline dark:text-d-text"
          title={r.supplier_name}
        >
          {r.supplier_name}
        </Link>
      )
    },
    {
      key: "type",
      label: t("dashboard.tblType", lang),
      align: "center",
      sortValue: (r) => r.supplier_type,
      searchValue: (r) => r.supplier_type,
      exportValue: (r) => r.supplier_type,
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 font-display text-[10.5px] font-bold tracking-[0.02em] ${supplierTypeColor(r.supplier_type)}`}
        >
          {r.supplier_type}
        </span>
      )
    },
    ...monthCols,
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

  const totalSpend = rows.reduce((s, r) => s + Number(r.total_spend ?? 0), 0);
  const monthlyTotals: Record<string, number> = Object.fromEntries(
    months.map((m) => [
      m,
      rows.reduce((s, r) => s + Number(r.monthly[m] ?? 0), 0)
    ])
  );

  return (
    <SortableTable<SupplierSpendRow>
      tableClassName="text-sm tabular-nums"
      rowKey={(r) => r.supplier_id}
      initialSort={{ key: "spend", dir: "desc" }}
      columns={columns}
      rows={rows}
      stickyHeader
      bodyMaxHeight={480}
      searchable
      exportable
      exportFileName="supplier-spend"
      exportSheetName="Supplier Spend"
      exportTitle={t("dashboard.supplierSpendTitle", lang)}
      exportTotals={{
        labelColSpan: 3,
        labelText: t("common.grandTotal", lang),
        values: {
          ...Object.fromEntries(months.map((m) => [`m-${m}`, monthlyTotals[m]])),
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
          {months.map((m) => (
            <td key={`ft-${m}`} className="py-2 px-3 text-left">
              <IDR
                value={monthlyTotals[m] ?? 0}
                className="text-[11px] font-black text-white"
                prefixClassName="text-white/70"
              />
            </td>
          ))}
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
