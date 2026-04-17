"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
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
  const { lang } = useLang();
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
        title={ti("autoAssign.title", lang, { n: unassigned })}
      >
        {isPending
          ? t("autoAssign.running", lang)
          : ti("autoAssign.btn", lang, { n: unassigned })}
      </button>
      {error && (
        <span className="text-[10px] font-bold text-red-700">{error}</span>
      )}
      {ok !== null && !error && (
        <span className="text-[10px] font-bold text-emerald-700">
          {ok === 0
            ? t("autoAssign.alreadyComplete", lang)
            : ti("autoAssign.assigned", lang, { n: ok })}
        </span>
      )}
    </div>
  );
}
