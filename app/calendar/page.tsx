import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { toISODate } from "@/lib/engine";
import { getHoliday, holidaysInRange } from "@/lib/holidays";
import { CalendarGrid } from "./calendar-grid";
import { PopulateControls } from "./populate-controls";
import { LinkButton, PageContainer } from "@/components/ui";
import { t, ti, MONTHS, DOW_HEAD } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const WRITE_ROLES = new Set(["admin", "operator", "ahli_gizi"]);

interface MenuLite {
  id: number;
  name: string;
  name_en: string | null;
  cycle_day: number;
}
interface AssignRow {
  assign_date: string;
  menu_id: number;
  note: string | null;
}
interface NonOpRow {
  op_date: string;
  reason: string;
}
interface SchoolTotalRow {
  students: number | null;
  guru: number | null;
}

function parseMonthParam(s: string | undefined): { year: number; month: number } {
  if (s) {
    const m = /^(\d{4})-(\d{1,2})$/.exec(s);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      if (mo >= 1 && mo <= 12) return { year: y, month: mo };
    }
  }
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth() + 1 };
}

// Build full-month grid (Mon..Sun rows). Pads leading/trailing days from neighbouring months.
function buildMonthMatrix(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);

  const start = new Date(first);
  const dow0 = first.getDay(); // 0..6 (Sun..Sat)
  const offsetStart = dow0 === 0 ? -6 : 1 - dow0;
  start.setDate(first.getDate() + offsetStart);
  start.setHours(0, 0, 0, 0);

  const end = new Date(last);
  const dowL = last.getDay();
  const offsetEnd = dowL === 0 ? 0 : 7 - dowL;
  end.setDate(last.getDate() + offsetEnd);

  const rows: Date[][] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    rows.push(week);
  }
  return rows;
}

function fmtMonthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

interface NoteEntry {
  dateLabel: string;
  reason: string;
}

// Group consecutive dates with the same label into ranges like "1–3 Jul".
// Input: [{date: "2026-07-01", name: "X"}, {date: "2026-07-02", name: "X"}, ...]
function groupConsecutive(
  rows: { date: string; name: string }[],
  lang: "ID" | "EN"
): NoteEntry[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const result: NoteEntry[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (
      j + 1 < sorted.length &&
      sorted[j + 1].name === sorted[i].name &&
      isNextDay(sorted[j].date, sorted[j + 1].date)
    ) {
      j++;
    }
    result.push({
      dateLabel: formatRange(sorted[i].date, sorted[j].date, lang),
      reason: sorted[i].name
    });
    i = j + 1;
  }
  return result;
}

function isNextDay(a: string, b: string): boolean {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad);
  const db = new Date(by, bm - 1, bd);
  return Math.round((db.getTime() - da.getTime()) / 86400000) === 1;
}

function formatRange(startIso: string, endIso: string, lang: "ID" | "EN"): string {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const sMonth = MONTHS.short[lang][sm - 1];
  const eMonth = MONTHS.short[lang][em - 1];
  if (startIso === endIso) {
    return lang === "EN" ? `${sMonth} ${sd}, ${sy}` : `${sd} ${sMonth} ${sy}`;
  }
  if (sm === em && sy === ey) {
    return lang === "EN"
      ? `${sMonth} ${sd}–${ed}, ${sy}`
      : `${sd}–${ed} ${sMonth} ${sy}`;
  }
  return lang === "EN"
    ? `${sMonth} ${sd} – ${eMonth} ${ed}, ${ey}`
    : `${sd} ${sMonth} – ${ed} ${eMonth} ${ey}`;
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: Promise<{ month?: string }> | { month?: string };
}) {
  const supabase = createClient();
  const lang = getLang();

  const sp = (await Promise.resolve(searchParams)) ?? {};
  const { year, month } = parseMonthParam(sp.month);
  const matrix = buildMonthMatrix(year, month);
  const start = toISODate(matrix[0][0]);
  const end = toISODate(matrix[matrix.length - 1][6]);

  const today = new Date();
  const todayIso = toISODate(today);
  const currentMonthKey = fmtMonthKey(today.getFullYear(), today.getMonth() + 1);

  // Kick off auth + 4 thin queries in parallel. Items, full school rows,
  // and attendance are lazy-loaded by the client modal on demand.
  const [profile, menusRes, assignRes, nonOpRes, schoolsTotalRes] = await Promise.all([
    getSessionProfile(),
    supabase
      .from("menus")
      .select("id, name, name_en, cycle_day")
      .order("id"),
    supabase
      .from("menu_assign")
      .select("assign_date, menu_id, note")
      .gte("assign_date", start)
      .lte("assign_date", end),
    supabase
      .from("non_op_days")
      .select("op_date, reason")
      .gte("op_date", start)
      .lte("op_date", end),
    supabase
      .from("schools")
      .select("students, guru")
      .eq("active", true)
  ]);

  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const menus = (menusRes.data ?? []) as MenuLite[];
  const assigns = (assignRes.data ?? []) as AssignRow[];
  const nonOps = (nonOpRes.data ?? []) as NonOpRow[];
  const schoolsTotal = (schoolsTotalRes.data ?? []) as SchoolTotalRow[];
  const recipientCount = schoolsTotal.reduce(
    (sum, s) => sum + (Number(s.students) || 0) + (Number(s.guru) || 0),
    0
  );

  const assignByDate = new Map(assigns.map((a) => [a.assign_date, a]));
  const nonOpByDate = new Map(nonOps.map((n) => [n.op_date, n]));

  let opDays = 0;
  let nonOpDays = 0;
  let unassigned = 0;
  let holDays = 0;
  for (const week of matrix) {
    for (const d of week) {
      if (d.getMonth() + 1 !== month) continue;
      const iso = toISODate(d);
      const isWknd = d.getDay() === 0 || d.getDay() === 6;
      if (getHoliday(iso)) {
        holDays++;
        continue;
      }
      if (isWknd) continue;
      if (nonOpByDate.has(iso)) {
        nonOpDays++;
      } else {
        opDays++;
        if (!assignByDate.has(iso)) unassigned++;
      }
    }
  }

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const prevHref = `/calendar?month=${fmtMonthKey(prevYear, prevMonth)}`;
  const nextHref = `/calendar?month=${fmtMonthKey(nextYear, nextMonth)}`;

  const monthLabel = `${MONTHS.long[lang][month - 1]} ${year}`;
  const canWrite = WRITE_ROLES.has(profile.role);

  // Build keterangan lists: holidays + non-op entries that fall within current month.
  const monthStartIso = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEndIso = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const holidayEntries = groupConsecutive(
    holidaysInRange(monthStartIso, monthEndIso).map((h) => ({
      date: h.date,
      name: h.name
    })),
    lang
  );
  const nonOpEntries = groupConsecutive(
    nonOps
      .filter((n) => n.op_date >= monthStartIso && n.op_date <= monthEndIso)
      .map((n) => ({ date: n.op_date, name: n.reason })),
    lang
  );
  const hasNotes = holidayEntries.length > 0 || nonOpEntries.length > 0;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <div className="relative mb-6 rounded-2xl bg-white shadow-card">
          {/* Toolbar */}
          <div className="grid grid-cols-1 items-center gap-3 border-b border-ink/10 px-5 py-4 sm:grid-cols-3">
            <div className="hidden sm:block" />
            <div className="flex items-center justify-center gap-2">
              <LinkButton
                href={prevHref}
                variant="secondary"
                size="sm"
                aria-label={t("calendar.prevAria", lang)}
              >
                ◀
              </LinkButton>
              <div className="min-w-[160px] px-2 text-center text-base font-black text-ink sm:text-lg">
                {monthLabel}
              </div>
              <LinkButton
                href={nextHref}
                variant="secondary"
                size="sm"
                aria-label={t("calendar.nextAria", lang)}
              >
                ▶
              </LinkButton>
            </div>
            <div className="flex items-center justify-end gap-2">
              {canWrite && (
                <PopulateControls year={year} month={month} menus={menus} />
              )}
            </div>
          </div>

          {/* Stats strip: hari operasional · libur · non-op · assignment status */}
          <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-paper/40 px-5 py-2.5 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-900 ring-1 ring-blue-200">
              <span className="font-black tabular-nums">{opDays}</span>
              <span className="opacity-80">{t("calendar.statOp", lang)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-rose-900 ring-1 ring-rose-200">
              <span className="font-black tabular-nums">{holDays}</span>
              <span className="opacity-80">{t("calendar.statHoliday", lang)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-orange-900 ring-1 ring-orange-200">
              <span className="font-black tabular-nums">{nonOpDays}</span>
              <span className="opacity-80">{t("calendar.statNonOp", lang)}</span>
            </span>
            <span className="ml-auto">
              {unassigned > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-red-800 ring-1 ring-red-200">
                  {ti("calendar.unassignedWarn", lang, { n: unassigned })}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 ring-1 ring-emerald-200">
                  ✓ {t("calendar.allAssigned", lang)}
                </span>
              )}
            </span>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1 border-b border-ink/5 px-4 py-2">
            {DOW_HEAD[lang].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-black uppercase tracking-wide text-ink2/70"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="px-4 py-3">
            <CalendarGrid
              matrix={matrix.map((week) => week.map((d) => toISODate(d)))}
              monthYear={year}
              monthMonth={month}
              todayIso={todayIso}
              menus={menus}
              initialAssigns={assigns}
              initialNonOps={nonOps}
              recipientCount={recipientCount}
              canWrite={canWrite}
            />
          </div>

          {/* Keterangan hari libur & non-operasional bulan ini */}
          <div className="border-t border-ink/10 bg-white px-5 py-4">
            <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-ink2/70">
              {t("calendar.notesTitle", lang)}
            </div>
            {hasNotes ? (
              <div className="flex flex-col gap-2.5">
                {holidayEntries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-900 ring-1 ring-rose-200">
                      <span className="inline-block h-2 w-2 rounded-full bg-rose-300" />
                      {t("calendar.notesHolidaySection", lang)}
                    </div>
                    {holidayEntries.map((h, i) => (
                      <span
                        key={`h-${i}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-rose-50/60 px-2 py-0.5 text-[11.5px] ring-1 ring-rose-100"
                      >
                        <span className="font-mono text-[10.5px] font-bold text-rose-900">{h.dateLabel}</span>
                        <span className="font-semibold text-ink">{h.reason}</span>
                      </span>
                    ))}
                  </div>
                )}
                {nonOpEntries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-900 ring-1 ring-orange-200">
                      <span className="inline-block h-2 w-2 rounded-full bg-orange-300" />
                      {t("calendar.notesNonOpSection", lang)}
                    </div>
                    {nonOpEntries.map((n, i) => (
                      <span
                        key={`n-${i}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-orange-50/60 px-2 py-0.5 text-[11.5px] ring-1 ring-orange-100"
                      >
                        <span className="font-mono text-[10.5px] font-bold text-orange-900">{n.dateLabel}</span>
                        <span className="font-semibold text-ink">{n.reason}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-ink2/60">
                {t("calendar.notesEmpty", lang)}
              </p>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-ink/10 bg-paper/40 px-5 py-3 text-[11px] font-semibold text-ink2">
            <LegendSwatch
              className="bg-gradient-to-b from-blue-800 to-blue-700"
              label={t("calendar.legendMenu", lang)}
            />
            <LegendSwatch
              className="bg-rose-100 ring-1 ring-rose-300"
              label={t("calendar.legendHoliday", lang)}
            />
            <LegendSwatch
              className="bg-amber-50 ring-1 ring-amber-200"
              label={t("calendar.legendWeekend", lang)}
            />
            <LegendSwatch
              className="bg-orange-100 ring-1 ring-orange-300"
              label={t("calendar.legendNonOp", lang)}
            />
            <span className="ml-auto text-ink2/60">
              {t("calendar.legendHint", lang)}
            </span>
          </div>

        </div>
      </PageContainer>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-3.5 w-3.5 rounded ${className}`} />
      <span>{label}</span>
    </span>
  );
}
