import type { CSSProperties } from "react";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
  className?: string;
}

const R = {
  sm: "rounded",
  md: "rounded-lg",
  lg: "rounded-2xl",
  full: "rounded-full"
};

export function Skeleton({
  width,
  height = "1rem",
  rounded = "md",
  className = ""
}: SkeletonProps) {
  const style: CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height
  };
  return (
    <span
      className={`inline-block animate-pulse bg-ink/10 dark:bg-white/10 ${R[rounded]} ${className}`}
      style={style}
      aria-hidden
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.75rem"
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 160 }: { height?: number }) {
  return (
    <div
      className="rounded-2xl bg-white p-4 shadow-card dark:bg-d-surface dark:shadow-card-dark"
      style={{ minHeight: height }}
    >
      <Skeleton height="0.75rem" width="40%" />
      <div className="mt-3 space-y-2">
        <Skeleton height="1.5rem" width="80%" />
        <Skeleton height="0.75rem" width="60%" />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 8,
  cols = 6
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-d-surface dark:shadow-card-dark">
      {/* header */}
      <div
        className="grid gap-2 border-b border-ink/5 bg-ink/[0.02] px-4 py-3 dark:border-white/5 dark:bg-white/5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height="0.65rem" width="70%" />
        ))}
      </div>
      {/* rows */}
      <div className="divide-y divide-ink/5 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-2 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                height="0.75rem"
                width={c === 0 ? "90%" : c % 2 ? "60%" : "80%"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonKpiGrid({ tiles = 5 }: { tiles?: number }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${tiles}, minmax(0,1fr))` }}
    >
      {Array.from({ length: tiles }).map((_, i) => (
        <SkeletonCard key={i} height={120} />
      ))}
    </div>
  );
}
