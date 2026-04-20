/**
 * PageTabs — strip tombol tab untuk halaman multi-tab.
 *
 * Digunakan oleh /keuangan, /personalia, /dokumen-bgn untuk beralih
 * antar sub-section tanpa re-mount page shell.
 *
 * Server-component-friendly: render <Link> ke ?tab=<id>, sehingga
 * halaman membaca tab aktif dari searchParams.tab.
 */
import Link from "next/link";

export interface PageTab {
  id: string;
  label: string;
  icon?: string;
  href: string; // sudah lengkap termasuk ?tab=id
}

interface PageTabsProps {
  tabs: PageTab[];
  activeId: string;
}

export function PageTabs({ tabs, activeId }: PageTabsProps) {
  return (
    <nav
      aria-label="Sub-tab"
      className="mb-6 flex w-full flex-wrap gap-2 rounded-2xl bg-white/80 p-2 shadow-card ring-1 ring-primary/5 dark:bg-d-surface/70 dark:ring-d-border/30"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-w-[120px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-bold transition ${
              active
                ? "bg-primary-gradient text-white shadow-cardlg ring-1 ring-gold/40 dark:bg-primary-gradient-dark"
                : "bg-paper/60 text-primary hover:bg-white hover:shadow-card dark:bg-d-surface-2/60 dark:text-d-text dark:hover:bg-d-surface-2"
            }`}
          >
            {tab.icon && <span aria-hidden>{tab.icon}</span>}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
