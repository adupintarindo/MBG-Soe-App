"use client";

import Link from "next/link";
import { CategoryBadge, IDR } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
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
      render: (r) => (
        <div className="flex justify-center">
          <CategoryBadge category={r.category} size="sm" />
        </div>
      )
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

export type CommoditySupplier = {
  id: string;
  name: string;
  is_main: boolean;
};

export type CommodityRow = {
  code: string;
  displayCode: string;
  category: string;
  unit: string;
  price_idr: number;
  vol_weekly: number;
  suppliers: CommoditySupplier[];
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
      align: "left",
      sortValue: (r) => r.price_idr,
      render: (r) => <IDR value={r.price_idr} className="text-xs" />
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
      align: "left",
      sortValue: (r) => r.suppliers.length,
      searchValue: (r) => r.suppliers.map((s) => s.name).join(" "),
      exportValue: (r) =>
        r.suppliers.length === 0
          ? ""
          : r.suppliers.map((s) => s.name).join(", "),
      render: (r) =>
        r.suppliers.length === 0 ? (
          <span className="text-ink2/50">—</span>
        ) : (
          <div className="flex flex-wrap justify-start gap-1">
            {r.suppliers.map((s) => (
              <Link
                key={s.id}
                href={`/suppliers/${s.id}`}
                title={s.is_main ? `${s.name} (utama)` : s.name}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 transition hover:brightness-95 ${
                  s.is_main
                    ? "bg-accent-strong/10 text-accent-strong ring-accent-strong/30"
                    : "bg-paper text-ink ring-ink/10 hover:bg-ink/[0.04]"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
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
