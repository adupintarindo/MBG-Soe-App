"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type Decision = "accepted" | "rejected" | "partial" | "pending";

export function AckForm({
  poNo,
  supplierId,
  currentDecision,
  currentNote,
  currentAltDate
}: {
  poNo: string;
  supplierId: string;
  currentDecision: Decision;
  currentNote: string;
  currentAltDate: string;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [note, setNote] = useState(currentNote);
  const [altDate, setAltDate] = useState(currentAltDate);
  const [busy, setBusy] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: Decision) {
    setError(null);
    setBusy(decision);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;
      const { error: err } = await supabase
        .from("po_acknowledgements")
        .upsert(
          {
            po_no: poNo,
            supplier_id: supplierId,
            decision,
            decided_at: new Date().toISOString(),
            decided_by: userId,
            note: note || null,
            alt_delivery_date:
              decision !== "accepted" && altDate ? altDate : null
          },
          { onConflict: "po_no" }
        );
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("sup.ackNote", lang)}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            placeholder={
              lang === "EN"
                ? "Notes for operator (optional)"
                : "Catatan untuk operator (opsional)"
            }
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("sup.ackAltDate", lang)}
          </span>
          <input
            type="date"
            value={altDate}
            onChange={(e) => setAltDate(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
          <span className="mt-0.5 block text-[10px] text-ink2/60">
            {lang === "EN"
              ? "Fill only if rejecting or requesting reschedule."
              : "Isi hanya bila menolak atau minta reschedule."}
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => submit("accepted")}
          disabled={disabled}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-card hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === "accepted"
            ? t("common.saving", lang)
            : `✓ ${t("sup.btnAccept", lang)}`}
        </button>
        <button
          type="button"
          onClick={() => submit("partial")}
          disabled={disabled}
          className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white shadow-card hover:bg-amber-600 disabled:opacity-50"
        >
          {busy === "partial"
            ? t("common.saving", lang)
            : `~ ${t("sup.btnPartial", lang)}`}
        </button>
        <button
          type="button"
          onClick={() => submit("rejected")}
          disabled={disabled}
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white shadow-card hover:bg-red-700 disabled:opacity-50"
        >
          {busy === "rejected"
            ? t("common.saving", lang)
            : `✕ ${t("sup.btnReject", lang)}`}
        </button>
        <span className="text-[11px] text-ink2/60">
          {lang === "EN" ? "Current:" : "Saat ini:"}{" "}
          <b>{currentDecision}</b>
        </span>
      </div>
    </div>
  );
}
