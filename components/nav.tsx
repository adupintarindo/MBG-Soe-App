"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { UserRole } from "@/lib/roles";
import { canInvite, canWriteMenu, canWriteStock } from "@/lib/roles";
import { type Lang, type LangKey, t, DAYS, MONTHS } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs-context";

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
  { href: "/dashboard", labelKey: "tabDashboard", icon: "📊", group: "home", show: () => true },
  { href: "/menu", labelKey: "tabMenu", icon: "🍲", group: "plan", show: () => true },
  {
    href: "/calendar",
    labelKey: "tabCalendar",
    icon: "🗓️",
    group: "plan",
    show: (r) => canWriteMenu(r) || r === "viewer"
  },
  { href: "/planning", labelKey: "tabPlanning", icon: "📋", group: "plan", show: () => true },
  {
    href: "/procurement",
    labelKey: "tabProcurement",
    icon: "🧾",
    group: "buy",
    show: () => true
  },
  { href: "/suppliers", labelKey: "tabSuppliers", icon: "🤝", group: "buy", show: () => true },
  { href: "/price-list", labelKey: "tabPriceList", icon: "💹", group: "buy", show: () => true },
  {
    href: "/supplier/forecast",
    labelKey: "tabForecast",
    icon: "📅",
    group: "buy",
    show: (r) => r === "supplier"
  },
  {
    href: "/stock",
    labelKey: "tabStock",
    icon: "📦",
    group: "run",
    show: (r) => canWriteStock(r) || r === "viewer" || r === "ahli_gizi"
  },
  { href: "/schools", labelKey: "tabSchools", icon: "🏫", group: "run", show: () => true },
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

// Cached clock snapshot. Must be idempotent for useSyncExternalStore —
// returning Date.now() directly causes React to see a fresh value on
// every render/commit check and silently bail out, leaving the chips
// stuck on the server snapshot.
let cachedNowMs = 0;

const NOW_SUBSCRIBE = (cb: () => void) => {
  cachedNowMs = Date.now();
  // Kick an immediate post-hydration update so chips populate
  // without waiting a full second for the first tick.
  const kick = setTimeout(cb, 0);
  const id = setInterval(() => {
    cachedNowMs = Date.now();
    cb();
  }, 1000);
  return () => {
    clearTimeout(kick);
    clearInterval(id);
  };
};
const NOW_CLIENT = () => cachedNowMs;
const NOW_SERVER = () => 0;

export function Nav({ email, role, fullName, menuToday }: NavProps) {
  const pathname = usePathname() ?? "";
  const { theme, setTheme, lang, setLang } = usePrefs();
  const [hash, setHash] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  // Ticks every second on client, returns 0 on server. Using
  // useSyncExternalStore avoids effect-scheduling edge cases (bfcache
  // restore, hot reload) where the clock could stay stuck on null.
  const nowMs = useSyncExternalStore(NOW_SUBSCRIBE, NOW_CLIENT, NOW_SERVER);
  const now: Date | null = nowMs > 0 ? new Date(nowMs) : null;

  useEffect(() => {
    setHash(window.location.hash);
    const onHash = () => setHash(window.location.hash);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
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
  const status = now
    ? computeStatus(now, menuToday ?? null, lang)
    : { tone: "muted" as StatusTone, text: "—", dot: "bg-slate-400" };
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
          href: "/admin/invite",
          labelKey: "tabAdmin",
          icon: "🛡️",
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
    if (tab.href === "/admin/invite") {
      return (
        current.startsWith("/admin") && !current.startsWith("/admin/data")
      );
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
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-gradient text-white shadow-cardlg ring-1 ring-white/10 dark:bg-primary-gradient-dark dark:shadow-cardlg-dark dark:ring-gold/30">
              <span className="text-lg" aria-hidden>🍱</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-tight text-primary dark:text-white sm:text-2xl">
                {t("appTitle", lang)}
              </h1>
              <p className="truncate text-[12px] font-semibold text-primary-2 dark:text-d-text">
                {t("brandSub", lang)}
              </p>
              <p className="hidden truncate text-[11px] font-medium text-primary-2/70 dark:text-d-text-2 sm:block">
                {t("brandRegion", lang)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip icon="📆" text={now ? formatDate(now, lang) : "—"} hideOnMobile />
            <Chip icon="🕐" text={now ? formatTimeWITA(now) : "—"} mono />

            <div
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold shadow-card dark:bg-d-surface-2 dark:shadow-card-dark"
              title={status.text}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${status.dot}`} />
              <span className="hidden text-primary dark:text-d-text sm:inline">
                {status.text}
              </span>
            </div>

            {/* Theme toggle */}
            <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-card dark:bg-d-surface-2 dark:shadow-card-dark">
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
            <div className="inline-flex items-center rounded-full bg-white p-1 text-[11px] font-black shadow-card dark:bg-d-surface-2 dark:shadow-card-dark">
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

            <form action="/auth/signout" method="post" className="inline-flex">
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
  hideOnMobile = false
}: {
  icon: string;
  text: string;
  mono?: boolean;
  hideOnMobile?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary shadow-card dark:bg-d-surface-2 dark:text-d-text dark:shadow-card-dark ${
        hideOnMobile ? "hidden md:inline-flex" : ""
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span className={mono ? "font-mono" : ""}>{text}</span>
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
      className={`group relative flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center transition sm:gap-3 sm:py-4 ${
        active
          ? "bg-primary-gradient text-white shadow-cardlg ring-1 ring-gold/40 dark:bg-primary-gradient-dark"
          : "bg-paper/70 text-primary ring-1 ring-primary/10 hover:-translate-y-0.5 hover:bg-white hover:shadow-card dark:bg-d-surface-2/60 dark:text-d-text dark:ring-d-border/30 dark:hover:bg-d-surface-2"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition sm:h-14 sm:w-14 sm:text-2xl ${
          active
            ? "bg-white/15 ring-1 ring-white/25"
            : "bg-white shadow-card ring-1 ring-primary/5 dark:bg-d-surface dark:ring-d-border/40 dark:shadow-card-dark"
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="text-[11px] font-bold leading-tight sm:text-[12.5px]">
        {label}
      </span>
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-5 bottom-2 h-0.5 rounded-full bg-gold"
        />
      )}
    </Link>
  );
}
