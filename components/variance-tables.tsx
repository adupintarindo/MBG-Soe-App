"use client";

import { Badge, CategoryBadge, IDR } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatKg } from "@/lib/engine";
import { t, formatNumber, type Lang } from "@/lib/i18n";

export type VarianceRow = {
  item_code: string;
  name_en: string | null;
  category: string;
  flag: "OVER" | "UNDER" | "OK";
  plan_kg: number;
  actual_kg: number;
  variance_kg: number;
  variance_pct: number | null;
};

export function VariancePerItemTable({
  rows,
  thresholdPct,
  lang
}: {
  rows: VarianceRow[];
  thresholdPct: number;
  lang: Lang;
}) {
  const columns: SortableColumn<VarianceRow>[] = [
    {
      key: "flag",
      label: t("variance.colFlag", lang),
      sortValue: (r) => r.flag,
      render: (r) => {
        const tone: "bad" | "warn" | "ok" =
          r.flag === "OVER" ? "bad" : r.flag === "UNDER" ? "warn" : "ok";
        return <Badge tone={tone}>{r.flag}</Badge>;
      }
    },
    {
      key: "item",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => (
        <span className="font-semibold text-ink">
          {r.item_code}
          {r.name_en && (
            <span className="ml-1 text-[10px] italic text-ink2/60">
              · {r.name_en}
            </span>
          )}
        </span>
      )
    },
    {
      key: "cat",
      label: t("common.category", lang),
      sortValue: (r) => r.category,
      render: (r) => (
        <div className="flex justify-center">
          <CategoryBadge category={r.category} />
        </div>
      )
    },
    {
      key: "plan",
      label: t("variance.colPlanKg", lang),
      align: "right",
      sortValue: (r) => r.plan_kg,
      render: (r) => (
        <span className="font-mono text-xs">{r.plan_kg.toFixed(2)}</span>
      )
    },
    {
      key: "actual",
      label: t("variance.colActualKg", lang),
      align: "right",
      sortValue: (r) => r.actual_kg,
      render: (r) => (
        <span className="font-mono text-xs">{r.actual_kg.toFixed(2)}</span>
      )
    },
    {
      key: "delta",
      label: t("variance.colDeltaKg", lang),
      align: "right",
      sortValue: (r) => r.variance_kg,
      render: (r) => (
        <span
          className={`font-mono text-xs font-bold ${
            r.variance_kg > 0
              ? "text-red-700"
              : r.variance_kg < 0
                ? "text-amber-700"
                : "text-ink2"
          }`}
        >
          {r.variance_kg > 0 ? "+" : ""}
          {r.variance_kg.toFixed(2)}
        </span>
      )
    },
    {
      key: "pct",
      label: t("variance.colDeltaPct", lang),
      align: "right",
      sortValue: (r) => r.variance_pct ?? 0,
      render: (r) => (
        <span
          className={`font-mono text-xs font-black ${
            r.variance_pct == null
              ? "text-ink2"
              : Math.abs(Number(r.variance_pct)) > thresholdPct
                ? r.variance_pct > 0
                  ? "text-red-700"
                  : "text-amber-700"
                : "text-emerald-700"
          }`}
        >
          {r.variance_pct == null
            ? "—"
            : `${r.variance_pct > 0 ? "+" : ""}${r.variance_pct.toFixed(1)}%`}
        </span>
      )
    }
  ];

  return (
    <SortableTable<VarianceRow>
      tableClassName="text-sm"
      rowKey={(r) => r.item_code}
      initialSort={{ key: "pct", dir: "desc" }}
      columns={columns}
      rows={rows}
      stickyHeader
      bodyMaxHeight={460}
    />
  );
}

export type VarianceByMenuRow = {
  menu_id: number;
  menu_name: string;
  days_served: number;
  plan_porsi: number;
  plan_kg_total: number;
  plan_cost_idr: number;
};

export function VarianceByMenuTable({
  rows,
  lang
}: {
  rows: VarianceByMenuRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<VarianceByMenuRow>[] = [
    {
      key: "id",
      label: t("schools.colId", lang),
      sortValue: (r) => r.menu_id,
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">M{r.menu_id}</span>
      )
    },
    {
      key: "name",
      label: t("common.menu", lang),
      align: "left",
      sortValue: (r) => r.menu_name,
      render: (r) => (
        <span className="font-semibold text-ink">{r.menu_name}</span>
      )
    },
    {
      key: "days",
      label: t("variance.colDays", lang),
      align: "right",
      sortValue: (r) => r.days_served,
      render: (r) => (
        <span className="font-mono text-xs">{r.days_served}</span>
      )
    },
    {
      key: "porsi",
      label: t("variance.colPorsi", lang),
      align: "right",
      sortValue: (r) => r.plan_porsi,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.plan_porsi, lang)}
        </span>
      )
    },
    {
      key: "kg",
      label: t("variance.colTotalBahan", lang),
      align: "right",
      sortValue: (r) => r.plan_kg_total,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatKg(r.plan_kg_total, 1)}
        </span>
      )
    },
    {
      key: "cost",
      label: t("variance.colCostBahan", lang),
      align: "left",
      sortValue: (r) => r.plan_cost_idr,
      render: (r) => (
        <IDR
          value={r.plan_cost_idr}
          className="text-xs font-bold text-emerald-800"
        />
      )
    }
  ];

  return (
    <SortableTable<VarianceByMenuRow>
      tableClassName="text-sm"
      rowKey={(r) => r.menu_id}
      initialSort={{ key: "cost", dir: "desc" }}
      columns={columns}
      rows={rows}
      stickyHeader
      bodyMaxHeight={460}
    />
  );
}
