"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/roles";
import { canInvite, canWriteMenu, canWriteStock } from "@/lib/roles";

interface NavProps {
  email: string;
  role: UserRole;
  fullName?: string | null;
}

interface TabCard {
  href: string;
  label: string;
  icon: string;
  show: (role: UserRole) => boolean;
}

const TABS: TabCard[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", show: () => true },
  { href: "/schools", label: "Sekolah", icon: "🏫", show: () => true },
  { href: "/menu", label: "Master Menu", icon: "🍲", show: () => true },
  {
    href: "/calendar",
    label: "Kalender Menu",
    icon: "🗓️",
    show: (r) => canWriteMenu(r) || r === "viewer"
  },
  { href: "/planning", label: "Rencana Kebutuhan", icon: "📋", show: () => true },
  {
    href: "/stock",
    label: "Kartu Stok",
    icon: "📦",
    show: (r) => canWriteStock(r) || r === "viewer" || r === "ahli_gizi"
  },
  { href: "/procurement#po", label: "PO / WO", icon: "📄", show: () => true },
  { href: "/procurement#grn", label: "GRN · QC", icon: "📥", show: () => true },
  { href: "/procurement#invoice", label: "Invoice", icon: "💰", show: () => true },
  { href: "/suppliers", label: "Supplier", icon: "🤝", show: () => true },
  {
    href: "/procurement#quotation",
    label: "Quotation",
    icon: "📝",
    show: () => true
  },
  { href: "/docgen", label: "Doc Generator", icon: "🖨️", show: () => true },
  { href: "/sop", label: "SOP", icon: "📚", show: () => true }
];

const DAYS_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];
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

function toWITA(d: Date): Date {
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utcMs + 8 * 3600 * 1000);
}

function formatDateID(d: Date): string {
  const w = toWITA(d);
  return `${DAYS_ID[w.getDay()]}, ${w.getDate()} ${MONTHS_ID[w.getMonth()]} ${w.getFullYear()}`;
}

function formatTimeWITA(d: Date): string {
  const w = toWITA(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(w.getHours())}:${pad(w.getMinutes())}:${pad(w.getSeconds())} WITA`;
}

function isOperational(d: Date): boolean {
  const w = toWITA(d);
  const day = w.getDay();
  const hour = w.getHours();
  return day >= 1 && day <= 5 && hour >= 4 && hour < 14;
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

export function Nav({ email, role, fullName }: NavProps) {
  const pathname = usePathname() ?? "";
  const [hash, setHash] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lang, setLang] = useState<"ID" | "EN">("ID");

  useEffect(() => {
    setNow(new Date());
    setHash(window.location.hash);
    const tick = setInterval(() => setNow(new Date()), 1000);
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => {
      clearInterval(tick);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const current = pathname + hash;
  const op = now ? isOperational(now) : false;
  const visible = TABS.filter((t) => t.show(role));

  return (
    <header className="border-b border-ink/10 bg-gradient-to-b from-paper to-white">
      <div className="mx-auto max-w-7xl px-6 pb-3 pt-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink">
              Supply Chain MBG
            </h1>
            <p className="mt-1 text-sm font-semibold text-ink2">
              SPPG Nunumeu · Kota Soe
            </p>
            <p className="text-xs font-medium text-ink2/70">
              Timor Tengah Selatan · Nusa Tenggara Timur
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip icon="📆" text={now ? formatDateID(now) : "—"} />
            <Chip icon="🕐" text={now ? formatTimeWITA(now) : "—"} mono />
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold shadow-card">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  op ? "bg-emerald-500" : "bg-emerald-500"
                }`}
              />
              <span className="text-ink">
                {op ? "Operasional" : "Di Luar Periode"}
              </span>
            </div>

            <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-card">
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-label="Light mode"
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition ${
                  theme === "light"
                    ? "bg-amber-50 text-amber-500"
                    : "text-ink2/40 hover:text-ink2"
                }`}
              >
                ☀
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-label="Dark mode"
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition ${
                  theme === "dark"
                    ? "bg-ink text-white"
                    : "text-ink2/40 hover:text-ink2"
                }`}
              >
                ☾
              </button>
            </div>

            <div className="inline-flex items-center rounded-full bg-white p-1 text-[11px] font-black shadow-card">
              <button
                type="button"
                onClick={() => setLang("ID")}
                className={`rounded-full px-3 py-1 transition ${
                  lang === "ID"
                    ? "bg-ink text-white"
                    : "text-ink2/40 hover:text-ink2"
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang("EN")}
                className={`rounded-full px-3 py-1 transition ${
                  lang === "EN"
                    ? "bg-ink text-white"
                    : "text-ink2/40 hover:text-ink2"
                }`}
              >
                EN
              </button>
            </div>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title={fullName || email}
                className="rounded-full bg-white px-3 py-2 text-xs font-bold text-ink2 shadow-card transition hover:bg-ink hover:text-white"
              >
                ⎋ Keluar
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-3xl bg-white/70 p-3 shadow-cardlg ring-1 ring-ink/5 backdrop-blur">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visible.map((t) => (
              <TabButton
                key={t.href + t.label}
                href={t.href}
                label={t.label}
                icon={t.icon}
                active={isActive(t.href, current)}
              />
            ))}
            {canInvite(role) && (
              <TabButton
                href="/admin/invite"
                label="Admin"
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
    <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink shadow-card">
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
          ? "bg-ink text-white shadow-cardlg"
          : "bg-white text-ink ring-1 ring-ink/5 hover:-translate-y-0.5 hover:shadow-card"
      }`}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-card transition ${
          active ? "bg-white" : "bg-paper group-hover:bg-white"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-sm font-black leading-tight ${
          active ? "text-white" : "text-ink"
        }`}
      >
        {label}
      </span>
      {active && (
        <span className="absolute bottom-2 h-1 w-12 rounded-full bg-accent" />
      )}
    </Link>
  );
}
