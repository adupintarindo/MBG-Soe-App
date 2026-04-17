"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ti, t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

export function PrActions({
  prNo,
  pendingCount
}: {
  prNo: string;
  pendingCount: number;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function generate() {
    if (
      !confirm(ti("prActions.confirm", lang, { n: pendingCount }))
    )
      return;
    setError(null);
    setBusy(true);
    try {
      const { data, error: err } = await supabase.rpc(
        "pr_generate_quotations",
        { p_pr_no: prNo }
      );
      if (err) {
        setError(err.message);
        return;
      }
      const created = (data as string[] | null) ?? [];
      alert(
        created.length === 0
          ? t("prActions.noneSpawned", lang)
          : ti("prActions.done", lang, { n: created.length, list: created.join("\n") })
      );
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={generate}
        disabled={busy || pendingCount === 0}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-card hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? t("prActions.processing", lang) : ti("prActions.btnGen", lang, { n: pendingCount })}
      </button>
      {error && (
        <span className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </span>
      )}
    </div>
  );
}
