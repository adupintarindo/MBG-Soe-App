"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { t, type Lang } from "@/lib/i18n";
import type { DeliverySummaryRow } from "@/lib/engine";
import { formatDateShort, formatDateLong } from "@/lib/engine";

export type StopRow = {
  id: number;
  delivery_no: string;
  stop_order: number;
  school_id: string;
  school_name: string;
  porsi_planned: number;
  porsi_delivered: number;
  arrival_at: string | null;
  temperature_c: number | null;
  receiver_name: string | null;
  signature_url: string | null;
  photo_url: string | null;
  note: string | null;
  status: string;
};

export type DeliveryRow = {
  no: string;
  delivery_date: string;
  menu_id: number | null;
  driver_name: string | null;
  vehicle: string | null;
  status: string;
  total_porsi_planned: number;
  total_porsi_delivered: number;
  stops: StopRow[];
};

function statusBadge(s: string, lang: Lang) {
  if (s === "delivered")
    return <Badge tone="ok">{t("del.statusDelivered", lang)}</Badge>;
  if (s === "partial")
    return <Badge tone="warn">{t("del.statusPartial", lang)}</Badge>;
  if (s === "dispatched")
    return <Badge tone="info">{t("del.statusDispatched", lang)}</Badge>;
  if (s === "cancelled")
    return <Badge tone="bad">{t("del.statusCancelled", lang)}</Badge>;
  return <Badge tone="muted">{t("del.statusPlanned", lang)}</Badge>;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function DeliveryManifestTable({
  delivery,
  lang,
  canWrite
}: {
  delivery: DeliveryRow;
  lang: Lang;
  canWrite: boolean;
}) {
  const columns: SortableColumn<StopRow>[] = [
    {
      key: "order",
      label: "#",
      width: "40px",
      align: "center",
      sortValue: (r) => r.stop_order,
      render: (r) => <span className="font-mono text-xs">{r.stop_order}</span>
    },
    {
      key: "school",
      label: t("del.colSchool", lang),
      align: "left",
      sortValue: (r) => r.school_name,
      render: (r) => (
        <div>
          <div className="font-semibold">{r.school_name}</div>
          <div className="font-mono text-[10px] text-ink2/60">
            {r.school_id}
          </div>
        </div>
      )
    },
    {
      key: "planned",
      label: t("del.colPlanned", lang),
      align: "right",
      sortValue: (r) => r.porsi_planned,
      render: (r) => (
        <span className="font-mono text-xs">{r.porsi_planned}</span>
      )
    },
    {
      key: "delivered",
      label: t("del.colDelivered", lang),
      align: "right",
      sortValue: (r) => r.porsi_delivered,
      render: (r) => (
        <span
          className={`font-mono text-xs font-black ${
            r.porsi_delivered >= r.porsi_planned
              ? "text-emerald-700"
              : r.porsi_delivered > 0
                ? "text-amber-700"
                : "text-ink2/60"
          }`}
        >
          {r.porsi_delivered}
        </span>
      )
    },
    {
      key: "arrival",
      label: t("del.colArrival", lang),
      sortValue: (r) => r.arrival_at ?? "",
      render: (r) => (
        <span className="font-mono text-[11px]">
          {formatTime(r.arrival_at)}
        </span>
      )
    },
    {
      key: "receiver",
      label: t("del.colReceiver", lang),
      align: "left",
      sortValue: (r) => r.receiver_name ?? "",
      render: (r) => (
        <span className="text-xs">{r.receiver_name ?? "—"}</span>
      )
    },
    {
      key: "temp",
      label: t("del.colTemp", lang),
      align: "right",
      sortValue: (r) => r.temperature_c ?? -999,
      render: (r) => (
        <span className="font-mono text-[11px]">
          {r.temperature_c != null ? `${r.temperature_c}°C` : "—"}
        </span>
      )
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => r.status,
      render: (r) => statusBadge(r.status, lang)
    },
    {
      key: "pod",
      label: "POD",
      sortable: false,
      render: (r) =>
        canWrite ? (
          <Link
            href={`/deliveries/${encodeURIComponent(r.delivery_no)}/pod/${r.id}`}
            className="rounded-lg bg-ink px-2 py-1 text-[10px] font-black text-white hover:bg-ink2"
          >
            {t("del.btnPOD", lang)}
          </Link>
        ) : (
          <span className="text-xs text-ink2/60">—</span>
        )
    }
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink2">
        <span>
          <b className="font-mono">{delivery.no}</b>
        </span>
        <span>·</span>
        <span>{formatDateShort(delivery.delivery_date)}</span>
        {delivery.menu_id != null && (
          <>
            <span>·</span>
            <span>
              Menu <b>M{delivery.menu_id}</b>
            </span>
          </>
        )}
        {delivery.driver_name && (
          <>
            <span>·</span>
            <span>
              Driver <b>{delivery.driver_name}</b>
            </span>
          </>
        )}
        {delivery.vehicle && (
          <>
            <span>·</span>
            <span>
              Kendaraan <b>{delivery.vehicle}</b>
            </span>
          </>
        )}
        <span>·</span>
        {statusBadge(delivery.status, lang)}
      </div>
      <SortableTable<StopRow>
        tableClassName="text-sm"
        rowKey={(r) => r.id}
        initialSort={{ key: "order", dir: "asc" }}
        columns={columns}
        rows={delivery.stops}
      />
    </div>
  );
}

export function DeliveryHistoryTable({
  rows,
  summary,
  lang
}: {
  rows: DeliveryRow[];
  summary: DeliverySummaryRow[];
  lang: Lang;
}) {
  const summaryByDate = new Map(summary.map((s) => [s.delivery_date, s]));

  const columns: SortableColumn<DeliveryRow>[] = [
    {
      key: "date",
      label: t("common.dayDate", lang),
      align: "left",
      sortValue: (r) => r.delivery_date,
      render: (r) => (
        <span className="text-[11px] font-semibold">{formatDateLong(r.delivery_date, lang)}</span>
      )
    },
    {
      key: "no",
      label: "No",
      align: "left",
      sortValue: (r) => r.no,
      render: (r) => (
        <span className="font-mono text-[11px] font-semibold">{r.no}</span>
      )
    },
    {
      key: "stops",
      label: t("del.colStops", lang),
      align: "right",
      sortValue: (r) => r.stops.length,
      render: (r) => (
        <span className="font-mono text-xs">{r.stops.length}</span>
      )
    },
    {
      key: "planned",
      label: t("del.colPlanned", lang),
      align: "right",
      sortValue: (r) => r.total_porsi_planned,
      render: (r) => (
        <span className="font-mono text-xs">{r.total_porsi_planned}</span>
      )
    },
    {
      key: "delivered",
      label: t("del.colDelivered", lang),
      align: "right",
      sortValue: (r) => r.total_porsi_delivered,
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {r.total_porsi_delivered}
        </span>
      )
    },
    {
      key: "fulfil",
      label: t("del.colFulfilment", lang),
      align: "right",
      sortValue: (r) => {
        const s = summaryByDate.get(r.delivery_date);
        return s?.fulfilment_pct ?? 0;
      },
      render: (r) => {
        const s = summaryByDate.get(r.delivery_date);
        const pct = Number(s?.fulfilment_pct ?? 0);
        return (
          <span
            className={`font-mono text-xs font-black ${
              pct >= 95
                ? "text-emerald-700"
                : pct >= 80
                  ? "text-amber-700"
                  : "text-red-700"
            }`}
          >
            {pct.toFixed(0)}%
          </span>
        );
      }
    },
    {
      key: "driver",
      label: t("del.colDriver", lang),
      align: "left",
      sortValue: (r) => r.driver_name ?? "",
      render: (r) => (
        <span className="text-xs">{r.driver_name ?? "—"}</span>
      )
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => r.status,
      render: (r) => statusBadge(r.status, lang)
    }
  ];

  return (
    <SortableTable<DeliveryRow>
      tableClassName="text-sm"
      rowKey={(r) => r.no}
      initialSort={{ key: "date", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
    />
  );
}
