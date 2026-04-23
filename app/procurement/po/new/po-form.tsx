"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatIDR, formatDateShort } from "@/lib/engine";
import { useLang } from "@/lib/prefs-context";
import type { QtLite } from "./page";

interface Props {
  quotations: QtLite[];
}

export function NewPOForm({ quotations }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const [_, startTransition] = useTransition();
  const [qtNo, setQtNo] = useState<string>(quotations[0]?.no ?? "");
  const [deliveryDate, setDeliveryDate] = useState<string>(
    quotations[0]?.need_date ?? ""
  );
  const [payMethod, setPayMethod] = useState("");
  const [top, setTop] = useState("");
  const [refContract, setRefContract] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedQt = useMemo(
    () => quotations.find((q) => q.no === qtNo) ?? null,
    [quotations, qtNo]
  );

  // Compute rows + total preview using same logic as API
  const previewRows = useMemo(() => {
    if (!selectedQt) return [];
    return selectedQt.rows.map((r) => {
      const qty = Number(r.qty_quoted ?? r.qty ?? 0);
      const price = Number(r.price_quoted ?? r.price_suggested ?? 0);
      return { ...r, finalQty: qty, finalPrice: price, subtotal: qty * price };
    });
  }, [selectedQt]);
  const previewTotal = previewRows.reduce((s, r) => s + r.subtotal, 0);

  function onPickQt(no: string) {
    setQtNo(no);
    const q = quotations.find((x) => x.no === no);
    setDeliveryDate(q?.need_date ?? "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQt) {
      setError(
        lang === "EN" ? "Select a quotation first." : "Pilih quotation dulu."
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qt_no: selectedQt.no,
          delivery_date: deliveryDate || null,
          pay_method: payMethod || null,
          top: top || null,
          ref_contract: refContract || null,
          notes: notes || null
        })
      });
      const json = (await res.json()) as {
        ok: boolean;
        no?: string;
        error?: string;
        warning?: string;
      };
      if (!res.ok || !json.ok || !json.no) {
        setError(json.error ?? (lang === "EN" ? "Failed" : "Gagal membuat PO"));
        return;
      }
      startTransition(() => {
        router.push(
          `/docgen/po/${encodeURIComponent(json.no as string)}`
        );
        router.refresh();
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="divide-y divide-ink/10">
      {/* Step 1: Pick quotation */}
      <div className="space-y-3 p-5">
        <h3 className="text-sm font-black uppercase tracking-wide text-ink2">
          {lang === "EN"
            ? "Step 1 · Pick Quotation"
            : "Langkah 1 · Pilih Quotation"}
        </h3>
        <p className="text-[11px] text-ink2/70">
          {lang === "EN"
            ? "Pick an existing quotation. Only quotations not yet converted to PO are listed."
            : "Pilih quotation yang sudah ada. Hanya quotation yang belum dikonversi ke PO yang muncul."}
        </p>

        {quotations.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {lang === "EN"
              ? "No available quotation to convert. Create a quotation first."
              : "Tidak ada quotation yang bisa dikonversi. Buat quotation dulu."}
          </div>
        ) : (
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-ink2">
              {lang === "EN" ? "Source Quotation" : "Sumber Quotation"}
            </span>
            <select
              value={qtNo}
              onChange={(e) => onPickQt(e.target.value)}
              className="w-full max-w-md rounded-md border border-ink/10 bg-paper px-2.5 py-1.5 text-xs outline-none focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
            >
              {quotations.map((q) => (
                <option key={q.no} value={q.no}>
                  {q.no} · {q.supplier_name ?? q.supplier_id} ·{" "}
                  {formatDateShort(q.quote_date)} · {formatIDR(q.total)} ·{" "}
                  {q.status}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Step 2: PO metadata */}
      {selectedQt && (
        <div className="space-y-3 p-5">
          <h3 className="text-sm font-black uppercase tracking-wide text-ink2">
            {lang === "EN" ? "Step 2 · PO Metadata" : "Langkah 2 · Data PO"}
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-ink/10 bg-paper px-3 py-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                {lang === "EN" ? "Supplier" : "Supplier"}
              </div>
              <div className="mt-0.5 font-bold text-ink">
                {selectedQt.supplier_name ?? selectedQt.supplier_id}
              </div>
              <div className="font-mono text-[10px] text-ink2/70">
                {selectedQt.supplier_id}
              </div>
            </div>
            <div className="rounded-lg border border-ink/10 bg-paper px-3 py-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                {lang === "EN" ? "Quotation Ref" : "Ref Quotation"}
              </div>
              <div className="mt-0.5 font-mono font-bold text-ink">
                {selectedQt.no}
              </div>
              <div className="text-[10px] text-ink2/70">
                {lang === "EN" ? "Quoted" : "Tgl. Penawaran"}:{" "}
                {formatDateShort(selectedQt.quote_date)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-ink2">
                {lang === "EN" ? "Delivery Date" : "Tgl. Pengiriman"}
              </span>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-md border border-ink/10 bg-paper px-2.5 py-1.5 font-mono text-xs outline-none focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-ink2">
                {lang === "EN" ? "Payment Method" : "Metode Bayar"}
              </span>
              <input
                type="text"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                placeholder={lang === "EN" ? "Transfer, cash, …" : "Transfer, tunai, …"}
                className="w-full rounded-md border border-ink/10 bg-paper px-2.5 py-1.5 text-xs outline-none focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-ink2">
                {lang === "EN" ? "Term (TOP)" : "Termin (TOP)"}
              </span>
              <input
                type="text"
                value={top}
                onChange={(e) => setTop(e.target.value)}
                placeholder={lang === "EN" ? "e.g. NET 30" : "mis. NET 30"}
                className="w-full rounded-md border border-ink/10 bg-paper px-2.5 py-1.5 text-xs outline-none focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-ink2">
                {lang === "EN" ? "Contract Ref" : "No. Kontrak"}
              </span>
              <input
                type="text"
                value={refContract}
                onChange={(e) => setRefContract(e.target.value)}
                className="w-full rounded-md border border-ink/10 bg-paper px-2.5 py-1.5 text-xs outline-none focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-ink2">
              {lang === "EN" ? "Notes" : "Catatan"}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-ink/10 bg-paper px-2.5 py-1.5 text-xs outline-none focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
            />
          </label>
        </div>
      )}

      {/* Step 3: Preview */}
      {selectedQt && (
        <div className="space-y-3 p-5">
          <h3 className="text-sm font-black uppercase tracking-wide text-ink2">
            {lang === "EN"
              ? "Step 3 · Preview PO Rows"
              : "Langkah 3 · Preview Baris PO"}
          </h3>
          <p className="text-[11px] text-ink2/70">
            {lang === "EN"
              ? "Rows below will be copied into the new PO. Qty uses quoted value when present, else suggested."
              : "Baris di bawah akan disalin ke PO baru. Qty pakai nilai quoted kalau ada, kalau tidak pakai qty awal."}
          </p>

          <div className="overflow-x-auto rounded-xl border border-ink/10">
            <table className="w-full text-[12px]">
              <thead className="bg-ink/5 font-display text-[10px] uppercase tracking-wide text-ink2/80">
                <tr>
                  <th className="px-2 py-1.5 text-center">#</th>
                  <th className="px-2 py-1.5 text-left">
                    {lang === "EN" ? "Item" : "Barang"}
                  </th>
                  <th className="px-2 py-1.5 text-right">Qty</th>
                  <th className="px-2 py-1.5 text-center">
                    {lang === "EN" ? "Unit" : "Satuan"}
                  </th>
                  <th className="px-2 py-1.5 text-right">
                    {lang === "EN" ? "Price" : "Harga"}
                  </th>
                  <th className="px-2 py-1.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r) => (
                  <tr key={r.line_no} className="border-t border-ink/5">
                    <td className="px-2 py-1.5 text-center font-mono text-[11px] text-ink2">
                      {r.line_no}
                    </td>
                    <td className="px-2 py-1.5 font-semibold">{r.item_code}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {r.finalQty.toLocaleString("id-ID", {
                        maximumFractionDigits: 3
                      })}
                    </td>
                    <td className="px-2 py-1.5 text-center text-ink2/80">
                      {r.unit}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {formatIDR(r.finalPrice)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold tabular-nums">
                      {formatIDR(r.subtotal)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink bg-ink font-black text-white">
                  <td
                    colSpan={5}
                    className="px-2 py-1.5 text-right uppercase tracking-wide"
                  >
                    Total
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {formatIDR(previewTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 bg-paper/60 px-5 py-4">
        {error && (
          <span className="mr-auto text-xs font-semibold text-rose-700">
            ⚠ {error}
          </span>
        )}
        <button
          type="submit"
          disabled={saving || !selectedQt || previewRows.length === 0}
          className="rounded-lg bg-ink px-4 py-2 text-xs font-black text-white shadow-card transition hover:bg-ink2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? lang === "EN"
              ? "Creating…"
              : "Membuat…"
            : lang === "EN"
              ? "Create PO"
              : "Buat PO"}
        </button>
      </div>
    </form>
  );
}
