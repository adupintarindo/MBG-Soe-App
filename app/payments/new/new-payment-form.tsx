"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatIDR } from "@/lib/engine";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

const OVERPAY_TOLERANCE = 0.01; // rounding tolerance (Rp 0.01)

interface OpenInvoice {
  no: string;
  supplier_id: string;
  supplier_name: string | null;
  inv_date: string;
  due_date: string | null;
  total: number;
  paid: number;
  outstanding: number;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const METHODS = [
  "transfer",
  "tunai",
  "cek",
  "giro",
  "virtual_account",
  "qris",
  "lainnya"
] as const;
type PaymentMethod = (typeof METHODS)[number];

async function nextPaymentNo(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  const { data } = await supabase
    .from("payments")
    .select("no")
    .ilike("no", `${prefix}%`)
    .order("no", { ascending: false })
    .limit(1);
  const last = data?.[0]?.no as string | undefined;
  const n = last ? Number(last.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(4, "0")}`;
}

export function NewPaymentForm({ invoices }: { invoices: OpenInvoice[] }) {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [invoiceNo, setInvoiceNo] = useState<string>(invoices[0]?.no ?? "");
  const [payDate, setPayDate] = useState(todayIso());
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = invoices.find((i) => i.no === invoiceNo);
  const amt = Number(amount);
  const overpayBy =
    selected && amt > 0 ? amt - selected.outstanding : 0;
  const isOverpay = overpayBy > OVERPAY_TOLERANCE;

  async function submit() {
    setError(null);
    if (!invoiceNo || !selected) {
      setError(t("pay.errPickInvoice", lang));
      return;
    }
    if (!(amt > 0)) {
      setError(t("pay.errAmountZero", lang));
      return;
    }
    if (selected.outstanding <= 0) {
      setError(t("pay.errNoOutstanding", lang));
      return;
    }
    if (isOverpay) {
      setError(
        ti("pay.errOverpay", lang, { max: formatIDR(selected.outstanding) })
      );
      return;
    }
    setBusy(true);
    try {
      const no = await nextPaymentNo(supabase);
      const { error: err } = await supabase.from("payments").insert({
        no,
        invoice_no: invoiceNo,
        supplier_id: selected?.supplier_id ?? null,
        pay_date: payDate,
        amount: amt,
        method,
        reference: reference || null,
        note: note || null
      });
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/payments");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold text-ink2">
          {t("pay.formInvoice", lang)}
        </span>
        <select
          value={invoiceNo}
          onChange={(e) => {
            setInvoiceNo(e.target.value);
            const inv = invoices.find((i) => i.no === e.target.value);
            if (inv) setAmount(String(inv.outstanding));
          }}
          className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {invoices.map((inv) => (
            <option key={inv.no} value={inv.no}>
              {inv.no} · {inv.supplier_name ?? inv.supplier_id} ·{" "}
              {formatIDR(inv.outstanding)}
            </option>
          ))}
        </select>
        {selected && (
          <div className="mt-1 text-[11px] text-ink2/70">
            Total: {formatIDR(selected.total)} · Terbayar:{" "}
            {formatIDR(selected.paid)} · Sisa:{" "}
            <b className="text-red-700">{formatIDR(selected.outstanding)}</b>
          </div>
        )}
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.formPayDate", lang)}
          </span>
          <input
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.formAmount", lang)}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            max={selected ? selected.outstanding : undefined}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={isOverpay || undefined}
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm ${
              isOverpay
                ? "border-red-400 ring-1 ring-red-200"
                : "border-ink/20"
            }`}
          />
          {selected && selected.outstanding > 0 && (
            <span
              className={`mt-1 block text-[11px] ${
                isOverpay ? "font-bold text-red-700" : "text-ink2/70"
              }`}
            >
              {isOverpay
                ? ti("pay.errOverpay", lang, {
                    max: formatIDR(selected.outstanding)
                  })
                : ti("pay.hintMaxOutstanding", lang, {
                    max: formatIDR(selected.outstanding)
                  })}
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.formMethod", lang)}
          </span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.formReference", lang)}
          </span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="BCA TRX/2026/04-..."
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-bold text-ink2">
          {t("pay.formNote", lang)}
        </span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        />
      </label>

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={
            busy ||
            !selected ||
            selected.outstanding <= 0 ||
            !(amt > 0) ||
            isOverpay
          }
          className="rounded-xl bg-ink px-5 py-3 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
        >
          {busy ? t("common.saving", lang) : t("common.save", lang)}
        </button>
      </div>
    </div>
  );
}
