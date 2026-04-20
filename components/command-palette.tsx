"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { globalSearch, type SearchHit } from "@/lib/engine";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

const KIND_ICON: Record<string, string> = {
  po: "🧾",
  grn: "📥",
  invoice: "🧮",
  qt: "💹",
  pr: "📋",
  item: "📦",
  supplier: "🤝",
  menu: "🍲",
  school: "🏫",
  delivery: "🚚"
};

const STATIC_ROUTES: Array<{
  title: string;
  subtitle: string;
  url: string;
  icon: string;
  keywords: string;
}> = [
  {
    title: "Dashboard",
    subtitle: "Overview KPI",
    url: "/dashboard",
    icon: "📊",
    keywords: "dashboard home overview"
  },
  {
    title: "Menu Master",
    subtitle: "Resep + BOM",
    url: "/menu",
    icon: "🍲",
    keywords: "menu resep recipe bom"
  },
  {
    title: "Kalender Menu",
    subtitle: "Penjadwalan menu",
    url: "/calendar",
    icon: "🗓️",
    keywords: "calendar kalender schedule"
  },
  {
    title: "Rencana Kebutuhan",
    subtitle: "Planning",
    url: "/planning",
    icon: "📋",
    keywords: "planning rencana kebutuhan forecast"
  },
  {
    title: "Kartu Stok",
    subtitle: "Inventori + batch",
    url: "/stock",
    icon: "📦",
    keywords: "stock kartu stok inventory batch expiry"
  },
  {
    title: "Pengadaan",
    subtitle: "PO, GRN, invoice",
    url: "/procurement",
    icon: "🧾",
    keywords: "procurement pengadaan po grn invoice"
  },
  {
    title: "Supplier",
    subtitle: "Master supplier",
    url: "/suppliers",
    icon: "🤝",
    keywords: "supplier vendor"
  },
  {
    title: "Price List",
    subtitle: "Harga referensi",
    url: "/price-list",
    icon: "💹",
    keywords: "price list harga"
  },
  {
    title: "Sekolah",
    subtitle: "Master sekolah + attendance",
    url: "/schools",
    icon: "🏫",
    keywords: "school sekolah attendance"
  },
  {
    title: "Pengiriman",
    subtitle: "Manifest + POD",
    url: "/deliveries",
    icon: "🚚",
    keywords: "delivery pengiriman manifest pod"
  },
  {
    title: "Pembayaran",
    subtitle: "AP + cashflow",
    url: "/payments",
    icon: "💳",
    keywords: "payment pembayaran cashflow ap"
  },
  {
    title: "Anggaran",
    subtitle: "Budget + CPP",
    url: "/budget",
    icon: "💰",
    keywords: "budget anggaran cpp cost per portion"
  },
  {
    title: "Dokumen",
    subtitle: "Doc generator",
    url: "/docgen",
    icon: "🖨️",
    keywords: "docgen dokumen document print"
  },
  {
    title: "SOP",
    subtitle: "Prosedur operasi",
    url: "/sop",
    icon: "📚",
    keywords: "sop prosedur procedure"
  },
  {
    title: "Audit Log",
    subtitle: "Aktivitas sistem",
    url: "/admin/audit",
    icon: "📜",
    keywords: "audit log aktivitas"
  },
  {
    title: "Data Master",
    subtitle: "Admin data",
    url: "/admin/data",
    icon: "🗃️",
    keywords: "admin data master"
  }
];

export function CommandPalette() {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setHits([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const results = await globalSearch(supabase, q, 12);
        setHits(results);
        setActive(0);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [query, supabase]);

  const staticHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATIC_ROUTES.slice(0, 8);
    return STATIC_ROUTES.filter((r) =>
      (r.title + " " + r.keywords + " " + r.subtitle).toLowerCase().includes(q)
    ).slice(0, 6);
  }, [query]);

  const combined = useMemo(() => {
    const s = staticHits.map((r) => ({
      kind: "nav",
      id: r.url,
      title: r.title,
      subtitle: r.subtitle,
      url: r.url,
      icon: r.icon
    }));
    const h = hits.map((r) => ({
      kind: r.kind,
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
      url: r.url,
      icon: KIND_ICON[r.kind] ?? "•"
    }));
    return [...s, ...h];
  }, [staticHits, hits]);

  const go = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, combined.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = combined[active];
      if (hit) go(hit.url);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("cmdk.trigger", lang)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-xs font-black text-white shadow-cardlg transition hover:bg-ink2 hover:scale-105 sm:text-sm"
      >
        <span>🔍</span>
        <span className="hidden sm:inline">
          {t("cmdk.trigger", lang)}
        </span>
        <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-cardlg ring-1 ring-ink/10 dark:bg-d-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
              <span className="text-lg">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("cmdk.placeholder", lang)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink2/50"
              />
              {loading && (
                <span className="text-[11px] text-ink2/60">...</span>
              )}
              <kbd className="rounded bg-ink2/10 px-1.5 py-0.5 font-mono text-[10px] text-ink2">
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {combined.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-ink2/60">
                  {query.trim().length < 2
                    ? t("cmdk.empty", lang)
                    : t("cmdk.noResults", lang)}
                </div>
              ) : (
                <ul>
                  {combined.map((hit, i) => (
                    <li key={`${hit.kind}:${hit.id}`}>
                      <Link
                        href={hit.url}
                        onClick={(e) => {
                          e.preventDefault();
                          go(hit.url);
                        }}
                        onMouseEnter={() => setActive(i)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                          i === active
                            ? "bg-primary-strong/10"
                            : "hover:bg-ink2/5"
                        }`}
                      >
                        <span className="text-lg">{hit.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold text-ink">
                            {hit.title}
                          </div>
                          <div className="truncate text-[11px] text-ink2/70">
                            {hit.subtitle}
                          </div>
                        </div>
                        <span className="rounded-full bg-ink2/10 px-2 py-0.5 font-mono text-[10px] uppercase text-ink2">
                          {hit.kind}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-ink/10 bg-ink2/5 px-4 py-2 text-[10px] text-ink2/60">
              <div className="flex gap-2">
                <span>
                  <kbd className="rounded bg-white px-1 py-0.5 font-mono">↑↓</kbd>{" "}
                  {lang === "EN" ? "navigate" : "navigasi"}
                </span>
                <span>
                  <kbd className="rounded bg-white px-1 py-0.5 font-mono">↵</kbd>{" "}
                  {lang === "EN" ? "open" : "buka"}
                </span>
              </div>
              <span className="font-mono">{combined.length} items</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
