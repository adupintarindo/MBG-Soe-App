"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Alert {
  kind:
    | "shortage_h1"
    | "near_expiry_3"
    | "near_expiry_7"
    | "invoice_overdue"
    | "po_waiting_grn";
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  ref: string;
  ts: string;
}

const KIND_ICON: Record<Alert["kind"], string> = {
  shortage_h1: "⚠️",
  near_expiry_3: "⏰",
  near_expiry_7: "📅",
  invoice_overdue: "💸",
  po_waiting_grn: "📥"
};

const SEV_COLOR: Record<Alert["severity"], string> = {
  high: "text-red-700 dark:text-red-300",
  medium: "text-amber-700 dark:text-amber-300",
  low: "text-sky-700 dark:text-sky-300"
};

const POLL_MS = 90_000; // 90s

export function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      // notification_feed() RPC added in migration 0042 — not yet in
      // regenerated database types, cast via unknown until `db:types:remote`
      // is re-run after auth login.
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      )("notification_feed", { p_limit: 50 });
      if (error) {
        console.warn("[bell]", error.message);
        setAlerts([]);
        return;
      }
      const parsed: Alert[] = Array.isArray(data) ? (data as Alert[]) : [];
      setAlerts(parsed);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, POLL_MS);
    return () => clearInterval(id);
  }, [fetchFeed]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  const count = alerts.length;
  const highCount = alerts.filter((a) => a.severity === "high").length;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifikasi (${count})`}
        className="relative inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary-2 shadow-card transition hover:bg-primary hover:text-white dark:bg-d-surface-2 dark:text-d-text dark:shadow-card-dark dark:hover:bg-accent-strong"
      >
        <span aria-hidden>🔔</span>
        {count > 0 && (
          <span
            className={`absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-d-bg ${
              highCount > 0 ? "bg-red-600" : "bg-amber-500"
            }`}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-2xl bg-white shadow-cardlg ring-1 ring-ink/10 dark:bg-d-surface dark:ring-white/10">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2 dark:border-white/10">
            <span className="font-display text-[12px] font-black uppercase tracking-wider text-ink dark:text-d-text">
              Notifikasi
            </span>
            <span className="text-[11px] text-ink2 dark:text-d-text-2">
              {loading ? "…" : `${count} item`}
            </span>
          </div>
          {count === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-ink2/70 dark:text-d-text-2">
              🎉 Tidak ada notifikasi.
            </div>
          ) : (
            <ul className="max-h-[360px] divide-y divide-ink/5 overflow-y-auto dark:divide-white/5">
              {alerts.map((a, i) => (
                <li
                  key={`${a.kind}-${a.ref}-${i}`}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-ink/[0.03] dark:hover:bg-white/5"
                >
                  <span className="text-base" aria-hidden>
                    {KIND_ICON[a.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-[12.5px] font-bold ${SEV_COLOR[a.severity]}`}
                    >
                      {a.title}
                    </div>
                    <div className="truncate text-[11px] text-ink2/80 dark:text-d-text-2">
                      {a.detail}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
