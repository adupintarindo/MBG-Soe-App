"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { flushOutbox, outboxCount } from "@/lib/offline-queue";

export function PwaRegistrar() {
  const supabase = useMemo(() => createClient(), []);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const [justFlushed, setJustFlushed] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("SW register failed:", err);
        });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const n = await outboxCount().catch(() => 0);
      if (!cancelled) setPending(n);
    };
    tick();
    const int = setInterval(tick, 10000);
    return () => {
      cancelled = true;
      clearInterval(int);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = async () => {
      if (!navigator.onLine) return;
      setFlushing(true);
      try {
        const res = await flushOutbox(supabase);
        setPending(res.remaining);
        if (res.flushed > 0) {
          setJustFlushed(res.flushed);
          setTimeout(() => setJustFlushed(null), 4000);
        }
      } finally {
        setFlushing(false);
      }
    };
    window.addEventListener("online", handler);
    navigator.serviceWorker?.addEventListener("message", (e) => {
      if ((e.data as { type?: string })?.type === "flush-outbox") {
        void handler();
      }
    });
    if (navigator.onLine) void handler();
    return () => {
      window.removeEventListener("online", handler);
    };
  }, [supabase]);

  if (online && pending === 0 && justFlushed === null) return null;

  return (
    <div
      className="fixed left-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold shadow-cardlg"
      style={{
        background: online ? "rgb(236, 253, 245)" : "rgb(254, 242, 242)",
        color: online ? "rgb(4, 120, 87)" : "rgb(153, 27, 27)",
        borderWidth: 1,
        borderColor: online ? "rgb(167, 243, 208)" : "rgb(254, 202, 202)"
      }}
      role="status"
    >
      <span>{online ? "🟢" : "🔴"}</span>
      <span>
        {!online
          ? "Offline — perubahan disimpan lokal"
          : flushing
            ? `Mengirim ${pending}...`
            : pending > 0
              ? `${pending} pending sync`
              : justFlushed
                ? `✓ ${justFlushed} tersinkron`
                : ""}
      </span>
    </div>
  );
}
