"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UserRole } from "@/lib/roles";
import { canInvite, canWriteMenu, canWriteStock } from "@/lib/roles";
import { type Lang, type LangKey, t, DAYS, MONTHS } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs-context";
import { CommandPalette } from "./command-palette";
import { NotificationBell } from "./notification-bell";

interface MenuToday {
  id: number | null;
  name: string | null;
}

interface NavProps {
  email: string;
  role: UserRole;
  fullName?: string | null;
  /** Menu cycle for today (from dashboard_kpis). Pass null when there is no menu (libur). */
  menuToday?: MenuToday | null;
}

type TabGroup = "home" | "plan" | "buy" | "run" | "audit" | "admin";

interface TabCard {
  href: string;
  labelKey: LangKey;
  icon: string;
  group: TabGroup;
  show: (role: UserRole) => boolean;
}

const TABS: TabCard[] = [
  // Home
  { href: "/dashboard", labelKey: "tabDashboard", icon: "📊", group: "home", show: () => true },

  // Plan — what to cook & when
  { href: "/menu", labelKey: "tabMenu", icon: "🍲", group: "plan", show: () => true },
  {
    href: "/calendar",
    labelKey: "tabCalendar",
    icon: "🗓️",
    group: "plan",
    show: (r) => canWriteMenu(r) || r === "viewer"
  },
  { href: "/planning", labelKey: "tabPlanning", icon: "📋", group: "plan", show: () => true },

  // Buy — source, price, order, pay
  { href: "/price-list", labelKey: "tabPriceList", icon: "💹", group: "buy", show: () => true },
  { href: "/suppliers", labelKey: "tabSuppliers", icon: "🤝", group: "buy", show: () => true },
  {
    href: "/procurement",
    labelKey: "tabProcurement",
    icon: "🧾",
    group: "buy",
    show: () => true
  },
  {
    href: "/payments",
    labelKey: "tabPayments",
    icon: "💳",
    group: "buy",
    show: (r) => r === "admin" || r === "operator" || r === "viewer"
  },

  // Run — receive, cook, deliver
  {
    href: "/stock",
    labelKey: "tabStock",
    icon: "📦",
    group: "run",
    show: (r) => canWriteStock(r) || r === "viewer" || r === "ahli_gizi"
  },
  { href: "/schools", labelKey: "tabSchools", icon: "🫶", group: "run", show: () => true },

  // Finance — cost per portion & budget
  {
    href: "/keuangan",
    labelKey: "tabKeuangan",
    icon: "💰",
    group: "run",
    show: (r) => r === "admin" || r === "operator" || r === "viewer"
  },

  // Personalia — tim SPPG, gaji, insentif
  {
    href: "/personalia",
    labelKey: "tabPersonalia",
    icon: "👥",
    group: "run",
    show: (r) => r === "admin" || r === "operator" || r === "viewer"
  },

  // Dokumen BGN — QC sampel, uji organoleptik, generator Lampiran
  {
    href: "/dokumen-bgn",
    labelKey: "tabDokumenBgn",
    icon: "📄",
    group: "audit",
    show: (r) =>
      r === "admin" || r === "operator" || r === "viewer" || r === "ahli_gizi"
  },

  // Supplier portal (only visible to supplier role)
  {
    href: "/supplier",
    labelKey: "tabSupplierPortal",
    icon: "🏢",
    group: "buy",
    show: (r) => r === "supplier"
  },
  {
    href: "/supplier/forecast",
    labelKey: "tabForecast",
    icon: "📅",
    group: "buy",
    show: (r) => r === "supplier"
  },

  // Docs & SOP
  { href: "/docgen", labelKey: "tabDocgen", icon: "🖨️", group: "audit", show: () => true },
  { href: "/sop", labelKey: "tabSOP", icon: "📚", group: "audit", show: () => true }
];

function toWITA(d: Date): Date {
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utcMs + 8 * 3600 * 1000);
}

function formatDate(d: Date, lang: Lang): string {
  const w = toWITA(d);
  const day = lang === "EN" ? DAYS.short.EN[w.getDay()] : DAYS.long.ID[w.getDay()];
  const month = MONTHS.long[lang][w.getMonth()];
  return `${day}, ${w.getDate()} ${month} ${w.getFullYear()}`;
}

function formatTimeWITA(d: Date): string {
  const w = toWITA(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(w.getHours())}:${pad(w.getMinutes())}:${pad(w.getSeconds())} WITA`;
}

type StatusTone = "ok" | "warn" | "muted";
interface StatusOut {
  tone: StatusTone;
  text: string;
  dot: string;
}

function computeStatus(
  d: Date,
  menu: MenuToday | null | undefined,
  lang: Lang
): StatusOut {
  const w = toWITA(d);
  const day = w.getDay();
  const hour = w.getHours();

  if (day === 0 || day === 6) {
    return { tone: "muted", text: t("statusWeekend", lang), dot: "bg-slate-400" };
  }
  if (hour < 4 || hour >= 14) {
    return { tone: "warn", text: t("statusOutOfHours", lang), dot: "bg-warn" };
  }
  if (!menu || (menu.id == null && !menu.name)) {
    return { tone: "muted", text: t("statusHoliday", lang), dot: "bg-slate-400" };
  }
  const label = menu.id != null ? `M${menu.id}` : menu.name ?? "";
  const text = `${t("statusOperasional", lang)} · ${t("statusMenuPrefix", lang)} ${label}`;
  return { tone: "ok", text, dot: "bg-ok" };
}

function isActive(href: string, current: string): boolean {
  if (href === "/dashboard") return current === "/dashboard";
  if (href === "/procurement") {
    return current === "/procurement" || current.startsWith("/procurement");
  }
  return current === href || current.startsWith(href + "/");
}

export function Nav({ email, role, fullName, menuToday }: NavProps) {
  const pathname = usePathname() ?? "";
  const { theme, setTheme, lang, setLang } = usePrefs();
  const [hash, setHash] = useState("");
  // Use a lazy initializer so we always have a concrete Date — no null
  // flash, no dependency on useEffect firing. The SSR output will use
  // server time; client overwrites on mount via the interval below.
  // Hydration-mismatch warnings on the text are silenced with
  // suppressHydrationWarning at the render sites.
  const [now, setNow] = useState<Date>(() => new Date());
  const [scrolled, setScrolled] = useState(false);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNow(new Date());
    setHash(window.location.hash);

    const tick = setInterval(() => setNow(new Date()), 1000);
    const onHash = () => setHash(window.location.hash);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      clearInterval(tick);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Auto-scroll active mobile pill into view
  useEffect(() => {
    if (!tabsRef.current) return;
    const active = tabsRef.current.querySelector<HTMLElement>("[data-active='true']");
    if (active && "scrollIntoView" in active) {
      active.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [pathname, hash]);

  const current = pathname + hash;
  const status = computeStatus(now, menuToday ?? null, lang);
  const visible = TABS.filter((tab) => tab.show(role));
  const adminTabs: TabCard[] = canInvite(role)
    ? [
        {
          href: "/admin/data",
          labelKey: "tabData",
          icon: "🗃️",
          group: "admin",
          show: () => true
        },
        {
          href: "/admin/audit",
          labelKey: "tabAudit",
          icon: "📜",
          group: "admin",
          show: () => true
        },
        {
          href: "/admin/invite",
          labelKey: "tabAdmin",
          icon: "🛡️",
          group: "admin",
          show: () => true
        }
      ]
    : role === "viewer"
      ? [
          {
            href: "/admin/audit",
            labelKey: "tabAudit",
            icon: "📜",
            group: "admin",
            show: () => true
          }
        ]
      : [];
  const allTabs = [...visible, ...adminTabs];
  const displayName = fullName || email.split("@")[0];

  const isTabActive = (tab: TabCard) => {
    if (tab.href === "/admin/data") {
      return current.startsWith("/admin/data");
    }
    if (tab.href === "/admin/audit") {
      return current.startsWith("/admin/audit");
    }
    if (tab.href === "/admin/invite") {
      return (
        current.startsWith("/admin") &&
        !current.startsWith("/admin/data") &&
        !current.startsWith("/admin/audit")
      );
    }
    if (tab.href === "/supplier") {
      return (
        current === "/supplier" ||
        (current.startsWith("/supplier/") &&
          !current.startsWith("/supplier/forecast"))
      );
    }
    // /keuangan, /personalia, /dokumen-bgn are tab-based pages — treat subpaths as active
    if (tab.href === "/keuangan") {
      return current === "/keuangan" || current.startsWith("/keuangan");
    }
    if (tab.href === "/personalia") {
      return current === "/personalia" || current.startsWith("/personalia");
    }
    if (tab.href === "/dokumen-bgn") {
      return current === "/dokumen-bgn" || current.startsWith("/dokumen-bgn");
    }
    return isActive(tab.href, current);
  };

  return (
    <header
      className={`border-b transition ${
        scrolled
          ? "border-primary/10 bg-white/85 dark:border-gold/15 dark:bg-d-bg/90"
          : "border-transparent bg-paper/0 dark:border-d-border/20 dark:bg-d-bg/60"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
        {/* === Top row: brand + utility chips === */}
        <div className="mb-4 flex flex-nowrap items-center justify-between gap-3 sm:mb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-gradient text-white shadow-cardlg ring-1 ring-white/10 dark:bg-primary-gradient-dark dark:shadow-cardlg-dark dark:ring-gold/30">
              <span className="text-lg" aria-hidden>🍱</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-primary dark:text-white sm:text-base">
                SPPG Nunumeu, Soe #3
              </h1>
            </div>
          </div>

          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <Chip icon="📆" text={formatDate(now, lang)} hideOnMobile suppressHydrationWarning />
            <Chip icon="🕐" text={formatTimeWITA(now)} mono suppressHydrationWarning />

            <div
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[11px] font-bold shadow-card dark:bg-d-surface-2 dark:shadow-card-dark"
              title={status.text}
              suppressHydrationWarning
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${status.dot}`}
                suppressHydrationWarning
              />
              <span
                className="hidden text-primary dark:text-d-text sm:inline"
                suppressHydrationWarning
              >
                {status.text}
              </span>
            </div>

            {/* Theme toggle */}
            <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white p-1 shadow-card dark:bg-d-surface-2 dark:shadow-card-dark">
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-label={t("themeLight", lang)}
                aria-pressed={theme === "light"}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition ${
                  theme === "light"
                    ? "bg-amber-50 text-amber-500"
                    : "text-primary-2/40 hover:text-primary-2 dark:text-d-text-2/50 dark:hover:text-d-text"
                }`}
              >
                ☀
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-label={t("themeDark", lang)}
                aria-pressed={theme === "dark"}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition ${
                  theme === "dark"
                    ? "bg-primary text-white dark:bg-accent-strong"
                    : "text-primary-2/40 hover:text-primary-2 dark:text-d-text-2/50 dark:hover:text-d-text"
                }`}
              >
                ☾
              </button>
            </div>

            {/* Language toggle */}
            <div className="inline-flex shrink-0 items-center rounded-full bg-white p-1 text-[11px] font-black shadow-card dark:bg-d-surface-2 dark:shadow-card-dark">
              <button
                type="button"
                onClick={() => setLang("ID")}
                aria-pressed={lang === "ID"}
                className={`rounded-full px-3 py-1 transition ${
                  lang === "ID"
                    ? "bg-primary text-white dark:bg-accent-strong"
                    : "text-primary-2/40 hover:text-primary-2 dark:text-d-text-2/50 dark:hover:text-d-text"
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang("EN")}
                aria-pressed={lang === "EN"}
                className={`rounded-full px-3 py-1 transition ${
                  lang === "EN"
                    ? "bg-primary text-white dark:bg-accent-strong"
                    : "text-primary-2/40 hover:text-primary-2 dark:text-d-text-2/50 dark:hover:text-d-text"
                }`}
              >
                EN
              </button>
            </div>

            <form action="/auth/signout" method="post" className="inline-flex shrink-0">
              <button
                type="submit"
                title={`${displayName} · ${email} — ${t("signOut", lang)}`}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary-2 shadow-card transition hover:bg-primary hover:text-white dark:bg-d-surface-2 dark:text-d-text dark:shadow-card-dark dark:hover:bg-accent-strong"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white group-hover:bg-white group-hover:text-primary dark:bg-accent-strong dark:group-hover:bg-white dark:group-hover:text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {displayName}
                </span>
                <span aria-hidden>⎋</span>
              </button>
            </form>

            <CommandPalette
              renderTrigger={(openPalette) => (
                <button
                  type="button"
                  onClick={openPalette}
                  aria-label={t("cmdk.trigger", lang)}
                  className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary-2 shadow-card transition hover:bg-primary hover:text-white dark:bg-d-surface-2 dark:text-d-text dark:shadow-card-dark dark:hover:bg-accent-strong"
                >
                  <span aria-hidden>🔍</span>
                  <span className="hidden sm:inline">
                    {t("cmdk.trigger", lang)}
                  </span>
                  <kbd className="hidden rounded bg-ink/10 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                    ⌘K
                  </kbd>
                </button>
              )}
            />

            <NotificationBell />
          </div>
        </div>

        {/* === Tabs === */}
        <nav
          aria-label={t("navMainAria", lang)}
          ref={tabsRef}
          className="rounded-3xl border border-primary/10 bg-white/80 p-2 shadow-card ring-1 ring-primary/5 backdrop-blur dark:border-d-border/40 dark:bg-d-surface/70 dark:shadow-card-dark dark:ring-d-border/30"
        >
          {/* Mobile: 4-col grid */}
          <div className="grid grid-cols-4 gap-2 sm:hidden">
            {allTabs.map((tab) => (
              <TabTile
                key={tab.href + tab.labelKey}
                href={tab.href}
                label={t(tab.labelKey, lang)}
                icon={tab.icon}
                active={isTabActive(tab)}
              />
            ))}
          </div>

          {/* Desktop: dynamic N cols × 2 rows untuk simetri penuh */}
          <div
            className="hidden gap-2 sm:grid"
            style={{
              gridTemplateColumns: `repeat(${Math.ceil(allTabs.length / 2)}, minmax(0, 1fr))`
            }}
          >
            {allTabs.map((tab) => (
              <TabTile
                key={tab.href + tab.labelKey}
                href={tab.href}
                label={t(tab.labelKey, lang)}
                icon={tab.icon}
                active={isTabActive(tab)}
              />
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

function Chip({
  icon,
  text,
  mono = false,
  hideOnMobile = false,
  suppressHydrationWarning = false
}: {
  icon: string;
  text: string;
  mono?: boolean;
  hideOnMobile?: boolean;
  suppressHydrationWarning?: boolean;
}) {
  return (
    <div
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary shadow-card dark:bg-d-surface-2 dark:text-d-text dark:shadow-card-dark ${
        hideOnMobile ? "hidden md:inline-flex" : ""
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span
        className={mono ? "font-mono" : ""}
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {text}
      </span>
    </div>
  );
}

function TabTile({
  href,
  label,
  icon,
  active
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      data-active={active}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-center transition sm:gap-2 sm:py-2.5 ${
        active
          ? "bg-primary-gradient text-white shadow-cardlg ring-1 ring-gold/40 dark:bg-primary-gradient-dark"
          : "bg-paper/70 text-primary ring-1 ring-primary/10 hover:-translate-y-0.5 hover:bg-white hover:shadow-card dark:bg-d-surface-2/60 dark:text-d-text dark:ring-d-border/30 dark:hover:bg-d-surface-2"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition sm:h-10 sm:w-10 sm:text-xl ${
          active
            ? "bg-white/15 ring-1 ring-white/25"
            : "bg-white shadow-card ring-1 ring-primary/5 dark:bg-d-surface dark:ring-d-border/40 dark:shadow-card-dark"
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="text-[11px] font-bold leading-tight sm:text-[12px]">
        {label}
      </span>
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-5 bottom-1 h-0.5 rounded-full bg-gold"
        />
      )}
    </Link>
  );
}
