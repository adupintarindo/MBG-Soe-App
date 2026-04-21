"use client";

import { useMemo, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
import type { CellHint } from "@/lib/excel-export";

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
  /** Excel number format, e.g. "#,##0", '"Rp "#,##0'. */
  exportNumFmt?: string;
  /** Per-column or per-row cell styling hint for the Excel export. */
  exportHint?: CellHint | ((row: T) => CellHint | undefined);
  /** Excel column width (characters). */
  exportWidth?: number;
  render: (row: T, index: number) => ReactNode;
  width?: string;
  title?: string;
  colSpan?: number;
}

export interface SortableTableFilter<T> {
  key: string;
  label: string;
  getValue: (row: T) => string | null | undefined;
  options?: { value: string; label: string }[]; // optional manual list; otherwise derived
  width?: string;
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
  /** Big title row at top of Excel file (merged). */
  exportTitle?: string;
  /** Smaller subtitle line under the title. */
  exportSubtitle?: string;
  /** Grand total row rendered with navy + gold styling. */
  exportTotals?:
    | {
        labelColSpan?: number;
        labelText?: string;
        values: Record<string, number | string>;
      }
    | ((rows: T[]) => {
        labelColSpan?: number;
        labelText?: string;
        values: Record<string, number | string>;
      });
  toolbarExtra?: ReactNode;
  filters?: SortableTableFilter<T>[];
  /** If set, wrap the table body in a scroll container with this max-height (px). Toolbar stays above the scroll area. */
  bodyMaxHeight?: number;
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
  sheetName: string,
  title: string | undefined,
  subtitle: string | undefined,
  totalsOpt: SortableTableProps<T>["exportTotals"]
) {
  const { downloadStyledXlsx } = await import("@/lib/excel-export");
  const exportCols = columns.filter((c) => c.exportValue || c.sortValue);

  const styledColumns = exportCols.map((c) => ({
    key: c.key,
    header: columnHeaderText(c),
    align: c.align ?? "left",
    numFmt: c.exportNumFmt,
    width: c.exportWidth,
    hint:
      typeof c.exportHint === "function"
        ? undefined
        : (c.exportHint as CellHint | undefined)
  }));

  const rowObjects = rows.map((row, idx) => {
    const o: Record<string, unknown> = { __row: row, __idx: idx };
    for (const c of exportCols) {
      if (c.exportValue) {
        o[c.key] = c.exportValue(row) ?? "";
      } else if (c.sortValue) {
        o[c.key] = c.sortValue(row) ?? "";
      } else {
        o[c.key] = stripReactNodeToText(c.render(row, idx));
      }
    }
    return o;
  });

  const hintByKey = new Map<string, (row: T) => CellHint | undefined>();
  for (const c of exportCols) {
    if (typeof c.exportHint === "function") {
      hintByKey.set(c.key, c.exportHint as (row: T) => CellHint | undefined);
    }
  }

  const cellHint = hintByKey.size > 0
    ? (row: Record<string, unknown>, colKey: string) => {
        const fn = hintByKey.get(colKey);
        if (!fn) return undefined;
        return fn(row.__row as T);
      }
    : undefined;

  const totals =
    typeof totalsOpt === "function" ? totalsOpt(rows) : totalsOpt;

  await downloadStyledXlsx({
    fileName: baseFileName,
    sheets: [
      {
        name: sheetName || "Sheet1",
        title,
        subtitle,
        columns: styledColumns,
        rows: rowObjects,
        cellHint,
        totals,
        freezeHeader: true,
        zebra: true
      }
    ]
  });
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
  searchable = true,
  searchPlaceholder,
  exportable = true,
  exportFileName = "export",
  exportSheetName = "Sheet1",
  exportTitle,
  exportSubtitle,
  exportTotals,
  toolbarExtra,
  filters,
  bodyMaxHeight
}: SortableTableProps<T>) {
  const { lang } = useLang();
  const [sortKey, setSortKey] = useState<string | null>(
    initialSort?.key ?? null
  );
  const [sortDir, setSortDir] = useState<SortDir>(initialSort?.dir ?? "asc");
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Options derived from row data when filter.options is not explicitly provided.
  const filterOptionsByKey = useMemo(() => {
    const m = new Map<string, { value: string; label: string }[]>();
    if (!filters) return m;
    for (const f of filters) {
      if (f.options) {
        m.set(f.key, f.options);
        continue;
      }
      const seen = new Set<string>();
      const list: { value: string; label: string }[] = [];
      for (const row of rows) {
        const v = f.getValue(row);
        if (v == null || v === "") continue;
        const s = String(v);
        if (seen.has(s)) continue;
        seen.add(s);
        list.push({ value: s, label: s });
      }
      list.sort((a, b) => a.label.localeCompare(b.label, "id"));
      m.set(f.key, list);
    }
    return m;
  }, [filters, rows]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (filters && filters.length > 0) {
      out = out.filter((row) =>
        filters.every((f) => {
          const sel = filterValues[f.key];
          if (!sel) return true;
          const v = f.getValue(row);
          return v != null && String(v) === sel;
        })
      );
    }
    if (searchable && query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((row) =>
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
    }
    return out;
  }, [rows, columns, query, searchable, filters, filterValues]);

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
      await runExport(
        sortedRows,
        columns,
        exportFileName,
        exportSheetName,
        exportTitle,
        exportSubtitle,
        exportTotals
      );
    } finally {
      setIsExporting(false);
    }
  }

  const theadCls = `${stickyHeader ? "sticky top-0 z-10 " : ""}${THEAD_VARIANTS[variant]}`;
  const rowPad = dense ? "py-1.5" : "py-2";
  const hasFilters = !!filters && filters.length > 0;
  const showToolbar = searchable || exportable || hasFilters || toolbarExtra;
  const queryActive = searchable && query.trim().length > 0;
  const filterActive =
    hasFilters && Object.values(filterValues).some((v) => v && v.length > 0);

  return (
    <div className={className}>
      {showToolbar && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative flex min-w-[220px] flex-1 items-center">
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
            </div>
          )}
          {hasFilters &&
            filters!.map((f) => {
              const opts = filterOptionsByKey.get(f.key) ?? [];
              const val = filterValues[f.key] ?? "";
              return (
                <select
                  key={f.key}
                  value={val}
                  onChange={(e) =>
                    setFilterValues((prev) => ({
                      ...prev,
                      [f.key]: e.target.value
                    }))
                  }
                  className="rounded-md border border-ink/10 bg-paper py-1.5 pl-2.5 pr-7 text-xs text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
                  style={f.width ? { minWidth: f.width } : undefined}
                >
                  <option value="">{f.label}</option>
                  {opts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              );
            })}
          {(queryActive || filterActive) && (
            <span className="text-[10.5px] font-mono text-ink2/70">
              {sortedRows.length}/{rows.length}
            </span>
          )}
          {(queryActive || filterActive) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilterValues({});
              }}
              className="rounded-md border border-ink/10 bg-paper px-2 py-1 text-[11px] font-semibold text-ink2 transition hover:bg-ink/[0.04]"
            >
              {t("common.reset", lang)}
            </button>
          )}
          {toolbarExtra}
          {exportable && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || sortedRows.length === 0}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              title={t("common.exportExcel", lang)}
            >
              <DownloadIcon />
              <span>{t("common.exportExcel", lang)}</span>
            </button>
          )}
        </div>
      )}

      <div
        className={bodyMaxHeight ? "overflow-auto rounded-xl ring-1 ring-ink/10" : "overflow-x-auto"}
        style={bodyMaxHeight ? { maxHeight: `${bodyMaxHeight}px` } : undefined}
      >
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
            <tr className="font-display text-[11px] font-bold tracking-wide">
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
                    className={`whitespace-nowrap px-3 ${rowPad} ${ALIGN_CLS[c.align ?? "center"]} ${
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
                          className={`whitespace-nowrap px-3 ${rowPad} ${ALIGN_CLS[c.align ?? "center"]} ${tdExtra}`}
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
