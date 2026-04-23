"use client";

import Link from "next/link";
import { IDR } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import {
  DateRangeToolbar,
  useDateRangeFilter
} from "@/components/date-range-toolbar";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
import { formatDateLong } from "@/lib/engine";
import type {
  ThreeWayMatchRow,
  ThreeWayMatchStatus
} from "@/lib/engine";

const MATCH_COLOR: Record<ThreeWayMatchStatus, string> = {
  matched: "bg-emerald-100 text-emerald-900",
  over_po: "bg-red-100 text-red-800",
  over_grn: "bg-red-100 text-red-800",
  under_grn: "bg-amber-100 text-amber-900",
  no_grn: "bg-slate-100 text-slate-700",
  no_po: "bg-slate-100 text-slate-500",
  review: "bg-amber-100 text-amber-900"
};

function statusLabel(s: ThreeWayMatchStatus, lang: "EN" | "ID"): string {
  const en: Record<ThreeWayMatchStatus, string> = {
    matched: "Matched",
    over_po: "Over PO",
    over_grn: "Over GRN",
    under_grn: "Under GRN",
    no_grn: "No GRN",
    no_po: "No PO",
    review: "Review"
  };
  const id: Record<ThreeWayMatchStatus, string> = {
    matched: "Cocok",
    over_po: "Lebih dari PO",
    over_grn: "Lebih dari GRN",
    under_grn: "Kurang dari GRN",
    no_grn: "Belum GRN",
    no_po: "Tanpa PO",
    review: "Tinjau"
  };
  return lang === "EN" ? en[s] : id[s];
}

function VarianceCell({ value }: { value: number }) {
  if (Math.abs(value) < 0.01) {
    return <span className="text-xs text-ink2/60">—</span>;
  }
  const positive = value > 0;
  return (
    <span
      className={`text-xs font-bold ${
        positive ? "text-red-700" : "text-amber-800"
      }`}
    >
      {positive ? "+" : ""}
      <IDR value={value} />
    </span>
  );
}

export function ThreeWayMatchTable({ rows }: { rows: ThreeWayMatchRow[] }) {
  const { lang } = useLang();
  const dr = useDateRangeFilter(rows, (r) => r.inv_date);

  const columns: SortableColumn<ThreeWayMatchRow>[] = [
    {
      key: "invoice_no",
      label: t("procurement.colInvoiceNo", lang),
      align: "left",
      sortValue: (r) => r.invoice_no,
      render: (r) => (
        <span className="font-mono text-xs font-black">{r.invoice_no}</span>
      )
    },
    {
      key: "inv_date",
      label: t("common.dayDate", lang),
      align: "left",
      sortValue: (r) => r.inv_date,
      render: (r) => (
        <span className="text-xs">{formatDateLong(r.inv_date, lang)}</span>
      )
    },
    {
      key: "supplier",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => r.supplier_name ?? r.supplier_id,
      render: (r) => (
        <Link
          href={`/suppliers/${r.supplier_id}`}
          className="text-xs font-semibold hover:text-accent-strong hover:underline"
        >
          {r.supplier_name ?? r.supplier_id}
        </Link>
      )
    },
    {
      key: "po_no",
      label: t("procurement.colPO", lang),
      sortValue: (r) => r.po_no ?? "",
      render: (r) =>
        r.po_no ? (
          <span className="font-mono text-xs">{r.po_no}</span>
        ) : (
          <span className="text-xs text-ink2/60">—</span>
        )
    },
    {
      key: "po_total",
      label: lang === "EN" ? "PO" : "PO",
      sortValue: (r) => r.po_total,
      exportValue: (r) => r.po_total,
      render: (r) => <IDR value={r.po_total} className="text-xs" />
    },
    {
      key: "grn_value",
      label: lang === "EN" ? "GRN" : "GRN",
      sortValue: (r) => r.grn_value,
      exportValue: (r) => r.grn_value,
      render: (r) => (
        <div className="flex flex-col items-end">
          <IDR value={r.grn_value} className="text-xs" />
          <span className="text-[10px] text-ink2/60">{r.grn_count}× GRN</span>
        </div>
      )
    },
    {
      key: "invoice_total",
      label: t("common.total", lang),
      sortValue: (r) => r.invoice_total,
      exportValue: (r) => r.invoice_total,
      render: (r) => (
        <IDR value={r.invoice_total} className="text-xs font-black" />
      )
    },
    {
      key: "inv_vs_po",
      label: lang === "EN" ? "Δ vs PO" : "Δ vs PO",
      sortValue: (r) => r.inv_vs_po,
      exportValue: (r) => r.inv_vs_po,
      render: (r) => <VarianceCell value={r.inv_vs_po} />
    },
    {
      key: "inv_vs_grn",
      label: lang === "EN" ? "Δ vs GRN" : "Δ vs GRN",
      sortValue: (r) => r.inv_vs_grn,
      exportValue: (r) => r.inv_vs_grn,
      render: (r) => <VarianceCell value={r.inv_vs_grn} />
    },
    {
      key: "match_status",
      label: t("common.status", lang),
      sortValue: (r) => r.match_status,
      render: (r) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${MATCH_COLOR[r.match_status]}`}
        >
          {statusLabel(r.match_status, lang)}
        </span>
      )
    }
  ];

  return (
    <SortableTable<ThreeWayMatchRow>
      columns={columns}
      rows={dr.filtered}
      rowKey={(r) => r.invoice_no}
      variant="dark"
      searchable
      exportable
      exportFileName="three-way-match"
      exportSheetName="3-Way Match"
      initialSort={{ key: "inv_date", dir: "desc" }}
      stickyHeader
      bodyMaxHeight={520}
      toolbarExtra={
        <DateRangeToolbar
          from={dr.from}
          to={dr.to}
          onChange={dr.onChange}
          onReset={dr.reset}
          rangeActive={dr.rangeActive}
        />
      }
    />
  );
}
