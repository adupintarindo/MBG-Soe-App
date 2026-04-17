// ============================================================================
// Parser Kalender Pendidikan
// ============================================================================
// Menerima teks bebas copy-paste dari kalender pendidikan Dinas (format SK/SKB
// Kemendikbudristek, atau SK Kepala Dinas). Mengekstrak entri non-operasional:
// libur semester, PTS, PAS, MPLS, cuti bersama, hari khusus, dll.
//
// Didukung format tanggal:
//   - ISO tunggal:        2026-01-01
//   - ISO rentang:        2026-01-01 s.d. 2026-01-07
//   - DD MMM YYYY:        1 Jan 2026
//   - DD-DD MMM YYYY:     1-7 Januari 2026
//   - DD MMM-DD MMM YYYY: 28 Des 2025 - 7 Jan 2026
//   - DD/MM/YYYY:         01/01/2026
// Pemisah antara tanggal dan keterangan: ":" "-" "—" "–" tab atau spasi ganda.

const MONTH_ID: Record<string, number> = {
  jan: 1,
  januari: 1,
  feb: 2,
  februari: 2,
  mar: 3,
  maret: 3,
  apr: 4,
  april: 4,
  mei: 5,
  jun: 6,
  juni: 6,
  jul: 7,
  juli: 7,
  agu: 8,
  ags: 8,
  agustus: 8,
  aug: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oct: 10,
  oktober: 10,
  nov: 11,
  november: 11,
  des: 12,
  dec: 12,
  desember: 12,
  // English supplementary
  may: 5
};

const RANGE_SEP = "(?:-|–|—|s\\.?d\\.?|sd|sampai|to|hingga|/)";

export interface ParsedCalendarEntry {
  op_date: string; // YYYY-MM-DD
  reason: string;
  sourceLine: number; // 1-based input line index
}

export interface ParseResult {
  entries: ParsedCalendarEntry[];
  warnings: { line: number; text: string; msg: string }[];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function monthNum(token: string): number | null {
  const k = token.toLowerCase().replace(/\./g, "");
  return MONTH_ID[k] ?? null;
}

function daysBetweenISO(a: string, b: string): string[] {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const start = new Date(Date.UTC(ay, am - 1, ad));
  const end = new Date(Date.UTC(by, bm - 1, bd));
  if (end < start) return [];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(
      toISO(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate())
    );
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function stripSeparator(rest: string): string {
  return rest.replace(/^[\s:·\-–—\t]+/, "").trim();
}

// Try to parse a single line into one or more ISO dates + reason.
// Returns null if no date recognised.
function parseLine(raw: string):
  | { dates: string[]; reason: string }
  | null {
  const line = raw.trim();
  if (!line) return null;

  // Skip section headers that start with a colon, e.g. "SEMESTER I :"
  // or lines with no digits at all.
  if (!/\d/.test(line)) return null;

  // 1) ISO range: 2026-01-01 s.d. 2026-01-07 : Libur
  {
    const re = new RegExp(
      `^(\\d{4}-\\d{1,2}-\\d{1,2})\\s*${RANGE_SEP}\\s*(\\d{4}-\\d{1,2}-\\d{1,2})(.*)$`,
      "i"
    );
    const m = line.match(re);
    if (m) {
      const [_, a, b, rest] = m;
      const [ay, am, ad] = a.split("-").map(Number);
      const [by, bm, bd] = b.split("-").map(Number);
      const dates = daysBetweenISO(
        toISO(ay, am, ad),
        toISO(by, bm, bd)
      );
      return { dates, reason: stripSeparator(rest) };
    }
  }

  // 2) ISO tunggal: 2026-01-01 : ...
  {
    const re = /^(\d{4}-\d{1,2}-\d{1,2})(.*)$/;
    const m = line.match(re);
    if (m) {
      const [_, a, rest] = m;
      const [y, mo, d] = a.split("-").map(Number);
      return { dates: [toISO(y, mo, d)], reason: stripSeparator(rest) };
    }
  }

  // 3) DD MMM - DD MMM YYYY (rentang lintas bulan, tahun di akhir)
  {
    const re = new RegExp(
      `^(\\d{1,2})\\s+([A-Za-z\\.]+)\\s*${RANGE_SEP}\\s*(\\d{1,2})\\s+([A-Za-z\\.]+)\\s+(\\d{4})(.*)$`,
      "i"
    );
    const m = line.match(re);
    if (m) {
      const [_, d1, mo1, d2, mo2, y, rest] = m;
      const n1 = monthNum(mo1);
      const n2 = monthNum(mo2);
      const year = Number(y);
      if (n1 && n2) {
        const startYear =
          n1 > n2 ? year - 1 : year; // 28 Des - 7 Jan 2026 → 28 Des 2025
        const dates = daysBetweenISO(
          toISO(startYear, n1, Number(d1)),
          toISO(year, n2, Number(d2))
        );
        return { dates, reason: stripSeparator(rest) };
      }
    }
  }

  // 4) DD MMM YYYY - DD MMM YYYY (rentang lintas tahun eksplisit)
  {
    const re = new RegExp(
      `^(\\d{1,2})\\s+([A-Za-z\\.]+)\\s+(\\d{4})\\s*${RANGE_SEP}\\s*(\\d{1,2})\\s+([A-Za-z\\.]+)\\s+(\\d{4})(.*)$`,
      "i"
    );
    const m = line.match(re);
    if (m) {
      const [_, d1, mo1, y1, d2, mo2, y2, rest] = m;
      const n1 = monthNum(mo1);
      const n2 = monthNum(mo2);
      if (n1 && n2) {
        const dates = daysBetweenISO(
          toISO(Number(y1), n1, Number(d1)),
          toISO(Number(y2), n2, Number(d2))
        );
        return { dates, reason: stripSeparator(rest) };
      }
    }
  }

  // 5) DD-DD MMM YYYY (rentang dalam satu bulan)
  {
    const re = new RegExp(
      `^(\\d{1,2})\\s*${RANGE_SEP}\\s*(\\d{1,2})\\s+([A-Za-z\\.]+)\\s+(\\d{4})(.*)$`,
      "i"
    );
    const m = line.match(re);
    if (m) {
      const [_, d1, d2, mo, y, rest] = m;
      const n = monthNum(mo);
      const year = Number(y);
      if (n) {
        const dates = daysBetweenISO(
          toISO(year, n, Number(d1)),
          toISO(year, n, Number(d2))
        );
        return { dates, reason: stripSeparator(rest) };
      }
    }
  }

  // 6) DD MMM YYYY tunggal
  {
    const re = /^(\d{1,2})\s+([A-Za-z\.]+)\s+(\d{4})(.*)$/;
    const m = line.match(re);
    if (m) {
      const [_, d, mo, y, rest] = m;
      const n = monthNum(mo);
      if (n) {
        return {
          dates: [toISO(Number(y), n, Number(d))],
          reason: stripSeparator(rest)
        };
      }
    }
  }

  // 7) DD/MM/YYYY range
  {
    const re = new RegExp(
      `^(\\d{1,2})/(\\d{1,2})/(\\d{4})\\s*${RANGE_SEP}\\s*(\\d{1,2})/(\\d{1,2})/(\\d{4})(.*)$`
    );
    const m = line.match(re);
    if (m) {
      const [_, d1, m1, y1, d2, m2, y2, rest] = m;
      const dates = daysBetweenISO(
        toISO(Number(y1), Number(m1), Number(d1)),
        toISO(Number(y2), Number(m2), Number(d2))
      );
      return { dates, reason: stripSeparator(rest) };
    }
  }

  // 8) DD/MM/YYYY tunggal
  {
    const re = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/;
    const m = line.match(re);
    if (m) {
      const [_, d, mo, y, rest] = m;
      return {
        dates: [toISO(Number(y), Number(mo), Number(d))],
        reason: stripSeparator(rest)
      };
    }
  }

  return null;
}

export function parseSchoolCalendar(input: string): ParseResult {
  const lines = input.split(/\r?\n/);
  const entries: ParsedCalendarEntry[] = [];
  const warnings: ParseResult["warnings"] = [];
  const seen = new Set<string>();

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;
    // skip pure bullet markers, dividers
    if (/^[=\-_*•·]+$/.test(trimmed)) return;

    const parsed = parseLine(trimmed);
    if (!parsed) {
      // Only warn when the line clearly contains a date-ish token.
      if (/\d{1,4}/.test(trimmed)) {
        warnings.push({
          line: lineNo,
          text: trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed,
          msg: "Format tanggal tidak dikenali."
        });
      }
      return;
    }

    const reason =
      parsed.reason && parsed.reason.length > 0
        ? parsed.reason.slice(0, 200)
        : "Non-operasional";

    for (const d of parsed.dates) {
      const key = `${d}|${reason}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ op_date: d, reason, sourceLine: lineNo });
    }
  });

  // Sort by date asc for stable preview
  entries.sort((a, b) => a.op_date.localeCompare(b.op_date));

  return { entries, warnings };
}
