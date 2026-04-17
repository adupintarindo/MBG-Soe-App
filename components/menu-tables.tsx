"use client";

import { CategoryBadge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatIDR } from "@/lib/engine";
import { t, type Lang } from "@/lib/i18n";

export type BomTableRow = {
  item_code: string;
  category: string;
  small: number;
  large: number;
  tiered: boolean;
};

export function BomTable({
  rows,
  lang
}: {
  rows: BomTableRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<BomTableRow>[] = [
    {
      key: "item",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => (
        <span className="font-semibold text-ink">{r.item_code}</span>
      )
    },
    {
      key: "cat",
      label: t("menu.colKat", lang),
      sortValue: (r) => r.category,
      render: (r) => <CategoryBadge category={r.category} size="sm" />
    },
    {
      key: "small",
      label: t("menu.colSmall", lang),
      title: t("menu.titleSmall", lang),
      sortValue: (r) => r.small,
      render: (r) => (
        <span className="font-mono text-ink">{r.small.toFixed(1)}</span>
      )
    },
    {
      key: "large",
      label: t("menu.colLarge", lang),
      title: t("menu.titleLarge", lang),
      sortValue: (r) => r.large,
      render: (r) => (
        <span className="font-mono font-black text-ink">
          {r.large.toFixed(1)}
        </span>
      )
    }
  ];

  return (
    <SortableTable<BomTableRow>
      tableClassName="text-xs"
      variant="subtle"
      rowKey={(r) => r.item_code}
      initialSort={{ key: "large", dir: "desc" }}
      columns={columns}
      rows={rows}
      dense
    />
  );
}

export type CommodityRow = {
  code: string;
  displayCode: string;
  category: string;
  unit: string;
  price_idr: number;
  vol_weekly: number;
  supplier_count: number;
  active: boolean;
};

export function CommodityTable({
  rows,
  lang
}: {
  rows: CommodityRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<CommodityRow>[] = [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "52px",
      sortable: false,
      render: (_r, i) => <span className="text-ink2">{i + 1}</span>
    },
    {
      key: "code",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.displayCode,
      render: (r) => <span className="font-semibold">{r.displayCode}</span>
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
      key: "unit",
      label: t("common.unit", lang),
      sortValue: (r) => r.unit,
      render: (r) => <span className="font-mono text-xs">{r.unit}</span>
    },
    {
      key: "price",
      label: t("menu.colPrice", lang),
      align: "right",
      sortValue: (r) => r.price_idr,
      render: (r) => (
        <span className="font-mono text-xs">{formatIDR(r.price_idr)}</span>
      )
    },
    {
      key: "vol",
      label: t("stock.colVolWeekly", lang),
      align: "right",
      sortValue: (r) => r.vol_weekly,
      render: (r) => (
        <span className="font-mono text-xs">{r.vol_weekly.toFixed(1)}</span>
      )
    },
    {
      key: "sup",
      label: t("common.supplier", lang),
      align: "right",
      sortValue: (r) => r.supplier_count,
      render: (r) => (
        <span className="font-mono text-xs">{r.supplier_count}</span>
      )
    }
  ];

  return (
    <SortableTable<CommodityRow>
      tableClassName="text-sm"
      rowKey={(r) => r.code}
      initialSort={{ key: "vol", dir: "desc" }}
      rowClassName={(r) => (!r.active ? "opacity-50" : "")}
      columns={columns}
      rows={rows}
    />
  );
}
