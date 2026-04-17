"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { autoAssignMonth } from "./actions";

export function AutoAssignButton({
  year,
  month,
  unassigned
}: {
  year: number;
  month: number;
  unassigned: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<number | null>(null);

  function run() {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await autoAssignMonth(year, month);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOk(res.inserted);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="rounded-full bg-ink px-4 py-2 text-xs font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
        title={`Isi ${unassigned} hari kosong bulan ini pakai rolling M1..Mn`}
      >
        {isPending ? "Menjalankan…" : `⚡ Auto-assign ${unassigned} hari`}
      </button>
      {error && (
        <span className="text-[10px] font-bold text-red-700">{error}</span>
      )}
      {ok !== null && !error && (
        <span className="text-[10px] font-bold text-emerald-700">
          {ok === 0 ? "Sudah lengkap." : `${ok} hari di-assign.`}
        </span>
      )}
    </div>
  );
}
