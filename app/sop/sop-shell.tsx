"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import type { SOP } from "@/lib/sops";
import type { SopComplianceRow } from "@/lib/engine";
import { SopRunForm } from "./sop-run-form";

const CAT_RING: Record<SOP["category"], string> = {
  OPERASIONAL: "bg-sky-50 text-sky-900 ring-sky-200",
  HIGIENE: "bg-emerald-50 text-emerald-900 ring-emerald-200"
};

// Pemetaan SOP → halaman operasional terkait.
const RELATED_ACTION: Record<string, { href: string; label: string } | null> = {
  "SOP-OP-01": { href: "/procurement", label: "➜ Procurement · Catat GRN" },
  "SOP-OP-02": { href: "/stock", label: "➜ Stock · Kelola Gudang" },
  "SOP-OP-03": { href: "/menu", label: "➜ Menu · Edit BOM" },
  "SOP-OP-04": { href: "/procurement", label: "➜ Procurement · Terbitkan PO" },
  "SOP-OP-05": { href: "/schools", label: "➜ Schools · Porsi Efektif" },
  "SOP-OP-06": { href: "/procurement", label: "➜ Procurement · Berita Acara" },
  "SOP-OP-07": { href: "/procurement", label: "➜ Procurement · Invoice" },
  "SOP-OP-08": { href: "/schools", label: "➜ Schools · Distribusi" },
  "SOP-OP-09": { href: "/dashboard", label: "➜ Dashboard · Pelaporan Harian" },
  "SOP-OP-10": { href: "/stock", label: "➜ Stock · Adjustment & Waste" },
  "SOP-OP-11": { href: "/dashboard", label: "➜ Dashboard · Audit" },
  "SOP-HG-01": null,
  "SOP-HG-02": null,
  "SOP-HG-03": null,
  "SOP-HG-04": null,
  "SOP-HG-05": null,
  "SOP-HG-06": { href: "/procurement", label: "➜ Procurement · QC Harian" },
  "SOP-HG-07": null,
  "SOP-HG-08": null,
  "SOP-HG-09": { href: "/dashboard", label: "➜ Dashboard · Incident Log" }
};

interface Props {
  sops: SOP[];
  compliance: SopComplianceRow[];
  canWrite: boolean;
}

export function SopShell({ sops, compliance, canWrite }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = openId ? sops.find((s) => s.id === openId) ?? null : null;

  const complianceMap = useMemo(() => {
    const m = new Map<string, SopComplianceRow>();
    for (const c of compliance) m.set(c.sop_id, c);
    return m;
  }, [compliance]);

  return (
    <>
      <div className="mb-6 space-y-3">
        {sops.map((s) => {
          const c = complianceMap.get(s.id);
          const related = RELATED_ACTION[s.id];
          return (
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
              <div className="flex shrink-0 flex-wrap items-center gap-2 text-[10px] font-semibold text-ink2/70">
                <Badge tone="neutral">{s.steps.length} langkah</Badge>
                <Badge tone="bad">{s.risks.length} risiko</Badge>
                {c ? (
                  <Badge
                    tone={
                      Number(c.avg_completion) >= 80
                        ? "ok"
                        : Number(c.avg_completion) >= 50
                          ? "warn"
                          : "bad"
                    }
                  >
                    {c.run_count}× · {Number(c.avg_completion).toFixed(0)}%
                  </Badge>
                ) : (
                  <Badge tone="muted">belum dieksekusi</Badge>
                )}
                {related && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = related.href;
                    }}
                    className="hidden cursor-pointer rounded-full bg-accent-strong/10 px-2 py-0.5 text-[10px] font-bold text-accent-strong transition hover:bg-accent-strong hover:text-white md:inline-block"
                  >
                    {related.label}
                  </span>
                )}
                <span className="hidden text-ink2/60 lg:inline">{s.ref}</span>
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <SopModal
          sop={active}
          canWrite={canWrite}
          related={RELATED_ACTION[active.id]}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

function SopModal({
  sop,
  canWrite,
  related,
  onClose
}: {
  sop: SOP;
  canWrite: boolean;
  related: { href: string; label: string } | null | undefined;
  onClose: () => void;
}) {
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
          <div className="flex shrink-0 items-center gap-2">
            {related && (
              <a
                href={related.href}
                className="hidden rounded-xl bg-accent-strong px-3 py-2 text-[11px] font-black text-white ring-1 ring-accent-strong transition hover:bg-ink sm:inline-block"
              >
                {related.label}
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink2 ring-1 ring-ink/10 transition hover:bg-ink/5"
            >
              ×
            </button>
          </div>
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

          {/* Embedded interaction form */}
          <SopRunForm sop={sop} canWrite={canWrite} />
        </div>
      </div>
    </div>
  );
}
