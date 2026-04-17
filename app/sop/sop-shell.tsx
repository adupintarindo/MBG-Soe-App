"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import type { SOP } from "@/lib/sops";

const CAT_RING: Record<SOP["category"], string> = {
  OPERASIONAL: "bg-sky-50 text-sky-900 ring-sky-200",
  HIGIENE: "bg-emerald-50 text-emerald-900 ring-emerald-200"
};

export function SopShell({ sops }: { sops: SOP[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = openId ? sops.find((s) => s.id === openId) ?? null : null;

  return (
    <>
      <div className="mb-6 space-y-3">
        {sops.map((s) => (
          <button
            key={s.id}
            id={s.id}
            type="button"
            onClick={() => setOpenId(s.id)}
            className="group flex w-full scroll-mt-20 flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-cardlg focus:outline-none focus:ring-2 focus:ring-accent-strong"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/5 text-xs font-black text-ink2 transition group-hover:translate-x-0.5">
                ›
              </span>
              <span className="font-mono text-[11px] font-bold text-ink2/60">
                {s.id}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CAT_RING[s.category]}`}
              >
                {s.category}
              </span>
              <h3 className="truncate text-base font-black text-ink">
                {s.title}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[10px] font-semibold text-ink2/70">
              <Badge tone="neutral">{s.steps.length} langkah</Badge>
              <Badge tone="bad">{s.risks.length} risiko</Badge>
              <span className="hidden md:inline text-ink2/60">{s.ref}</span>
            </div>
          </button>
        ))}
      </div>

      {active && <SopModal sop={active} onClose={() => setOpenId(null)} />}
    </>
  );
}

function SopModal({ sop, onClose }: { sop: SOP; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`SOP ${sop.title}`}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-3 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl ring-1 ring-ink/10"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink/10 px-6 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-ink2/60">
                {sop.id}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CAT_RING[sop.category]}`}
              >
                {sop.category}
              </span>
              <Badge tone="neutral">{sop.steps.length} langkah</Badge>
              <Badge tone="bad">{sop.risks.length} risiko</Badge>
            </div>
            <h2 className="truncate text-lg font-black text-ink">
              {sop.title}
            </h2>
            <div className="mt-0.5 text-[11px] text-ink2/70">
              <b>Ref:</b> {sop.ref}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink2 ring-1 ring-ink/10 transition hover:bg-ink/5"
          >
            ×
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl bg-paper px-4 py-3 ring-1 ring-ink/5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
              Scope
            </div>
            <p className="mt-1 text-sm text-ink2">{sop.scope}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                Langkah ({sop.steps.length})
              </div>
              <ol className="mt-2 space-y-1.5 text-sm">
                {sop.steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-black text-white">
                      {i + 1}
                    </span>
                    <span className="text-ink2">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                Risiko Utama ({sop.risks.length})
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {sop.risks.map((r, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-red-900 ring-1 ring-red-200"
                  >
                    ⚠ {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
