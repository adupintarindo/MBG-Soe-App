"use client";

import Link from "next/link";
import { formatIDR } from "@/lib/engine";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { t, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

const PO_STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  closed: "bg-green-100 text-green-900",
  cancelled: "bg-red-100 text-red-800"
};

const INV_STATUS_COLOR: Record<string, string> = {
  issued: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700"
};

const QT_STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-blue-100 text-blue-800",
  responded: "bg-amber-100 text-amber-900",
  accepted: "bg-emerald-100 text-emerald-900",
  converted: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-slate-100 text-slate-500"
};

const PR_STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  allocated: "bg-amber-100 text-amber-900",
  quotations_issued: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-red-100 text-red-800"
};

export interface PrRow {
  no: string;
  need_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface PoRow {
  no: string;
  po_date: string;
  supplier_id: string;
  delivery_date: string | null;
  total: number | string;
  status: string;
  pay_method: string | null;
  top: string | null;
  notes: string | null;
}

export interface QtRow {
  no: string;
  supplier_id: string;
  quote_date: string;
  valid_until: string | null;
  need_date: string | null;
  total: number | string;
  status: string;
  converted_po_no: string | null;
}

export interface InvoiceRow {
  no: string;
  po_no: string | null;
  inv_date: string;
  supplier_id: string;
  total: number | string;
  due_date: string | null;
  status: string;
}

export function PrTable({ rows }: { rows: PrRow[] }) {
  const { lang } = useLang();
  const columns: SortableColumn<PrRow>[] = [
    {
      key: "no",
      label: t("procurement.colPRNo", lang),
      align: "left",
      sortValue: (r) => r.no,
      render: (r) => <span className="font-mono text-xs font-black">{r.no}</span>
    },
    {
      key: "created",
      label: t("procurement.colCreated", lang),
      sortValue: (r) => r.created_at,
      render: (r) => (
        <span className="text-xs text-ink2">{r.created_at.slice(0, 10)}</span>
      )
    },
    {
      key: "need",
      label: t("procurement.colNeeded", lang),
      sortValue: (r) => r.need_date,
      render: (r) => <span className="text-xs">{r.need_date}</span>
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => r.status,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            PR_STATUS_COLOR[r.status] ?? PR_STATUS_COLOR.draft
          }`}
        >
          {r.status}
        </span>
      )
    },
    {
      key: "notes",
      label: t("common.note", lang),
      align: "left",
      sortable: false,
      sortValue: (r) => r.notes ?? "",
      render: (r) => (
        <span className="text-[11px] italic text-ink2/70">
          {r.notes ?? "—"}
        </span>
      )
    },
    {
      key: "detail",
      label: "",
      align: "right",
      sortable: false,
      render: (r) => (
        <Link
          href={`/procurement/requisition/${encodeURIComponent(r.no)}`}
          className="text-[11px] font-bold text-accent-strong hover:underline"
        >
          {t("common.detail", lang)} →
        </Link>
      )
    }
  ];

  return (
    <SortableTable<PrRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.no}
      variant="dark"
      searchable
      exportable
      exportFileName="pr"
      exportSheetName="PR"
      initialSort={{ key: "created", dir: "desc" }}
    />
  );
}

export function QtTable({
  rows,
  supplierNames
}: {
  rows: QtRow[];
  supplierNames: Record<string, string>;
}) {
  const { lang } = useLang();
  const supName = (id: string) => supplierNames[id] ?? id;
  const columns: SortableColumn<QtRow>[] = [
    {
      key: "no",
      label: "No.",
      align: "left",
      sortValue: (r) => r.no,
      render: (r) => <span className="font-mono text-xs font-black">{r.no}</span>
    },
    {
      key: "date",
      label: t("common.date", lang),
      sortValue: (r) => r.quote_date,
      render: (r) => <span className="text-xs">{r.quote_date}</span>
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => supName(r.supplier_id),
      render: (r) => <span className="text-xs">{supName(r.supplier_id)}</span>
    },
    {
      key: "need",
      label: t("procurement.colNeeded", lang),
      sortValue: (r) => r.need_date ?? "",
      render: (r) => <span className="text-xs">{r.need_date ?? "—"}</span>
    },
    {
      key: "valid",
      label: t("procurement.colValidUntil", lang),
      sortValue: (r) => r.valid_until ?? "",
      render: (r) => <span className="text-xs">{r.valid_until ?? "—"}</span>
    },
    {
      key: "total",
      label: t("procurement.colAmount", lang),
      align: "right",
      sortValue: (r) => Number(r.total),
      exportValue: (r) => Number(r.total),
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatIDR(Number(r.total))}
        </span>
      )
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => r.status,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            QT_STATUS_COLOR[r.status] ?? QT_STATUS_COLOR.draft
          }`}
        >
          {r.status}
        </span>
      )
    },
    {
      key: "po",
      label: t("procurement.colPO", lang),
      sortValue: (r) => r.converted_po_no ?? "",
      render: (r) => (
        <span className="font-mono text-xs">{r.converted_po_no ?? "—"}</span>
      )
    },
    {
      key: "detail",
      label: "",
      align: "right",
      sortable: false,
      render: (r) => (
        <Link
          href={`/procurement/quotation/${encodeURIComponent(r.no)}`}
          className="text-[11px] font-bold text-accent-strong hover:underline"
        >
          {t("common.detail", lang)} →
        </Link>
      )
    }
  ];

  return (
    <SortableTable<QtRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.no}
      variant="dark"
      searchable
      exportable
      exportFileName="quotations"
      exportSheetName="Quotations"
      initialSort={{ key: "date", dir: "desc" }}
    />
  );
}

export function PoTable({
  rows,
  supplierNames,
  rowCountByPO,
  qtyByPO
}: {
  rows: PoRow[];
  supplierNames: Record<string, string>;
  rowCountByPO: Record<string, number>;
  qtyByPO: Record<string, number>;
}) {
  const { lang } = useLang();
  const supName = (id: string) => supplierNames[id] ?? id;
  const columns: SortableColumn<PoRow>[] = [
    {
      key: "no",
      label: "No.",
      align: "left",
      sortValue: (r) => r.no,
      render: (r) => <span className="font-mono text-xs font-black">{r.no}</span>
    },
    {
      key: "date",
      label: t("common.date", lang),
      sortValue: (r) => r.po_date,
      render: (r) => <span className="text-xs">{r.po_date}</span>
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => supName(r.supplier_id),
      render: (r) => <span className="text-xs">{supName(r.supplier_id)}</span>
    },
    {
      key: "delivery",
      label: t("common.delivery", lang),
      sortValue: (r) => r.delivery_date ?? "",
      render: (r) => <span className="text-xs">{r.delivery_date ?? "—"}</span>
    },
    {
      key: "items",
      label: t("procurement.colItems", lang),
      align: "right",
      sortValue: (r) => rowCountByPO[r.no] ?? 0,
      render: (r) => (
        <span className="font-mono text-xs">{rowCountByPO[r.no] ?? 0}</span>
      )
    },
    {
      key: "qty",
      label: t("procurement.colTotalQty", lang),
      align: "right",
      sortValue: (r) => qtyByPO[r.no] ?? 0,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(qtyByPO[r.no] ?? 0, lang, { maximumFractionDigits: 1 })}
        </span>
      )
    },
    {
      key: "total",
      label: t("procurement.colAmount", lang),
      align: "right",
      sortValue: (r) => Number(r.total),
      exportValue: (r) => Number(r.total),
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatIDR(Number(r.total))}
        </span>
      )
    },
    {
      key: "top",
      label: "TOP",
      sortValue: (r) => r.top ?? "",
      render: (r) => <span className="text-xs">{r.top ?? "—"}</span>
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => r.status,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            PO_STATUS_COLOR[r.status] ?? PO_STATUS_COLOR.draft
          }`}
        >
          {r.status}
        </span>
      )
    }
  ];

  return (
    <SortableTable<PoRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.no}
      variant="dark"
      searchable
      exportable
      exportFileName="purchase-orders"
      exportSheetName="POs"
      initialSort={{ key: "date", dir: "desc" }}
    />
  );
}

export function InvoiceTable({
  rows,
  supplierNames
}: {
  rows: InvoiceRow[];
  supplierNames: Record<string, string>;
}) {
  const { lang } = useLang();
  const supName = (id: string) => supplierNames[id] ?? id;
  const columns: SortableColumn<InvoiceRow>[] = [
    {
      key: "no",
      label: t("procurement.colInvoiceNo", lang),
      align: "left",
      sortValue: (r) => r.no,
      render: (r) => <span className="font-mono text-xs font-black">{r.no}</span>
    },
    {
      key: "date",
      label: t("common.date", lang),
      sortValue: (r) => r.inv_date,
      render: (r) => <span className="text-xs">{r.inv_date}</span>
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => supName(r.supplier_id),
      render: (r) => <span className="text-xs">{supName(r.supplier_id)}</span>
    },
    {
      key: "po",
      label: t("procurement.colPO", lang),
      sortValue: (r) => r.po_no ?? "",
      render: (r) => (
        <span className="font-mono text-xs">{r.po_no ?? "—"}</span>
      )
    },
    {
      key: "total",
      label: t("common.total", lang),
      align: "right",
      sortValue: (r) => Number(r.total),
      exportValue: (r) => Number(r.total),
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatIDR(Number(r.total))}
        </span>
      )
    },
    {
      key: "due",
      label: t("procurement.colDueDate", lang),
      sortValue: (r) => r.due_date ?? "",
      render: (r) => <span className="text-xs">{r.due_date ?? "—"}</span>
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => r.status,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            INV_STATUS_COLOR[r.status] ?? INV_STATUS_COLOR.issued
          }`}
        >
          {r.status}
        </span>
      )
    }
  ];

  return (
    <SortableTable<InvoiceRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.no}
      variant="dark"
      searchable
      exportable
      exportFileName="invoices"
      exportSheetName="Invoices"
      initialSort={{ key: "date", dir: "desc" }}
    />
  );
}
