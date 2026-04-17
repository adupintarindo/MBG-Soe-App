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
  const [menuOpen, setMenuOpen] = useState(false);

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

  function triggerDownload(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildMarkdown(s: SOP) {
    const lines: string[] = [];
    lines.push(`# ${s.id} · ${s.title}`);
    lines.push("");
    lines.push(`**Kategori:** ${s.category}`);
    lines.push(`**Referensi:** ${s.ref}`);
    lines.push("");
    lines.push(`## Scope`);
    lines.push(s.scope);
    lines.push("");
    lines.push(`## Langkah (${s.steps.length})`);
    s.steps.forEach((st, i) => lines.push(`${i + 1}. ${st}`));
    lines.push("");
    lines.push(`## Risiko Utama (${s.risks.length})`);
    s.risks.forEach((r) => lines.push(`- ${r}`));
    lines.push("");
    lines.push(
      `---\nSPPG Nunumeu · IFSR × FFI untuk WFP × Pemkab TTS · ${new Date().toISOString().slice(0, 10)}`
    );
    return lines.join("\n");
  }

  function buildHtml(s: SOP) {
    const esc = (t: string) =>
      t
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/>
<title>${esc(s.id)} · ${esc(s.title)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:780px;margin:40px auto;padding:0 20px;color:#111;line-height:1.55}
  .meta{font-size:12px;color:#555;margin-bottom:4px}
  h1{font-size:22px;margin:0 0 8px}
  h2{font-size:14px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.04em;color:#333}
  .tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#eef;color:#224;margin-right:6px}
  ol,ul{padding-left:22px}
  li{margin:4px 0}
  .risk{background:#fee;border:1px solid #fcc;border-radius:8px;padding:6px 10px;margin:4px 0;list-style:none}
  footer{margin-top:32px;font-size:11px;color:#777;border-top:1px solid #eee;padding-top:10px}
  @media print{body{margin:20px}}
</style></head>
<body>
  <div class="meta">${esc(s.id)} · <span class="tag">${esc(s.category)}</span></div>
  <h1>${esc(s.title)}</h1>
  <div class="meta"><b>Ref:</b> ${esc(s.ref)}</div>
  <h2>Scope</h2><p>${esc(s.scope)}</p>
  <h2>Langkah (${s.steps.length})</h2>
  <ol>${s.steps.map((st) => `<li>${esc(st)}</li>`).join("")}</ol>
  <h2>Risiko Utama (${s.risks.length})</h2>
  <ul>${s.risks.map((r) => `<li class="risk">⚠ ${esc(r)}</li>`).join("")}</ul>
  <footer>SPPG Nunumeu · IFSR × FFI untuk WFP × Pemkab TTS · Dicetak ${new Date().toLocaleString("id-ID")}</footer>
</body></html>`;
  }

  function downloadMd() {
    triggerDownload(`${sop.id}.md`, buildMarkdown(sop), "text/markdown");
    setMenuOpen(false);
  }
  function downloadHtml() {
    triggerDownload(`${sop.id}.html`, buildHtml(sop), "text/html");
    setMenuOpen(false);
  }
  function downloadPdf() {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      alert("Popup diblokir browser. Izinkan popup untuk download PDF.");
      return;
    }
    w.document.open();
    w.document.write(buildHtml(sop));
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 400);
    setMenuOpen(false);
  }

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
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[11px] font-black text-white ring-1 ring-ink transition hover:bg-ink2"
              >
                ⬇ Download
                <span className="text-[10px] opacity-70">▾</span>
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-ink/10"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={downloadPdf}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-bold text-ink transition hover:bg-paper"
                    >
                      <span>📄 PDF (Cetak)</span>
                      <span className="text-[10px] font-normal text-ink2/60">
                        .pdf
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={downloadHtml}
                      className="flex w-full items-center justify-between gap-2 border-t border-ink/5 px-4 py-2.5 text-left text-xs font-bold text-ink transition hover:bg-paper"
                    >
                      <span>🌐 HTML Standalone</span>
                      <span className="text-[10px] font-normal text-ink2/60">
                        .html
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={downloadMd}
                      className="flex w-full items-center justify-between gap-2 border-t border-ink/5 px-4 py-2.5 text-left text-xs font-bold text-ink transition hover:bg-paper"
                    >
                      <span>📝 Markdown</span>
                      <span className="text-[10px] font-normal text-ink2/60">
                        .md
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
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
