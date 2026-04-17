"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Badge } from "@/components/ui";
import { formatIDR, formatKg } from "@/lib/engine";
import { t, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

/* ========================================================================== */
/* Menu & Portion Schedule (10-day horizon)                                   */
/* ========================================================================== */

export type MenuScheduleRow = {
  op_date: string;
  dateLabel: string;
  menu_name: string | null;
  porsi_total: number;
  schools_count: number;
  kecil: number;
  besar: number;
  operasional: boolean;
};

export function MenuScheduleTable({ rows }: { rows: MenuScheduleRow[] }) {
  const { lang } = useLang();

  const columns: DataTableColumn<MenuScheduleRow>[] = [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "48px",
      sortable: false,
      cell: (_r, idx) => (
        <span className="font-mono text-xs text-ink2">{idx + 1}</span>
      )
    },
    {
      key: "date",
      label: t("dashboard.tblDayDate", lang),
      align: "left",
      sortValue: (r) => r.op_date,
      searchValue: (r) => `${r.op_date} ${r.dateLabel}`,
      exportValue: (r) => r.dateLabel,
      cell: (r) => (
        <div className="text-left">
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
      cell: (r) => (
        <span className="text-xs">
          {r.menu_name ?? <span className="text-ink2/60">—</span>}
        </span>
      )
    },
    {
      key: "schools",
      label: t("dashboard.tblSchools", lang),
      align: "right",
      sortValue: (r) => r.schools_count,
      exportValue: (r) => r.schools_count,
      cell: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.schools_count, lang)}
        </span>
      )
    },
    {
      key: "kecil",
      label: t("dashboard.tblPorsiKecil", lang),
      align: "right",
      sortValue: (r) => r.kecil,
      exportValue: (r) => r.kecil,
      cell: (r) => (
        <span className="font-mono text-xs">{formatNumber(r.kecil, lang)}</span>
      )
    },
    {
      key: "besar",
      label: t("dashboard.tblPorsiBesar", lang),
      align: "right",
      sortValue: (r) => r.besar,
      exportValue: (r) => r.besar,
      cell: (r) => (
        <span className="font-mono text-xs">{formatNumber(r.besar, lang)}</span>
      )
    },
    {
      key: "total",
      label: t("dashboard.tblPorsiTotal", lang),
      align: "right",
      sortValue: (r) => r.porsi_total,
      exportValue: (r) => r.porsi_total,
      cell: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(r.porsi_total, lang)}
        </span>
      )
    }
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.op_date}
      searchable
      exportFileName="menu-schedule"
      exportSheetName="Menu Schedule"
      defaultSort={{ key: "date", dir: "asc" }}
    />
  );
}

/* ========================================================================== */
/* 4-month Ingredient Volume Matrix                                           */
/* ========================================================================== */

export type VolumeRow = {
  code: string;
  displayName: string;
  categoryDot: string;
  categoryLabel: string;
  monthly: Record<string, number>;
  total: number;
  rowMax: number;
};

export function VolumeMatrixTable({
  rows,
  months,
  monthLabels,
  maxItemTotal
}: {
  rows: VolumeRow[];
  months: string[];
  monthLabels: Record<string, string>;
  maxItemTotal: number;
}) {
  const { lang } = useLang();

  const rankTone = (idx: number) =>
    idx === 0
      ? "bg-emerald-600 text-white"
      : idx === 1
        ? "bg-emerald-200 text-emerald-900"
        : idx === 2
          ? "bg-emerald-100 text-emerald-900"
          : "bg-slate-100 text-ink2";

  const columns: DataTableColumn<VolumeRow>[] = [
    {
      key: "rank",
      label: "#",
      width: "44px",
      sortable: false,
      cell: (_r, idx) => (
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-display text-[11px] font-bold ${rankTone(idx)}`}
        >
          {idx + 1}
        </span>
      )
    },
    {
      key: "commodity",
      label: t("dashboard.tblCommodity", lang),
      align: "left",
      sortValue: (r) => r.displayName,
      searchValue: (r) => `${r.displayName} ${r.categoryLabel} ${r.code}`,
      exportValue: (r) => r.displayName,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${r.categoryDot}`}
            aria-hidden
          />
          <span className="font-semibold">{r.displayName}</span>
          <span className="hidden text-[10px] font-medium uppercase tracking-wider text-ink2/60 md:inline">
            {r.categoryLabel}
          </span>
        </div>
      )
    },
    ...months.map<DataTableColumn<VolumeRow>>((m) => ({
      key: `month-${m}`,
      label: monthLabels[m] ?? m,
      align: "right",
      sortValue: (r) => r.monthly[m] ?? 0,
      exportValue: (r) => r.monthly[m] ?? 0,
      cell: (r) => {
        const v = r.monthly[m] ?? 0;
        const intensity = r.rowMax > 0 ? v / r.rowMax : 0;
        const bg =
          intensity >= 0.95
            ? "bg-emerald-100/80"
            : intensity >= 0.7
              ? "bg-emerald-50"
              : intensity >= 0.4
                ? "bg-emerald-50/50"
                : "";
        return (
          <span
            className={`block rounded px-1 font-mono text-xs ${bg}`}
          >
            {formatNumber(v, lang, { maximumFractionDigits: 1 })}
          </span>
        );
      }
    })),
    {
      key: "total",
      label: t("dashboard.tblTotalKg", lang),
      align: "right",
      sortValue: (r) => r.total,
      exportValue: (r) => r.total,
      cell: (r) => {
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
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.code}
      searchable
      exportFileName="volume-matrix"
      exportSheetName="Volume Matrix"
      defaultSort={{ key: "total", dir: "desc" }}
      rowClassName={(_r, idx) => (idx % 2 === 1 ? "odd:bg-slate-50/50" : "")}
    />
  );
}

/* ========================================================================== */
/* Supplier Spend                                                             */
/* ========================================================================== */

export type SupplierSpendRow = {
  supplier_id: string;
  supplier_name: string;
  supplier_type: string;
  invoice_count: number;
  total_spend: number;
};

export function SupplierSpendTable({ rows }: { rows: SupplierSpendRow[] }) {
  const { lang } = useLang();

  const columns: DataTableColumn<SupplierSpendRow>[] = [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "44px",
      sortable: false,
      cell: (_r, idx) => <span className="text-ink2">{idx + 1}</span>
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => r.supplier_name,
      searchValue: (r) => `${r.supplier_name} ${r.supplier_id}`,
      exportValue: (r) => r.supplier_name,
      cell: (r) => <span className="font-semibold">{r.supplier_name}</span>
    },
    {
      key: "type",
      label: t("dashboard.tblType", lang),
      sortValue: (r) => r.supplier_type,
      searchValue: (r) => r.supplier_type,
      exportValue: (r) => r.supplier_type,
      cell: (r) => <Badge tone="neutral">{r.supplier_type}</Badge>
    },
    {
      key: "invoice_count",
      label: t("dashboard.tblInvoice", lang),
      align: "right",
      sortValue: (r) => r.invoice_count,
      exportValue: (r) => r.invoice_count,
      cell: (r) => (
        <span className="font-mono text-xs">{r.invoice_count}</span>
      )
    },
    {
      key: "spend",
      label: t("dashboard.tblTotalSpend", lang),
      align: "right",
      sortValue: (r) => r.total_spend,
      exportValue: (r) => r.total_spend,
      cell: (r) => (
        <span className="font-mono text-xs font-black">
          {formatIDR(Number(r.total_spend))}
        </span>
      )
    }
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.supplier_id}
      searchable
      exportFileName="supplier-spend"
      exportSheetName="Supplier Spend"
      defaultSort={{ key: "spend", dir: "desc" }}
      footer={(visible) => {
        const totalSpend = visible.reduce(
          (s, r) => s + Number(r.total_spend),
          0
        );
        const totalInv = visible.reduce(
          (s, r) => s + Number(r.invoice_count),
          0
        );
        return (
          <tr className="border-t-2 border-ink/10 bg-paper/70 font-mono text-xs font-black">
            <td colSpan={3} className="py-2 pr-3 text-right uppercase">
              {t("common.total", lang)}
            </td>
            <td className="py-2 pr-3 text-right">{totalInv}</td>
            <td className="py-2 pr-3 text-right">{formatIDR(totalSpend)}</td>
          </tr>
        );
      }}
    />
  );
}

/* ========================================================================== */
/* Helper: formatKg is re-exported if needed by consumers.                     */
/* ========================================================================== */
export { formatKg };
