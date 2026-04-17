"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UserRole } from "@/lib/roles";
import { canInvite, canWriteMenu, canWriteStock } from "@/lib/roles";
import { type Lang, type LangKey, t } from "@/lib/i18n";
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

interface TabCard {
  href: string;
  labelKey: LangKey;
  icon: string;
  show: (role: UserRole) => boolean;
}

const TABS: TabCard[] = [
  { href: "/dashboard", labelKey: "tabDashboard", icon: "📊", show: () => true },
  { href: "/schools", labelKey: "tabSchools", icon: "🏫", show: () => true },
  { href: "/menu", labelKey: "tabMenu", icon: "🍲", show: () => true },
  {
    href: "/calendar",
    labelKey: "tabCalendar",
    icon: "🗓️",
    show: (r) => canWriteMenu(r) || r === "viewer"
  },
  { href: "/planning", labelKey: "tabPlanning", icon: "📋", show: () => true },
  {
    href: "/stock",
    labelKey: "tabStock",
    icon: "📦",
    show: (r) => canWriteStock(r) || r === "viewer" || r === "ahli_gizi"
  },
  { href: "/procurement#po", labelKey: "tabPO", icon: "📄", show: () => true },
  { href: "/procurement#grn", labelKey: "tabGRN", icon: "📥", show: () => true },
  {
    href: "/procurement#invoice",
    labelKey: "tabInvoice",
    icon: "💰",
    show: () => true
  },
  { href: "/suppliers", labelKey: "tabSuppliers", icon: "🤝", show: () => true },
  {
    href: "/procurement#quotation",
    labelKey: "tabQuotation",
    icon: "📝",
    show: () => true
  },
  { href: "/docgen", labelKey: "tabDocgen", icon: "🖨️", show: () => true },
  { href: "/sop", labelKey: "tabSOP", icon: "📚", show: () => true }
];

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function toWITA(d: Date): Date {
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utcMs + 8 * 3600 * 1000);
}

function formatDate(d: Date, lang: Lang): string {
  const w = toWITA(d);
  if (lang === "EN") {
    return `${DAYS_EN[w.getDay()]}, ${w.getDate()} ${MONTHS_EN[w.getMonth()]} ${w.getFullYear()}`;
  }
  return `${DAYS_ID[w.getDay()]}, ${w.getDate()} ${MONTHS_ID[w.getMonth()]} ${w.getFullYear()}`;
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
  if (href.includes("#")) {
    if (current === href) return true;
    if (
      href === "/procurement#po" &&
      (current === "/procurement" || current === "/procurement#")
    ) {
      return true;
    }
    return false;
  }
  if (href === "/dashboard") return current === "/dashboard";
  return current === href || current.startsWith(href + "/");
}

export function Nav({ email, role, fullName, menuToday }: NavProps) {
  const pathname = usePathname() ?? "";
  const { theme, setTheme, lang, setLang } = usePrefs();
  const [hash, setHash] = useState("");
  const [now, setNow] = useState<Date | null>(null);
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
  const status = now
    ? computeStatus(now, menuToday ?? null, lang)
    : { tone: "muted" as StatusTone, text: "—", dot: "bg-slate-400" };
  const visible = TABS.filter((tab) => tab.show(role));
  const displayName = fullName || email.split("@")[0];

  return (
    <header
      className={`sticky top-0 z-40 border-b transition ${
        scrolled
          ? "border-primary/10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-gold/15 dark:bg-d-bg/90 dark:supports-[backdrop-filter]:bg-d-bg/75"
          : "border-transparent bg-paper/0 dark:border-d-border/20 dark:bg-d-bg/60 dark:supports-[backdrop-filter]:bg-d-bg/50 dark:backdrop-blur"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
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
                title={`${displayName} · ${email} — Keluar`}
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
          aria-label="Modul utama"
          ref={tabsRef}
          className="rounded-3xl bg-white/70 p-2 shadow-cardlg ring-1 ring-primary/5 backdrop-blur dark:bg-d-surface/70 dark:shadow-cardlg-dark dark:ring-d-border/30 sm:p-3"
        >
          {/* Mobile horizontal scroller */}
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:hidden">
            {visible.map((tab) => (
              <TabPillMobile
                key={tab.href + tab.labelKey}
                href={tab.href}
                label={t(tab.labelKey, lang)}
                icon={tab.icon}
                active={isActive(tab.href, current)}
              />
            ))}
            {canInvite(role) && (
              <TabPillMobile
                href="/admin/invite"
                label={t("tabAdmin", lang)}
                icon="🛡️"
                active={current.startsWith("/admin")}
              />
            )}
          </div>

          {/* Desktop grid */}
          <div className="hidden grid-cols-3 gap-2 sm:grid sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 lg:gap-3">
            {visible.map((tab) => (
              <TabButton
                key={tab.href + tab.labelKey}
                href={tab.href}
                label={t(tab.labelKey, lang)}
                icon={tab.icon}
                active={isActive(tab.href, current)}
              />
            ))}
            {canInvite(role) && (
              <TabButton
                href="/admin/invite"
                label={t("tabAdmin", lang)}
                icon="🛡️"
                active={current.startsWith("/admin")}
              />
            )}
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

function TabButton({
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
      className={`group relative flex flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center transition lg:gap-3 lg:py-4 ${
        active
          ? "bg-primary-gradient text-white shadow-cardlg dark:bg-primary-gradient-dark dark:shadow-cardlg-dark"
          : "bg-white text-primary ring-1 ring-primary/5 hover:-translate-y-0.5 hover:shadow-card dark:bg-d-surface-2 dark:text-d-text dark:ring-d-border/30 dark:hover:shadow-card-dark"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-2xl shadow-card transition lg:h-12 lg:w-12 lg:text-3xl ${
          active
            ? "bg-white/15 backdrop-blur-sm"
            : "bg-paper group-hover:bg-white dark:bg-d-bg dark:group-hover:bg-d-surface"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-[12px] font-black leading-tight lg:text-[13px] ${
          active ? "text-white" : "text-primary dark:text-d-text"
        }`}
      >
        {label}
      </span>
      {active && (
        <span className="absolute bottom-1.5 h-1 w-10 rounded-full bg-gold" />
      )}
    </Link>
  );
}

function TabPillMobile({
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
      className={`flex min-w-[88px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2.5 text-center transition ${
        active
          ? "bg-primary-gradient text-white shadow-card dark:bg-primary-gradient-dark"
          : "bg-white text-primary ring-1 ring-primary/5 dark:bg-d-surface-2 dark:text-d-text dark:ring-d-border/30"
      }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[11px] font-black leading-tight">{label}</span>
    </Link>
  );
}
