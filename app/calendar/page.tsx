import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { toISODate } from "@/lib/engine";
import { getHoliday, holidaysInRange } from "@/lib/holidays";
import { CalendarGrid } from "./calendar-grid";
import { AutoAssignButton } from "./auto-assign-button";
import {
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
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

  const holidaysData = holidaysInRange(start, end);

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const prevHref = `/calendar?month=${fmtMonthKey(prevYear, prevMonth)}`;
  const nextHref = `/calendar?month=${fmtMonthKey(nextYear, nextMonth)}`;

  const monthLabel = `${MONTHS.long[lang][month - 1]} ${year}`;
  const canWrite = WRITE_ROLES.has(profile.role);

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📅"
          title={t("calendar.title", lang)}
          subtitle={
            <>
              {ti("calendar.subtitle", lang, {
                month: monthLabel,
                op: opDays,
                hol: holDays,
                nonOp: nonOpDays
              })}{" "}
              ·{" "}
              {unassigned > 0 ? (
                <span className="font-bold text-red-700">
                  {ti("calendar.unassignedWarn", lang, { n: unassigned })}
                </span>
              ) : (
                <span className="font-bold text-emerald-700">
                  {t("calendar.allAssigned", lang)}
                </span>
              )}
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canWrite && unassigned > 0 && (
                <AutoAssignButton year={year} month={month} unassigned={unassigned} />
              )}
              <LinkButton href="/menu" variant="secondary" size="sm">
                {t("calendar.btnBOM", lang)}
              </LinkButton>
            </div>
          }
        />

        <Section noPad className="overflow-hidden">
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
        </Section>

        {holidaysData.length > 0 && (
          <Section
            title={t("calendar.holidaysTitle", lang)}
            hint={t("calendar.holidaysHint", lang)}
          >
            <div className="flex flex-wrap gap-2">
              {holidaysData.map((h) => (
                <span
                  key={`${h.date}-${h.name}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-900 ring-1 ring-rose-200"
                >
                  <span className="font-mono text-[10px] opacity-70">
                    {h.date}
                  </span>
                  <span>{h.name}</span>
                </span>
              ))}
            </div>
          </Section>
        )}
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
