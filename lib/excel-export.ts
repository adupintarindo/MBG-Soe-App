/**
 * lib/excel-export.ts
 *
 * Shared styled Excel (XLSX) exporter backed by `exceljs`.
 *
 * Goals
 *  • Konsisten di seluruh app — dashboard table, price list, forecast, quotation,
 *    rincian penerima, semuanya pakai style yang sama (bukan sekadar dump data).
 *  • Isomorphic — berfungsi di browser (client-side download via Blob) maupun
 *    di Next.js API route (mengembalikan Buffer).
 *
 * Style preset "MBG":
 *  • Title row  → navy #0B1E3F, white bold 14pt, merged, centered
 *  • Subtitle   → white bg, gray italic
 *  • Header     → navy #0B1E3F, white bold, uppercase tracking, tebal border bawah gold
 *  • Body       → bordered tipis, zebra opsional
 *  • Status OK  → fill hijau #D1FADF, teks hijau tua #027A48, bold
 *  • Status BAD → fill merah #FEE4E2, teks merah tua #B42318, bold
 *  • Total row  → navy #0B1E3F, white bold, border atas tebal
 */

import ExcelJS, { type Alignment, type Borders, type Fill, type Font } from "exceljs";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type CellHint =
  | "default"
  | "status-ok"
  | "status-bad"
  | "status-neutral"
  | "number"
  | "money"
  | "bold"
  | "muted";

export interface StyledColumn {
  /** Column key — used to look up value in row objects & totals. */
  key: string;
  /** Column header (rendered in navy header row). */
  header: string;
  /** Excel column width (default auto from content). */
  width?: number;
  /** Text alignment for body cells. Headers are always center. */
  align?: "left" | "center" | "right";
  /** Excel number format, e.g. "#,##0", "#,##0.00", '"Rp "#,##0'. */
  numFmt?: string;
  /** Default cell styling hint for this column. */
  hint?: CellHint;
}

export interface StyledSheet {
  name: string;
  /** Big title at row 1 (merged across all cols). */
  title?: string;
  /** Smaller subtitle under title (merged). */
  subtitle?: string;
  /** Optional key-value info block before table (for cover/info sheets). */
  meta?: Array<[string, string | number]>;
  columns: StyledColumn[];
  rows: Array<Record<string, unknown>>;
  /** Per-cell override. Return a hint to apply special styling. */
  cellHint?: (
    row: Record<string, unknown>,
    colKey: string
  ) => CellHint | undefined;
  /** Optional grand total row — rendered navy + white bold. */
  totals?: {
    labelColSpan?: number;
    labelText?: string;
    values: Record<string, number | string>;
  };
  freezeHeader?: boolean;
  zebra?: boolean;
  /** Italic merged rows rendered BELOW the totals (instructions, disclaimers). */
  notes?: string[];
  /** Optional signature block (two columns) at the very bottom. */
  signatures?: Array<{ left: string; right?: string }>;
}

export interface StyledWorkbookOptions {
  fileName: string;
  creator?: string;
  sheets: StyledSheet[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Style tokens
// ──────────────────────────────────────────────────────────────────────────────

const NAVY = "FF0B1E3F";
const GOLD = "FFDFB85A";
const WHITE = "FFFFFFFF";
const INK_SOFT = "FFF7F7F8";
const ZEBRA_ALT = "FFF3F4F6";
const BORDER_SOFT = "FFE5E7EB";

const STATUS_OK_FILL = "FFD1FADF";
const STATUS_OK_TEXT = "FF027A48";
const STATUS_BAD_FILL = "FFFEE4E2";
const STATUS_BAD_TEXT = "FFB42318";
const STATUS_NEU_FILL = "FFE0E7FF";
const STATUS_NEU_TEXT = "FF3730A3";
const MUTED_TEXT = "FF6B7280";

const FONT_FAMILY = "Inter";

const alignCenter: Partial<Alignment> = { horizontal: "center", vertical: "middle", wrapText: false };
const alignLeft: Partial<Alignment> = { horizontal: "left", vertical: "middle", wrapText: false };
const alignRight: Partial<Alignment> = { horizontal: "right", vertical: "middle", wrapText: false };

const thinBorder: Partial<Borders> = {
  top: { style: "thin", color: { argb: BORDER_SOFT } },
  bottom: { style: "thin", color: { argb: BORDER_SOFT } },
  left: { style: "thin", color: { argb: BORDER_SOFT } },
  right: { style: "thin", color: { argb: BORDER_SOFT } }
};

const titleFill: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: NAVY }
};
const headerFill: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: NAVY }
};
const totalFill: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: NAVY }
};

const headerFont: Partial<Font> = {
  name: FONT_FAMILY,
  bold: true,
  color: { argb: WHITE },
  size: 10
};
const titleFont: Partial<Font> = {
  name: FONT_FAMILY,
  bold: true,
  color: { argb: WHITE },
  size: 14
};
const subtitleFont: Partial<Font> = {
  name: FONT_FAMILY,
  italic: true,
  color: { argb: MUTED_TEXT },
  size: 10
};
const bodyFont: Partial<Font> = {
  name: FONT_FAMILY,
  color: { argb: "FF111827" },
  size: 10
};
const totalFont: Partial<Font> = {
  name: FONT_FAMILY,
  bold: true,
  color: { argb: WHITE },
  size: 11
};

// ──────────────────────────────────────────────────────────────────────────────
// Builder
// ──────────────────────────────────────────────────────────────────────────────

function alignForCol(col: StyledColumn, isNumeric: boolean): Partial<Alignment> {
  if (col.align === "left") return alignLeft;
  if (col.align === "right") return alignRight;
  if (col.align === "center") return alignCenter;
  return isNumeric ? alignRight : alignLeft;
}

function autoWidth(col: StyledColumn, rows: Array<Record<string, unknown>>): number {
  if (col.width) return col.width;
  let max = col.header.length;
  for (const r of rows) {
    const v = r[col.key];
    if (v == null) continue;
    const s = typeof v === "number" ? v.toLocaleString("id-ID") : String(v);
    if (s.length > max) max = s.length;
  }
  return Math.min(42, Math.max(8, max + 2));
}

function applyHint(
  cell: ExcelJS.Cell,
  hint: CellHint | undefined,
  base: { align: Partial<Alignment>; numFmt?: string }
): void {
  cell.font = { ...bodyFont };
  cell.alignment = base.align;
  cell.border = thinBorder;
  if (base.numFmt) cell.numFmt = base.numFmt;
  if (!hint || hint === "default") return;
  switch (hint) {
    case "status-ok":
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: STATUS_OK_FILL }
      };
      cell.font = {
        ...bodyFont,
        bold: true,
        color: { argb: STATUS_OK_TEXT }
      };
      cell.alignment = alignCenter;
      break;
    case "status-bad":
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: STATUS_BAD_FILL }
      };
      cell.font = {
        ...bodyFont,
        bold: true,
        color: { argb: STATUS_BAD_TEXT }
      };
      cell.alignment = alignCenter;
      break;
    case "status-neutral":
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: STATUS_NEU_FILL }
      };
      cell.font = {
        ...bodyFont,
        bold: true,
        color: { argb: STATUS_NEU_TEXT }
      };
      cell.alignment = alignCenter;
      break;
    case "bold":
      cell.font = { ...bodyFont, bold: true };
      break;
    case "muted":
      cell.font = { ...bodyFont, color: { argb: MUTED_TEXT } };
      break;
    case "number":
      cell.alignment = alignRight;
      cell.numFmt = cell.numFmt || "#,##0";
      break;
    case "money":
      cell.alignment = alignRight;
      cell.numFmt = cell.numFmt || '"Rp "#,##0';
      break;
  }
}

function buildSheet(workbook: ExcelJS.Workbook, sheet: StyledSheet): void {
  const ws = workbook.addWorksheet(sheet.name.slice(0, 31) || "Sheet1", {
    views: sheet.freezeHeader ? [{ state: "frozen", ySplit: 0 }] : []
  });

  const colCount = sheet.columns.length;

  // Column widths
  ws.columns = sheet.columns.map((c) => ({
    key: c.key,
    width: autoWidth(c, sheet.rows)
  }));

  let cursor = 1;

  // Title row
  if (sheet.title) {
    ws.mergeCells(cursor, 1, cursor, colCount);
    const cell = ws.getCell(cursor, 1);
    cell.value = sheet.title;
    cell.font = titleFont;
    cell.alignment = alignCenter;
    cell.fill = titleFill;
    ws.getRow(cursor).height = 26;
    cursor += 1;
  }

  // Subtitle
  if (sheet.subtitle) {
    ws.mergeCells(cursor, 1, cursor, colCount);
    const cell = ws.getCell(cursor, 1);
    cell.value = sheet.subtitle;
    cell.font = subtitleFont;
    cell.alignment = alignCenter;
    ws.getRow(cursor).height = 18;
    cursor += 1;
  }

  // Spacer after title block
  if (sheet.title || sheet.subtitle) {
    cursor += 1;
  }

  // Meta block (for cover/info sheets) — 2 columns (key → value)
  if (sheet.meta && sheet.meta.length > 0) {
    for (const [k, v] of sheet.meta) {
      const keyCell = ws.getCell(cursor, 1);
      keyCell.value = k;
      keyCell.font = { ...bodyFont, bold: true };
      keyCell.alignment = alignLeft;
      keyCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: INK_SOFT }
      };
      keyCell.border = thinBorder;
      if (colCount >= 2) {
        ws.mergeCells(cursor, 2, cursor, colCount);
      }
      const valCell = ws.getCell(cursor, 2);
      valCell.value = v;
      valCell.font = bodyFont;
      valCell.alignment = alignLeft;
      valCell.border = thinBorder;
      cursor += 1;
    }
    cursor += 1;
  }

  // Header row — skip when sheet is pure meta (cover/info page, no rows)
  const hasTable =
    sheet.rows.length > 0 || !sheet.meta || sheet.meta.length === 0;
  if (hasTable) {
    const headerRow = ws.getRow(cursor);
    sheet.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = headerFont;
      cell.alignment = alignCenter;
      cell.fill = headerFill;
      cell.border = {
        top: { style: "thin", color: { argb: NAVY } },
        bottom: { style: "medium", color: { argb: GOLD } },
        left: { style: "thin", color: { argb: NAVY } },
        right: { style: "thin", color: { argb: NAVY } }
      };
    });
    headerRow.height = 22;
    cursor += 1;
  }

  if (sheet.freezeHeader && hasTable) {
    ws.views = [{ state: "frozen", ySplit: cursor - 1 }];
  }

  // Body rows
  const startBody = cursor;
  sheet.rows.forEach((r, rowIdx) => {
    const row = ws.getRow(cursor);
    sheet.columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      const rawVal = r[col.key];
      const isNumeric =
        col.hint === "number" ||
        col.hint === "money" ||
        typeof rawVal === "number";

      // Write value (preserve numbers, coerce null/undefined to empty)
      if (rawVal === null || rawVal === undefined) {
        cell.value = "";
      } else if (typeof rawVal === "boolean") {
        cell.value = rawVal ? "Yes" : "No";
      } else {
        cell.value = rawVal as ExcelJS.CellValue;
      }

      const hint = sheet.cellHint?.(r, col.key) ?? col.hint;
      applyHint(cell, hint, {
        align: alignForCol(col, isNumeric),
        numFmt: col.numFmt
      });

      // Zebra stripe (applied only when no explicit status fill)
      if (
        sheet.zebra &&
        rowIdx % 2 === 1 &&
        hint !== "status-ok" &&
        hint !== "status-bad" &&
        hint !== "status-neutral"
      ) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ZEBRA_ALT }
        };
      }
    });
    row.height = 18;
    cursor += 1;
  });

  // Grand total row
  if (sheet.totals) {
    const total = sheet.totals;
    const labelSpan = Math.max(1, Math.min(colCount, total.labelColSpan ?? 1));
    const row = ws.getRow(cursor);
    row.height = 24;

    if (labelSpan > 1) {
      ws.mergeCells(cursor, 1, cursor, labelSpan);
    }
    const labelCell = row.getCell(1);
    labelCell.value = total.labelText ?? "GRAND TOTAL";
    labelCell.font = totalFont;
    labelCell.fill = totalFill;
    labelCell.alignment = alignCenter;
    labelCell.border = {
      top: { style: "medium", color: { argb: GOLD } },
      bottom: { style: "thin", color: { argb: NAVY } },
      left: { style: "thin", color: { argb: NAVY } },
      right: { style: "thin", color: { argb: NAVY } }
    };

    for (let i = labelSpan; i < colCount; i++) {
      const col = sheet.columns[i];
      const cell = row.getCell(i + 1);
      const v = total.values[col.key];
      cell.value = v === undefined ? "" : (v as ExcelJS.CellValue);
      cell.font = totalFont;
      cell.fill = totalFill;
      cell.alignment = alignForCol(col, typeof v === "number");
      cell.numFmt = col.numFmt || (typeof v === "number" ? "#,##0" : undefined) || "";
      cell.border = {
        top: { style: "medium", color: { argb: GOLD } },
        bottom: { style: "thin", color: { argb: NAVY } },
        left: { style: "thin", color: { argb: NAVY } },
        right: { style: "thin", color: { argb: NAVY } }
      };
    }
    cursor += 1;
  }

  // Empty state — only shown when there's no meta block standing in as content
  if (sheet.rows.length === 0 && (!sheet.meta || sheet.meta.length === 0)) {
    ws.mergeCells(startBody, 1, startBody, colCount);
    const cell = ws.getCell(startBody, 1);
    cell.value = "Tidak ada data.";
    cell.font = { ...bodyFont, italic: true, color: { argb: MUTED_TEXT } };
    cell.alignment = alignCenter;
    ws.getRow(startBody).height = 26;
  }

  // Notes block (italic merged rows below the table)
  if (sheet.notes && sheet.notes.length > 0) {
    cursor += 1;
    for (const note of sheet.notes) {
      ws.mergeCells(cursor, 1, cursor, colCount);
      const cell = ws.getCell(cursor, 1);
      cell.value = note;
      cell.font = { ...bodyFont, italic: true, color: { argb: MUTED_TEXT } };
      cell.alignment = alignLeft;
      ws.getRow(cursor).height = 18;
      cursor += 1;
    }
  }

  // Signature block (two columns at bottom)
  if (sheet.signatures && sheet.signatures.length > 0 && colCount >= 2) {
    cursor += 2;
    const half = Math.ceil(colCount / 2);
    for (const sig of sheet.signatures) {
      if (half > 1) ws.mergeCells(cursor, 1, cursor, half);
      const left = ws.getCell(cursor, 1);
      left.value = sig.left;
      left.font = { ...bodyFont, bold: /Tanda Tangan/i.test(sig.left) };
      left.alignment = alignLeft;

      if (sig.right !== undefined) {
        if (colCount > half) ws.mergeCells(cursor, half + 1, cursor, colCount);
        const right = ws.getCell(cursor, half + 1);
        right.value = sig.right;
        right.font = { ...bodyFont, bold: /Tanda Tangan/i.test(sig.right) };
        right.alignment = alignLeft;
      }
      ws.getRow(cursor).height = 18;
      cursor += 1;
    }
  }
}

function buildWorkbook(opts: StyledWorkbookOptions): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = opts.creator ?? "MBG Soe Supply Chain";
  wb.created = new Date();
  wb.lastModifiedBy = opts.creator ?? "MBG Soe Supply Chain";
  for (const sheet of opts.sheets) {
    buildSheet(wb, sheet);
  }
  return wb;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/** Browser: trigger download. Assumes DOM is available. */
export async function downloadStyledXlsx(
  opts: StyledWorkbookOptions
): Promise<void> {
  const wb = buildWorkbook(opts);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `${opts.fileName}-${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Server (Next.js route handler): returns a Buffer to put in NextResponse. */
export async function buildStyledXlsxBuffer(
  opts: StyledWorkbookOptions
): Promise<Buffer> {
  const wb = buildWorkbook(opts);
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}
