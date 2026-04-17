"use client";

import { useMemo, useState, type ReactNode } from "react";

export type SortDir = "asc" | "desc";

export interface SortableColumn<T> {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  thClassName?: string;
  tdClassName?: string | ((row: T) => string);
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  render: (row: T, index: number) => ReactNode;
  width?: string;
  title?: string;
  colSpan?: number;
}

export interface SortableTableProps<T> {
  columns: SortableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  initialSort?: { key: string; dir: SortDir };
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  tableClassName?: string;
  emptyMessage?: ReactNode;
  footer?: ReactNode;
  stickyHeader?: boolean;
  variant?: "gradient" | "subtle" | "dark";
  caption?: ReactNode;
  ariaLabel?: string;
  zebra?: boolean;
  dense?: boolean;
}

const ALIGN_CLS: Record<NonNullable<SortableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right"
};

const THEAD_VARIANTS = {
  gradient:
    "bg-primary-gradient dark:bg-primary-gradient-dark text-white/95 [&>tr]:border-b-2 [&>tr]:border-gold/70 [&>tr>th:first-child]:rounded-tl-lg [&>tr>th:first-child]:pl-3 [&>tr>th:last-child]:rounded-tr-lg [&>tr>th:last-child]:pr-3",
  subtle:
    "bg-paper text-ink2 [&>tr]:border-b [&>tr]:border-ink/10",
  dark:
    "bg-ink text-white/95 [&>tr>th:first-child]:rounded-tl-xl [&>tr>th:last-child]:rounded-tr-xl"
};

const ARROW_ACTIVE = "opacity-100";
const ARROW_IDLE = "opacity-30";

function compare(a: unknown, b: unknown): number {
  const an = a == null;
  const bn = b == null;
  if (an && bn) return 0;
  if (an) return 1;
  if (bn) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return a === b ? 0 : a ? 1 : -1;
  }
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  return sa.localeCompare(sb, "id", { numeric: true, sensitivity: "base" });
}

export function SortableTable<T>({
  columns,
  rows,
  rowKey,
  initialSort,
  rowClassName,
  onRowClick,
  className = "",
  tableClassName = "",
  emptyMessage,
  footer,
  stickyHeader = false,
  variant = "gradient",
  caption,
  ariaLabel,
  zebra = false,
  dense = false
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(
    initialSort?.key ?? null
  );
  const [sortDir, setSortDir] = useState<SortDir>(initialSort?.dir ?? "asc");

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || col.sortable === false) return rows;
    const valueFn =
      col.sortValue ??
      ((row: T) => {
        const v = col.render(row, 0);
        return typeof v === "string" || typeof v === "number" ? v : null;
      });
    const sign = sortDir === "asc" ? 1 : -1;
    const copy = rows.slice();
    copy.sort((a, b) => sign * compare(valueFn(a), valueFn(b)));
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  function toggle(key: string, sortable: boolean) {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const theadCls = `${stickyHeader ? "sticky top-0 z-10 " : ""}${THEAD_VARIANTS[variant]}`;
  const rowPad = dense ? "py-1.5" : "py-2";

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table
        aria-label={ariaLabel}
        className={`w-full text-xs ${tableClassName}`}
      >
        {caption && (
          <caption className="mb-2 text-left text-[11px] text-ink2/70">
            {caption}
          </caption>
        )}
        <thead className={theadCls}>
          <tr className="font-display text-[10.5px] font-bold uppercase tracking-[0.1em]">
            {columns.map((c) => {
              const sortable = c.sortable !== false;
              const active = sortKey === c.key && sortable;
              const ariaSort: "ascending" | "descending" | "none" = active
                ? sortDir === "asc"
                  ? "ascending"
                  : "descending"
                : "none";
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={ariaSort}
                  title={c.title}
                  style={c.width ? { width: c.width } : undefined}
                  className={`px-3 ${rowPad} ${ALIGN_CLS[c.align ?? "center"]} ${
                    sortable
                      ? "cursor-pointer select-none transition hover:brightness-110"
                      : ""
                  } ${c.thClassName ?? ""}`}
                  onClick={sortable ? () => toggle(c.key, sortable) : undefined}
                >
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      c.align === "right"
                        ? "justify-end"
                        : c.align === "left"
                          ? "justify-start"
                          : "justify-center"
                    }`}
                  >
                    <span>{c.label}</span>
                    {sortable && (
                      <span
                        aria-hidden
                        className="inline-flex flex-col leading-none text-[8px]"
                      >
                        <span
                          className={`-mb-[1px] ${
                            active && sortDir === "asc"
                              ? ARROW_ACTIVE
                              : ARROW_IDLE
                          }`}
                        >
                          ▲
                        </span>
                        <span
                          className={
                            active && sortDir === "desc"
                              ? ARROW_ACTIVE
                              : ARROW_IDLE
                          }
                        >
                          ▼
                        </span>
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-[12px] text-ink2/70"
              >
                {emptyMessage ?? "Tidak ada data."}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, i) => {
              const zebraCls =
                zebra && i % 2 === 1 ? "bg-ink/[0.02]" : "";
              const extra = rowClassName?.(row, i) ?? "";
              const clickable = onRowClick
                ? "cursor-pointer hover:bg-accent-strong/5"
                : "hover:bg-ink/[0.02]";
              return (
                <tr
                  key={rowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-t border-ink/5 transition ${clickable} ${zebraCls} ${extra}`}
                >
                  {columns.map((c) => {
                    const tdExtra =
                      typeof c.tdClassName === "function"
                        ? c.tdClassName(row)
                        : (c.tdClassName ?? "");
                    return (
                      <td
                        key={c.key}
                        className={`px-3 ${rowPad} ${ALIGN_CLS[c.align ?? "center"]} ${tdExtra}`}
                      >
                        {c.render(row, i)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>

        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}
