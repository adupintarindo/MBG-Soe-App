"use client";

import { Badge, CategoryBadge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatIDR, formatKg } from "@/lib/engine";
import { t, formatNumber, type Lang } from "@/lib/i18n";

const displayCode = (code: string) => code.replace(/^Buah\s*-\s*/i, "");

// ============== Schedule (10-day menu + portion) ==============
export type ScheduleRow = {
  op_date: string;
  dateLabel: string;
  menu_name: string | null;
  operasional: boolean;
  schools: number;
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
      render: (r) => (
        <div>
          <div className="font-semibold">{r.dateLabel}</div>
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
      align: "right",
      sortValue: (r) => r.schools,
      exportValue: (r) => r.schools,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.schools, lang)}
        </span>
      )
    },
    {
      key: "kecil",
      label: t("dashboard.tblPorsiKecil", lang),
      align: "right",
      sortValue: (r) => r.kecil,
      exportValue: (r) => r.kecil,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.kecil, lang)}
        </span>
      )
    },
    {
      key: "besar",
      label: t("dashboard.tblPorsiBesar", lang),
      align: "right",
      sortValue: (r) => r.besar,
      exportValue: (r) => r.besar,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.besar, lang)}
        </span>
      )
    },
    {
      key: "total",
      label: t("dashboard.tblPorsiTotal", lang),
      align: "right",
      sortValue: (r) => r.total,
      exportValue: (r) => r.total,
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(r.total, lang)}
        </span>
      )
    }
  ];

  return (
    <SortableTable<ScheduleRow>
      tableClassName="text-sm tabular-nums"
      rowKey={(r) => r.op_date}
      initialSort={{ key: "date", dir: "asc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="menu-schedule"
      exportSheetName="Menu Schedule"
    />
  );
}

// ============== Volume matrix (commodity × month) ==============
export type VolumeRow = {
  code: string;
  category: string;
  total: number;
  monthly: Record<string, number>;
};

export function VolumeMatrixTable({
  rows,
  months,
  monthLabels,
  maxItemTotal,
  lang
}: {
  rows: VolumeRow[];
  months: string[];
  monthLabels: Record<string, string>;
  maxItemTotal: number;
  lang: Lang;
}) {
  const monthCols: SortableColumn<VolumeRow>[] = months.map((m) => ({
    key: `m-${m}`,
    label: monthLabels[m] ?? m,
    align: "right",
    sortValue: (r) => r.monthly[m] ?? 0,
    exportValue: (r) => r.monthly[m] ?? 0,
    exportLabel: monthLabels[m] ?? m,
    render: (r) => {
      const v = r.monthly[m] ?? 0;
      const rowMax = Math.max(1, ...months.map((x) => r.monthly[x] ?? 0));
      const intensity = v / rowMax;
      const bg =
        intensity >= 0.95
          ? "bg-emerald-100/80"
          : intensity >= 0.7
            ? "bg-emerald-50"
            : intensity >= 0.4
              ? "bg-emerald-50/50"
              : "";
      return (
        <span className={`block font-mono text-xs ${bg} -mx-3 px-3`}>
          {formatNumber(v, lang, { maximumFractionDigits: 1 })}
        </span>
      );
    }
  }));

  const columns: SortableColumn<VolumeRow>[] = [
    {
      key: "rank",
      label: t("dashboard.tblNo", lang),
      width: "56px",
      sortable: false,
      render: (_r, i) => {
        const rankTone =
          i === 0
            ? "bg-emerald-600 text-white"
            : i === 1
              ? "bg-emerald-200 text-emerald-900"
              : i === 2
                ? "bg-emerald-100 text-emerald-900"
                : "bg-slate-100 text-ink2";
        return (
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-display text-[11px] font-bold ${rankTone}`}
          >
            {i + 1}
          </span>
        );
      }
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
    ...monthCols,
    {
      key: "total",
      label: t("dashboard.tblTotalKg", lang),
      align: "right",
      sortValue: (r) => r.total,
      exportValue: (r) => r.total,
      render: (r) => {
        const share = maxItemTotal > 0 ? r.total / maxItemTotal : 0;
        return (
          <div className="flex items-center justify-end gap-3">
            <div className="relative hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-200/70 md:block">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                style={{ width: `${Math.max(4, share * 100)}%` }}
              />
            </div>
            <span className="font-mono text-xs font-black">
              {formatNumber(r.total, lang, { maximumFractionDigits: 0 })}
            </span>
          </div>
        );
      }
    }
  ];

  return (
    <SortableTable<VolumeRow>
      tableClassName="text-sm tabular-nums"
      rowKey={(r) => r.code}
      initialSort={{ key: "total", dir: "desc" }}
      columns={columns}
      rows={rows}
      zebra
      searchable
      exportable
      exportFileName="volume-matrix"
      exportSheetName="Volume Matrix"
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
      label: t("dashboard.tblDate", lang),
      align: "left",
      sortValue: (r) => r.op_date,
      searchValue: (r) => r.op_date,
      exportValue: (r) => r.op_date,
      render: (r) => (
        <div>
          <div className="font-mono text-[11px]">{r.op_date}</div>
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

  return (
    <SortableTable<PlanRow>
      tableClassName="text-sm"
      rowKey={(r) => r.op_date}
      initialSort={{ key: "date", dir: "asc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="planning"
      exportSheetName="Planning"
    />
  );
}

// ============== Stock alert ==============
export type StockAlertRow = {
  item_code: string;
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
      searchValue: (r) => displayCode(r.item_code),
      exportValue: (r) => displayCode(r.item_code),
      render: (r) => (
        <span className="font-semibold">{displayCode(r.item_code)}</span>
      )
    },
    {
      key: "req",
      label: t("dashboard.tblButuh", lang),
      align: "right",
      sortValue: (r) => r.required,
      exportValue: (r) => Number(r.required),
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
      render: (r) => (
        <span className="font-mono text-xs font-black text-red-700">
          {Number(r.gap).toFixed(2)} {r.unit}
        </span>
      )
    }
  ];

  return (
    <SortableTable<StockAlertRow>
      tableClassName="text-sm"
      rowKey={(r) => r.item_code}
      initialSort={{ key: "gap", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="stock-alert"
      exportSheetName="Stock Alert"
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
      sortValue: (r) => r.supplier_type,
      searchValue: (r) => r.supplier_type,
      exportValue: (r) => r.supplier_type,
      render: (r) => <Badge tone="neutral">{r.supplier_type}</Badge>
    },
    {
      key: "invoices",
      label: t("dashboard.tblInvoice", lang),
      align: "right",
      sortValue: (r) => r.invoice_count,
      exportValue: (r) => r.invoice_count,
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
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatIDR(Number(r.total_spend))}
        </span>
      )
    }
  ];

  return (
    <SortableTable<SupplierSpendRow>
      tableClassName="text-sm"
      rowKey={(r) => r.supplier_id}
      initialSort={{ key: "spend", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="supplier-spend"
      exportSheetName="Supplier Spend"
    />
  );
}
