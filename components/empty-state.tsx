import type { ReactNode } from "react";
import Link from "next/link";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { pad: "p-4",  icon: "text-2xl", title: "text-sm",  desc: "text-[11px]" },
  md: { pad: "p-6",  icon: "text-3xl", title: "text-base", desc: "text-xs" },
  lg: { pad: "p-10", icon: "text-5xl", title: "text-lg",  desc: "text-sm" }
};

export function EmptyState({
  icon = "📭",
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  size = "md",
  className = ""
}: EmptyStateProps) {
  const S = SIZES[size];
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl bg-ink/[0.03] text-center dark:bg-white/5 ${S.pad} ${className}`}
      role="status"
    >
      <div className={`${S.icon} mb-2`} aria-hidden>
        {icon}
      </div>
      <div className={`font-display font-bold text-ink dark:text-d-text ${S.title}`}>
        {title}
      </div>
      {description && (
        <div className={`mt-1 max-w-md text-ink2/80 dark:text-d-text-2 ${S.desc}`}>
          {description}
        </div>
      )}
      {(ctaLabel && (ctaHref || ctaOnClick)) && (
        <div className="mt-3">
          {ctaHref ? (
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-card hover:bg-primary-2 dark:bg-accent-strong dark:hover:bg-accent"
            >
              {ctaLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={ctaOnClick}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-card hover:bg-primary-2 dark:bg-accent-strong dark:hover:bg-accent"
            >
              {ctaLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
