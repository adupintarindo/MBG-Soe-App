"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
import {
  SortableTable,
  type SortableColumn
} from "@/components/sortable-table";
import { IDR, Section } from "@/components/ui";
import { formatDateLong, formatIDR } from "@/lib/engine";
import type { Lang } from "@/lib/i18n";

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

type TxTypeTab = "all" | TxRow["tx_type"];

export function TransactionLog({ rows }: { rows: TxRow[] }) {
  const { lang } = useLang();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeType, setActiveType] = useState<TxTypeTab>("all");
  const [detailOpen, setDetailOpen] = useState<TxRow | null>(null);

  const dateRangeFiltered = useMemo(() => {
    return rows.filter((r) => {
      if (dateFrom && r.tx_date < dateFrom) return false;
      if (dateTo && r.tx_date > dateTo) return false;
      if (activeType !== "all" && r.tx_type !== activeType) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo, activeType]);

  const typeCounts = useMemo(() => {
    const base = rows.filter((r) => {
      if (dateFrom && r.tx_date < dateFrom) return false;
      if (dateTo && r.tx_date > dateTo) return false;
      return true;
    });
    const counts: Record<TxTypeTab, number> = {
      all: base.length,
      po: 0,
      grn: 0,
      invoice: 0,
      payment: 0,
      adjustment: 0,
      receipt: 0
    };
    for (const r of base) counts[r.tx_type] += 1;
    return counts;
  }, [rows, dateFrom, dateTo]);

  const totalAmount = dateRangeFiltered.reduce(
    (s, r) => s + Number(r.amount ?? 0),
    0
  );

  const rangeActive = dateFrom !== "" || dateTo !== "";

  const typeTabs: Array<{ id: TxTypeTab; label: string; icon: string }> = [
    { id: "all", label: t("tx.allTypes", lang), icon: "📋" },
    { id: "po", label: t("tx.typePO", lang), icon: "📝" },
    { id: "grn", label: t("tx.typeGRN", lang), icon: "📦" },
    { id: "invoice", label: t("tx.typeInvoice", lang), icon: "🧾" },
    { id: "payment", label: t("tx.typePayment", lang), icon: "💸" },
    { id: "adjustment", label: t("tx.typeAdjustment", lang), icon: "⚙️" },
    { id: "receipt", label: t("tx.typeReceipt", lang), icon: "🧾" }
  ];

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

  return (
    <Section icon="📜" title={t("tx.title", lang)} hint={t("tx.hint", lang)}>
      <nav
        aria-label={t("tx.allTypes", lang)}
        className="mb-4 flex w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-2xl bg-white/80 p-1.5 shadow-card ring-1 ring-primary/5 dark:bg-d-surface/70 dark:ring-d-border/30"
      >
        {typeTabs.map((tab) => {
          const active = tab.id === activeType;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveType(tab.id)}
              aria-pressed={active}
              className={`inline-flex flex-1 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                active
                  ? "bg-primary-gradient text-white shadow-card ring-1 ring-gold/40 dark:bg-primary-gradient-dark"
                  : "bg-paper/60 text-primary hover:bg-white hover:shadow-card dark:bg-d-surface-2/60 dark:text-d-text dark:hover:bg-d-surface-2"
              }`}
            >
              <span aria-hidden className="text-[11px]">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
              <span
                className={`rounded-full px-1 font-mono text-[9.5px] font-bold leading-tight ${
                  active ? "bg-white/20 text-white" : "bg-ink/10 text-ink2"
                }`}
              >
                {typeCounts[tab.id]}
              </span>
            </button>
          );
        })}
      </nav>

      {dateRangeFiltered.length === 0 && !rangeActive && activeType === "all" ? (
        <div className="rounded-xl bg-ink/5 p-4 text-center text-sm text-ink2">
          {t("tx.empty", lang)}
        </div>
      ) : (
        <SortableTable<TxRow>
          stickyHeader
          rowKey={(r) => r.id}
          initialSort={{ key: "date", dir: "desc" }}
          columns={txColumns(lang, (row) => setDetailOpen(row))}
          rows={dateRangeFiltered}
          searchable
          exportable
          exportFileName="transactions"
          exportSheetName="Transactions"
          toolbarExtra={dateToolbar}
          bodyMaxHeight={440}
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
      )}

      {detailOpen && (
        <TransactionDetailModal
          tx={detailOpen}
          lang={lang}
          onClose={() => setDetailOpen(null)}
        />
      )}
    </Section>
  );
}

function txColumns(
  lang: Lang,
  onOpenDetail: (row: TxRow) => void
): SortableColumn<TxRow>[] {
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
      align: "left",
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
      render: (r) => {
        if (r.amount == null) {
          return (
            <button
              type="button"
              onClick={() => onOpenDetail(r)}
              aria-label={t("tx.detailOpen", lang)}
              title={t("tx.detailOpen", lang)}
              className="inline-flex w-full items-center justify-between gap-1.5 rounded-md border border-ink/10 bg-white px-2 py-0.5 text-ink2 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              <span className="text-ink2/40">—</span>
              <EyeIcon />
            </button>
          );
        }
        return (
          <button
            type="button"
            onClick={() => onOpenDetail(r)}
            aria-label={t("tx.detailOpen", lang)}
            title={t("tx.detailOpen", lang)}
            className="inline-flex w-full items-center justify-between gap-1.5 rounded-md border border-ink/10 bg-white px-2 py-0.5 text-ink transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <IDR value={Number(r.amount)} />
            <EyeIcon />
          </button>
        );
      }
    }
  ];
}

function EyeIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3 w-3 shrink-0 text-ink2/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ============== Detail Modal ==============

type LineItem = {
  line_no: number;
  item_code: string;
  item_name: string | null;
  qty: number;
  qty_ordered?: number;
  qty_received?: number;
  qty_rejected?: number;
  unit: string;
  price?: number;
  subtotal?: number;
  note?: string | null;
};

type TxSupplierInfo = {
  id: string | null;
  name: string | null;
  address: string | null;
  pic: string | null;
  phone: string | null;
  email: string | null;
};

type DetailPayload = {
  ok: true;
  tx: {
    id: number;
    tx_date: string;
    tx_type: TxRow["tx_type"];
    ref_no: string | null;
    amount: number | null;
    description: string | null;
  };
  supplier: TxSupplierInfo;
  po?: {
    no: string;
    po_date: string;
    delivery_date: string | null;
    status: string;
    total: number;
    ref_contract: string | null;
    pay_method: string | null;
    top: string | null;
    notes: string | null;
    rows: LineItem[];
  };
  grn?: {
    no: string;
    grn_date: string;
    po_no: string | null;
    status: string;
    qc_note: string | null;
    rows: LineItem[];
  };
  invoice?: {
    no: string;
    inv_date: string;
    due_date: string | null;
    po_no: string | null;
    status: string;
    total: number;
    rows?: LineItem[];
  };
  payment?: {
    no: string;
    pay_date: string;
    amount: number;
    method: string;
    reference: string | null;
    note: string | null;
    invoice_no: string | null;
    invoice_total?: number;
    invoice_due_date?: string | null;
  };
  cash_receipt?: {
    no: string;
    receipt_date: string;
    source: string;
    source_name: string | null;
    amount: number;
    period: string | null;
    reference: string | null;
    note: string | null;
  };
};

const DOC_TITLE: Record<TxRow["tx_type"], string> = {
  po: "PURCHASE ORDER",
  grn: "GOODS RECEIPT NOTE",
  invoice: "INVOICE",
  payment: "BUKTI PEMBAYARAN",
  adjustment: "ADJUSTMENT",
  receipt: "BUKTI PENERIMAAN KAS"
};

function TransactionDetailModal({
  tx,
  lang,
  onClose
}: {
  tx: TxRow;
  lang: Lang;
  onClose: () => void;
}) {
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "xlsx" | "docx" | null>(
    null
  );

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/transaction-detail?id=${tx.id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((json: DetailPayload) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tx.id]);

  function handlePrintPdf() {
    setDownloading("pdf");
    // Give the browser a tick to render the "print-only" class.
    setTimeout(() => {
      window.print();
      setDownloading(null);
    }, 50);
  }

  async function handleDownload(format: "xlsx" | "docx") {
    setDownloading(format);
    try {
      const res = await fetch(
        `/api/transaction-detail?id=${tx.id}&format=${format}`
      );
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "xlsx" ? "xlsx" : "doc";
      const stem = (tx.ref_no ?? `tx-${tx.id}`).replace(/[^a-z0-9\-_]/gi, "_");
      a.download = `transaksi-${stem}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // noop — user sees no download start
    } finally {
      setDownloading(null);
    }
  }

  if (!mounted) return null;

  const overlay = (
    <div
      data-tx-detail-portal
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/50 px-4 pt-[4vh] pb-[4vh] backdrop-blur-sm print:static print:block print:overflow-visible print:bg-white print:p-0 print:backdrop-blur-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Inline print stylesheet — when this modal is open & user prints,
          hide the rest of the page so only the document preview prints. */}
      <style>{`@media print {
        body > *:not([data-tx-detail-portal]) { display: none !important; }
        [data-tx-detail-portal] { position: static !important; inset: auto !important; max-height: none !important; overflow: visible !important; }
        @page { size: A4; margin: 15mm; }
      }`}</style>
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-paper shadow-cardlg ring-1 ring-ink/10 print:max-h-none print:max-w-none print:rounded-none print:bg-white print:shadow-none print:ring-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar — hidden on print */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-primary-gradient px-5 py-3 text-white print:hidden">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${TYPE_BADGE[tx.tx_type]}`}
              >
                {TYPE_LABELS[tx.tx_type]}
              </span>
              <h2 className="truncate font-display text-sm font-black uppercase tracking-wide">
                {DOC_TITLE[tx.tx_type]} · {tx.ref_no ?? `TX-${tx.id}`}
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] text-white/80">
              {formatDateLong(tx.tx_date, lang)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <DownloadButton
              label="PDF"
              icon="🖨️"
              busy={downloading === "pdf"}
              disabled={loading || !data || error}
              onClick={handlePrintPdf}
            />
            <DownloadButton
              label="Excel"
              icon="📊"
              busy={downloading === "xlsx"}
              disabled={loading || !data || error}
              onClick={() => handleDownload("xlsx")}
            />
            <DownloadButton
              label="Word"
              icon="📝"
              busy={downloading === "docx"}
              disabled={loading || !data || error}
              onClick={() => handleDownload("docx")}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label={t("tx.detailClose", lang)}
              className="ml-1 rounded-md px-2 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Document body */}
        <div
          id="tx-detail-printable"
          className="flex-1 overflow-y-auto bg-paper px-4 py-6 print:overflow-visible print:bg-white print:p-0"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink2">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
              <span>{t("tx.detailLoading", lang)}</span>
            </div>
          ) : error || !data ? (
            <div className="mx-auto max-w-md rounded-xl bg-rose-50 p-4 text-center text-sm text-rose-700">
              {t("tx.detailError", lang)}
            </div>
          ) : (
            <DocumentPreview data={data} lang={lang} />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function DownloadButton({
  label,
  icon,
  onClick,
  busy,
  disabled
}: {
  label: string;
  icon: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        <span aria-hidden>{icon}</span>
      )}
      <span>{label}</span>
    </button>
  );
}

// ---------- Document preview (A4-style, printable) ----------

function DocumentPreview({
  data,
  lang
}: {
  data: DetailPayload;
  lang: Lang;
}) {
  const { tx, supplier } = data;
  const printedOn = new Date().toLocaleDateString(
    lang === "EN" ? "en-US" : "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );

  return (
    <article className="mx-auto max-w-[800px] bg-white px-8 py-10 shadow-card ring-1 ring-ink/10 print:max-w-none print:px-0 print:py-0 print:shadow-none print:ring-0">
      {/* Letterhead */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-xl text-white">
            🍱
          </span>
          <div>
            <div className="text-sm font-black uppercase tracking-wide text-ink">
              MBG Soe
            </div>
            <div className="text-[10px] text-ink2/80">
              Program Makan Bergizi Gratis · Kabupaten TTS, NTT
            </div>
            <div className="text-[10px] text-ink2/80">
              Indonesia Food Security Review (IFSR)
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black uppercase tracking-wider text-ink">
            {DOC_TITLE[tx.tx_type]}
          </div>
          <div className="font-mono text-[10px] text-ink2/70">
            {lang === "EN" ? "Printed" : "Dicetak"}: {printedOn}
          </div>
        </div>
      </header>

      {/* Supplier + meta block */}
      <section className="mb-6 grid grid-cols-1 gap-6 border-b-2 border-ink/80 pb-5 sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
            {tx.tx_type === "po"
              ? lang === "EN"
                ? "To Supplier"
                : "Kepada Supplier"
              : tx.tx_type === "grn"
                ? lang === "EN"
                  ? "Received From"
                  : "Diterima Dari"
                : tx.tx_type === "invoice"
                  ? lang === "EN"
                    ? "Biller"
                    : "Penagih"
                  : tx.tx_type === "payment"
                    ? lang === "EN"
                      ? "Paid To"
                      : "Dibayarkan Ke"
                    : tx.tx_type === "receipt"
                      ? lang === "EN"
                        ? "Received From"
                        : "Diterima Dari"
                      : "Counterparty"}
          </div>
          <div className="mt-1 text-base font-black text-ink">
            {supplier.name ?? "—"}
          </div>
          {supplier.address && (
            <div className="mt-1 text-xs text-ink2">{supplier.address}</div>
          )}
          {(supplier.pic || supplier.phone) && (
            <div className="text-xs text-ink2">
              PIC: {supplier.pic ?? "—"} · {supplier.phone ?? "—"}
            </div>
          )}
          {supplier.email && (
            <div className="font-mono text-xs text-ink2">{supplier.email}</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:text-right">
          <DocField label={t("tx.detailRef", lang)}>
            <span className="font-mono text-sm font-black">
              {tx.ref_no ?? "—"}
            </span>
          </DocField>
          <DocField label={t("tx.detailDate", lang)}>
            {formatDateLong(tx.tx_date, lang)}
          </DocField>
          {tx.amount != null && (
            <DocField label={t("tx.detailAmount", lang)}>
              <span className="font-mono font-black">
                {formatIDR(Number(tx.amount))}
              </span>
            </DocField>
          )}
        </div>
      </section>

      {/* Type-specific body */}
      {data.po && <POBlock po={data.po} lang={lang} />}
      {data.grn && <GRNBlock grn={data.grn} lang={lang} />}
      {data.invoice && <InvoiceBlock invoice={data.invoice} lang={lang} />}
      {data.payment && <PaymentBlock payment={data.payment} lang={lang} />}
      {data.cash_receipt && (
        <CashReceiptBlock receipt={data.cash_receipt} lang={lang} />
      )}
      {!data.po &&
        !data.grn &&
        !data.invoice &&
        !data.payment &&
        !data.cash_receipt && <AdjustmentBlock tx={tx} lang={lang} />}

      {/* Signatures */}
      <section className="mt-10 grid grid-cols-1 gap-6 border-t border-ink/15 pt-6 sm:grid-cols-3">
        <SignBlock
          title={lang === "EN" ? "Created By" : "Dibuat Oleh"}
          role="Operator"
        />
        <SignBlock
          title={
            tx.tx_type === "grn"
              ? lang === "EN"
                ? "Received By"
                : "Diterima Oleh"
              : tx.tx_type === "invoice" || tx.tx_type === "payment"
                ? lang === "EN"
                  ? "Verified By"
                  : "Diverifikasi Oleh"
                : lang === "EN"
                  ? "Approved By"
                  : "Disetujui Oleh"
          }
          role={lang === "EN" ? "Head / Finance" : "Kepala / Keuangan"}
        />
        <SignBlock
          title={lang === "EN" ? "Witness" : "Menyetujui"}
          role={
            tx.tx_type === "invoice" || tx.tx_type === "payment"
              ? lang === "EN"
                ? "Finance"
                : "Keuangan"
              : lang === "EN"
                ? "Supplier"
                : "Supplier"
          }
        />
      </section>
    </article>
  );
}

function DocField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-ink2/60">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-ink">{children}</div>
    </div>
  );
}

function SignBlock({ title, role }: { title: string; role: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
        {title}
      </div>
      <div className="mt-16 border-t border-ink pt-1">
        <div className="text-xs font-bold text-ink">(________________)</div>
        <div className="text-[10px] text-ink2/70">{role}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    {
      draft: "bg-slate-100 text-slate-700 ring-slate-300",
      sent: "bg-blue-100 text-blue-800 ring-blue-300",
      confirmed: "bg-blue-100 text-blue-800 ring-blue-300",
      delivered: "bg-emerald-100 text-emerald-800 ring-emerald-300",
      closed: "bg-emerald-100 text-emerald-800 ring-emerald-300",
      approved: "bg-emerald-100 text-emerald-800 ring-emerald-300",
      ok: "bg-emerald-100 text-emerald-800 ring-emerald-300",
      pending: "bg-amber-100 text-amber-900 ring-amber-300",
      partial: "bg-amber-100 text-amber-900 ring-amber-300",
      rejected: "bg-rose-100 text-rose-800 ring-rose-300",
      cancelled: "bg-rose-100 text-rose-800 ring-rose-300",
      issued: "bg-blue-100 text-blue-800 ring-blue-300",
      paid: "bg-emerald-100 text-emerald-800 ring-emerald-300",
      overdue: "bg-rose-100 text-rose-800 ring-rose-300"
    }[status.toLowerCase()] ?? "bg-ink/5 text-ink2 ring-ink/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${tone}`}
    >
      {status}
    </span>
  );
}

function ItemCell({ row }: { row: LineItem }) {
  return (
    <div>
      <div className="font-semibold text-ink">{row.item_code}</div>
      {row.item_name && row.item_name !== row.item_code && (
        <div className="text-[10px] italic text-ink2/70">{row.item_name}</div>
      )}
    </div>
  );
}

function POBlock({
  po,
  lang
}: {
  po: NonNullable<DetailPayload["po"]>;
  lang: Lang;
}) {
  return (
    <section>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DocField label={t("tx.detailStatus", lang)}>
          <StatusPill status={po.status} />
        </DocField>
        {po.delivery_date && (
          <DocField label={t("tx.detailDeliveryDate", lang)}>
            {formatDateLong(po.delivery_date, lang)}
          </DocField>
        )}
        {po.pay_method && (
          <DocField label={t("tx.detailPayMethod", lang)}>
            {po.pay_method}
          </DocField>
        )}
        {po.top && (
          <DocField label={t("tx.detailTop", lang)}>{po.top}</DocField>
        )}
        {po.ref_contract && (
          <DocField label={t("tx.detailContract", lang)}>
            <span className="font-mono">{po.ref_contract}</span>
          </DocField>
        )}
      </div>

      <div className="mb-2 text-xs font-black uppercase tracking-wide text-ink">
        {t("tx.detailLineItems", lang)} ({po.rows.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink bg-ink/5">
              <th className="border-x border-ink/20 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailLineNo", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailItem", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailQty", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailUnit", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailPrice", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailSubtotal", lang)}
              </th>
            </tr>
          </thead>
          <tbody>
            {po.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border-x border-ink/20 px-2 py-4 text-center text-xs text-ink2/60"
                >
                  {t("tx.detailEmpty", lang)}
                </td>
              </tr>
            ) : (
              po.rows.map((r) => (
                <tr
                  key={r.line_no}
                  className="border-b border-ink/10 even:bg-paper/40"
                >
                  <td className="border-x border-ink/20 px-2 py-1.5 text-center font-mono text-xs">
                    {r.line_no}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-xs">
                    <ItemCell row={r} />
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                    {Number(r.qty).toLocaleString("id-ID", {
                      maximumFractionDigits: 3
                    })}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-center text-xs">
                    {r.unit}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                    {formatIDR(Number(r.price ?? 0))}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs font-black">
                    {formatIDR(Number(r.subtotal ?? 0))}
                  </td>
                </tr>
              ))
            )}
            <tr className="border-t-2 border-ink bg-ink/10">
              <td
                colSpan={5}
                className="border-x border-ink/20 px-2 py-2 text-right text-xs font-black uppercase tracking-wide"
              >
                {t("tx.detailTotal", lang)}
              </td>
              <td className="border-x border-ink/20 px-2 py-2 text-right font-mono text-sm font-black text-ink">
                {formatIDR(po.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {po.notes && (
        <div className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink2 ring-1 ring-ink/5 print:bg-white print:ring-ink/30">
          <span className="font-black uppercase tracking-wide text-ink2/70">
            {t("tx.detailNote", lang)}:{" "}
          </span>
          {po.notes}
        </div>
      )}
    </section>
  );
}

function GRNBlock({
  grn,
  lang
}: {
  grn: NonNullable<DetailPayload["grn"]>;
  lang: Lang;
}) {
  return (
    <section>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DocField label={t("tx.detailStatus", lang)}>
          <StatusPill status={grn.status} />
        </DocField>
        <DocField label={t("tx.detailDate", lang)}>
          {formatDateLong(grn.grn_date, lang)}
        </DocField>
        {grn.po_no && (
          <DocField label={t("tx.detailPoNo", lang)}>
            <span className="font-mono">{grn.po_no}</span>
          </DocField>
        )}
      </div>

      <div className="mb-2 text-xs font-black uppercase tracking-wide text-ink">
        {t("tx.detailLineItems", lang)} ({grn.rows.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink bg-ink/5">
              <th className="border-x border-ink/20 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailLineNo", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailItem", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailQtyOrdered", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailQtyReceived", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailQtyRejected", lang)}
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide">
                {t("tx.detailUnit", lang)}
              </th>
            </tr>
          </thead>
          <tbody>
            {grn.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border-x border-ink/20 px-2 py-4 text-center text-xs text-ink2/60"
                >
                  {t("tx.detailEmpty", lang)}
                </td>
              </tr>
            ) : (
              grn.rows.map((r) => (
                <tr
                  key={r.line_no}
                  className="border-b border-ink/10 even:bg-paper/40"
                >
                  <td className="border-x border-ink/20 px-2 py-1.5 text-center font-mono text-xs">
                    {r.line_no}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-xs">
                    <ItemCell row={r} />
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                    {Number(r.qty_ordered ?? 0).toLocaleString("id-ID", {
                      maximumFractionDigits: 3
                    })}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs font-bold text-emerald-700">
                    {Number(r.qty_received ?? 0).toLocaleString("id-ID", {
                      maximumFractionDigits: 3
                    })}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs text-rose-700">
                    {Number(r.qty_rejected ?? 0).toLocaleString("id-ID", {
                      maximumFractionDigits: 3
                    })}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-center text-xs">
                    {r.unit}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {grn.qc_note && (
        <div className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink2 ring-1 ring-ink/5 print:bg-white print:ring-ink/30">
          <span className="font-black uppercase tracking-wide text-ink2/70">
            {t("tx.detailQcNote", lang)}:{" "}
          </span>
          {grn.qc_note}
        </div>
      )}
    </section>
  );
}

function InvoiceBlock({
  invoice,
  lang
}: {
  invoice: NonNullable<DetailPayload["invoice"]>;
  lang: Lang;
}) {
  const rows = invoice.rows ?? [];
  return (
    <section>
      <div className="mb-4 rounded-2xl bg-ink/5 p-5 ring-1 ring-ink/10 print:bg-white print:ring-2 print:ring-ink">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
          {lang === "EN" ? "Amount Due" : "Jumlah Tagihan"}
        </div>
        <div className="mt-1 font-mono text-3xl font-black text-ink sm:text-4xl">
          {formatIDR(invoice.total)}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink2/70">
          <span>
            <b className="uppercase tracking-wide text-ink2/60">
              {t("tx.detailStatus", lang)}:
            </b>{" "}
            <StatusPill status={invoice.status} />
          </span>
          {invoice.due_date && (
            <span>
              <b className="uppercase tracking-wide text-ink2/60">
                {t("tx.detailDueDate", lang)}:
              </b>{" "}
              {formatDateLong(invoice.due_date, lang)}
            </span>
          )}
          {invoice.po_no && (
            <span>
              <b className="uppercase tracking-wide text-ink2/60">
                {t("tx.detailPoNo", lang)}:
              </b>{" "}
              <span className="font-mono">{invoice.po_no}</span>
            </span>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-ink">
            {t("tx.detailLineItems", lang)} ({rows.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-ink bg-ink/5">
                  <th className="border-x border-ink/20 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide">
                    {t("tx.detailLineNo", lang)}
                  </th>
                  <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">
                    {t("tx.detailItem", lang)}
                  </th>
                  <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">
                    {t("tx.detailQty", lang)}
                  </th>
                  <th className="border-x border-ink/20 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide">
                    {t("tx.detailUnit", lang)}
                  </th>
                  <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">
                    {t("tx.detailPrice", lang)}
                  </th>
                  <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">
                    {t("tx.detailSubtotal", lang)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.line_no}
                    className="border-b border-ink/10 even:bg-paper/40"
                  >
                    <td className="border-x border-ink/20 px-2 py-1.5 text-center font-mono text-xs">
                      {r.line_no}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs">
                      <ItemCell row={r} />
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                      {Number(r.qty).toLocaleString("id-ID", {
                        maximumFractionDigits: 3
                      })}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-center text-xs">
                      {r.unit}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                      {formatIDR(Number(r.price ?? 0))}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs font-black">
                      {formatIDR(Number(r.subtotal ?? 0))}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink bg-ink/10">
                  <td
                    colSpan={5}
                    className="border-x border-ink/20 px-2 py-2 text-right text-xs font-black uppercase tracking-wide"
                  >
                    {t("tx.detailTotal", lang)}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-2 text-right font-mono text-sm font-black text-ink">
                    {formatIDR(invoice.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function PaymentBlock({
  payment,
  lang
}: {
  payment: NonNullable<DetailPayload["payment"]>;
  lang: Lang;
}) {
  return (
    <section>
      <div className="mb-4 rounded-2xl bg-ink/5 p-5 ring-1 ring-ink/10 print:bg-white print:ring-2 print:ring-ink">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
          {lang === "EN" ? "Amount Paid" : "Nilai Dibayar"}
        </div>
        <div className="mt-1 font-mono text-3xl font-black text-ink sm:text-4xl">
          {formatIDR(payment.amount)}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink2/70">
          <span>
            <b className="uppercase tracking-wide text-ink2/60">
              {t("tx.detailMethod", lang)}:
            </b>{" "}
            {payment.method.toUpperCase()}
          </span>
          {payment.reference && (
            <span>
              <b className="uppercase tracking-wide text-ink2/60">
                {t("tx.detailPayReference", lang)}:
              </b>{" "}
              <span className="font-mono">{payment.reference}</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DocField label={t("tx.detailDate", lang)}>
          {formatDateLong(payment.pay_date, lang)}
        </DocField>
        {payment.invoice_no && (
          <DocField label={t("tx.detailInvoiceNo", lang)}>
            <span className="font-mono">{payment.invoice_no}</span>
          </DocField>
        )}
        {payment.invoice_total != null && (
          <DocField label={t("tx.detailInvoiceTotal", lang)}>
            <span className="font-mono">
              {formatIDR(payment.invoice_total)}
            </span>
          </DocField>
        )}
        {payment.invoice_due_date && (
          <DocField label={t("tx.detailDueDate", lang)}>
            {formatDateLong(payment.invoice_due_date, lang)}
          </DocField>
        )}
      </div>

      {payment.note && (
        <div className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink2 ring-1 ring-ink/5 print:bg-white print:ring-ink/30">
          <span className="font-black uppercase tracking-wide text-ink2/70">
            {t("tx.detailNote", lang)}:{" "}
          </span>
          {payment.note}
        </div>
      )}
    </section>
  );
}

function CashReceiptBlock({
  receipt,
  lang
}: {
  receipt: NonNullable<DetailPayload["cash_receipt"]>;
  lang: Lang;
}) {
  const sourceLabel = receipt.source_name
    ? `${receipt.source.toUpperCase()} · ${receipt.source_name}`
    : receipt.source.toUpperCase();
  return (
    <section>
      <div className="mb-4 rounded-2xl bg-ink/5 p-5 ring-1 ring-ink/10 print:bg-white print:ring-2 print:ring-ink">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
          {lang === "EN" ? "Amount Received" : "Nilai Diterima"}
        </div>
        <div className="mt-1 font-mono text-3xl font-black text-ink sm:text-4xl">
          {formatIDR(receipt.amount)}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink2/70">
          <span>
            <b className="uppercase tracking-wide text-ink2/60">
              {t("tx.detailSource", lang)}:
            </b>{" "}
            {sourceLabel}
          </span>
          {receipt.period && (
            <span>
              <b className="uppercase tracking-wide text-ink2/60">
                {t("tx.detailPeriod", lang)}:
              </b>{" "}
              <span className="font-mono">{receipt.period}</span>
            </span>
          )}
          {receipt.reference && (
            <span>
              <b className="uppercase tracking-wide text-ink2/60">
                {t("tx.detailPayReference", lang)}:
              </b>{" "}
              <span className="font-mono">{receipt.reference}</span>
            </span>
          )}
        </div>
      </div>

      <DocField label={t("tx.detailDate", lang)}>
        {formatDateLong(receipt.receipt_date, lang)}
      </DocField>

      {receipt.note && (
        <div className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink2 ring-1 ring-ink/5 print:bg-white print:ring-ink/30">
          <span className="font-black uppercase tracking-wide text-ink2/70">
            {t("tx.detailNote", lang)}:{" "}
          </span>
          {receipt.note}
        </div>
      )}
    </section>
  );
}

function AdjustmentBlock({
  tx,
  lang
}: {
  tx: DetailPayload["tx"];
  lang: Lang;
}) {
  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DocField label={t("tx.detailDate", lang)}>
          {formatDateLong(tx.tx_date, lang)}
        </DocField>
        <DocField label={t("tx.detailAmount", lang)}>
          <span className="font-mono font-black">
            {tx.amount == null ? "—" : formatIDR(Number(tx.amount))}
          </span>
        </DocField>
      </div>
      {tx.description && (
        <div className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink2 ring-1 ring-ink/5 print:bg-white print:ring-ink/30">
          <span className="font-black uppercase tracking-wide text-ink2/70">
            {t("tx.detailDescription", lang)}:{" "}
          </span>
          {tx.description}
        </div>
      )}
    </section>
  );
}
