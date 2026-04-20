"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
import {
  SortableTable,
  type SortableColumn,
  type SortableTableFilter
} from "@/components/sortable-table";
import { IDR, Section } from "@/components/ui";
import { formatDateLong } from "@/lib/engine";

export type TxRow = {
  id: number;
  tx_date: string;
  tx_type: "po" | "grn" | "invoice" | "payment" | "adjustment" | "receipt";
  ref_no: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  amount: number | null;
  description: string | null;
};

const TYPE_LABELS: Record<TxRow["tx_type"], string> = {
  po: "PO",
  grn: "GRN",
  invoice: "INV",
  payment: "PAY",
  adjustment: "ADJ",
  receipt: "RCPT"
};

const TYPE_BADGE: Record<TxRow["tx_type"], string> = {
  po: "bg-blue-100 text-blue-800",
  grn: "bg-emerald-100 text-emerald-800",
  invoice: "bg-purple-100 text-purple-800",
  payment: "bg-amber-100 text-amber-800",
  adjustment: "bg-slate-100 text-slate-800",
  receipt: "bg-teal-100 text-teal-800"
};

export function TransactionLog({ rows }: { rows: TxRow[] }) {
  const { lang } = useLang();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const dateRangeFiltered = useMemo(() => {
    return rows.filter((r) => {
      if (dateFrom && r.tx_date < dateFrom) return false;
      if (dateTo && r.tx_date > dateTo) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo]);

  const totalAmount = dateRangeFiltered.reduce(
    (s, r) => s + Number(r.amount ?? 0),
    0
  );

  const rangeActive = dateFrom !== "" || dateTo !== "";

  const dateToolbar = (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{t("dashboard.hppFrom", lang)}</span>
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{t("dashboard.hppTo", lang)}</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      {rangeActive && (
        <button
          type="button"
          onClick={() => {
            setDateFrom("");
            setDateTo("");
          }}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 text-[11px] font-semibold text-ink2 transition hover:bg-ink/[0.04]"
        >
          {t("common.reset", lang)}
        </button>
      )}
    </div>
  );

  const typeFilter: SortableTableFilter<TxRow> = {
    key: "type",
    label: t("tx.allTypes", lang),
    getValue: (r) => r.tx_type,
    options: [
      { value: "po", label: t("tx.typePO", lang) },
      { value: "grn", label: t("tx.typeGRN", lang) },
      { value: "invoice", label: t("tx.typeInvoice", lang) },
      { value: "payment", label: t("tx.typePayment", lang) },
      { value: "adjustment", label: t("tx.typeAdjustment", lang) },
      { value: "receipt", label: t("tx.typeReceipt", lang) }
    ]
  };

  return (
    <Section title={t("tx.title", lang)}>
      {dateRangeFiltered.length === 0 && !rangeActive ? (
        <div className="rounded-xl bg-ink/5 p-4 text-center text-sm text-ink2">
          {t("tx.empty", lang)}
        </div>
      ) : (
        <div className="max-h-[440px] overflow-auto rounded-xl ring-1 ring-ink/10">
          <SortableTable<TxRow>
            stickyHeader
            rowKey={(r) => r.id}
            initialSort={{ key: "date", dir: "desc" }}
            columns={txColumns(lang)}
            rows={dateRangeFiltered}
            searchable
            exportable
            exportFileName="transactions"
            exportSheetName="Transactions"
            toolbarExtra={dateToolbar}
            filters={[typeFilter]}
            footer={
              <tr className="border-t-2 border-ink bg-ink font-black">
                <td
                  colSpan={6}
                  className="px-3 py-2 text-center text-[11px] uppercase tracking-wide text-white"
                >
                  {t("tx.grandTotal", lang)}
                </td>
                <td className="px-3 py-2 text-left">
                  <IDR
                    value={totalAmount}
                    className="text-white"
                    prefixClassName="text-white/70"
                  />
                </td>
              </tr>
            }
          />
        </div>
      )}
    </Section>
  );
}

function txColumns(lang: "ID" | "EN"): SortableColumn<TxRow>[] {
  return [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "48px",
      sortable: false,
      render: (_r, i) => (
        <span className="font-mono text-[11px] text-ink2">{i + 1}</span>
      )
    },
    {
      key: "date",
      label: t("common.dayDate", lang),
      sortValue: (r) => r.tx_date,
      render: (r) => (
        <span className="whitespace-nowrap text-[11px] font-semibold">
          {formatDateLong(r.tx_date, lang)}
        </span>
      )
    },
    {
      key: "type",
      label: t("tx.colType", lang),
      sortValue: (r) => r.tx_type,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${TYPE_BADGE[r.tx_type]}`}
        >
          {TYPE_LABELS[r.tx_type]}
        </span>
      )
    },
    {
      key: "ref",
      label: t("tx.colRef", lang),
      sortValue: (r) => r.ref_no ?? "",
      render: (r) => (
        <span className="font-mono text-[11px]">{r.ref_no ?? "—"}</span>
      )
    },
    {
      key: "supplier",
      label: t("tx.colSupplier", lang),
      align: "left",
      sortValue: (r) => r.supplier_name ?? "",
      render: (r) => r.supplier_name ?? "—"
    },
    {
      key: "desc",
      label: t("tx.colDescription", lang),
      align: "left",
      sortValue: (r) => r.description ?? "",
      render: (r) => (
        <span className="text-ink2">{r.description ?? "—"}</span>
      )
    },
    {
      key: "amount",
      label: t("tx.colAmount", lang),
      align: "left",
      sortValue: (r) => Number(r.amount ?? 0),
      render: (r) =>
        r.amount == null ? (
          <span className="text-ink2/40">—</span>
        ) : (
          <IDR value={Number(r.amount)} />
        )
    }
  ];
}
