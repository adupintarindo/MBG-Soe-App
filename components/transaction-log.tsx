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
          📦 Transaksi Rantai Pasok · 50 Terakhir
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-ink2/70">Filter tanggal:</span>
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
            <option value="">Semua tipe</option>
            <option value="po">Purchase Order</option>
            <option value="grn">Goods Receipt</option>
            <option value="invoice">Invoice</option>
            <option value="payment">Payment</option>
            <option value="adjustment">Adjustment</option>
            <option value="receipt">Receipt</option>
          </select>
          <button
            onClick={reset}
            className="rounded-lg border border-ink/20 bg-white px-3 py-1 text-[11px] font-bold text-ink2 hover:bg-ink/5"
          >
            Reset
          </button>
        </div>
      </div>

      <p className="mb-2 text-[11px] text-ink2/70">
        {filtered.length} transaksi · total nilai {formatIDR(totalAmount)}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-ink/5 p-4 text-center text-sm text-ink2">
          Tidak ada transaksi pada filter ini.
        </div>
      ) : (
        <div className="max-h-[440px] overflow-auto rounded-xl ring-1 ring-ink/10">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-ink/5">
              <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-ink2">
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Tipe</th>
                <th className="px-3 py-2">Ref</th>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Keterangan</th>
                <th className="px-3 py-2 text-right">Nilai</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-ink/5 hover:bg-ink/[0.02]"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">
                    {r.tx_date}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${TYPE_BADGE[r.tx_type]}`}
                    >
                      {TYPE_LABELS[r.tx_type]}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {r.ref_no ?? "—"}
                  </td>
                  <td className="px-3 py-2">{r.supplier_name ?? "—"}</td>
                  <td className="px-3 py-2 text-ink2">
                    {r.description ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono">
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
