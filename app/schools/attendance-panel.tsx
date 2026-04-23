"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Section, Button, TableWrap, THead } from "@/components/ui";
import { t, ti, formatNumber, DAYS, MONTHS } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type SchoolLite = {
  id: string;
  name: string;
  level: string;
  students: number;
  kelas13: number;
  kelas46: number;
  guru: number;
};

type AttendanceRow = {
  school_id: string;
  att_date: string;
  qty: number;
};

type NonOpDay = {
  op_date: string;
  reason: string | null;
};

interface Props {
  schools: SchoolLite[];
  attendance: AttendanceRow[];
  nonOpDays: NonOpDay[];
  canEdit: boolean;
}

// Display row — one input per row. SD splits into "kecil"/"besar"; others single.
// Every school also gets a "guru" row so teacher attendance can be tracked separately.
type DisplayRow = {
  rowKey: string; // unique grid key, e.g. "SCH-04#K", "SCH-04#B", "SCH-01#G"
  school_id: string; // backend key (always the actual school id)
  group: "siswa" | "kecil" | "besar" | "guru";
  name: string;
  level: string;
  cap: number; // capacity for THIS row only
};

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextSevenDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arr: Date[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    arr.push(d);
  }
  return arr;
}

// Build display rows: SD → 2 siswa rows (kecil + besar) + 1 guru row;
// non-SD → 1 siswa row + 1 guru row.
function buildDisplayRows(schools: SchoolLite[]): DisplayRow[] {
  const rows: DisplayRow[] = [];
  for (const s of schools) {
    if (s.level === "SD") {
      const kecilCap = s.kelas13;
      const besarCap = s.kelas46 > 0 ? s.kelas46 : Math.max(0, s.students - s.kelas13);
      rows.push({
        rowKey: `${s.id}#K`,
        school_id: s.id,
        group: "kecil",
        name: s.name,
        level: s.level,
        cap: kecilCap
      });
      rows.push({
        rowKey: `${s.id}#B`,
        school_id: s.id,
        group: "besar",
        name: s.name,
        level: s.level,
        cap: besarCap
      });
    } else {
      rows.push({
        rowKey: `${s.id}#S`,
        school_id: s.id,
        group: "siswa",
        name: s.name,
        level: s.level,
        cap: s.students
      });
    }
    rows.push({
      rowKey: `${s.id}#G`,
      school_id: s.id,
      group: "guru",
      name: s.name,
      level: s.level,
      cap: s.guru
    });
  }
  return rows;
}

const GROUP_BADGE: Record<DisplayRow["group"], string> = {
  siswa: "bg-slate-100 text-slate-900 ring-1 ring-slate-200",
  kecil: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
  besar: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200",
  guru: "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200"
};

const LEVEL_BADGE: Record<string, string> = {
  "PAUD/TK": "bg-pink-50 text-pink-900 ring-pink-200",
  SD: "bg-amber-50 text-amber-900 ring-amber-200",
  SMP: "bg-sky-50 text-sky-900 ring-sky-200",
  SMA: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  SMK: "bg-indigo-50 text-indigo-900 ring-indigo-200"
};

type SortKey = "sekolah" | "jenjang" | "porsi" | "kapasitas";
type SortDir = "asc" | "desc";

const GROUP_ORDER: Record<DisplayRow["group"], number> = {
  kecil: 0,
  besar: 1,
  siswa: 2,
  guru: 3
};

const LEVEL_ORDER: Record<string, number> = {
  "PAUD/TK": 0,
  SD: 1,
  SMP: 2,
  SMA: 3,
  SMK: 4
};

function SortHeader({
  label,
  colKey,
  align = "left",
  activeKey,
  activeDir,
  onToggle
}: {
  label: React.ReactNode;
  colKey: SortKey;
  align?: "left" | "center";
  activeKey: SortKey | null;
  activeDir: SortDir;
  onToggle: (k: SortKey) => void;
}) {
  const active = activeKey === colKey;
  const ariaSort: "ascending" | "descending" | "none" = active
    ? activeDir === "asc"
      ? "ascending"
      : "descending"
    : "none";
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      onClick={() => onToggle(colKey)}
      className={`py-2 pr-3 cursor-pointer select-none transition hover:brightness-110 ${
        align === "center" ? "text-center" : ""
      }`}
    >
      <span
        className={`inline-flex items-center gap-1.5 ${
          align === "center" ? "justify-center" : "justify-start"
        }`}
      >
        <span>{label}</span>
        <span
          aria-hidden
          className="inline-flex flex-col leading-none text-[8px]"
        >
          <span
            className={`-mb-[1px] ${
              active && activeDir === "asc" ? "opacity-100" : "opacity-30"
            }`}
          >
            ▲
          </span>
          <span
            className={
              active && activeDir === "desc" ? "opacity-100" : "opacity-30"
            }
          >
            ▼
          </span>
        </span>
      </span>
    </th>
  );
}

export function SchoolAttendancePanel({
  schools,
  attendance,
  nonOpDays,
  canEdit
}: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const days = useMemo(nextSevenDays, []);
  const dayKeys = days.map(toISO);
  const DAY_NAME = DAYS.short[lang];
  const MONTH = MONTHS.short[lang];
  const GROUP_LABEL: Record<DisplayRow["group"], string> = {
    siswa: lang === "EN" ? "Students" : "Siswa",
    kecil: t("schools.attGroupKecil", lang),
    besar: t("schools.attGroupBesar", lang),
    guru: t("schools.colTeachers", lang)
  };

  // Non-operational day lookup (weekend OR in non_op_days table).
  // Locked cells render as "—" and can't be edited; save sends qty=0.
  const nonOpReason = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of nonOpDays) {
      m.set(r.op_date, r.reason ?? t("calendar.nonOp", lang));
    }
    return m;
  }, [nonOpDays, lang]);

  const dayInfo = useMemo(
    () =>
      days.map((d) => {
        const iso = toISO(d);
        const weekend = d.getDay() === 0 || d.getDay() === 6;
        const listedReason = nonOpReason.get(iso);
        const nonOp = weekend || listedReason != null;
        const reason =
          listedReason ??
          (weekend ? t("statusWeekend", lang) : null);
        return { iso, weekend, nonOp, reason };
      }),
    [days, nonOpReason, lang]
  );

  const displayRows = useMemo(() => buildDisplayRows(schools), [schools]);

  // Map school_id → list of display rowKeys (1 or 2)
  const rowsBySchool = useMemo(() => {
    const m = new Map<string, DisplayRow[]>();
    for (const r of displayRows) {
      const arr = m.get(r.school_id) ?? [];
      arr.push(r);
      m.set(r.school_id, arr);
    }
    return m;
  }, [displayRows]);

  const nonOpByIso = useMemo(() => {
    const s = new Set<string>();
    dayInfo.forEach((d) => {
      if (d.nonOp) s.add(d.iso);
    });
    return s;
  }, [dayInfo]);

  // Initial grid keyed by display rowKey. Persisted attendance is per school_id;
  // when SD school has saved total Q, split it proportionally between kecil/besar
  // by capacity ratio (so reload preserves the saved figure).
  const initialMap = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const r of displayRows) m[r.rowKey] = {};

    const attBySchoolDate = new Map<string, number>();
    for (const a of attendance) {
      attBySchoolDate.set(`${a.school_id}::${a.att_date}`, Number(a.qty));
    }

    for (const r of displayRows) {
      for (const k of dayKeys) {
        m[r.rowKey][k] = nonOpByIso.has(k) ? 0 : r.cap;
      }
    }

    for (const [sid, rows] of rowsBySchool.entries()) {
      const totalCap = rows.reduce((acc, r) => acc + r.cap, 0);
      for (const k of dayKeys) {
        const saved = attBySchoolDate.get(`${sid}::${k}`);
        if (saved == null) continue;
        if (rows.length === 1) {
          m[rows[0].rowKey][k] = saved;
        } else {
          // Split proportionally by capacity; remainder goes to first row.
          if (totalCap === 0) {
            for (const r of rows) m[r.rowKey][k] = 0;
          } else {
            let allocated = 0;
            for (let i = 0; i < rows.length - 1; i++) {
              const share = Math.round((rows[i].cap / totalCap) * saved);
              m[rows[i].rowKey][k] = Math.min(share, rows[i].cap);
              allocated += m[rows[i].rowKey][k];
            }
            const last = rows[rows.length - 1];
            m[last.rowKey][k] = Math.max(0, Math.min(last.cap, saved - allocated));
          }
        }
      }
    }
    return m;
  }, [attendance, displayRows, rowsBySchool, dayKeys]);

  const [grid, setGrid] = useState<Record<string, Record<string, number>>>(
    initialMap
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedDisplayRows = useMemo(() => {
    if (!sortKey) return displayRows;
    const sign = sortDir === "asc" ? 1 : -1;
    const copy = displayRows.slice();
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "sekolah":
          cmp = a.name.localeCompare(b.name, "id", { sensitivity: "base" });
          if (cmp === 0) {
            cmp = (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99);
          }
          break;
        case "jenjang":
          cmp =
            (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99);
          if (cmp === 0) {
            cmp = a.name.localeCompare(b.name, "id", { sensitivity: "base" });
          }
          if (cmp === 0) {
            cmp = (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99);
          }
          break;
        case "porsi":
          cmp = (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99);
          if (cmp === 0) {
            cmp = a.name.localeCompare(b.name, "id", { sensitivity: "base" });
          }
          break;
        case "kapasitas":
          cmp = a.cap - b.cap;
          break;
      }
      return sign * cmp;
    });
    return copy;
  }, [displayRows, sortKey, sortDir]);

  function setCell(rowKey: string, iso: string, raw: string, cap: number) {
    const n = Math.max(0, Math.min(cap, Math.round(Number(raw) || 0)));
    setGrid((prev) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [iso]: n }
    }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    // Aggregate display rows back to one entry per (school_id, date).
    const entries: { school_id: string; att_date: string; qty: number }[] = [];
    for (const [sid, rows] of rowsBySchool.entries()) {
      for (const k of dayKeys) {
        let qty = 0;
        for (const r of rows) qty += grid[r.rowKey]?.[k] ?? 0;
        entries.push({ school_id: sid, att_date: k, qty });
      }
    }
    try {
      const res = await fetch("/api/schools/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "save failed");
      setMsg(ti("schools.attSavedMsg", lang, { n: json.saved }));
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  // Per-day totals (aggregate display rows so we don't double-count SD).
  const colTotals = dayKeys.map((k) =>
    displayRows.reduce((acc, r) => acc + (grid[r.rowKey]?.[k] ?? 0), 0)
  );
  const capTotal = displayRows.reduce((acc, r) => acc + r.cap, 0);

  return (
    <Section
      title={t("schools.attTitle", lang)}
      hint={t("schools.attHint", lang)}
    >
      <TableWrap>
        <table className="w-full text-sm">
          <THead>
            <SortHeader
              label={t("schools.attColSekolah", lang)}
              colKey="sekolah"
              activeKey={sortKey}
              activeDir={sortDir}
              onToggle={toggleSort}
            />
            <SortHeader
              label={t("schools.colLevel", lang)}
              colKey="jenjang"
              activeKey={sortKey}
              activeDir={sortDir}
              onToggle={toggleSort}
            />
            <SortHeader
              label={t("schools.attColPorsi", lang)}
              colKey="porsi"
              activeKey={sortKey}
              activeDir={sortDir}
              onToggle={toggleSort}
            />
            <SortHeader
              label={t("schools.attColKapasitas", lang)}
              colKey="kapasitas"
              align="center"
              activeKey={sortKey}
              activeDir={sortDir}
              onToggle={toggleSort}
            />
            {days.map((d, di) => {
              const info = dayInfo[di];
              return (
                <th
                  key={toISO(d)}
                  className={`py-2 pr-3 text-center ${
                    info.nonOp ? "bg-amber-500/20 ring-1 ring-inset ring-amber-300/40" : ""
                  }`}
                  title={info.reason ?? undefined}
                >
                  <div className={info.nonOp ? "text-amber-100" : undefined}>
                    {DAY_NAME[d.getDay()]}
                  </div>
                  <div
                    className={`font-mono text-[10px] ${
                      info.nonOp ? "text-amber-100" : "text-white/70"
                    }`}
                  >
                    {d.getDate()} {MONTH[d.getMonth()]}
                  </div>
                  {info.nonOp && (
                    <div className="mt-1 inline-block rounded-sm bg-amber-400 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-amber-950">
                      {t("calendar.holiday", lang)}
                    </div>
                  )}
                </th>
              );
            })}
          </THead>
          <tbody>
            {sortedDisplayRows.map((r, idx) => {
              const prev = idx > 0 ? sortedDisplayRows[idx - 1] : null;
              const isFirstOfSchool = !prev || prev.school_id !== r.school_id;
              const isLastOfSchool =
                idx === sortedDisplayRows.length - 1 ||
                sortedDisplayRows[idx + 1].school_id !== r.school_id;

              let schoolRowSpan = 1;
              if (isFirstOfSchool) {
                for (let j = idx + 1; j < sortedDisplayRows.length; j++) {
                  if (sortedDisplayRows[j].school_id === r.school_id) schoolRowSpan++;
                  else break;
                }
              }

              return (
                <tr
                  key={r.rowKey}
                  className={`row-hover ${
                    isLastOfSchool
                      ? "border-b border-ink/10"
                      : "border-b border-ink/5"
                  }`}
                >
                  {isFirstOfSchool && (
                    <td
                      rowSpan={schoolRowSpan}
                      className="py-2 pr-3 align-middle"
                    >
                      <div className="text-xs font-semibold text-ink">
                        {r.name}
                      </div>
                    </td>
                  )}
                  {isFirstOfSchool && (
                    <td
                      rowSpan={schoolRowSpan}
                      className="py-2 pr-3 align-middle"
                    >
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${LEVEL_BADGE[r.level] ?? LEVEL_BADGE.SD}`}
                      >
                        {r.level}
                      </span>
                    </td>
                  )}
                  <td className="py-2 pr-3 align-middle">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${GROUP_BADGE[r.group]}`}
                    >
                      {GROUP_LABEL[r.group]}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-center align-middle font-mono text-xs">
                    {formatNumber(r.cap, lang)}
                  </td>
                  {dayKeys.map((k, di) => {
                    const info = dayInfo[di];
                    const v = grid[r.rowKey]?.[k] ?? r.cap;
                    if (info.nonOp) {
                      return (
                        <td
                          key={k}
                          className="py-1.5 pr-1 text-center align-middle bg-amber-50/60"
                          title={info.reason ?? undefined}
                        >
                          <span className="inline-flex h-7 w-16 items-center justify-center rounded-lg border border-dashed border-amber-300 bg-white/60 font-mono text-xs text-amber-700/70">
                            —
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={k}
                        className="py-1.5 pr-1 text-center align-middle"
                      >
                        <input
                          type="number"
                          min={0}
                          max={r.cap}
                          value={v}
                          disabled={!canEdit || r.cap === 0}
                          onChange={(e) =>
                            setCell(r.rowKey, k, e.target.value, r.cap)
                          }
                          className="w-16 rounded-lg border border-ink/10 bg-white px-1.5 py-1 text-center font-mono text-xs tabular-nums focus:border-accent-strong focus:outline-none focus:ring-1 focus:ring-accent-strong disabled:bg-ink/5 disabled:text-ink2/40"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink bg-ink">
              <td
                className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
                colSpan={3}
              >
                {t("common.grandTotal", lang)}
              </td>
              <td className="py-2 pr-3 text-center font-mono text-xs font-black text-white">
                {formatNumber(capTotal, lang)}
              </td>
              {colTotals.map((v, i) => {
                const info = dayInfo[i];
                if (info.nonOp) {
                  return (
                    <td
                      key={dayKeys[i]}
                      className="py-2 pr-3 text-center font-mono text-xs font-black text-amber-300"
                      title={info.reason ?? undefined}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wide">
                        {t("calendar.holiday", lang)}
                      </div>
                    </td>
                  );
                }
                return (
                  <td
                    key={dayKeys[i]}
                    className="py-2 pr-3 text-center font-mono text-xs font-black text-white"
                  >
                    {formatNumber(v, lang)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </TableWrap>
      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {msg && (
            <span className="text-[11px] font-bold text-accent-strong">
              {msg}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={save}
            disabled={saving}
          >
            {saving ? t("schools.attSaving", lang) : t("schools.attSave", lang)}
          </Button>
        </div>
      )}
    </Section>
  );
}
