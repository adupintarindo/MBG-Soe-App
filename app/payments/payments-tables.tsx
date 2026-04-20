"use client";

import { Badge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatIDR } from "@/lib/engine";
import { t, type Lang } from "@/lib/i18n";
import type {
  OutstandingBySupplier,
  CashflowRow as EngineCashflowRow
} from "@/lib/engine";

export type PaymentRow = {
  no: string;
  invoice_no: string | null;
  supplier_id: string | null;
  pay_date: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
};

export type ReceiptRow = {
  no: string;
  receipt_date: string;
  source: string;
  source_name: string | null;
  amount: number;
  period: string | null;
  reference: string | null;
  note: string | null;
};

const METHOD_LABEL: Record<string, { ID: string; EN: string }> = {
  transfer: { ID: "Transfer", EN: "Transfer" },
  tunai: { ID: "Tunai", EN: "Cash" },
  cek: { ID: "Cek", EN: "Check" },
  giro: { ID: "Giro", EN: "Giro" },
  virtual_account: { ID: "VA", EN: "VA" },
  qris: { ID: "QRIS", EN: "QRIS" },
  lainnya: { ID: "Lainnya", EN: "Other" }
};

const SOURCE_LABEL: Record<string, { ID: string; EN: string }> = {
  dinas: { ID: "Dinas", EN: "Govt" },
  wfp: { ID: "WFP", EN: "WFP" },
  ifsr: { ID: "IFSR", EN: "IFSR" },
  ffi: { ID: "FFI", EN: "FFI" },
  donor_swasta: { ID: "Donor", EN: "Donor" },
  lainnya: { ID: "Lainnya", EN: "Other" }
};

export function OutstandingTable({
  rows,
  lang
}: {
  rows: OutstandingBySupplier[];
  lang: Lang;
}) {
  const columns: SortableColumn<OutstandingBySupplier>[] = [
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => r.supplier_name,
      render: (r) => (
        <div>
          <div className="font-semibold">{r.supplier_name}</div>
          <div className="font-mono text-[10px] text-ink2/60">{r.supplier_id}</div>
        </div>
      )
    },
    {
      key: "count",
      label: t("pay.colInvoiceCount", lang),
      align: "right",
      sortValue: (r) => r.invoice_count,
      render: (r) => (
        <span className="font-mono text-xs">{r.invoice_count}</span>
      )
    },
    {
      key: "total",
      label: t("common.total", lang),
      align: "right",
      sortValue: (r) => r.invoice_total,
      render: (r) => (
        <span className="font-mono text-xs">{formatIDR(r.invoice_total)}</span>
      )
    },
    {
      key: "paid",
      label: t("pay.colPaid", lang),
      align: "right",
      sortValue: (r) => r.paid_total,
      render: (r) => (
        <span className="font-mono text-xs text-emerald-700">
          {formatIDR(r.paid_total)}
        </span>
      )
    },
    {
      key: "out",
      label: t("pay.colOutstanding", lang),
      align: "right",
      sortValue: (r) => r.outstanding,
      render: (r) => (
        <span className="font-mono text-xs font-black text-red-700">
          {formatIDR(r.outstanding)}
        </span>
      )
    },
    {
      key: "due",
      label: t("pay.colOldestDue", lang),
      sortValue: (r) => r.oldest_due ?? "",
      render: (r) => {
        if (!r.oldest_due) return <span className="text-ink2/60">—</span>;
        const dueDate = new Date(r.oldest_due);
        const today = new Date();
        const days = Math.floor(
          (today.getTime() - dueDate.getTime()) / 86400000
        );
        return (
          <span
            className={`font-mono text-[11px] ${
              days > 0 ? "font-black text-red-700" : "text-ink2"
            }`}
          >
            {r.oldest_due}
            {days > 0 && <span className="ml-1">(+{days}d)</span>}
          </span>
        );
      }
    }
  ];

  return (
    <SortableTable<OutstandingBySupplier>
      tableClassName="text-sm"
      rowKey={(r) => r.supplier_id}
      initialSort={{ key: "out", dir: "desc" }}
      columns={columns}
      rows={rows}
    />
  );
}

export function CashflowTable({
  rows,
  lang
}: {
  rows: EngineCashflowRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<EngineCashflowRow>[] = [
    {
      key: "period",
      label: t("pay.colPeriod", lang),
      align: "left",
      sortValue: (r) => r.period,
      render: (r) => <span className="font-mono text-xs">{r.period}</span>
    },
    {
      key: "in",
      label: t("pay.colIn", lang),
      align: "right",
      sortValue: (r) => r.cash_in,
      render: (r) => (
        <span className="font-mono text-xs text-emerald-700">
          {formatIDR(r.cash_in)}
        </span>
      )
    },
    {
      key: "out",
      label: t("pay.colOut", lang),
      align: "right",
      sortValue: (r) => r.cash_out,
      render: (r) => (
        <span className="font-mono text-xs text-red-700">
          {formatIDR(r.cash_out)}
        </span>
      )
    },
    {
      key: "net",
      label: t("pay.colNet", lang),
      align: "right",
      sortValue: (r) => r.net,
      render: (r) => (
        <span
          className={`font-mono text-xs font-black ${
            r.net >= 0 ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {formatIDR(r.net)}
        </span>
      )
    },
    {
      key: "cum",
      label: t("pay.colCumulative", lang),
      align: "right",
      sortValue: (r) => r.cumulative,
      render: (r) => (
        <span
          className={`font-mono text-xs ${
            r.cumulative >= 0 ? "text-ink" : "text-red-700"
          }`}
        >
          {formatIDR(r.cumulative)}
        </span>
      )
    }
  ];

  return (
    <SortableTable<EngineCashflowRow>
      tableClassName="text-sm"
      rowKey={(r) => r.period}
      initialSort={{ key: "period", dir: "desc" }}
      columns={columns}
      rows={rows}
    />
  );
}

export function PaymentsTable({
  rows,
  lang
}: {
  rows: PaymentRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<PaymentRow>[] = [
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
      key: "date",
      label: t("common.date", lang),
      sortValue: (r) => r.pay_date,
      render: (r) => (
        <span className="font-mono text-[11px]">{r.pay_date}</span>
      )
    },
    {
      key: "invoice",
      label: t("pay.formInvoice", lang),
      sortValue: (r) => r.invoice_no ?? "",
      render: (r) => (
        <span className="font-mono text-[11px]">{r.invoice_no ?? "—"}</span>
      )
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => r.supplier_id ?? "",
      render: (r) => (
        <span className="text-xs">{r.supplier_id ?? "—"}</span>
      )
    },
    {
      key: "amount",
      label: t("pay.formAmount", lang),
      align: "right",
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatIDR(r.amount)}
        </span>
      )
    },
    {
      key: "method",
      label: t("pay.colMethod", lang),
      sortValue: (r) => r.method,
      render: (r) => {
        const lbl = METHOD_LABEL[r.method]?.[lang] ?? r.method;
        return <Badge tone="info">{lbl}</Badge>;
      }
    },
    {
      key: "ref",
      label: t("pay.colReference", lang),
      align: "left",
      sortValue: (r) => r.reference ?? "",
      render: (r) => (
        <span className="font-mono text-[10px] text-ink2">
          {r.reference ?? "—"}
        </span>
      )
    }
  ];

  return (
    <SortableTable<PaymentRow>
      tableClassName="text-sm"
      rowKey={(r) => r.no}
      initialSort={{ key: "date", dir: "desc" }}
      columns={columns}
      rows={rows}
    />
  );
}

export function ReceiptsTable({
  rows,
  lang
}: {
  rows: ReceiptRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<ReceiptRow>[] = [
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
      key: "date",
      label: t("common.date", lang),
      sortValue: (r) => r.receipt_date,
      render: (r) => (
        <span className="font-mono text-[11px]">{r.receipt_date}</span>
      )
    },
    {
      key: "source",
      label: t("pay.colSource", lang),
      sortValue: (r) => r.source,
      render: (r) => {
        const lbl = SOURCE_LABEL[r.source]?.[lang] ?? r.source;
        return (
          <div>
            <Badge tone="accent">{lbl}</Badge>
            {r.source_name && (
              <div className="mt-0.5 text-[10px] text-ink2/60">
                {r.source_name}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: "amount",
      label: t("pay.formAmount", lang),
      align: "right",
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="font-mono text-xs font-black text-emerald-700">
          {formatIDR(r.amount)}
        </span>
      )
    },
    {
      key: "period",
      label: t("pay.colPeriod", lang),
      sortValue: (r) => r.period ?? "",
      render: (r) => (
        <span className="font-mono text-[11px]">{r.period ?? "—"}</span>
      )
    },
    {
      key: "ref",
      label: t("pay.colReference", lang),
      align: "left",
      sortValue: (r) => r.reference ?? "",
      render: (r) => (
        <span className="font-mono text-[10px] text-ink2">
          {r.reference ?? "—"}
        </span>
      )
    }
  ];

  return (
    <SortableTable<ReceiptRow>
      tableClassName="text-sm"
      rowKey={(r) => r.no}
      initialSort={{ key: "date", dir: "desc" }}
      columns={columns}
      rows={rows}
    />
  );
}
