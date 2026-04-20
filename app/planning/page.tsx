import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  dailyPlanning,
  monthlyRequirements,
  upcomingShortages,
  formatKg,
  formatIDR,
  toISODate,
  type MonthlyRequirement,
  type DailyPlan,
  type UpcomingShortage
} from "@/lib/engine";
import {
  EmptyState,
  KpiGrid,
  KpiTile,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import {
  PlanningMatrixTable,
  PlanningDailyTable,
  type PlanningMatrixRow,
  type PlanningDailyRow
} from "@/components/planning-tables";
import { t, ti, formatNumber, MONTHS, DAYS } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { porsiBreakdown } from "@/lib/bgn";

export const dynamic = "force-dynamic";

type PlanningTabId = "matrix" | "daily" | "forecast";
const VALID_TABS: readonly PlanningTabId[] = ["matrix", "daily", "forecast"];

interface SearchParams {
  tab?: string;
}

interface ItemLite {
  code: string;
  unit: string;
  category: string;
  price_idr: number | string;
}

export default async function PlanningPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const activeTab: PlanningTabId = VALID_TABS.includes(
    searchParams.tab as PlanningTabId
  )
    ? (searchParams.tab as PlanningTabId)
    : "matrix";

  const tabs: PageTab[] = [
    {
      id: "matrix",
      icon: "📊",
      label: lang === "EN" ? "5-Month Matrix" : "Matrix 5-Bulan",
      href: "/planning?tab=matrix"
    },
    {
      id: "daily",
      icon: "📅",
      label: lang === "EN" ? "Daily Planning" : "Planning Harian",
      href: "/planning?tab=daily"
    },
    {
      id: "forecast",
      icon: "⚠️",
      label: lang === "EN" ? "Shortage Forecast" : "Forecast Shortage",
      href: "/planning?tab=forecast"
    }
  ];

  const now = new Date();
  const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));

  const [daily, monthly, upcoming, itemsRes] = await Promise.all([
    dailyPlanning(supabase, 30).catch(() => [] as DailyPlan[]),
    monthlyRequirements(supabase, monthStart, 5).catch(
      () => [] as MonthlyRequirement[]
    ),
    upcomingShortages(supabase, 30).catch(() => [] as UpcomingShortage[]),
    supabase.from("items").select("code, unit, category, price_idr")
  ]);

  const items = (itemsRes.data ?? []) as ItemLite[];
  const itemByCode = new Map(items.map((i) => [i.code, i]));

  // Monthly matrix — always show 5 consecutive months from monthStart
  const months = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const itemTotals = new Map<string, number>();
  const itemCost = new Map<string, number>();
  for (const r of monthly) {
    const qty = Number(r.qty_kg);
    itemTotals.set(r.item_code, (itemTotals.get(r.item_code) ?? 0) + qty);
    const price = Number(itemByCode.get(r.item_code)?.price_idr ?? 0);
    itemCost.set(r.item_code, (itemCost.get(r.item_code) ?? 0) + qty * price);
  }

  const sortedItems = [...itemTotals.entries()].sort((a, b) => b[1] - a[1]);
  const grandTotalKg = sortedItems.reduce((s, [, q]) => s + q, 0);
  const grandTotalCost = [...itemCost.values()].reduce((s, q) => s + q, 0);

  const matrix: Record<string, Record<string, number>> = {};
  for (const [code] of sortedItems) matrix[code] = {};
  for (const r of monthly) {
    if (!matrix[r.item_code]) continue;
    const m = r.month.slice(0, 7);
    matrix[r.item_code][m] =
      (matrix[r.item_code][m] ?? 0) + Number(r.qty_kg);
  }

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const idx = Number(mo) - 1;
    return `${MONTHS.short[lang][idx]} ${y.slice(2)}`;
  };

  const opDays = daily.filter((d) => d.operasional).length;
  const totalPorsi = daily.reduce((s, d) => s + d.porsi_total, 0);
  const totalKg = daily.reduce((s, d) => s + Number(d.total_kg), 0);

  // Forecast shortage derivations
  const upcomingPeakGap = upcoming.reduce(
    (m, u) => Math.max(m, Number(u.total_gap_kg) || 0),
    0
  );
  const upcomingTotalGap = upcoming.reduce(
    (s, u) => s + (Number(u.total_gap_kg) || 0),
    0
  );
  const upcomingTotalItems = upcoming.reduce(
    (s, u) => s + (u.short_items ?? 0),
    0
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const DAY_SHORT = DAYS.short[lang];
  const MONTH_SHORT = MONTHS.short[lang];

  const matrixRows: PlanningMatrixRow[] = sortedItems.map(
    ([code, total], i) => ({
      rank: i + 1,
      code,
      category: itemByCode.get(code)?.category ?? "LAIN",
      unit: itemByCode.get(code)?.unit ?? "kg",
      monthly: { ...(matrix[code] ?? {}) },
      total,
      cost: itemCost.get(code) ?? 0
    })
  );
  const monthLabels: Record<string, string> = Object.fromEntries(
    months.map((m) => [m, monthLabel(m)])
  );

  const porsiByDate = new Map<
    string,
    { kecil: number; besar: number; total: number }
  >();
  const breakdownByDate = new Map<
    string,
    {
      schools_count: number;
      students_total: number;
      pregnant_count: number;
      toddler_count: number;
    }
  >();
  await Promise.all(
    daily.map(async (p) => {
      const [pcRes, bdRes] = await Promise.all([
        supabase.rpc("porsi_counts", { p_date: p.op_date }),
        porsiBreakdown(supabase, p.op_date).catch(() => null)
      ]);
      const row = (pcRes.data ?? [])[0] as
        | { besar: number; kecil: number; total: number }
        | undefined;
      if (row) {
        porsiByDate.set(p.op_date, {
          kecil: Number(row.kecil ?? 0),
          besar: Number(row.besar ?? 0),
          total: Number(row.total ?? 0)
        });
      }
      if (bdRes) {
        breakdownByDate.set(p.op_date, {
          schools_count: bdRes.schools_count,
          students_total: bdRes.students_total,
          pregnant_count: bdRes.pregnant_count,
          toddler_count: bdRes.toddler_count
        });
      }
    })
  );

  const dailyRows: PlanningDailyRow[] = daily.map((p) => {
    const porsi = porsiByDate.get(p.op_date);
    const bd = breakdownByDate.get(p.op_date);
    return {
      op_date: p.op_date,
      menu_name: p.menu_name ?? null,
      porsi_total: p.porsi_total,
      porsi_eff: Number(p.porsi_eff),
      operasional: p.operasional,
      schools: bd?.schools_count ?? 0,
      students: bd?.students_total ?? 0,
      pregnant: bd?.pregnant_count ?? 0,
      toddler: bd?.toddler_count ?? 0,
      kecil: porsi?.kecil ?? 0,
      besar: porsi?.besar ?? 0,
      total: porsi?.total ?? p.porsi_total
    };
  });

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader />
        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "matrix" && (
          <>
            <Section
              title={ti("planning.matrixTitle", lang, {
                months: months.length,
                items: sortedItems.length
              })}
              hint={t("planning.matrixHint", lang)}
            >
              {sortedItems.length === 0 ? (
                <EmptyState message={t("planning.matrixEmpty", lang)} />
              ) : (
                <PlanningMatrixTable
                  lang={lang}
                  rows={matrixRows}
                  months={months}
                  monthLabels={monthLabels}
                />
              )}
            </Section>
          </>
        )}

        {activeTab === "daily" && (
          <>
            <KpiGrid>
              <KpiTile
                icon="📅"
                label={t("planning.kpiOpDays", lang)}
                value={`${opDays} / ${daily.length}`}
                sub={t("planning.kpiOpDaysSub", lang)}
              />
              <KpiTile
                icon="🍽️"
                label={t("planning.kpiTotalPorsi", lang)}
                value={formatNumber(totalPorsi, lang)}
                sub={t("planning.kpiTotalPorsiSub", lang)}
              />
              <KpiTile
                icon="⚖️"
                label={t("planning.kpiTotalKg", lang)}
                value={formatKg(totalKg, 0)}
                sub={t("planning.kpiTotalKgSub", lang)}
              />
            </KpiGrid>
            <Section title={t("planning.dailyTitle", lang)} hint={t("planning.dailyHint", lang)}>
              <PlanningDailyTable lang={lang} rows={dailyRows} />
            </Section>
          </>
        )}

        {activeTab === "forecast" && (
        <Section
          title={t("planning.forecastTitle", lang)}
          hint={t("planning.forecastHint", lang)}
          accent={upcoming.length > 0 ? "warn" : "ok"}
          actions={
            upcoming.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-medium text-ink2/70">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> {t("planning.tierCritical", lang)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> {t("planning.tierHigh", lang)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" /> {t("planning.tierMed", lang)}
                </span>
              </div>
            ) : undefined
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon="✅"
              tone="ok"
              message={t("planning.forecastEmpty", lang)}
            />
          ) : (
            <div>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-amber-200/70">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
                    {t("planning.fcHariTerdampak", lang)}
                  </div>
                  <div className="mt-0.5 text-lg font-bold leading-tight text-amber-900">
                    {upcoming.length}
                    <span className="ml-1 text-[10px] font-medium text-amber-700/70">
                      / 30
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-amber-200/70">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
                    {t("planning.fcTotalGap", lang)}
                  </div>
                  <div className="mt-0.5 text-lg font-bold leading-tight text-amber-900">
                    {formatKg(upcomingTotalGap)}
                  </div>
                </div>
                <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-amber-200/70">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
                    {t("planning.fcPeak", lang)}
                  </div>
                  <div className="mt-0.5 text-lg font-bold leading-tight text-amber-900">
                    {formatKg(upcomingPeakGap)}
                  </div>
                </div>
                <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-amber-200/70">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
                    {t("planning.fcTotalItems", lang)}
                  </div>
                  <div className="mt-0.5 text-lg font-bold leading-tight text-amber-900">
                    {upcomingTotalItems}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((u) => {
                  const d = new Date(u.op_date);
                  const gap = Number(u.total_gap_kg) || 0;
                  const ratio = upcomingPeakGap > 0 ? gap / upcomingPeakGap : 0;
                  const tier =
                    ratio >= 0.8 ? "crit" : ratio >= 0.55 ? "high" : "med";
                  const cfg = {
                    crit: {
                      dot: "bg-red-500",
                      bar: "bg-gradient-to-r from-red-500 to-red-400",
                      track: "bg-red-100",
                      text: "text-red-900",
                      sub: "text-red-700/80",
                      ring: "ring-red-200/80",
                      bg: "bg-white"
                    },
                    high: {
                      dot: "bg-amber-500",
                      bar: "bg-gradient-to-r from-amber-500 to-amber-400",
                      track: "bg-amber-100",
                      text: "text-amber-900",
                      sub: "text-amber-800/80",
                      ring: "ring-amber-200/80",
                      bg: "bg-white"
                    },
                    med: {
                      dot: "bg-yellow-400",
                      bar: "bg-gradient-to-r from-yellow-400 to-yellow-300",
                      track: "bg-yellow-100",
                      text: "text-yellow-900",
                      sub: "text-yellow-800/80",
                      ring: "ring-yellow-200/80",
                      bg: "bg-white"
                    }
                  }[tier];
                  const isWknd = d.getDay() === 0 || d.getDay() === 6;
                  const diffDays = Math.round(
                    (d.getTime() - todayStart.getTime()) / 86400000
                  );
                  const rel =
                    diffDays === 0
                      ? t("planning.fcToday", lang)
                      : diffDays === 1
                        ? t("planning.fcTomorrow", lang)
                        : diffDays > 1
                          ? `H+${diffDays}`
                          : `${diffDays}`;

                  return (
                    <div
                      key={u.op_date}
                      className={`group relative overflow-hidden rounded-xl ${cfg.bg} px-4 py-3 ring-1 ${cfg.ring} transition hover:-translate-y-0.5 hover:shadow-card`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-white/80 ring-1 ${cfg.ring}`}
                          >
                            <span
                              className={`text-[9px] font-bold uppercase leading-none tracking-wide ${cfg.sub}`}
                            >
                              {DAY_SHORT[d.getDay()]}
                            </span>
                            <span
                              className={`mt-0.5 text-base font-bold leading-none ${cfg.text}`}
                            >
                              {d.getDate()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`flex items-center gap-1.5 text-[13px] font-bold ${cfg.text}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                              />
                              {MONTH_SHORT[d.getMonth()]} {d.getFullYear()}
                              {isWknd && (
                                <span className="ml-1 rounded bg-white/70 px-1.5 py-px text-[9px] font-semibold tracking-wide text-ink2/70">
                                  WKND
                                </span>
                              )}
                            </div>
                            <div className={`mt-0.5 text-[11px] ${cfg.sub}`}>
                              {ti("planning.fcItemsShort", lang, { rel, n: u.short_items })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${cfg.text}`}>
                            {formatKg(gap)}
                          </div>
                          <div
                            className={`text-[9px] font-semibold uppercase tracking-wider ${cfg.sub}`}
                          >
                            {t("planning.fcGap", lang)}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${cfg.track}`}
                      >
                        <div
                          className={`h-full rounded-full ${cfg.bar}`}
                          style={{
                            width: `${Math.max(8, Math.round(ratio * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
        )}
      </PageContainer>
    </div>
  );
}
