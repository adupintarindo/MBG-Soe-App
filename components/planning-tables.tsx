"use client";

import { Badge, CategoryBadge, IDR } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatDateLong } from "@/lib/engine";
import { t, formatNumber, type Lang } from "@/lib/i18n";

export type PlanningMatrixRow = {
  rank: number;
  code: string;
  category: string;
  unit: string;
  monthly: Record<string, number>;
  total: number;
  cost: number;
};

export function PlanningMatrixTable({
  rows,
  months,
  monthLabels,
  lang
}: {
  rows: PlanningMatrixRow[];
  months: string[];
  monthLabels: Record<string, string>;
  lang: Lang;
}) {
  const topRows = rows.slice(0, 30);

  const monthColumns: SortableColumn<PlanningMatrixRow>[] = months.map((m) => ({
    key: `m-${m}`,
    label: monthLabels[m] ?? m,
    align: "center",
    sortValue: (r) => r.monthly[m] ?? 0,
    render: (r) => (
      <span className="font-mono text-xs">
        {formatNumber(r.monthly[m] ?? 0, lang, { maximumFractionDigits: 1 })}
      </span>
    )
  }));

  const columns: SortableColumn<PlanningMatrixRow>[] = [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "52px",
      sortValue: (r) => r.rank,
      render: (r) => <span className="text-ink2">{r.rank}</span>
    },
    {
      key: "code",
      label: t("common.commodity", lang),
      align: "left",
      sortValue: (r) => r.code,
      render: (r) => <span className="font-semibold">{r.code}</span>
    },
    {
      key: "cat",
      label: t("common.category", lang),
      align: "center",
      sortValue: (r) => r.category,
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
    ...monthColumns,
    {
      key: "total",
      label: t("planning.colTotalKg", lang),
      align: "center",
      sortValue: (r) => r.total,
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(r.total, lang, { maximumFractionDigits: 0 })}
        </span>
      )
    },
    {
      key: "cost",
      label: t("planning.colEstCost", lang),
      align: "left",
      sortValue: (r) => r.cost,
      render: (r) => (
        <IDR value={r.cost} className="text-xs text-emerald-800" />
      )
    }
  ];

  const colMonth: Record<string, number> = {};
  for (const m of months) {
    colMonth[m] = topRows.reduce((s, r) => s + (r.monthly[m] ?? 0), 0);
  }
  const totalKg = topRows.reduce((s, r) => s + r.total, 0);
  const totalCost = topRows.reduce((s, r) => s + r.cost, 0);

  const footer = (
    <tr className="border-t-2 border-ink bg-ink">
      <td
        colSpan={4}
        className="py-1.5 px-3 text-center text-[10.5px] font-black uppercase tracking-wide text-white"
      >
        {t("planning.totalTop30", lang)}
      </td>
      {months.map((m) => (
        <td
          key={m}
          className="py-1.5 px-3 text-center font-mono text-[11px] font-black text-white"
        >
          {formatNumber(colMonth[m], lang, { maximumFractionDigits: 0 })}
        </td>
      ))}
      <td className="py-1.5 px-3 text-center font-mono text-[11px] font-black text-white">
        {formatNumber(totalKg, lang, { maximumFractionDigits: 0 })}
      </td>
      <td className="py-1.5 px-3 text-left font-mono text-[11px] font-black text-white">
        <IDR value={totalCost} className="text-[11px] font-black !text-white" />
      </td>
    </tr>
  );

  return (
    <SortableTable<PlanningMatrixRow>
      tableClassName="text-sm"
      rowKey={(r) => r.code}
      initialSort={{ key: "total", dir: "desc" }}
      columns={columns}
      rows={topRows}
      footer={footer}
      searchable
      searchPlaceholder={
        lang === "EN" ? "Search ingredient..." : "Cari bahan..."
      }
      stickyHeader
      bodyMaxHeight={500}
    />
  );
}

export type PlanningDailyRow = {
  op_date: string;
  menu_name: string | null;
  porsi_total: number;
  porsi_eff: number;
  operasional: boolean;
  schools: number;
  students: number;
  pregnant: number;
  toddler: number;
  kecil: number;
  besar: number;
  total: number;
};

export function PlanningDailyTable({
  rows,
  lang
}: {
  rows: PlanningDailyRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<PlanningDailyRow>[] = [
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
      exportValue: (r) => formatDateLong(r.op_date, lang),
      render: (r) => (
        <span className="text-xs font-semibold">
          {formatDateLong(r.op_date, lang)}
        </span>
      )
    },
    {
      key: "status",
      label: t("common.status", lang),
      align: "center",
      sortValue: (r) => (r.operasional ? 1 : 0),
      render: (r) =>
        r.operasional ? (
          <Badge tone="ok">{t("planning.badgeOP", lang)}</Badge>
        ) : (
          <Badge tone="bad">{t("dashboard.badgeNonOp", lang)}</Badge>
        )
    },
    {
      key: "menu",
      label: t("common.menu", lang),
      align: "left",
      sortValue: (r) => r.menu_name ?? "",
      render: (r) =>
        r.menu_name ? (
          <span className="text-xs">{r.menu_name}</span>
        ) : (
          <span className="text-xs text-ink2/60">—</span>
        )
    },
    {
      key: "porsi",
      label: t("common.porsi", lang),
      align: "right",
      sortValue: (r) => r.porsi_total,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.porsi_total, lang)}
        </span>
      )
    },
    {
      key: "porsi_eff",
      label: t("planning.colPorsiEff", lang),
      align: "right",
      sortValue: (r) => r.porsi_eff,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.porsi_eff, lang, { maximumFractionDigits: 1 })}
        </span>
      )
    },
    {
      key: "schools",
      label: t("dashboard.tblSchools", lang),
      align: "center",
      sortValue: (r) => r.schools,
      exportValue: (r) => r.schools,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.schools, lang)}
        </span>
      )
    },
    {
      key: "students",
      label: t("dashboard.tblStudents", lang),
      align: "center",
      sortValue: (r) => r.students,
      exportValue: (r) => r.students,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.students, lang)}
        </span>
      )
    },
    {
      key: "pregnant",
      label: t("dashboard.tblPregnant", lang),
      align: "center",
      sortValue: (r) => r.pregnant,
      exportValue: (r) => r.pregnant,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.pregnant, lang)}
        </span>
      )
    },
    {
      key: "toddler",
      label: t("dashboard.tblToddler", lang),
      align: "center",
      sortValue: (r) => r.toddler,
      exportValue: (r) => r.toddler,
      exportHint: "number",
      exportNumFmt: "#,##0",
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.toddler, lang)}
        </span>
      )
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

  const totals = rows.reduce(
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

  const footer = (
    <tr className="border-t-2 border-ink bg-ink">
      <td
        colSpan={6}
        className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
      >
        {t("common.grandTotal", lang)}
      </td>
      <td className="py-2 px-3 text-center font-mono text-xs font-black text-white">
        {formatNumber(totals.schools, lang)}
      </td>
      <td className="py-2 px-3 text-center font-mono text-xs font-black text-white">
        {formatNumber(totals.students, lang)}
      </td>
      <td className="py-2 px-3 text-center font-mono text-xs font-black text-white">
        {formatNumber(totals.pregnant, lang)}
      </td>
      <td className="py-2 px-3 text-center font-mono text-xs font-black text-white">
        {formatNumber(totals.toddler, lang)}
      </td>
      <td className="py-2 px-3 text-center font-mono text-xs font-black text-white">
        {formatNumber(totals.kecil, lang)}
      </td>
      <td className="py-2 px-3 text-center font-mono text-xs font-black text-white">
        {formatNumber(totals.besar, lang)}
      </td>
      <td className="py-2 px-3 text-center font-mono text-xs font-black text-white">
        {formatNumber(totals.total, lang)}
      </td>
    </tr>
  );

  return (
    <SortableTable<PlanningDailyRow>
      tableClassName="text-sm"
      rowKey={(r) => r.op_date}
      initialSort={{ key: "date", dir: "asc" }}
      columns={columns}
      rows={rows}
      footer={footer}
      searchable
      exportable
      exportFileName="planning-daily"
      exportSheetName="Planning Daily"
      exportTitle={t("planning.dailyTitle", lang)}
      exportTotals={{
        labelColSpan: 6,
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
      searchPlaceholder={
        lang === "EN" ? "Search menu / date..." : "Cari menu / tanggal..."
      }
      stickyHeader
      bodyMaxHeight={500}
    />
  );
}
