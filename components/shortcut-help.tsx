"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Shortcut {
  keys: string[];
  label: string;
  action?: () => void;
}

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Two-key sequence state (e.g., "g d" → /dashboard)
    let lastKey: string | null = null;
    let lastAt = 0;
    const SEQ_WINDOW = 800;

    function nav(path: string) {
      router.push(path);
    }

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // ⌘/ or ? — toggle help (allowed even while typing)
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (!isTyping && e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (isTyping) return;

      // Sequence shortcuts: g+<letter>
      const now = Date.now();
      if (lastKey === "g" && now - lastAt < SEQ_WINDOW) {
        const map: Record<string, string> = {
          d: "/dashboard",
          m: "/menu",
          c: "/calendar",
          p: "/procurement",
          s: "/stock",
          x: "/schools",
          b: "/budget",
          o: "/sop"
        };
        const path = map[e.key.toLowerCase()];
        if (path) {
          e.preventDefault();
          nav(path);
          lastKey = null;
          return;
        }
      }
      if (e.key.toLowerCase() === "g") {
        lastKey = "g";
        lastAt = now;
        return;
      }

      // Single-key shortcuts
      if (e.key.toLowerCase() === "n" && !lastKey) {
        // n+p → new PO
        lastKey = "n";
        lastAt = now;
        return;
      }
      if (lastKey === "n" && now - lastAt < SEQ_WINDOW) {
        if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          nav("/procurement/new");
          lastKey = null;
          return;
        }
        lastKey = null;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, router]);

  if (!open) return null;

  const SECTIONS: { title: string; items: Shortcut[] }[] = [
    {
      title: "Global",
      items: [
        { keys: ["⌘", "K"], label: "Buka Command Palette · cari apa saja" },
        { keys: ["⌘", "/"], label: "Toggle bantuan shortcut ini" },
        { keys: ["?"], label: "Buka bantuan shortcut" },
        { keys: ["Esc"], label: "Tutup modal / kembali" }
      ]
    },
    {
      title: "Navigasi (tekan g lalu…)",
      items: [
        { keys: ["g", "d"], label: "Dashboard" },
        { keys: ["g", "m"], label: "Menu master" },
        { keys: ["g", "c"], label: "Kalender menu" },
        { keys: ["g", "p"], label: "Pengadaan" },
        { keys: ["g", "s"], label: "Stok" },
        { keys: ["g", "x"], label: "Sekolah" },
        { keys: ["g", "b"], label: "Budget" },
        { keys: ["g", "o"], label: "SOP" }
      ]
    },
    {
      title: "Aksi cepat",
      items: [
        { keys: ["n", "p"], label: "Buat PO baru (Procurement · New)" }
      ]
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-cardlg ring-1 ring-ink/10 dark:bg-d-surface dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3 dark:border-white/10">
          <div className="font-display text-base font-black text-ink dark:text-d-text">
            ⌨ Pintasan Keyboard
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded-full p-1 text-ink2 hover:bg-ink/5 dark:text-d-text-2 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {SECTIONS.map((sec) => (
            <section key={sec.title}>
              <h3 className="mb-2 font-display text-[11px] font-black uppercase tracking-wider text-ink2 dark:text-d-text-2">
                {sec.title}
              </h3>
              <ul className="space-y-1.5">
                {sec.items.map((it) => (
                  <li
                    key={it.label}
                    className="flex items-center justify-between gap-3 text-[12.5px] text-ink dark:text-d-text"
                  >
                    <span className="truncate">{it.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {it.keys.map((k, idx) => (
                        <kbd
                          key={idx}
                          className="rounded border border-ink/15 bg-ink/5 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-ink dark:border-white/15 dark:bg-white/10 dark:text-d-text"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="border-t border-ink/10 bg-ink/[0.02] px-5 py-2 text-[11px] text-ink2 dark:border-white/10 dark:bg-white/5 dark:text-d-text-2">
          Tekan <kbd className="rounded bg-ink/10 px-1 py-0.5 font-mono dark:bg-white/10">Esc</kbd> untuk menutup
        </div>
      </div>
    </div>
  );
}
