"use client";

import { useMemo, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

export interface DateRangeToolbarProps {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  onReset?: () => void;
  rangeActive?: boolean;
  fromLabel?: string;
  toLabel?: string;
}

/**
 * Compact "DARI … SAMPAI …" date range picker matching the dashboard
 * Schedule/Transaction toolbars. Intended to be passed as `toolbarExtra`
 * to a SortableTable so every transactional table shares the same UI.
 */
export function DateRangeToolbar({
  from,
  to,
  onChange,
  onReset,
  rangeActive,
  fromLabel,
  toLabel
}: DateRangeToolbarProps) {
  const { lang } = useLang();
  const showReset = rangeActive ?? (from !== "" || to !== "");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{fromLabel ?? t("dashboard.hppFrom", lang)}</span>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2">
        <span>{toLabel ?? t("dashboard.hppTo", lang)}</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
        />
      </label>
      {showReset && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-ink/10 bg-paper px-2 py-1 text-[11px] font-semibold text-ink2 transition hover:bg-ink/[0.04]"
        >
          {t("common.reset", lang)}
        </button>
      )}
    </div>
  );
}

/**
 * Hook that pairs with DateRangeToolbar. Filters `rows` by a date accessor
 * inside the [from, to] window (inclusive). Works with any ISO date string.
 */
export function useDateRangeFilter<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
  initial?: { from?: string; to?: string }
) {
  const [from, setFrom] = useState<string>(initial?.from ?? "");
  const [to, setTo] = useState<string>(initial?.to ?? "");

  const filtered = useMemo(() => {
    if (!from && !to) return rows;
    return rows.filter((r) => {
      const d = getDate(r);
      if (!d) return !from && !to ? true : false;
      const iso = d.length >= 10 ? d.slice(0, 10) : d;
      if (from && iso < from) return false;
      if (to && iso > to) return false;
      return true;
    });
  }, [rows, from, to, getDate]);

  const reset = () => {
    setFrom(initial?.from ?? "");
    setTo(initial?.to ?? "");
  };

  const rangeActive = from !== (initial?.from ?? "") || to !== (initial?.to ?? "");

  return {
    from,
    to,
    setFrom,
    setTo,
    filtered,
    reset,
    rangeActive,
    /** Convenience: bind to <DateRangeToolbar /> onChange. */
    onChange: ({ from: f, to: tv }: { from: string; to: string }) => {
      setFrom(f);
      setTo(tv);
    }
  } as const;
}

/** Re-exported for callers that only want a reset button ReactNode. */
export type { ReactNode };
