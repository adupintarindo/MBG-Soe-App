"use client";

import { Badge, CategoryBadge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatIDR, formatKg } from "@/lib/engine";
import { t, formatNumber, type Lang } from "@/lib/i18n";

export type PlanningMatrixRow = {
  rank: number;
  code: string;
  category: string;
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
      align: "center",
      sortValue: (r) => r.code,
      render: (r) => <span className="font-semibold">{r.code}</span>
    },
    {
      key: "cat",
      label: t("common.category", lang),
      sortValue: (r) => r.category,
      render: (r) => (
        <div className="flex justify-center">
          <CategoryBadge category={r.category} size="sm" />
        </div>
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
      align: "center",
      sortValue: (r) => r.cost,
      render: (r) => (
        <span className="font-mono text-xs text-emerald-800">
          {formatIDR(r.cost)}
        </span>
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
    <tr className="border-t-2 border-ink/20 bg-paper">
      <td colSpan={3} className="py-2 px-3 text-center font-black">
        {t("planning.totalTop30", lang)}
      </td>
      {months.map((m) => (
        <td
          key={m}
          className="py-2 px-3 text-center font-mono text-xs font-black"
        >
          {formatNumber(colMonth[m], lang, { maximumFractionDigits: 0 })}
        </td>
      ))}
      <td className="py-2 px-3 text-center font-mono text-xs font-black">
        {formatNumber(totalKg, lang, { maximumFractionDigits: 0 })}
      </td>
      <td className="py-2 px-3 text-center font-mono text-xs font-black text-emerald-800">
        {formatIDR(totalCost)}
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
    />
  );
}

export type PlanningDailyRow = {
  op_date: string;
  menu_name: string | null;
  porsi_total: number;
  porsi_eff: number;
  total_kg: number;
  short_items: number;
  operasional: boolean;
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
      key: "date",
      label: t("common.date", lang),
      align: "left",
      sortValue: (r) => r.op_date,
      render: (r) => <span className="font-mono text-xs">{r.op_date}</span>
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
      key: "kg",
      label: t("common.needed", lang),
      align: "right",
      sortValue: (r) => r.total_kg,
      render: (r) => (
        <span className="font-mono text-xs">{formatKg(r.total_kg, 1)}</span>
      )
    },
    {
      key: "short",
      label: t("common.short", lang),
      align: "right",
      sortValue: (r) => r.short_items,
      render: (r) => (
        <span
          className={`font-mono text-xs font-black ${r.short_items > 0 ? "text-red-700" : "text-emerald-700"}`}
        >
          {r.short_items}
        </span>
      )
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => (r.operasional ? 1 : 0),
      render: (r) =>
        r.operasional ? (
          <Badge tone="ok">{t("planning.badgeOP", lang)}</Badge>
        ) : (
          <Badge tone="warn">{t("dashboard.badgeNonOp", lang)}</Badge>
        )
    }
  ];

  return (
    <SortableTable<PlanningDailyRow>
      tableClassName="text-sm"
      rowKey={(r) => r.op_date}
      initialSort={{ key: "date", dir: "asc" }}
      columns={columns}
      rows={rows}
    />
  );
}
