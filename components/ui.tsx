/**
 * Shared UI primitives — MBG Soe Supply Chain.
 * Used across all dashboard pages so styling stays consistent
 * and dark-mode adapts everywhere by default.
 */
import Link from "next/link";
import type { ReactNode, HTMLAttributes, AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

export { SortableTable, type SortableColumn, type SortDir } from "./sortable-table";

/* ---------- Layout ---------- */

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-6 pt-3 sm:px-6 sm:pb-8 sm:pt-4 animate-fade-in">
      {children}
    </main>
  );
}

interface PageHeaderProps {
  icon?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-crisp text-ink sm:text-[1.75rem]">
          {icon && <span className="shrink-0 text-2xl leading-none">{icon}</span>}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2/80">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/* ---------- Section card ---------- */

interface SectionProps {
  title?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  accent?: "default" | "ok" | "warn" | "bad" | "info";
  className?: string;
  children: ReactNode;
  noPad?: boolean;
  banner?: boolean;
}

const ACCENT_BORDER: Record<NonNullable<SectionProps["accent"]>, string> = {
  default: "",
  ok: "border-l-4 border-emerald-500",
  warn: "border-l-4 border-amber-500",
  bad: "border-l-4 border-red-500",
  info: "border-l-4 border-accent-strong"
};

export function Section({
  title,
  hint,
  actions,
  accent = "default",
  className = "",
  children,
  noPad = false,
  banner: _banner = false
}: SectionProps) {
  void _banner;
  return (
    <section
      className={`mb-6 overflow-hidden rounded-2xl bg-white shadow-card ${ACCENT_BORDER[accent]} ${className}`}
    >
      {(title || actions) && (
        <header className="relative flex flex-wrap items-center justify-center gap-3 bg-ink px-4 py-1.5 text-center">
          {title && (
            <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              {title}
            </h2>
          )}
          {actions && (
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </header>
      )}
      <div className={noPad ? "" : "p-5"}>
        {hint && (
          <p className="mb-4 text-[12px] leading-relaxed text-ink2/70">
            {hint}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

/* ---------- KPI tile ---------- */

interface KpiTileProps {
  icon?: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "ok" | "warn" | "bad" | "info";
  size?: "lg" | "md" | "sm";
  palette?: "blue" | "amber" | "emerald" | "orange" | "violet" | "slate";
}

const TONE_VALUE: Record<NonNullable<KpiTileProps["tone"]>, string> = {
  default: "text-ink",
  ok: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-red-700",
  info: "text-accent-strong"
};

const PALETTE_HEADER: Record<NonNullable<KpiTileProps["palette"]>, string> = {
  blue: "bg-primary-gradient",
  amber: "bg-gradient-to-r from-teal-800 to-teal-700",
  emerald: "bg-gradient-to-r from-emerald-800 to-emerald-700",
  orange: "bg-gradient-to-r from-teal-800 to-teal-700",
  violet: "bg-gradient-to-r from-slate-700 to-slate-900",
  slate: "bg-gradient-to-r from-slate-700 to-slate-900"
};

export function KpiTile({
  icon,
  label,
  value,
  sub,
  tone = "default",
  size = "lg",
  palette
}: KpiTileProps) {
  const sizeCls =
    size === "lg"
      ? "text-[1.75rem] leading-none"
      : size === "md"
        ? "text-xl leading-tight"
        : "text-base leading-snug";

  if (palette) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-cardlg">
        <div
          className={`flex items-center justify-center gap-2 px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white ${PALETTE_HEADER[palette]}`}
        >
          {icon && (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-sm ring-1 ring-white/25">
              {icon}
            </span>
          )}
          <span>{label}</span>
        </div>
        <div className="px-4 py-5">
          <div
            className={`font-display font-extrabold tracking-crisp tabular-nums ${sizeCls} ${TONE_VALUE[tone]}`}
          >
            {value}
          </div>
          {sub && (
            <div className="mt-2 text-[11.5px] font-semibold text-ink2/70">{sub}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-cardlg">
      <div className="mb-1.5 flex items-center justify-center gap-2 font-display text-[10.5px] font-bold uppercase tracking-[0.09em] text-ink2/80">
        {icon && <span className="text-sm">{icon}</span>}
        <span>{label}</span>
      </div>
      <div
        className={`font-display font-extrabold tracking-crisp tabular-nums ${sizeCls} ${TONE_VALUE[tone]}`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[11.5px] font-semibold text-ink2/70">{sub}</div>
      )}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {children}
    </section>
  );
}

/* ---------- Badge / status pill ---------- */

interface BadgeProps {
  tone?:
    | "neutral"
    | "ok"
    | "warn"
    | "bad"
    | "info"
    | "accent"
    | "muted";
  children: ReactNode;
  className?: string;
}

const BADGE_TONE: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-ink/5 text-ink2",
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-900",
  bad: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  accent: "bg-accent-strong/15 text-accent-strong",
  muted: "bg-slate-100 text-slate-700"
};

export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10.5px] font-bold tracking-[0.02em] ${BADGE_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------- Category badge (icon + colored pill) ---------- */

const CATEGORY_COLOR: Record<string, string> = {
  BERAS: "bg-amber-50 text-amber-900 ring-amber-200",
  HEWANI: "bg-rose-50 text-rose-900 ring-rose-200",
  NABATI: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  SAYUR_HIJAU: "bg-green-50 text-green-900 ring-green-200",
  SAYUR: "bg-lime-50 text-lime-900 ring-lime-200",
  UMBI: "bg-orange-50 text-orange-900 ring-orange-200",
  BUMBU: "bg-yellow-50 text-yellow-900 ring-yellow-200",
  REMPAH: "bg-red-50 text-red-900 ring-red-200",
  SEMBAKO: "bg-slate-50 text-slate-900 ring-slate-200",
  BUAH: "bg-pink-50 text-pink-900 ring-pink-200",
  LAIN: "bg-gray-50 text-gray-900 ring-gray-200"
};

const CATEGORY_ICON: Record<string, string> = {
  BERAS: "🌾",
  HEWANI: "🍗",
  NABATI: "🫘",
  SAYUR_HIJAU: "🥬",
  SAYUR: "🥕",
  UMBI: "🥔",
  BUMBU: "🧅",
  REMPAH: "🌶️",
  SEMBAKO: "🛒",
  BUAH: "🍎",
  LAIN: "🍽️"
};

export function CategoryBadge({
  category,
  size = "md",
  className = ""
}: {
  category: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const cat = (category ?? "LAIN").toString().toUpperCase();
  const color = CATEGORY_COLOR[cat] ?? CATEGORY_COLOR.LAIN;
  const icon = CATEGORY_ICON[cat] ?? CATEGORY_ICON.LAIN;
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  const iconSize = size === "sm" ? "text-[11px]" : "text-[12px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ring-1 ${pad} ${color} ${className}`}
    >
      <span aria-hidden className={`${iconSize} leading-none`}>
        {icon}
      </span>
      {cat}
    </span>
  );
}

/* ---------- Empty state ---------- */

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad";
}

const EMPTY_TONE: Record<NonNullable<EmptyStateProps["tone"]>, string> = {
  neutral: "bg-ink/5 text-ink2 ring-ink/5",
  ok: "bg-green-50 text-green-900 ring-green-200",
  warn: "bg-amber-50 text-amber-900 ring-amber-200",
  bad: "bg-red-50 text-red-900 ring-red-200"
};

export function EmptyState({
  icon = "🗒️",
  title,
  message,
  tone = "neutral"
}: EmptyStateProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${EMPTY_TONE[tone]}`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <div className="min-w-0">
        {title && <div className="font-bold">{title}</div>}
        {message != null && (
          <div className={title ? "text-[12px] opacity-80" : ""}>{message}</div>
        )}
      </div>
    </div>
  );
}

/* ---------- Buttons / link buttons ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";

interface BtnStyleProps {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

function btnClass({ variant = "primary", size = "md" }: BtnStyleProps): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-display font-bold tracking-[0.005em] shadow-card transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
  const sz =
    size === "sm"
      ? "px-3 py-1.5 text-[11.5px]"
      : size === "lg"
        ? "px-5 py-3 text-[14px]"
        : "px-4 py-2 text-[12.5px]";
  const variantCls =
    variant === "primary"
      ? "bg-ink text-white hover:bg-ink2"
      : variant === "secondary"
        ? "bg-white text-ink ring-1 ring-ink/10 hover:bg-paper"
        : variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-700"
          : variant === "gold"
            ? "bg-gold-gradient text-primary-strong hover:brightness-105"
            : "bg-transparent text-ink2 shadow-none hover:bg-ink/5";
  return `${base} ${sz} ${variantCls}`;
}

export function Button({
  variant,
  size,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & BtnStyleProps) {
  return (
    <button className={`${btnClass({ variant, size })} ${className}`} {...rest}>
      {children}
    </button>
  );
}

interface LinkBtnProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>,
    BtnStyleProps {
  href: string;
  external?: boolean;
}

export function LinkButton({
  href,
  variant,
  size,
  className = "",
  external = false,
  children,
  ...rest
}: LinkBtnProps) {
  const cls = `${btnClass({ variant, size })} ${className}`;
  if (external) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/* ---------- Form primitives ---------- */

const inputBase =
  "w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition outline-none placeholder:text-ink2/40 focus:border-accent-strong focus:shadow-ring-accent disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink2/50";

export function FieldLabel({
  children,
  hint
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <span className="mb-1 flex items-center justify-between gap-2 font-display text-[10.5px] font-bold uppercase tracking-[0.09em] text-ink2">
      <span>{children}</span>
      {hint && (
        <span className="text-[10px] font-semibold normal-case tracking-normal text-ink2/70">
          {hint}
        </span>
      )}
    </span>
  );
}

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
) {
  const { className = "", ...rest } = props;
  return <input className={`${inputBase} ${className}`} {...rest} />;
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
) {
  const { className = "", ...rest } = props;
  return <select className={`${inputBase} pr-8 ${className}`} {...rest} />;
}

/* ---------- Table primitives (compose with native <table>) ---------- */

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 [&_table]:text-center">
      {children}
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-primary-gradient dark:bg-primary-gradient-dark">
      <tr className="border-b-2 border-gold/70 text-center font-display text-[10.5px] font-bold uppercase tracking-[0.09em] text-white/95 [&>th:first-child]:rounded-tl-lg [&>th:first-child]:pl-3 [&>th:last-child]:rounded-tr-lg [&>th:last-child]:pr-3">
        {children}
      </tr>
    </thead>
  );
}

/* ---------- Status dot used in Nav ---------- */

interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "ok" | "warn" | "bad" | "muted";
}
const DOT_TONE: Record<NonNullable<StatusDotProps["tone"]>, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
  muted: "bg-slate-400"
};
export function StatusDot({ tone = "muted", className = "", ...rest }: StatusDotProps) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${DOT_TONE[tone]} ${className}`}
      {...rest}
    />
  );
}

/* ---------- Inactive banner (used by /dashboard when profile inactive) ---------- */

export function NoticeCard({
  title,
  children,
  tone = "neutral"
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "warn" | "bad";
}) {
  const ring =
    tone === "warn"
      ? "ring-amber-200 bg-amber-50 text-amber-900"
      : tone === "bad"
        ? "ring-red-200 bg-red-50 text-red-900"
        : "ring-ink/10 bg-white text-ink";
  return (
    <div className={`rounded-2xl p-6 shadow-cardlg ring-1 ${ring}`}>
      <h2 className="mb-2 text-base font-black">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
