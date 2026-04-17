"use client";

import { useMemo, useState, type ReactNode } from "react";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

export type SortDir = "asc" | "desc";

export type ExportPrimitive = string | number | Date | null | undefined;

export type DataTableColumn<T> = {
  /** Stable id for the column (used by sort state + React keys + export headers). */
  key: string;
  /** Header label. */
  label: ReactNode;
  /** Plain text used for Excel header + sortable button aria-label. Defaults to stringified `label`. */
  labelText?: string;
  /** Text alignment in the data cell. */
  align?: "left" | "right" | "center";
  /** Disable sort on this column. Default: true when `sortValue` is provided. */
  sortable?: boolean;
  /** Comparable value for sorting. */
  sortValue?: (row: T) => ExportPrimitive;
  /** Searchable value — concatenated across columns for the global search filter. */
  searchValue?: (row: T) => string | number | null | undefined;
  /** Value written to Excel. Falls back to sortValue, then searchValue. */
  exportValue?: (row: T) => ExportPrimitive;
  /** Cell renderer. */
  cell: (row: T, idx: number) => ReactNode;
  /** Extra classes on the <th>. */
  headClassName?: string;
  /** Extra classes on every <td> of this column. */
  cellClassName?: string;
  /** Optional fixed width (CSS value). */
  width?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Stable key per row. */
  getRowKey: (row: T, idx: number) => string | number;
  /** Show global search input above the table. */
  searchable?: boolean;
  /** Show Excel export button. Default: true. */
  exportable?: boolean;
  /** Base name of the downloaded file (no extension). */
  exportFileName?: string;
  /** Excel sheet name. Default: "Sheet1". */
  exportSheetName?: string;
  /** Default sort on first render. */
  defaultSort?: { key: string; dir: SortDir };
  /** Fallback node when rows is empty. */
  empty?: ReactNode;
  /** Extra classes on the <table>. */
  tableClassName?: string;
  /** Extra classes appended to every <tr> in tbody. */
  rowClassName?: (row: T, idx: number) => string;
  /** Render extra controls (e.g. type filter) inline with the search input. */
  toolbar?: ReactNode;
  /** Render a summary row below the body (e.g. totals). Receives the visible rows. */
  footer?: (visibleRows: T[]) => ReactNode;
};

function compare(a: ExportPrimitive, b: ExportPrimitive): number {
  const aNil = a == null || (typeof a === "number" && Number.isNaN(a));
  const bNil = b == null || (typeof b === "number" && Number.isNaN(b));
  if (aNil && bNil) return 0;
  if (aNil) return 1;
  if (bNil) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function labelToText(label: ReactNode, fallback: string): string {
  if (typeof label === "string") return label;
  if (typeof label === "number") return String(label);
  return fallback;
}

function safeFileName(base: string): string {
  const trimmed = base.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
  return trimmed || "data";
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  searchable = false,
  exportable = true,
  exportFileName,
  exportSheetName = "Sheet1",
  defaultSort,
  empty,
  tableClassName = "",
  rowClassName,
  toolbar,
  footer
}: DataTableProps<T>) {
  const { lang } = useLang();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(
    defaultSort ?? null
  );
  const [exportBusy, setExportBusy] = useState(false);

  const visibleRows = useMemo(() => {
    let data = rows;

    const q = query.trim().toLowerCase();
    if (q) {
      data = data.filter((row) => {
        for (const col of columns) {
          const extractor = col.searchValue ?? col.sortValue;
          if (!extractor) continue;
          const v = extractor(row as T);
          if (v == null) continue;
          if (String(v).toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const dir = sort.dir === "asc" ? 1 : -1;
        data = [...data].sort(
          (a, b) => compare(col.sortValue!(a), col.sortValue!(b)) * dir
        );
      }
    }

    return data;
  }, [rows, columns, query, sort]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null; // third click clears sort
    });
  }

  async function handleExport() {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      // Lazy-load sheetjs so the ~400KB bundle only ships on click.
      const XLSX = await import("xlsx");

      const headers = columns.map((col, i) =>
        labelToText(col.label, col.labelText ?? col.key ?? `col-${i + 1}`)
      );

      const dataRows = visibleRows.map((row) =>
        columns.map((col) => {
          const extractor =
            col.exportValue ?? col.sortValue ?? col.searchValue;
          if (!extractor) return "";
          const v = extractor(row as T);
          if (v == null) return "";
          if (v instanceof Date) return v;
          return v;
        })
      );

      const sheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      // Auto column widths (min 8, max 40 chars).
      sheet["!cols"] = headers.map((h, colIdx) => {
        let max = String(h).length;
        for (const row of dataRows) {
          const v = row[colIdx];
          const len =
            v instanceof Date
              ? 10
              : typeof v === "number"
                ? String(v).length
                : String(v ?? "").length;
          if (len > max) max = len;
        }
        return { wch: Math.min(40, Math.max(8, max + 2)) };
      });

      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, exportSheetName.slice(0, 31));

      const stamp = new Date().toISOString().slice(0, 10);
      const base = safeFileName(exportFileName || "table");
      XLSX.writeFile(book, `${base}-${stamp}.xlsx`);
    } finally {
      setExportBusy(false);
    }
  }

  const showToolbar = searchable || exportable || toolbar != null;
  const hasVisibleRows = visibleRows.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <label className="relative min-w-[180px] max-w-sm flex-1">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink2/60"
              >
                🔍
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.searchPlaceholder", lang)}
                className="w-full rounded-lg border border-ink/15 bg-white py-1.5 pl-8 pr-3 text-xs text-ink outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20 dark:border-d-border/40 dark:bg-d-surface-2 dark:text-d-text"
              />
            </label>
          )}
          {toolbar}
          <div className="ml-auto flex items-center gap-2">
            {(query || sort) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSort(defaultSort ?? null);
                }}
                className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-[11px] font-bold text-ink2 transition hover:bg-ink/5 dark:border-d-border/40 dark:bg-d-surface-2 dark:text-d-text"
              >
                {t("common.reset", lang)}
              </button>
            )}
            {exportable && (
              <button
                type="button"
                onClick={handleExport}
                disabled={exportBusy || !hasVisibleRows}
                title={t("common.exportExcel", lang)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/25 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/30 dark:bg-emerald-900/20 dark:text-emerald-200"
              >
                <span aria-hidden>📊</span>
                <span>
                  {exportBusy
                    ? `${t("common.exportExcel", lang)}…`
                    : t("common.exportExcel", lang)}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="-mx-1 overflow-x-auto px-1">
        <table className={`w-full ${tableClassName}`}>
          <thead className="sticky top-0 z-10 bg-primary-gradient dark:bg-primary-gradient-dark">
            <tr className="border-b-2 border-gold/70 text-center font-display text-[10.5px] font-bold uppercase tracking-[0.09em] text-white/95 [&>th:first-child]:rounded-tl-lg [&>th:first-child]:pl-3 [&>th:last-child]:rounded-tr-lg [&>th:last-child]:pr-3">
              {columns.map((col) => {
                const sortable = col.sortable ?? Boolean(col.sortValue);
                const isActive = sort?.key === col.key;
                const dir = isActive ? sort!.dir : null;
                const alignCls =
                  col.align === "right"
                    ? "text-right"
                    : col.align === "left"
                      ? "text-left"
                      : "text-center";
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`py-2 ${alignCls} ${col.headClassName ?? ""}`}
                    style={col.width ? { width: col.width } : undefined}
                    aria-sort={
                      isActive
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 transition hover:bg-white/10 ${
                          isActive ? "bg-white/15 ring-1 ring-gold/50" : ""
                        }`}
                      >
                        <span>{col.label}</span>
                        <span
                          aria-hidden
                          className={`text-[9px] leading-none transition ${
                            isActive ? "opacity-100" : "opacity-40"
                          }`}
                        >
                          {dir === "asc" ? "▲" : dir === "desc" ? "▼" : "↕"}
                        </span>
                      </button>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {!hasVisibleRows ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-[12px] text-ink2/70"
                >
                  {empty ?? t("common.noData", lang)}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, idx) => {
                const extra = rowClassName?.(row, idx) ?? "";
                return (
                  <tr
                    key={getRowKey(row, idx)}
                    className={`row-hover border-b border-ink/5 ${extra}`}
                  >
                    {columns.map((col) => {
                      const alignCls =
                        col.align === "right"
                          ? "text-right"
                          : col.align === "left"
                            ? "text-left"
                            : "text-center";
                      return (
                        <td
                          key={col.key}
                          className={`py-2 pr-3 ${alignCls} ${col.cellClassName ?? ""}`}
                        >
                          {col.cell(row, idx)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
          {footer && hasVisibleRows && <tfoot>{footer(visibleRows)}</tfoot>}
        </table>
      </div>

      {(searchable || sort) && (
        <div className="flex items-center justify-between text-[11px] text-ink2/60">
          <span>
            {ti("common.showingRows", lang, {
              visible: visibleRows.length,
              total: rows.length
            })}
          </span>
          {sort && (
            <span className="font-mono">
              {t("common.sortedBy", lang)}:{" "}
              {labelToText(
                columns.find((c) => c.key === sort.key)?.label,
                sort.key
              )}{" "}
              {sort.dir === "asc" ? "▲" : "▼"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
