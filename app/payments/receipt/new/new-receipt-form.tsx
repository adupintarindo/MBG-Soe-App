"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const SOURCES = [
  "dinas",
  "wfp",
  "ifsr",
  "ffi",
  "donor_swasta",
  "lainnya"
] as const;
type CashSource = (typeof SOURCES)[number];

async function nextReceiptNo(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CR-${year}-`;
  const { data } = await supabase
    .from("cash_receipts")
    .select("no")
    .ilike("no", `${prefix}%`)
    .order("no", { ascending: false })
    .limit(1);
  const last = data?.[0]?.no as string | undefined;
  const n = last ? Number(last.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(4, "0")}`;
}

export function NewReceiptForm() {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [date, setDate] = useState(todayIso());
  const [source, setSource] = useState<CashSource>("dinas");
  const [sourceName, setSourceName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const amt = Number(amount);
    if (!(amt > 0)) {
      setError("Jumlah harus > 0");
      return;
    }
    setBusy(true);
    try {
      const no = await nextReceiptNo(supabase);
      const { error: err } = await supabase.from("cash_receipts").insert({
        no,
        receipt_date: date,
        source,
        source_name: sourceName || null,
        amount: amt,
        period: period || null,
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.receiptFormDate", lang)}
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.receiptFormSource", lang)}
          </span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as CashSource)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.receiptFormSourceName", lang)}
          </span>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="mis. Dinas Pendidikan TTS"
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.receiptFormPeriod", lang)}
          </span>
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="YYYY-MM"
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.formReference", lang)}
          </span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
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
          disabled={busy}
          className="rounded-xl bg-ink px-5 py-3 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
        >
          {busy ? t("common.saving", lang) : t("common.save", lang)}
        </button>
      </div>
    </div>
  );
}
