"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewPrForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [needDate, setNeedDate] = useState(plusDays(todayIso(), 3));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { data, error: err } = await supabase.rpc("pr_seed_from_date", {
        p_need_date: needDate,
        p_notes: notes || null
      });
      if (err) {
        setError(err.message);
        return;
      }
      const prNo = data as unknown as string;
      startTransition(() => {
        router.push(`/procurement/requisition/${encodeURIComponent(prNo)}`);
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            Tanggal Butuh Barang
          </span>
          <input
            type="date"
            value={needDate}
            onChange={(e) => setNeedDate(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[11px] text-ink2/60">
            Sistem auto-fill item & qty dari kebutuhan menu tanggal tsb.
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            Catatan (opsional)
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="mis. butuh untuk minggu 1 Mei"
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-ink2/70">
          Setelah PR dibuat, kamu bisa split tiap item ke multiple supplier
          dengan qty absolut, lalu generate quotation per supplier sekali klik.
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-xl bg-ink px-5 py-3 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
        >
          {busy ? "Membuat…" : "📋 Buat PR & Muat Kebutuhan"}
        </button>
      </div>
    </div>
  );
}
