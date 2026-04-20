// ============================================================================
// CSV parser/serializer tipis (zero-dep, quote-aware)
// ----------------------------------------------------------------------------
// Pakai untuk bulk import item/supplier/school/menu dari CSV/Excel.
// Untuk XLSX, convert dulu lewat `xlsx` yang sudah ada di dependencies.
// ============================================================================

export interface CsvParseOptions {
  /** default: auto-detect "," or ";" from first line */
  delimiter?: string;
  /** trim whitespace di tiap field */
  trim?: boolean;
}

export interface CsvParseResult<T> {
  headers: string[];
  rows: T[];
  errors: Array<{ line: number; message: string }>;
}

/**
 * Parse CSV string → array of objects keyed by header row.
 */
export function parseCsv<T extends Record<string, string>>(
  text: string,
  opts: CsvParseOptions = {}
): CsvParseResult<T> {
  const delim =
    opts.delimiter ??
    (() => {
      const first = text.split(/\r?\n/, 1)[0] || "";
      const c = first.match(/,/g)?.length ?? 0;
      const s = first.match(/;/g)?.length ?? 0;
      return s > c ? ";" : ",";
    })();

  const errors: Array<{ line: number; message: string }> = [];
  const lines = splitLines(text);
  if (lines.length === 0)
    return { headers: [], rows: [] as T[], errors: [{ line: 0, message: "empty" }] };

  const headers = parseLine(lines[0], delim).map((h) =>
    opts.trim !== false ? h.trim() : h
  );
  const rows: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const values = parseLine(raw, delim);
    if (values.length !== headers.length) {
      errors.push({
        line: i + 1,
        message: `expected ${headers.length} cols, got ${values.length}`
      });
      continue;
    }
    const obj = {} as Record<string, string>;
    headers.forEach((h, idx) => {
      obj[h] = opts.trim !== false ? values[idx].trim() : values[idx];
    });
    rows.push(obj as T);
  }

  return { headers, rows, errors };
}

/** Serialize array of objects → CSV string. */
export function toCsv(
  rows: Array<Record<string, unknown>>,
  opts: { delimiter?: string; columns?: string[] } = {}
): string {
  const delim = opts.delimiter ?? ",";
  const cols = opts.columns ?? Array.from(collectKeys(rows));
  const head = cols.map(escape).join(delim);
  const body = rows
    .map((r) =>
      cols.map((c) => escape(r[c] === undefined || r[c] === null ? "" : String(r[c]))).join(delim)
    )
    .join("\n");
  return head + "\n" + body;

  function escape(v: string): string {
    if (v.includes(delim) || v.includes("\n") || v.includes('"')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  }
}

// ---------- internals ------------------------------------------------------
function splitLines(text: string): string[] {
  // Split on newlines but respect quoted values (simple state machine)
  const lines: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuote = !inQuote;
      cur += c;
    } else if (c === "\n" && !inQuote) {
      lines.push(cur);
      cur = "";
    } else if (c === "\r" && !inQuote) {
      // skip
    } else {
      cur += c;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function parseLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === delim && !inQuote) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function collectKeys(rows: Array<Record<string, unknown>>): Set<string> {
  const s = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) s.add(k);
  return s;
}
