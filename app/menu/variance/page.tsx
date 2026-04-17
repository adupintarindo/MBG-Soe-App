import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  bomVariance,
  bomVarianceByMenu,
  bomVarianceSummary,
  formatIDR,
  formatKg
} from "@/lib/engine";
import {
  Badge,
  CategoryBadge,
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";
import { t, ti, formatNumber } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    start?: string;
    end?: string;
    threshold?: string;
  };
}

// Helper — clamp tanggal ke ISO YYYY-MM-DD
function isoDate(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export default async function BomVariancePage({ searchParams }: PageProps) {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  // Default range = 30 hari ke belakang dari hari ini (atau dari go-live bila
  // hari ini < 2026-05-04). Threshold default 10%.
  const today = new Date();
  const goLive = new Date("2026-05-04");
  const defaultEnd = today < goLive ? addDays(goLive, 30) : today;
  const defaultStart = today < goLive ? goLive : addDays(today, -30);

  const start = searchParams.start ?? isoDate(defaultStart);
  const end = searchParams.end ?? isoDate(defaultEnd);
  const thresholdPct = Number(searchParams.threshold ?? "10");

  const [rows, summary, byMenu] = await Promise.all([
    bomVariance(supabase, start, end, thresholdPct),
    bomVarianceSummary(supabase, start, end, thresholdPct),
    bomVarianceByMenu(supabase, start, end)
  ]);

  const overRows = rows.filter((r) => r.flag === "OVER");
  const underRows = rows.filter((r) => r.flag === "UNDER");
  const okRows = rows.filter((r) => r.flag === "OK");

  const hasActual = summary.total_actual_kg > 0;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📉"
          title={t("variance.title", lang)}
          subtitle={
            <>
              {ti("variance.subtitle", lang, { start, end, pct: thresholdPct })}
              {!hasActual && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  {t("variance.noGRN", lang)}
                </span>
              )}
            </>
          }
          actions={
            <>
              <LinkButton href="/menu" variant="secondary" size="sm">
                {t("variance.btnBackMenu", lang)}
              </LinkButton>
              <LinkButton href="/stock" variant="primary" size="sm">
                {t("variance.btnStock", lang)}
              </LinkButton>
            </>
          }
        />

        <form
          method="get"
          className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-paper p-4 ring-1 ring-ink/5"
        >
          <label className="flex flex-col text-[11px] font-bold uppercase tracking-wide text-ink2">
            {t("variance.filterFrom", lang)}
            <input
              type="date"
              name="start"
              defaultValue={start}
              className="mt-1 rounded-lg bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-ink/10"
            />
          </label>
          <label className="flex flex-col text-[11px] font-bold uppercase tracking-wide text-ink2">
            {t("variance.filterTo", lang)}
            <input
              type="date"
              name="end"
              defaultValue={end}
              className="mt-1 rounded-lg bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-ink/10"
            />
          </label>
          <label className="flex flex-col text-[11px] font-bold uppercase tracking-wide text-ink2">
            {t("variance.filterThreshold", lang)}
            <input
              type="number"
              name="threshold"
              min={0}
              max={100}
              step={1}
              defaultValue={thresholdPct}
              className="mt-1 w-24 rounded-lg bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-ink/10"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary-gradient px-4 py-2 text-sm font-bold text-white shadow-card hover:opacity-90"
          >
            {t("variance.filterApply", lang)}
          </button>
        </form>

        <KpiGrid>
          <KpiTile
            label={t("variance.kpiScope", lang)}
            value={summary.total_items.toString()}
            sub={ti("variance.kpiScopeSub", lang, {
              over: overRows.length,
              under: underRows.length,
              ok: okRows.length
            })}
          />
          <KpiTile
            label={t("variance.kpiPlan", lang)}
            value={formatKg(summary.total_plan_kg, 1)}
            sub={t("variance.kpiPlanSub", lang)}
          />
          <KpiTile
            label={t("variance.kpiActual", lang)}
            value={formatKg(summary.total_actual_kg, 1)}
            sub={t("variance.kpiActualSub", lang)}
            tone={hasActual ? "ok" : "default"}
          />
          <KpiTile
            label={t("variance.kpiVariance", lang)}
            value={
              summary.total_variance_pct == null
                ? "—"
                : `${summary.total_variance_pct > 0 ? "+" : ""}${Number(
                    summary.total_variance_pct
                  ).toFixed(1)}%`
            }
            sub={
              summary.total_variance_kg == null
                ? ""
                : `${summary.total_variance_kg >= 0 ? "+" : ""}${Number(
                    summary.total_variance_kg
                  ).toFixed(1)} kg`
            }
            tone={
              summary.total_variance_pct == null
                ? "default"
                : Math.abs(Number(summary.total_variance_pct)) > thresholdPct
                  ? "bad"
                  : "ok"
            }
          />
        </KpiGrid>

        <Section
          title={t("variance.secPerItem", lang)}
          hint={ti("variance.secPerItemHint", lang, { pct: thresholdPct })}
        >
          {rows.length === 0 ? (
            <EmptyState
              icon="🍚"
              title={t("variance.emptyTitle", lang)}
              message={t("variance.emptyBody", lang)}
            />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">{t("variance.colFlag", lang)}</th>
                  <th className="py-2 pr-3">{t("common.item", lang)}</th>
                  <th className="py-2 pr-3">{t("common.category", lang)}</th>
                  <th className="py-2 pr-3 text-right">{t("variance.colPlanKg", lang)}</th>
                  <th className="py-2 pr-3 text-right">{t("variance.colActualKg", lang)}</th>
                  <th className="py-2 pr-3 text-right">{t("variance.colDeltaKg", lang)}</th>
                  <th className="py-2 pr-3 text-right">{t("variance.colDeltaPct", lang)}</th>
                </THead>
                <tbody>
                  {rows.map((r) => {
                    const cat = (r.category ?? "LAIN") as string;
                    const flagTone: "bad" | "warn" | "ok" =
                      r.flag === "OVER"
                        ? "bad"
                        : r.flag === "UNDER"
                          ? "warn"
                          : "ok";
                    return (
                      <tr
                        key={r.item_code}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pr-3">
                          <Badge tone={flagTone}>{r.flag}</Badge>
                        </td>
                        <td className="py-2 pr-3 font-semibold text-ink">
                          {r.item_code}
                          {r.name_en && (
                            <span className="ml-1 text-[10px] italic text-ink2/60">
                              · {r.name_en}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <CategoryBadge category={cat} />
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {Number(r.plan_kg).toFixed(2)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {Number(r.actual_kg).toFixed(2)}
                        </td>
                        <td
                          className={`py-2 pr-3 text-right font-mono text-xs font-bold ${
                            r.variance_kg > 0
                              ? "text-red-700"
                              : r.variance_kg < 0
                                ? "text-amber-700"
                                : "text-ink2"
                          }`}
                        >
                          {r.variance_kg > 0 ? "+" : ""}
                          {Number(r.variance_kg).toFixed(2)}
                        </td>
                        <td
                          className={`py-2 pr-3 text-right font-mono text-xs font-black ${
                            r.variance_pct == null
                              ? "text-ink2"
                              : Math.abs(Number(r.variance_pct)) > thresholdPct
                                ? r.variance_pct > 0
                                  ? "text-red-700"
                                  : "text-amber-700"
                                : "text-emerald-700"
                          }`}
                        >
                          {r.variance_pct == null
                            ? "—"
                            : `${r.variance_pct > 0 ? "+" : ""}${Number(
                                r.variance_pct
                              ).toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section
          title={t("variance.secPerMenu", lang)}
          hint={t("variance.secPerMenuHint", lang)}
        >
          {byMenu.length === 0 ? (
            <EmptyState message={t("variance.emptyMenu", lang)} />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">{t("schools.colId", lang)}</th>
                  <th className="py-2 pr-3">{t("common.menu", lang)}</th>
                  <th className="py-2 pr-3 text-right">{t("variance.colDays", lang)}</th>
                  <th className="py-2 pr-3 text-right">{t("variance.colPorsi", lang)}</th>
                  <th className="py-2 pr-3 text-right">{t("variance.colTotalBahan", lang)}</th>
                  <th className="py-2 pr-3">{t("variance.colCostBahan", lang)}</th>
                </THead>
                <tbody>
                  {byMenu.map((m) => (
                    <tr
                      key={m.menu_id}
                      className="row-hover border-b border-ink/5"
                    >
                      <td className="py-2 pr-3 font-mono text-[11px] text-ink2">
                        M{m.menu_id}
                      </td>
                      <td className="py-2 pr-3 font-semibold text-ink">
                        {m.menu_name}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {m.days_served}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {formatNumber(m.plan_porsi, lang)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {formatKg(m.plan_kg_total, 1)}
                      </td>
                      <td className="py-2 pr-3 text-left font-mono text-xs font-bold text-emerald-800">
                        {formatIDR(m.plan_cost_idr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          {t("variance.footer", lang)}
        </p>
      </PageContainer>
    </div>
  );
}
