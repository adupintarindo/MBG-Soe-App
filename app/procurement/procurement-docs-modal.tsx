"use client";

import { useEffect, useState } from "react";
import { Badge, EmptyState, Section } from "@/components/ui";
import { formatIDR, formatDateShort } from "@/lib/engine";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

interface DocItem {
  no: string;
  date: string;
  sub: string;
  amount: number | null;
  status: string;
  href: string;
}

interface PoLite {
  no: string;
  po_date: string;
  supplier_id: string;
  total: number | string;
  status: string;
}
interface GrnLite {
  no: string;
  po_no: string | null;
  grn_date: string;
  status: string;
}
interface InvLite {
  no: string;
  po_no: string | null;
  inv_date: string;
  supplier_id: string;
  total: number | string;
  status: string;
}

export function ProcurementDocsModal({
  lang,
  pos,
  grns,
  invoices,
  supplierNames
}: {
  lang: Lang;
  pos: PoLite[];
  grns: GrnLite[];
  invoices: InvLite[];
  supplierNames: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const poDocs: DocItem[] = pos.map((p) => ({
    no: p.no,
    date: p.po_date,
    sub: supplierNames[p.supplier_id] ?? p.supplier_id,
    amount: Number(p.total),
    status: p.status,
    href: `/docgen/po/${encodeURIComponent(p.no)}`
  }));
  const grnDocs: DocItem[] = grns.map((g) => ({
    no: g.no,
    date: g.grn_date,
    sub: g.po_no ?? "—",
    amount: null,
    status: g.status,
    href: `/docgen/grn/${encodeURIComponent(g.no)}`
  }));
  const invDocs: DocItem[] = invoices.map((i) => ({
    no: i.no,
    date: i.inv_date,
    sub: supplierNames[i.supplier_id] ?? i.supplier_id,
    amount: Number(i.total),
    status: i.status,
    href: `/docgen/invoice/${encodeURIComponent(i.no)}`
  }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[11px] font-black text-white shadow-card hover:bg-ink2"
      >
        <span>🖨️</span>
        <span>{lang === "EN" ? "Documents" : "Dokumen"}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === "EN" ? "Documents" : "Dokumen"}
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="mt-6 w-full max-w-6xl overflow-hidden rounded-2xl bg-paper shadow-2xl ring-1 ring-ink/10">
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 bg-white px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🖨️</span>
                <h2 className="text-sm font-black uppercase tracking-wide text-ink">
                  {lang === "EN" ? "Documents" : "Dokumen"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-ink2 hover:bg-paper"
                aria-label={lang === "EN" ? "Close" : "Tutup"}
              >
                ✕
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <DocList
                  lang={lang}
                  title={t("docgen.listPO", lang)}
                  icon="📝"
                  hint={
                    lang === "EN"
                      ? "Latest purchase orders available for PDF generation."
                      : "Daftar PO terbaru siap di-generate PDF."
                  }
                  docs={poDocs}
                />
                <DocList
                  lang={lang}
                  title={t("docgen.listGRN", lang)}
                  icon="📦"
                  hint={
                    lang === "EN"
                      ? "Goods receipt notes with QC results. Click to print PDF."
                      : "Berita Acara Penerimaan (GRN) dengan hasil QC. Klik untuk cetak PDF."
                  }
                  docs={grnDocs}
                />
                <DocList
                  lang={lang}
                  title={t("docgen.listInvoice", lang)}
                  icon="💰"
                  hint={
                    lang === "EN"
                      ? "Supplier invoices ready for printable PDF export."
                      : "Invoice supplier yang siap di-cetak PDF."
                  }
                  docs={invDocs}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DocList({
  title,
  icon,
  hint,
  docs,
  lang
}: {
  title: string;
  icon: string;
  hint: string;
  lang: Lang;
  docs: DocItem[];
}) {
  return (
    <Section icon={icon} title={title} hint={hint} className="mb-0">
      {docs.length === 0 ? (
        <EmptyState message={t("docgen.empty", lang)} />
      ) : (
        <ul className="space-y-2 text-sm">
          {docs.map((d) => (
            <li key={d.no}>
              <a
                href={d.href}
                className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-card"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black text-ink">
                      {d.no}
                    </span>
                    <Badge tone="neutral">{d.status}</Badge>
                  </div>
                  <div className="truncate text-[11px] text-ink2/70">
                    {formatDateShort(d.date)} · {d.sub}
                  </div>
                </div>
                <div className="text-right">
                  {d.amount !== null && (
                    <div className="font-mono text-xs font-black text-emerald-800">
                      {formatIDR(d.amount)}
                    </div>
                  )}
                  <div className="text-[11px] font-bold text-accent-strong">
                    {t("docgen.print", lang)}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
