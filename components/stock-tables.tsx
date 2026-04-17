"use client";

import { Badge, CategoryBadge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatIDR } from "@/lib/engine";
import { t, ti, formatNumber, type Lang, type LangKey } from "@/lib/i18n";

const REASON_KEY: Record<string, LangKey> = {
  receipt: "stock.reasonReceipt",
  consumption: "stock.reasonConsumption",
  adjustment: "stock.reasonAdjustment",
  waste: "stock.reasonWaste",
  transfer_in: "stock.reasonTransferIn",
  transfer_out: "stock.reasonTransferOut",
  opening: "stock.reasonOpening"
};

const REASON_COLOR: Record<string, string> = {
  receipt: "bg-emerald-50 text-emerald-900",
  consumption: "bg-rose-50 text-rose-900",
  adjustment: "bg-amber-50 text-amber-900",
  waste: "bg-red-50 text-red-900",
  transfer_in: "bg-blue-50 text-blue-900",
  transfer_out: "bg-indigo-50 text-indigo-900",
  opening: "bg-slate-50 text-slate-900"
};

function reasonLabel(reason: string, lang: Lang): string {
  const key = REASON_KEY[reason];
  return key ? t(key, lang) : reason;
}

export type ShortRow = {
  item_code: string;
  required: number;
  on_hand: number;
  gap: number;
  unit: string;
};

export function StockShortTable({
  rows,
  lang
}: {
  rows: ShortRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<ShortRow>[] = [
    {
      key: "item",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => <span className="font-semibold">{r.item_code}</span>
    },
    {
      key: "req",
      label: t("common.required", lang),
      sortValue: (r) => r.required,
      render: (r) => (
        <span className="font-mono text-xs">{r.required.toFixed(2)}</span>
      )
    },
    {
      key: "onhand",
      label: t("common.onHand", lang),
      sortValue: (r) => r.on_hand,
      render: (r) => (
        <span className="font-mono text-xs">{r.on_hand.toFixed(2)}</span>
      )
    },
    {
      key: "gap",
      label: t("common.gap", lang),
      sortValue: (r) => r.gap,
      render: (r) => (
        <span className="font-mono text-xs font-black text-red-700">
          {r.gap.toFixed(2)} {r.unit}
        </span>
      )
    }
  ];

  return (
    <SortableTable<ShortRow>
      tableClassName="text-sm"
      rowKey={(r) => r.item_code}
      initialSort={{ key: "gap", dir: "desc" }}
      columns={columns}
      rows={rows}
    />
  );
}

export type StockMasterRow = {
  code: string;
  category: string;
  qty: number;
  unit: string;
  price_idr: number;
  value: number;
  weekly: number;
  weeksCover: number;
  shortGap: number | null;
};

export function StockMasterTable({
  rows,
  lang
}: {
  rows: StockMasterRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<StockMasterRow>[] = [
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
      sortValue: (r) => r.code,
      render: (r) => <span className="font-semibold">{r.code}</span>
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
      key: "qty",
      label: t("common.qty", lang),
      align: "right",
      sortValue: (r) => r.qty,
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(r.qty, lang, { maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: "unit",
      label: t("common.unit", lang),
      sortValue: (r) => r.unit,
      render: (r) => <span className="text-xs">{r.unit}</span>
    },
    {
      key: "price",
      label: t("stock.colHarga", lang),
      align: "right",
      sortValue: (r) => r.price_idr,
      render: (r) => (
        <span className="font-mono text-xs">{formatIDR(r.price_idr)}</span>
      )
    },
    {
      key: "value",
      label: t("stock.colNilai", lang),
      align: "right",
      sortValue: (r) => r.value,
      render: (r) => (
        <span className="font-mono text-xs">{formatIDR(r.value)}</span>
      )
    },
    {
      key: "weekly",
      label: t("stock.colVolWeekly", lang),
      align: "right",
      sortValue: (r) => r.weekly,
      render: (r) => (
        <span className="font-mono text-xs text-ink2/70">
          {r.weekly > 0 ? r.weekly.toFixed(1) : "—"}
        </span>
      )
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => {
        if (r.shortGap != null && r.shortGap > 0) return 0;
        if (r.qty <= 0) return 1;
        if (r.weeksCover < 1) return 2;
        return 3;
      },
      render: (r) => {
        if (r.shortGap != null && r.shortGap > 0)
          return (
            <Badge tone="bad">
              {ti("stock.statusShort", lang, { gap: r.shortGap.toFixed(1) })}
            </Badge>
          );
        if (r.qty <= 0)
          return <Badge tone="muted">{t("stock.statusEmpty", lang)}</Badge>;
        if (r.weeksCover < 1)
          return (
            <Badge tone="warn">
              {ti("stock.statusLow", lang, { w: r.weeksCover.toFixed(1) })}
            </Badge>
          );
        return (
          <Badge tone="ok">
            {t("stock.statusOK", lang)}
            {r.weeksCover < 99 ? ` · ${r.weeksCover.toFixed(1)}w` : ""}
          </Badge>
        );
      }
    }
  ];

  return (
    <SortableTable<StockMasterRow>
      tableClassName="text-sm"
      rowKey={(r) => r.code}
      initialSort={{ key: "value", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
    />
  );
}

export type MoveRow = {
  id: number;
  item_code: string;
  delta: number;
  reason: string;
  ref_doc: string | null;
  ref_no: string | null;
  note: string | null;
  created_at: string;
};

export function StockMovesTable({
  rows,
  lang
}: {
  rows: MoveRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<MoveRow>[] = [
    {
      key: "time",
      label: t("common.time", lang),
      sortValue: (r) => r.created_at,
      render: (r) => (
        <span className="font-mono text-[11px]">
          {new Date(r.created_at).toLocaleString(
            lang === "EN" ? "en-US" : "id-ID",
            {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            }
          )}
        </span>
      )
    },
    {
      key: "item",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => <span className="font-semibold">{r.item_code}</span>
    },
    {
      key: "reason",
      label: t("common.reason", lang),
      sortValue: (r) => r.reason,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${REASON_COLOR[r.reason] ?? REASON_COLOR.adjustment}`}
        >
          {reasonLabel(r.reason, lang)}
        </span>
      )
    },
    {
      key: "delta",
      label: t("common.delta", lang),
      align: "right",
      sortValue: (r) => r.delta,
      render: (r) => (
        <span
          className={`font-mono text-xs font-black ${
            r.delta >= 0 ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {r.delta >= 0 ? "+" : ""}
          {r.delta.toFixed(2)}
        </span>
      )
    },
    {
      key: "ref",
      label: t("stock.colRef", lang),
      sortValue: (r) =>
        r.ref_doc && r.ref_no
          ? `${r.ref_doc.toUpperCase()} ${r.ref_no}`
          : r.ref_doc ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {r.ref_doc && r.ref_no
            ? `${r.ref_doc.toUpperCase()} ${r.ref_no}`
            : r.ref_doc || "—"}
        </span>
      )
    },
    {
      key: "note",
      label: t("common.note", lang),
      align: "left",
      sortValue: (r) => r.note ?? "",
      render: (r) => (
        <span className="text-xs text-ink2/70">{r.note || "—"}</span>
      )
    }
  ];

  return (
    <SortableTable<MoveRow>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "time", dir: "desc" }}
      columns={columns}
      rows={rows}
    />
  );
}
