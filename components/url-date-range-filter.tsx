"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

interface Props {
  fromKey?: string;
  toKey?: string;
  defaultFrom?: string;
  defaultTo?: string;
}

/**
 * Reusable date range filter that writes `from`/`to` (or custom keys) to the
 * URL search params on change. No "Apply" button — updates instantly, matching
 * the in-memory toolbar filters used by TransactionLog / ScheduleTable.
 */
export function UrlDateRangeFilter({
  fromKey = "from",
  toKey = "to",
  defaultFrom,
  defaultTo
}: Props) {
  const { lang } = useLang();
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const from = sp.get(fromKey) ?? defaultFrom ?? "";
  const to = sp.get(toKey) ?? defaultTo ?? "";

  function set(key: string, val: string) {
    const params = new URLSearchParams(sp.toString());
    if (val) params.set(key, val);
    else params.delete(key);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    });
  }

  const rangeActive =
    (defaultFrom !== undefined && from !== defaultFrom) ||
    (defaultTo !== undefined && to !== defaultTo);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{t("dashboard.hppFrom", lang)}</span>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => set(fromKey, e.target.value)}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{t("dashboard.hppTo", lang)}</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => set(toKey, e.target.value)}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      {rangeActive && (
        <button
          type="button"
          onClick={() => {
            if (defaultFrom !== undefined) set(fromKey, defaultFrom);
            if (defaultTo !== undefined) set(toKey, defaultTo);
          }}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 text-[11px] font-semibold text-ink2 transition hover:bg-ink/[0.04]"
        >
          {t("common.reset", lang)}
        </button>
      )}
    </div>
  );
}
