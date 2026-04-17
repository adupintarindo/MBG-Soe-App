"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/roles";
import { canInvite, canWriteMenu, canWriteStock } from "@/lib/roles";
import { type Lang, type LangKey, t } from "@/lib/i18n";

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

  // Weekend → muted
  if (day === 0 || day === 6) {
    return { tone: "muted", text: t("statusWeekend", lang), dot: "bg-slate-400" };
  }
  // Outside operational window → amber
  if (hour < 4 || hour >= 14) {
    return { tone: "warn", text: t("statusOutOfHours", lang), dot: "bg-warn" };
  }
  // No menu assigned → libur
  if (!menu || (menu.id == null && !menu.name)) {
    return { tone: "muted", text: t("statusHoliday", lang), dot: "bg-slate-400" };
  }
  // Operasional + menu cycle visible
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

const THEME_KEY = "mbg-theme";
const LANG_KEY = "mbg-lang";

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function Nav({ email, role, fullName, menuToday }: NavProps) {
  const pathname = usePathname() ?? "";
  const [hash, setHash] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lang, setLang] = useState<Lang>("ID");

  // Initial mount: load persisted prefs + start clock + hash listener
  useEffect(() => {
    setNow(new Date());
    setHash(window.location.hash);

    const storedTheme =
      (window.localStorage.getItem(THEME_KEY) as "light" | "dark" | null) ?? null;
    const storedLang = (window.localStorage.getItem(LANG_KEY) as Lang | null) ?? null;
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    }
    if (storedLang === "ID" || storedLang === "EN") setLang(storedLang);

    const tick = setInterval(() => setNow(new Date()), 1000);
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => {
      clearInterval(tick);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  // Persist on change
  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_KEY, lang);
    }
  }, [lang]);

  const current = pathname + hash;
  const status = now
    ? computeStatus(now, menuToday ?? null, lang)
    : { tone: "muted" as StatusTone, text: "—", dot: "bg-slate-400" };
  const visible = TABS.filter((t) => t.show(role));

  return (
    <header className="border-b border-primary/10 bg-gradient-to-b from-paper to-white dark:border-d-border/30 dark:from-d-bg dark:to-d-surface">
      <div className="mx-auto max-w-7xl px-6 pb-3 pt-6">
        {/* === Top row: brand + utility chips === */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-primary dark:text-d-text">
              {t("appTitle", lang)}
            </h1>
            <p className="mt-1 text-sm font-semibold text-primary-2 dark:text-d-text-2">
              {t("brandSub", lang)}
            </p>
            <p className="text-xs font-medium text-primary-2/70 dark:text-d-text-2/70">
              {t("brandRegion", lang)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip icon="📆" text={now ? formatDate(now, lang) : "—"} />
            <Chip icon="🕐" text={now ? formatTimeWITA(now) : "—"} mono />

            {/* Status chip — per-date semantics */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold shadow-card dark:bg-d-surface-2 dark:shadow-card-dark">
              <span className={`inline-block h-2 w-2 rounded-full ${status.dot}`} />
              <span className="text-primary dark:text-d-text">{status.text}</span>
            </div>

            {/* Theme toggle */}
            <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-card dark:bg-d-surface-2 dark:shadow-card-dark">
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-label={t("themeLight", lang)}
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
                className={`rounded-full px-3 py-1 transition ${
                  lang === "EN"
                    ? "bg-primary text-white dark:bg-accent-strong"
                    : "text-primary-2/40 hover:text-primary-2 dark:text-d-text-2/50 dark:hover:text-d-text"
                }`}
              >
                EN
              </button>
            </div>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title={fullName || email}
                className="rounded-full bg-white px-3 py-2 text-xs font-bold text-primary-2 shadow-card transition hover:bg-primary hover:text-white dark:bg-d-surface-2 dark:text-d-text dark:shadow-card-dark dark:hover:bg-accent-strong"
              >
                ⎋ {t("signOut", lang)}
              </button>
            </form>
          </div>
        </div>

        {/* === Tab grid === */}
        <div className="rounded-3xl bg-white/70 p-3 shadow-cardlg ring-1 ring-primary/5 backdrop-blur dark:bg-d-surface/70 dark:shadow-cardlg-dark dark:ring-d-border/30">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
        </div>
      </div>
    </header>
  );
}

function Chip({
  icon,
  text,
  mono = false
}: {
  icon: string;
  text: string;
  mono?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-primary shadow-card dark:bg-d-surface-2 dark:text-d-text dark:shadow-card-dark">
      <span>{icon}</span>
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
      className={`group relative flex flex-col items-center justify-center gap-3 rounded-2xl px-3 py-5 text-center transition ${
        active
          ? "bg-primary-gradient text-white shadow-cardlg dark:bg-primary-gradient-dark dark:shadow-cardlg-dark"
          : "bg-white text-primary ring-1 ring-primary/5 hover:-translate-y-0.5 hover:shadow-card dark:bg-d-surface-2 dark:text-d-text dark:ring-d-border/30 dark:hover:shadow-card-dark"
      }`}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-card transition ${
          active
            ? "bg-white/15 backdrop-blur-sm"
            : "bg-paper group-hover:bg-white dark:bg-d-bg dark:group-hover:bg-d-surface"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-sm font-black leading-tight ${
          active ? "text-white" : "text-primary dark:text-d-text"
        }`}
      >
        {label}
      </span>
      {active && (
        <span className="absolute bottom-2 h-1 w-12 rounded-full bg-gold" />
      )}
    </Link>
  );
}
