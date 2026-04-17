"use client";

import { useMemo, useState } from "react";
import { formatIDR } from "@/lib/engine";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

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
  const [typeFilter, setTypeFilter] = useState<string>("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (dateFrom && r.tx_date < dateFrom) return false;
      if (dateTo && r.tx_date > dateTo) return false;
      if (typeFilter && r.tx_type !== typeFilter) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo, typeFilter]);

  const totalAmount = filtered.reduce(
    (s, r) => s + Number(r.amount ?? 0),
    0
  );

  function reset() {
    setDateFrom("");
    setDateTo("");
    setTypeFilter("");
  }

  return (
    <section className="mb-6 rounded-2xl border-l-4 border-accent bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-ink">
          {t("tx.title", lang)}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-ink2/70">{t("tx.filterDate", lang)}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-ink/20 bg-white px-2 py-1 text-xs"
          />
          <span className="text-ink2/60">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-ink/20 bg-white px-2 py-1 text-xs"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-ink/20 bg-white px-2 py-1 text-xs"
          >
            <option value="">{t("tx.allTypes", lang)}</option>
            <option value="po">{t("tx.typePO", lang)}</option>
            <option value="grn">{t("tx.typeGRN", lang)}</option>
            <option value="invoice">{t("tx.typeInvoice", lang)}</option>
            <option value="payment">{t("tx.typePayment", lang)}</option>
            <option value="adjustment">{t("tx.typeAdjustment", lang)}</option>
            <option value="receipt">{t("tx.typeReceipt", lang)}</option>
          </select>
          <button
            onClick={reset}
            className="rounded-lg border border-ink/20 bg-white px-3 py-1 text-[11px] font-bold text-ink2 hover:bg-ink/5"
          >
            {t("common.reset", lang)}
          </button>
        </div>
      </div>

      <p className="mb-2 text-[11px] text-ink2/70">
        {ti("tx.nRows", lang, { n: filtered.length })} · {t("tx.totalShown", lang)} {formatIDR(totalAmount)}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-ink/5 p-4 text-center text-sm text-ink2">
          {t("tx.empty", lang)}
        </div>
      ) : (
        <div className="max-h-[440px] overflow-auto rounded-xl ring-1 ring-ink/10">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-primary-gradient shadow-[inset_0_-1px_0_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <tr className="text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/95">
                <th className="px-3 py-2.5">{t("tx.colDate", lang)}</th>
                <th className="px-3 py-2.5">{t("tx.colType", lang)}</th>
                <th className="px-3 py-2.5">{t("tx.colRef", lang)}</th>
                <th className="px-3 py-2.5">{t("tx.colSupplier", lang)}</th>
                <th className="px-3 py-2.5">{t("tx.colDescription", lang)}</th>
                <th className="px-3 py-2.5">{t("tx.colAmount", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-ink/5 hover:bg-ink/[0.02]"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-center font-mono text-[11px]">
                    {r.tx_date}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${TYPE_BADGE[r.tx_type]}`}
                    >
                      {TYPE_LABELS[r.tx_type]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-[11px]">
                    {r.ref_no ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center">{r.supplier_name ?? "—"}</td>
                  <td className="px-3 py-2 text-center text-ink2">
                    {r.description ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-left font-mono">
                    {r.amount == null ? "—" : formatIDR(Number(r.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
