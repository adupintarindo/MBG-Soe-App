"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatIDR } from "@/lib/engine";
import { t, type Lang, type LangKey } from "@/lib/i18n";
import type {
  SupplierPoInboxRow,
  SupplierPaymentStatusRow
} from "@/lib/engine";

export type InvoiceUploadRow = {
  id: number;
  po_no: string | null;
  grn_no: string | null;
  invoice_no_supplier: string | null;
  total: number;
  file_url: string;
  status: "pending" | "approved" | "rejected";
  approved_invoice_no: string | null;
  rejected_reason: string | null;
  uploaded_at: string;
};

const ACK_LABEL_KEY: Record<
  SupplierPoInboxRow["ack_decision"],
  LangKey
> = {
  accepted: "sup.ackAccepted",
  rejected: "sup.ackRejected",
  partial: "sup.ackPartial",
  pending: "sup.ackPending"
};

function ackBadge(decision: SupplierPoInboxRow["ack_decision"], lang: Lang) {
  const label = t(ACK_LABEL_KEY[decision], lang);
  const tone =
    decision === "accepted"
      ? "ok"
      : decision === "rejected"
        ? "bad"
        : decision === "partial"
          ? "warn"
          : "muted";
  return <Badge tone={tone}>{label}</Badge>;
}

function poStatusBadge(s: SupplierPoInboxRow["po_status"]) {
  const tone =
    s === "closed" || s === "delivered"
      ? "ok"
      : s === "confirmed" || s === "sent"
        ? "info"
        : s === "cancelled"
          ? "bad"
          : "muted";
  return <Badge tone={tone}>{s}</Badge>;
}

export function SupplierInboxTable({
  rows,
  lang
}: {
  rows: SupplierPoInboxRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<SupplierPoInboxRow>[] = [
    {
      key: "po_no",
      label: "PO",
      align: "left",
      sortValue: (r) => r.po_no,
      render: (r) => (
        <Link
          href={`/supplier/po/${encodeURIComponent(r.po_no)}`}
          className="font-mono text-xs font-black text-primary-strong hover:underline"
        >
          {r.po_no}
        </Link>
      )
    },
    {
      key: "po_date",
      label: t("common.date", lang),
      align: "left",
      sortValue: (r) => r.po_date,
      render: (r) => (
        <span className="font-mono text-[11px]">{r.po_date}</span>
      )
    },
    {
      key: "delivery_date",
      label: lang === "EN" ? "Delivery" : "Kirim",
      align: "left",
      sortValue: (r) => r.delivery_date ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {r.delivery_date ?? "—"}
        </span>
      )
    },
    {
      key: "total",
      label: t("common.total", lang),
      align: "right",
      sortValue: (r) => Number(r.total),
      render: (r) => (
        <span className="font-mono text-xs font-bold">
          {formatIDR(Number(r.total))}
        </span>
      )
    },
    {
      key: "po_status",
      label: t("common.status", lang),
      sortValue: (r) => r.po_status,
      render: (r) => poStatusBadge(r.po_status)
    },
    {
      key: "ack",
      label: t("sup.colDecision", lang),
      sortValue: (r) => r.ack_decision,
      render: (r) => ackBadge(r.ack_decision, lang)
    },
    {
      key: "grn",
      label: t("sup.colGRN", lang),
      sortValue: (r) => r.grn_status ?? "",
      render: (r) =>
        r.grn_status ? (
          <Badge tone="info">{r.grn_status}</Badge>
        ) : (
          <span className="text-ink2/40">—</span>
        )
    },
    {
      key: "inv",
      label: t("sup.colInvoice", lang),
      sortValue: (r) => r.invoice_status ?? "",
      render: (r) =>
        r.invoice_status ? (
          <Badge
            tone={
              r.invoice_status === "paid"
                ? "ok"
                : r.invoice_status === "overdue"
                  ? "bad"
                  : "info"
            }
          >
            {r.invoice_status}
          </Badge>
        ) : (
          <span className="text-ink2/40">—</span>
        )
    },
    {
      key: "unread",
      label: t("sup.colUnread", lang),
      align: "right",
      sortValue: (r) => r.unread_msg,
      render: (r) =>
        r.unread_msg > 0 ? (
          <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-black text-amber-800">
            {r.unread_msg}
          </span>
        ) : (
          <span className="text-ink2/40">—</span>
        )
    }
  ];

  return (
    <SortableTable<SupplierPoInboxRow>
      tableClassName="text-sm"
      rowKey={(r) => r.po_no}
      initialSort={{ key: "po_date", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
      searchPlaceholder={lang === "EN" ? "Search PO..." : "Cari PO..."}
    />
  );
}

export function SupplierPaymentTable({
  rows,
  lang
}: {
  rows: SupplierPaymentStatusRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<SupplierPaymentStatusRow>[] = [
    {
      key: "invoice_no",
      label: t("sup.colInvoice", lang),
      align: "left",
      sortValue: (r) => r.invoice_no,
      render: (r) => (
        <span className="font-mono text-xs font-bold">{r.invoice_no}</span>
      )
    },
    {
      key: "po_no",
      label: "PO",
      align: "left",
      sortValue: (r) => r.po_no ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {r.po_no ?? "—"}
        </span>
      )
    },
    {
      key: "inv_date",
      label: t("common.date", lang),
      align: "left",
      sortValue: (r) => r.inv_date,
      render: (r) => (
        <span className="font-mono text-[11px]">{r.inv_date}</span>
      )
    },
    {
      key: "due_date",
      label: lang === "EN" ? "Due" : "Jatuh Tempo",
      align: "left",
      sortValue: (r) => r.due_date ?? "",
      render: (r) => {
        if (!r.due_date)
          return <span className="text-ink2/40">—</span>;
        const overdue =
          r.status !== "paid" &&
          new Date(r.due_date).getTime() < Date.now();
        return (
          <span
            className={`font-mono text-[11px] ${
              overdue ? "font-black text-red-700" : "text-ink2"
            }`}
          >
            {r.due_date}
          </span>
        );
      }
    },
    {
      key: "total",
      label: t("common.total", lang),
      align: "right",
      sortValue: (r) => Number(r.total),
      render: (r) => (
        <span className="font-mono text-xs">
          {formatIDR(Number(r.total))}
        </span>
      )
    },
    {
      key: "paid",
      label: lang === "EN" ? "Paid" : "Terbayar",
      align: "right",
      sortValue: (r) => Number(r.paid),
      render: (r) => (
        <span className="font-mono text-xs text-emerald-700">
          {formatIDR(Number(r.paid))}
        </span>
      )
    },
    {
      key: "outstanding",
      label: lang === "EN" ? "Outstanding" : "Sisa",
      align: "right",
      sortValue: (r) => Number(r.outstanding),
      render: (r) => (
        <span
          className={`font-mono text-xs font-black ${
            Number(r.outstanding) > 0 ? "text-red-700" : "text-ink2/60"
          }`}
        >
          {formatIDR(Number(r.outstanding))}
        </span>
      )
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => r.status,
      render: (r) => (
        <Badge
          tone={
            r.status === "paid"
              ? "ok"
              : r.status === "overdue"
                ? "bad"
                : r.status === "cancelled"
                  ? "muted"
                  : "info"
          }
        >
          {r.status}
        </Badge>
      )
    }
  ];

  return (
    <SortableTable<SupplierPaymentStatusRow>
      tableClassName="text-sm"
      rowKey={(r) => r.invoice_no}
      initialSort={{ key: "inv_date", dir: "desc" }}
      columns={columns}
      rows={rows}
    />
  );
}

export function SupplierUploadsTable({
  rows,
  lang
}: {
  rows: InvoiceUploadRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<InvoiceUploadRow>[] = [
    {
      key: "uploaded_at",
      label: lang === "EN" ? "Uploaded" : "Waktu Upload",
      align: "left",
      sortValue: (r) => r.uploaded_at,
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {r.uploaded_at.slice(0, 16).replace("T", " ")}
        </span>
      )
    },
    {
      key: "invoice_no_supplier",
      label: t("sup.uploadFormInvNo", lang),
      align: "left",
      sortValue: (r) => r.invoice_no_supplier ?? "",
      render: (r) => (
        <span className="font-mono text-xs">
          {r.invoice_no_supplier ?? "—"}
        </span>
      )
    },
    {
      key: "po_no",
      label: "PO",
      align: "left",
      sortValue: (r) => r.po_no ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {r.po_no ?? "—"}
        </span>
      )
    },
    {
      key: "grn_no",
      label: "GRN",
      align: "left",
      sortValue: (r) => r.grn_no ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {r.grn_no ?? "—"}
        </span>
      )
    },
    {
      key: "total",
      label: t("common.total", lang),
      align: "right",
      sortValue: (r) => r.total,
      render: (r) => (
        <span className="font-mono text-xs font-bold">
          {formatIDR(r.total)}
        </span>
      )
    },
    {
      key: "status",
      label: t("sup.colUploadStatus", lang),
      sortValue: (r) => r.status,
      render: (r) => (
        <Badge
          tone={
            r.status === "approved"
              ? "ok"
              : r.status === "rejected"
                ? "bad"
                : "warn"
          }
        >
          {r.status}
        </Badge>
      )
    },
    {
      key: "file",
      label: lang === "EN" ? "File" : "Berkas",
      sortable: false,
      render: (r) => (
        <a
          href={r.file_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-primary-strong underline underline-offset-2 hover:text-primary"
        >
          {lang === "EN" ? "Open" : "Buka"} ↗
        </a>
      )
    },
    {
      key: "note",
      label: t("common.note", lang),
      align: "left",
      sortValue: (r) => r.rejected_reason ?? r.approved_invoice_no ?? "",
      render: (r) =>
        r.status === "rejected" && r.rejected_reason ? (
          <span className="text-xs text-red-700">{r.rejected_reason}</span>
        ) : r.status === "approved" && r.approved_invoice_no ? (
          <span className="font-mono text-[11px] text-emerald-700">
            → {r.approved_invoice_no}
          </span>
        ) : (
          <span className="text-ink2/40">—</span>
        )
    }
  ];

  return (
    <SortableTable<InvoiceUploadRow>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "uploaded_at", dir: "desc" }}
      columns={columns}
      rows={rows}
    />
  );
}
