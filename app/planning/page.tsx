import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  monthlyRequirements,
  dailyPlanning,
  requirementForDate,
  toISODate,
  type MonthlyRequirement,
  type DailyPlan,
  type Requirement
} from "@/lib/engine";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import {
  VolumeMatrixTable,
  type VolumeRow,
  ProcurementScheduleTable,
  type ProcurementDayGroup
} from "@/components/dashboard-tables";
import { t, ti, MONTHS, DAYS } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type PlanningTabId = "matrix" | "forecast";
const VALID_TABS: readonly PlanningTabId[] = ["matrix", "forecast"];

interface SearchParams {
  tab?: string;
}

interface ItemLite {
  code: string;
  unit: string;
  category: string;
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
      id: "forecast",
      icon: "🛒",
      label: lang === "EN" ? "Procurement Schedule" : "Jadwal Belanja",
      href: "/planning?tab=forecast"
    }
  ];

  const now = new Date();
  const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const today = toISODate(now);

  const [monthly, planning, itemsRes] = await Promise.all([
    monthlyRequirements(supabase, monthStart, 5).catch(
      () => [] as MonthlyRequirement[]
    ),
    dailyPlanning(supabase, 180).catch(() => [] as DailyPlan[]),
    supabase.from("items").select("code, unit, category")
  ]);

  const items = (itemsRes.data ?? []) as ItemLite[];
  const itemByCode = new Map(items.map((i) => [i.code, i]));

  // Monthly matrix — always show 5 consecutive months from monthStart
  const months = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const itemTotals = new Map<string, number>();
  for (const r of monthly) {
    const qty = Number(r.qty_kg);
    itemTotals.set(r.item_code, (itemTotals.get(r.item_code) ?? 0) + qty);
  }

  const sortedItems = [...itemTotals.entries()].sort((a, b) => b[1] - a[1]);

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

  const monthOpDays: Record<string, number> = Object.fromEntries(
    months.map((m) => [m, 0])
  );
  for (const p of planning) {
    if (!p.operasional) continue;
    const m = p.op_date.slice(0, 7);
    if (m in monthOpDays) monthOpDays[m] += 1;
  }

  // ---- Procurement schedule: next 7 operational days × item × qty × price ----
  const procurementDays = planning
    .filter((p) => p.op_date >= today && p.operasional)
    .sort((a, b) => a.op_date.localeCompare(b.op_date))
    .slice(0, 7);

  const porsiByDate = new Map<string, number>();
  const reqsByDate = new Map<string, Requirement[]>();
  await Promise.all(
    procurementDays.map(async (p) => {
      const [pcRes, reqs] = await Promise.all([
        supabase.rpc("porsi_counts", { p_date: p.op_date }),
        requirementForDate(supabase, p.op_date).catch(() => [] as Requirement[])
      ]);
      const row = (pcRes.data ?? [])[0] as { total?: number } | undefined;
      porsiByDate.set(p.op_date, Number(row?.total ?? p.porsi_total));
      reqsByDate.set(p.op_date, reqs);
    })
  );

  const procurementGroups: ProcurementDayGroup[] = procurementDays.map((p) => {
    const reqs = reqsByDate.get(p.op_date) ?? [];
    const d = new Date(p.op_date + "T00:00:00");
    const dayName = DAYS.long[lang][d.getDay()];
    const dayShort = DAYS.short[lang][d.getDay()];
    const dateLabel = `${dayName}, ${d.getDate()} ${MONTHS.long[lang][d.getMonth()]} ${d.getFullYear()}`;
    const dateShort = `${dayShort}, ${d.getDate()} ${MONTHS.short[lang][d.getMonth()]}`;
    const rows = reqs
      .map((r) => {
        const qty = Number(r.qty ?? 0);
        const price = Number(r.price_idr ?? 0);
        return {
          item_code: r.item_code,
          category: (r.category ?? itemByCode.get(r.item_code)?.category ?? "LAIN") as string,
          qty,
          unit: r.unit ?? "kg",
          price_idr: price,
          subtotal: qty * price
        };
      })
      .filter((r) => r.qty > 0)
      .sort((a, b) => b.subtotal - a.subtotal);
    const subtotal = rows.reduce((s, r) => s + r.subtotal, 0);
    return {
      op_date: p.op_date,
      dateLabel,
      dateShort,
      menu_id: p.menu_id,
      menu_name: p.menu_name,
      porsi_total: porsiByDate.get(p.op_date) ?? p.porsi_total,
      rows,
      subtotal
    };
  });

  const matrixRows: VolumeRow[] = sortedItems.map(([code, total]) => ({
    code,
    category: itemByCode.get(code)?.category ?? "LAIN",
    unit: itemByCode.get(code)?.unit ?? "kg",
    monthly: { ...(matrix[code] ?? {}) },
    total
  }));
  const monthLabels: Record<string, string> = Object.fromEntries(
    months.map((m) => [m, monthLabel(m)])
  );

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
                <VolumeMatrixTable
                  lang={lang}
                  rows={matrixRows}
                  months={months}
                  monthLabels={monthLabels}
                  monthOpDays={monthOpDays}
                />
              )}
            </Section>
          </>
        )}

        {activeTab === "forecast" && (
          <Section
            title={t("dashboard.procurementTitle", lang)}
            hint={t("dashboard.procurementHint", lang)}
          >
            {procurementGroups.length === 0 ? (
              <EmptyState message={t("dashboard.procurementEmpty", lang)} />
            ) : (
              <ProcurementScheduleTable groups={procurementGroups} lang={lang} />
            )}
          </Section>
        )}
      </PageContainer>
    </div>
  );
}
