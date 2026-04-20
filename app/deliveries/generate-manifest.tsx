"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deliveryGenerateForDate } from "@/lib/engine";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

export function GenerateManifestButton({ date }: { date: string }) {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setBusy(true);
    try {
      await deliveryGenerateForDate(supabase, date);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-xl bg-gold-gradient px-4 py-2 text-[12px] font-black text-primary-strong shadow-card transition hover:brightness-105 disabled:opacity-50"
      >
        {busy ? t("common.loading", lang) : t("del.btnGenerate", lang)}
      </button>
      {error && (
        <span className="text-[11px] text-red-700" title={error}>
          ⚠
        </span>
      )}
    </>
  );
}
