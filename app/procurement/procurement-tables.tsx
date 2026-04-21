"use client";

import Link from "next/link";
import { IDR } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { t, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
import { formatDateLong } from "@/lib/engine";

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
        <span className="text-xs text-ink2">{formatDateLong(r.created_at, lang)}</span>
      )
    },
    {
      key: "need",
      label: t("procurement.colNeeded", lang),
      sortValue: (r) => r.need_date,
      render: (r) => <span className="text-xs">{formatDateLong(r.need_date, lang)}</span>
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
      stickyHeader
      bodyMaxHeight={500}
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
      render: (r) => (
        <Link
          href={`/suppliers/${r.supplier_id}`}
          className="text-xs font-semibold hover:text-accent-strong hover:underline"
        >
          {supName(r.supplier_id)}
        </Link>
      )
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
      align: "left",
      sortValue: (r) => Number(r.total),
      exportValue: (r) => Number(r.total),
      render: (r) => (
        <IDR value={Number(r.total)} className="text-xs font-black" />
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

  const totalQt = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);

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
      stickyHeader
      bodyMaxHeight={500}
      footer={
        <tr className="border-t-2 border-ink bg-ink">
          <td
            colSpan={5}
            className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
          >
            {t("common.grandTotal", lang)}
          </td>
          <td className="py-2 px-3 text-left">
            <IDR
              value={totalQt}
              className="text-xs font-black text-white"
              prefixClassName="text-white/70"
            />
          </td>
          <td colSpan={3}></td>
        </tr>
      }
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
      label: t("common.dayDate", lang),
      align: "left",
      sortValue: (r) => r.po_date,
      render: (r) => <span className="text-xs">{formatDateLong(r.po_date, lang)}</span>
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => supName(r.supplier_id),
      render: (r) => (
        <Link
          href={`/suppliers/${r.supplier_id}`}
          className="text-xs font-semibold hover:text-accent-strong hover:underline"
        >
          {supName(r.supplier_id)}
        </Link>
      )
    },
    {
      key: "delivery",
      label: t("common.delivery", lang),
      sortValue: (r) => r.delivery_date ?? "",
      render: (r) => (
        <span className="text-xs">
          {r.delivery_date ? formatDateLong(r.delivery_date, lang) : "—"}
        </span>
      )
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
      align: "left",
      sortValue: (r) => Number(r.total),
      exportValue: (r) => Number(r.total),
      render: (r) => (
        <IDR value={Number(r.total)} className="text-xs font-black" />
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

  const totalItems = rows.reduce((s, r) => s + (rowCountByPO[r.no] ?? 0), 0);
  const totalQty = rows.reduce((s, r) => s + (qtyByPO[r.no] ?? 0), 0);
  const totalPo = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);

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
      stickyHeader
      bodyMaxHeight={500}
      footer={
        <tr className="border-t-2 border-ink bg-ink">
          <td
            colSpan={4}
            className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
          >
            {t("common.grandTotal", lang)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs font-black text-white">
            {formatNumber(totalItems, lang)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs font-black text-white">
            {formatNumber(totalQty, lang, { maximumFractionDigits: 1 })}
          </td>
          <td className="py-2 px-3 text-left">
            <IDR
              value={totalPo}
              className="text-xs font-black text-white"
              prefixClassName="text-white/70"
            />
          </td>
          <td colSpan={2}></td>
        </tr>
      }
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
      label: t("common.dayDate", lang),
      align: "left",
      sortValue: (r) => r.inv_date,
      render: (r) => <span className="text-xs">{formatDateLong(r.inv_date, lang)}</span>
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => supName(r.supplier_id),
      render: (r) => (
        <Link
          href={`/suppliers/${r.supplier_id}`}
          className="text-xs font-semibold hover:text-accent-strong hover:underline"
        >
          {supName(r.supplier_id)}
        </Link>
      )
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
      align: "left",
      sortValue: (r) => Number(r.total),
      exportValue: (r) => Number(r.total),
      render: (r) => (
        <IDR value={Number(r.total)} className="text-xs font-black" />
      )
    },
    {
      key: "due",
      label: t("procurement.colDueDate", lang),
      sortValue: (r) => r.due_date ?? "",
      render: (r) => (
        <span className="text-xs">
          {r.due_date ? formatDateLong(r.due_date, lang) : "—"}
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
            INV_STATUS_COLOR[r.status] ?? INV_STATUS_COLOR.issued
          }`}
        >
          {r.status}
        </span>
      )
    }
  ];

  const totalInv = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);

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
      stickyHeader
      bodyMaxHeight={500}
      footer={
        <tr className="border-t-2 border-ink bg-ink">
          <td
            colSpan={4}
            className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
          >
            {t("common.grandTotal", lang)}
          </td>
          <td className="py-2 px-3 text-left">
            <IDR
              value={totalInv}
              className="text-xs font-black text-white"
              prefixClassName="text-white/70"
            />
          </td>
          <td colSpan={2}></td>
        </tr>
      }
    />
  );
}

export interface PrQuotationRow {
  no: string;
  supplier_id: string;
  status: string;
  total: number | string;
  need_date: string | null;
  converted_po_no: string | null;
}

export function PrQuotationsTable({
  rows,
  supplierNames
}: {
  rows: PrQuotationRow[];
  supplierNames: Record<string, string>;
}) {
  const { lang } = useLang();
  const supName = (id: string) => supplierNames[id] ?? id;
  const columns: SortableColumn<PrQuotationRow>[] = [
    {
      key: "no",
      label: t("prDetail.colNo", lang),
      align: "left",
      sortValue: (r) => r.no,
      render: (r) => <span className="font-mono text-xs font-black">{r.no}</span>
    },
    {
      key: "supplier",
      label: t("prDetail.colSupplier", lang),
      align: "left",
      sortValue: (r) => supName(r.supplier_id),
      render: (r) => (
        <Link
          href={`/suppliers/${r.supplier_id}`}
          className="text-xs font-semibold hover:text-accent-strong hover:underline"
        >
          {supName(r.supplier_id)}
        </Link>
      )
    },
    {
      key: "status",
      label: t("prDetail.colStatus", lang),
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
      key: "total",
      label: t("prDetail.colValue", lang),
      align: "right",
      sortValue: (r) => Number(r.total),
      exportValue: (r) => Number(r.total),
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(Number(r.total), lang)}
        </span>
      )
    },
    {
      key: "po",
      label: t("prDetail.colPo", lang),
      sortValue: (r) => r.converted_po_no ?? "",
      render: (r) => (
        <span className="font-mono text-[11px]">{r.converted_po_no ?? "—"}</span>
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
          {t("prDetail.linkDetail", lang)}
        </Link>
      )
    }
  ];
  const totalPrQt = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);

  return (
    <SortableTable<PrQuotationRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.no}
      variant="dark"
      initialSort={{ key: "no", dir: "asc" }}
      footer={
        <tr className="border-t-2 border-ink bg-ink">
          <td
            colSpan={3}
            className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
          >
            {t("common.grandTotal", lang)}
          </td>
          <td className="py-2 px-3 text-right font-mono text-xs font-black text-white">
            {formatNumber(totalPrQt, lang)}
          </td>
          <td colSpan={2}></td>
        </tr>
      }
    />
  );
}

export interface QuotationRow {
  line_no: number;
  item_code: string;
  item_name: string;
  qty: number;
  unit: string;
  price_suggested: number | null;
  qty_quoted: number | null;
  price_quoted: number | null;
  subtotal: number;
  note: string | null;
}

export function QuotationRowsTable({
  rows,
  totalLabel,
  total
}: {
  rows: QuotationRow[];
  totalLabel: string;
  total: number;
}) {
  const { lang } = useLang();
  const columns: SortableColumn<QuotationRow>[] = [
    {
      key: "line",
      label: t("qtDetail.colNo", lang),
      sortValue: (r) => r.line_no,
      render: (r) => <span className="font-mono text-xs">{r.line_no}</span>
    },
    {
      key: "item",
      label: t("qtDetail.colItem", lang),
      align: "left",
      sortValue: (r) => r.item_name,
      render: (r) => (
        <div>
          <div className="text-xs font-bold">{r.item_name}</div>
          <div className="font-mono text-[10px] text-ink2/60">{r.item_code}</div>
        </div>
      )
    },
    {
      key: "qty",
      label: t("qtDetail.colQty", lang),
      align: "right",
      sortValue: (r) => r.qty,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.qty, lang, { maximumFractionDigits: 3 })}
        </span>
      )
    },
    {
      key: "unit",
      label: t("qtDetail.colUnit", lang),
      sortValue: (r) => r.unit,
      render: (r) => <span className="text-xs">{r.unit}</span>
    },
    {
      key: "suggest",
      label: t("qtDetail.colSuggest", lang),
      align: "left",
      sortValue: (r) => r.price_suggested ?? 0,
      render: (r) =>
        r.price_suggested != null ? (
          <IDR value={r.price_suggested} className="text-xs text-ink2" />
        ) : (
          <span className="text-ink2/40">—</span>
        )
    },
    {
      key: "qtyFinal",
      label: t("qtDetail.colFinalQty", lang),
      align: "right",
      sortValue: (r) => r.qty_quoted ?? 0,
      render: (r) => (
        <span className="font-mono text-xs">
          {r.qty_quoted != null
            ? formatNumber(r.qty_quoted, lang, { maximumFractionDigits: 3 })
            : "—"}
        </span>
      )
    },
    {
      key: "priceFinal",
      label: t("qtDetail.colFinalPrice", lang),
      align: "left",
      sortValue: (r) => r.price_quoted ?? 0,
      render: (r) =>
        r.price_quoted != null ? (
          <IDR value={r.price_quoted} className="text-xs font-black text-emerald-800" />
        ) : (
          <span className="text-ink2/40">—</span>
        )
    },
    {
      key: "subtotal",
      label: t("qtDetail.colSubtotal", lang),
      align: "left",
      sortValue: (r) => r.subtotal,
      exportValue: (r) => r.subtotal,
      render: (r) => <IDR value={r.subtotal} className="text-xs font-black" />
    },
    {
      key: "note",
      label: t("qtDetail.colNote", lang),
      align: "left",
      sortable: false,
      render: (r) => (
        <span className="text-[11px] text-ink2">{r.note ?? "—"}</span>
      )
    }
  ];
  return (
    <SortableTable<QuotationRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.line_no}
      initialSort={{ key: "line", dir: "asc" }}
      footer={
        <tr>
          <td colSpan={7} className="py-2 pr-3 text-right font-black">
            {totalLabel}
          </td>
          <td className="py-2 pr-3 font-black text-ink">
            <IDR value={total} className="font-black" />
          </td>
          <td></td>
        </tr>
      }
    />
  );
}
