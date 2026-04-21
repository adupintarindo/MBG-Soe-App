"use client";

import { Badge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { t, formatNumber, type Lang } from "@/lib/i18n";
import { formatDateLong } from "@/lib/engine";

export type ExpiringBatchRow = {
  id: number;
  item_code: string;
  item_name: string | null;
  grn_no: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  qty_remaining: number;
  unit: string;
  expiry_date: string;
  days_left: number;
  status: "expired" | "urgent" | "soon" | string;
};

export type BatchRow = {
  id: number;
  item_code: string;
  batch_code: string | null;
  grn_no: string | null;
  supplier_id: string | null;
  qty_received: number;
  qty_remaining: number;
  unit: string;
  received_date: string | null;
  expiry_date: string | null;
};

function statusBadge(s: string, lang: Lang) {
  if (s === "expired")
    return <Badge tone="bad">{t("batch.statusExpired", lang)}</Badge>;
  if (s === "urgent")
    return <Badge tone="warn">{t("batch.statusUrgent", lang)}</Badge>;
  if (s === "soon")
    return <Badge tone="info">{t("batch.statusSoon", lang)}</Badge>;
  return <Badge tone="ok">{t("batch.statusOK", lang)}</Badge>;
}

export function ExpiringBatchTable({
  rows,
  lang
}: {
  rows: ExpiringBatchRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<ExpiringBatchRow>[] = [
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => (r.status === "expired" ? 0 : r.status === "urgent" ? 1 : 2),
      render: (r) => statusBadge(r.status, lang)
    },
    {
      key: "item",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => (
        <div>
          <div className="font-semibold">{r.item_code}</div>
          {r.item_name && (
            <div className="text-[10px] text-ink2/60">{r.item_name}</div>
          )}
        </div>
      )
    },
    {
      key: "qty",
      label: t("batch.colRemaining", lang),
      align: "right",
      sortValue: (r) => r.qty_remaining,
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(r.qty_remaining, lang, { maximumFractionDigits: 2 })}{" "}
          {r.unit}
        </span>
      )
    },
    {
      key: "expiry",
      label: t("batch.colExpiry", lang),
      sortValue: (r) => r.expiry_date,
      render: (r) => (
        <span className="text-[11px]">{formatDateLong(r.expiry_date, lang)}</span>
      )
    },
    {
      key: "days",
      label: t("batch.colDaysLeft", lang),
      align: "right",
      sortValue: (r) => r.days_left,
      render: (r) => (
        <span
          className={`font-mono text-xs font-black ${
            r.days_left < 0
              ? "text-red-700"
              : r.days_left <= 3
                ? "text-amber-700"
                : "text-ink2"
          }`}
        >
          {r.days_left < 0 ? `${r.days_left}` : r.days_left}d
        </span>
      )
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => r.supplier_name ?? r.supplier_id ?? "",
      render: (r) => (
        <span className="text-xs text-ink2">
          {r.supplier_name ?? r.supplier_id ?? "—"}
        </span>
      )
    },
    {
      key: "grn",
      label: "GRN",
      sortValue: (r) => r.grn_no ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2/80">
          {r.grn_no ?? "—"}
        </span>
      )
    }
  ];

  return (
    <SortableTable<ExpiringBatchRow>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "status", dir: "asc" }}
      columns={columns}
      rows={rows}
      stickyHeader
      bodyMaxHeight={460}
    />
  );
}

export function BatchTable({
  rows,
  lang
}: {
  rows: BatchRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<BatchRow>[] = [
    {
      key: "item",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => <span className="font-semibold">{r.item_code}</span>
    },
    {
      key: "batch",
      label: t("batch.colBatchCode", lang),
      align: "left",
      sortValue: (r) => r.batch_code ?? "",
      render: (r) => (
        <span className="font-mono text-[11px]">{r.batch_code ?? "—"}</span>
      )
    },
    {
      key: "received",
      label: t("batch.colReceived", lang),
      sortValue: (r) => r.received_date ?? "",
      render: (r) => (
        <span className="text-[11px]">
          {r.received_date ? formatDateLong(r.received_date, lang) : "—"}
        </span>
      )
    },
    {
      key: "expiry",
      label: t("batch.colExpiry", lang),
      sortValue: (r) => r.expiry_date ?? "",
      render: (r) => (
        <span className="text-[11px]">
          {r.expiry_date ? formatDateLong(r.expiry_date, lang) : "—"}
        </span>
      )
    },
    {
      key: "recv",
      label: t("common.qty", lang),
      align: "right",
      sortValue: (r) => r.qty_received,
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {formatNumber(r.qty_received, lang, { maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: "remaining",
      label: t("batch.colRemaining", lang),
      align: "right",
      sortValue: (r) => r.qty_remaining,
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(r.qty_remaining, lang, { maximumFractionDigits: 2 })}{" "}
          {r.unit}
        </span>
      )
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => r.supplier_id ?? "",
      render: (r) => (
        <span className="text-xs text-ink2">{r.supplier_id ?? "—"}</span>
      )
    },
    {
      key: "grn",
      label: "GRN",
      sortValue: (r) => r.grn_no ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2/80">
          {r.grn_no ?? "—"}
        </span>
      )
    }
  ];

  return (
    <SortableTable<BatchRow>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "expiry", dir: "asc" }}
      columns={columns}
      rows={rows}
      searchable
      stickyHeader
      bodyMaxHeight={500}
    />
  );
}
