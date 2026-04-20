"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

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
type BudgetSource = (typeof SOURCES)[number];

export function NewBudgetForm() {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [period, setPeriod] = useState(currentPeriod());
  const [source, setSource] = useState<BudgetSource>("dinas");
  const [sourceName, setSourceName] = useState("");
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("15000");
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
      const { error: err } = await supabase.from("budgets").upsert(
        {
          period,
          source,
          source_name: sourceName || null,
          amount_idr: amt,
          target_cost_per_portion: target ? Number(target) : null,
          note: note || null
        },
        { onConflict: "period,source" }
      );
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/budget");
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
            {t("bud.colPeriod", lang)} (YYYY-MM)
          </span>
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2026-04"
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("bud.colSource", lang)}
          </span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as BudgetSource)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("pay.receiptFormSourceName", lang)}
          </span>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Dinas Pendidikan TTS"
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("bud.colAmount", lang)} (Rp)
          </span>
          <input
            type="number"
            min="0"
            step="1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("bud.colTarget", lang)} (Rp/porsi)
          </span>
          <input
            type="number"
            min="0"
            step="500"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-bold text-ink2">
          {t("common.note", lang)}
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
