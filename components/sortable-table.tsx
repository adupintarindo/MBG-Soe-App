"use client";

import { useMemo, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

export type SortDir = "asc" | "desc";

export interface SortableColumn<T> {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  thClassName?: string;
  tdClassName?: string | ((row: T) => string);
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  searchValue?: (row: T) => string | number | null | undefined;
  exportLabel?: string;
  exportValue?: (row: T) => string | number | boolean | null | undefined;
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
  searchable?: boolean;
  searchPlaceholder?: string;
  exportable?: boolean;
  exportFileName?: string;
  exportSheetName?: string;
  toolbarExtra?: ReactNode;
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

function stripReactNodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(stripReactNodeToText).join(" ");
  // ReactElement — recurse into children if present
  if (typeof node === "object" && node !== null && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return stripReactNodeToText(props?.children);
  }
  return "";
}

function columnHeaderText<T>(col: SortableColumn<T>): string {
  return col.exportLabel ?? (stripReactNodeToText(col.label).trim() || col.key);
}

async function runExport<T>(
  rows: T[],
  columns: SortableColumn<T>[],
  baseFileName: string,
  sheetName: string
) {
  const XLSX = await import("xlsx");
  const exportCols = columns.filter((c) => c.exportValue || c.sortValue);
  const headers = exportCols.map((c) => columnHeaderText(c));
  const data = rows.map((row, idx) =>
    exportCols.map((c) => {
      if (c.exportValue) return c.exportValue(row) ?? "";
      if (c.sortValue) return c.sortValue(row) ?? "";
      return stripReactNodeToText(c.render(row, idx));
    })
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...data.map((r) => String(r[i] ?? "").length)
    );
    return { wch: Math.min(40, Math.max(10, maxLen + 2)) };
  });
  (ws as { [k: string]: unknown })["!cols"] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Sheet1");
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${baseFileName}-${stamp}.xlsx`);
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
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
  dense = false,
  searchable = false,
  searchPlaceholder,
  exportable = false,
  exportFileName = "export",
  exportSheetName = "Sheet1",
  toolbarExtra
}: SortableTableProps<T>) {
  const { lang } = useLang();
  const [sortKey, setSortKey] = useState<string | null>(
    initialSort?.key ?? null
  );
  const [sortDir, setSortDir] = useState<SortDir>(initialSort?.dir ?? "asc");
  const [query, setQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const filteredRows = useMemo(() => {
    if (!searchable || !query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) =>
      columns.some((c) => {
        if (c.searchValue) {
          const v = c.searchValue(row);
          return v != null && String(v).toLowerCase().includes(q);
        }
        if (c.sortValue) {
          const v = c.sortValue(row);
          return v != null && String(v).toLowerCase().includes(q);
        }
        return stripReactNodeToText(c.render(row, 0))
          .toLowerCase()
          .includes(q);
      })
    );
  }, [rows, columns, query, searchable]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || col.sortable === false) return filteredRows;
    const valueFn =
      col.sortValue ??
      ((row: T) => {
        const v = col.render(row, 0);
        return typeof v === "string" || typeof v === "number" ? v : null;
      });
    const sign = sortDir === "asc" ? 1 : -1;
    const copy = filteredRows.slice();
    copy.sort((a, b) => sign * compare(valueFn(a), valueFn(b)));
    return copy;
  }, [filteredRows, columns, sortKey, sortDir]);

  function toggle(key: string, sortable: boolean) {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await runExport(sortedRows, columns, exportFileName, exportSheetName);
    } finally {
      setIsExporting(false);
    }
  }

  const theadCls = `${stickyHeader ? "sticky top-0 z-10 " : ""}${THEAD_VARIANTS[variant]}`;
  const rowPad = dense ? "py-1.5" : "py-2";
  const showToolbar = searchable || exportable || toolbarExtra;

  return (
    <div className={className}>
      {showToolbar && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {searchable && (
            <label className="relative flex min-w-[200px] flex-1 items-center">
              <span className="pointer-events-none absolute left-2.5 text-ink2/60">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchPlaceholder ??
                  t("common.searchPlaceholder", lang)
                }
                className="w-full rounded-md border border-ink/10 bg-paper py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
              />
              {query && (
                <span className="ml-2 text-[10.5px] font-mono text-ink2/70">
                  {sortedRows.length}/{rows.length}
                </span>
              )}
            </label>
          )}
          {toolbarExtra}
          {exportable && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || sortedRows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              title={t("common.exportExcel", lang)}
            >
              <DownloadIcon />
              <span>{t("common.exportExcel", lang)}</span>
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
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
                  {emptyMessage ?? t("common.noData", lang)}
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
    </div>
  );
}
