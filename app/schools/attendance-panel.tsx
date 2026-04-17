"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Section, Button, TableWrap, THead } from "@/components/ui";

type SchoolLite = {
  id: string;
  name: string;
  level: string;
  students: number;
  kelas13: number;
  kelas46: number;
};

type AttendanceRow = {
  school_id: string;
  att_date: string;
  qty: number;
};

interface Props {
  schools: SchoolLite[];
  attendance: AttendanceRow[];
  canEdit: boolean;
}

// Display row — one input per row. SD splits into "kecil"/"besar"; others single.
type DisplayRow = {
  rowKey: string; // unique grid key, e.g. "SCH-04#K", "SCH-04#B", "SCH-01"
  school_id: string; // backend key (always the actual school id)
  group: "all" | "kecil" | "besar";
  name: string;
  level: string;
  cap: number; // capacity for THIS row only
};

const DAY_NAME = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des"
];

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

// Build display rows: SD → 2 rows (kecil + besar), others → single row.
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
        rowKey: s.id,
        school_id: s.id,
        group: "all",
        name: s.name,
        level: s.level,
        cap: s.students
      });
    }
  }
  return rows;
}

const GROUP_LABEL: Record<DisplayRow["group"], string> = {
  all: "",
  kecil: "Porsi Kecil · kelas 1–3",
  besar: "Porsi Besar · kelas 4–6"
};

const GROUP_BADGE: Record<DisplayRow["group"], string> = {
  all: "",
  kecil: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
  besar: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
};

export function SchoolAttendancePanel({
  schools,
  attendance,
  canEdit
}: Props) {
  const router = useRouter();
  const days = useMemo(nextSevenDays, []);
  const dayKeys = days.map(toISO);

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
        m[r.rowKey][k] = r.cap;
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

  function setCell(rowKey: string, iso: string, raw: string, cap: number) {
    const n = Math.max(0, Math.min(cap, Math.round(Number(raw) || 0)));
    setGrid((prev) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [iso]: n }
    }));
  }

  function fillPct(pct: number) {
    setGrid(() => {
      const next: Record<string, Record<string, number>> = {};
      for (const r of displayRows) {
        next[r.rowKey] = {};
        const v = Math.round(r.cap * pct);
        for (const k of dayKeys) next[r.rowKey][k] = v;
      }
      return next;
    });
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
      setMsg(`Tersimpan · ${json.saved} baris`);
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
      title="Perkiraan Kehadiran Siswa · 7 Hari Ke Depan"
      hint="Isi angka kehadiran per sekolah per tanggal. SD dipecah jadi Porsi Kecil (kelas 1–3) dan Porsi Besar (kelas 4–6) karena bobot porsi BOM-nya berbeda. Default = kapasitas penuh."
      actions={
        canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fillPct(1.0)}
              disabled={saving}
            >
              Isi Penuh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fillPct(0.9)}
              disabled={saving}
            >
              Estimasi 90%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fillPct(0.85)}
              disabled={saving}
            >
              Estimasi 85%
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Menyimpan…" : "Simpan Perkiraan"}
            </Button>
            {msg && (
              <span className="text-[11px] font-bold text-accent-strong">
                {msg}
              </span>
            )}
          </div>
        ) : null
      }
    >
      <TableWrap>
        <table className="w-full text-sm">
          <THead>
            <th className="py-2 pr-3">Sekolah</th>
            <th className="py-2 pr-3">Porsi</th>
            <th className="py-2 pr-3 text-right">Kapasitas</th>
            {days.map((d) => {
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <th
                  key={toISO(d)}
                  className={`py-2 pr-3 text-center ${
                    isWeekend ? "bg-amber-50 text-amber-900" : ""
                  }`}
                >
                  <div>{DAY_NAME[d.getDay()]}</div>
                  <div className="font-mono text-[10px] text-ink2/70">
                    {d.getDate()} {MONTH[d.getMonth()]}
                  </div>
                </th>
              );
            })}
          </THead>
          <tbody>
            {displayRows.map((r, idx) => {
              const prev = idx > 0 ? displayRows[idx - 1] : null;
              const isFirstOfSchool = !prev || prev.school_id !== r.school_id;
              const isLastOfSchool =
                idx === displayRows.length - 1 ||
                displayRows[idx + 1].school_id !== r.school_id;

              let schoolRowSpan = 1;
              if (isFirstOfSchool) {
                for (let j = idx + 1; j < displayRows.length; j++) {
                  if (displayRows[j].school_id === r.school_id) schoolRowSpan++;
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
                      <div className="font-mono text-[10px] text-ink2/60">
                        {r.school_id} · {r.level}
                      </div>
                    </td>
                  )}
                  <td className="py-2 pr-3 align-middle">
                    {r.group !== "all" ? (
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${GROUP_BADGE[r.group]}`}
                      >
                        {GROUP_LABEL[r.group]}
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink2/30">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right align-middle font-mono text-xs">
                    {r.cap.toLocaleString("id-ID")}
                  </td>
                  {dayKeys.map((k, di) => {
                    const d = days[di];
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const v = grid[r.rowKey]?.[k] ?? r.cap;
                    return (
                      <td
                        key={k}
                        className={`py-1.5 pr-1 text-center align-middle ${
                          isWeekend ? "bg-amber-50/60" : ""
                        }`}
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
            <tr className="border-t-2 border-ink/20 bg-paper">
              <td className="py-2 pr-3 font-black text-ink" colSpan={2}>
                TOTAL
              </td>
              <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                {capTotal.toLocaleString("id-ID")}
              </td>
              {colTotals.map((t, i) => {
                const d = days[i];
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const pct = capTotal > 0 ? Math.round((t / capTotal) * 100) : 0;
                return (
                  <td
                    key={dayKeys[i]}
                    className={`py-2 pr-3 text-center font-mono text-xs font-black ${
                      isWeekend ? "bg-amber-50 text-amber-900" : "text-ink"
                    }`}
                  >
                    <div>{t.toLocaleString("id-ID")}</div>
                    <div className="text-[9px] font-semibold text-ink2/60">
                      {pct}%
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </TableWrap>
      <p className="mt-3 text-[11px] text-ink2/70">
        SD ditampilkan 2 baris karena bobot porsi BOM beda — Kecil ×0.7 (kelas
        1–3) & Besar ×1.0 (kelas 4–6). Saat disimpan, kedua angka dijumlahkan
        kembali jadi 1 entri per sekolah per tanggal. Akhir pekan ditandai
        kuning. Nilai <b className="text-ink">&lt; kapasitas</b> akan
        memproporsionalkan kebutuhan bahan untuk tanggal tsb.
      </p>
    </Section>
  );
}
