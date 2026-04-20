import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  bomVariance,
  bomVarianceByMenu,
  bomVarianceSummary
} from "@/lib/engine";
import {
  EmptyState,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import {
  VariancePerItemTable,
  VarianceByMenuTable,
  type VarianceRow,
  type VarianceByMenuRow
} from "@/components/variance-tables";
import { t, ti } from "@/lib/i18n";
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
            <VariancePerItemTable
              lang={lang}
              thresholdPct={thresholdPct}
              rows={rows.map(
                (r): VarianceRow => ({
                  item_code: r.item_code,
                  name_en: r.name_en,
                  category: (r.category ?? "LAIN") as string,
                  flag: r.flag as "OVER" | "UNDER" | "OK",
                  plan_kg: Number(r.plan_kg),
                  actual_kg: Number(r.actual_kg),
                  variance_kg: Number(r.variance_kg),
                  variance_pct:
                    r.variance_pct == null ? null : Number(r.variance_pct)
                })
              )}
            />
          )}
        </Section>

        <Section
          title={t("variance.secPerMenu", lang)}
          hint={t("variance.secPerMenuHint", lang)}
        >
          {byMenu.length === 0 ? (
            <EmptyState message={t("variance.emptyMenu", lang)} />
          ) : (
            <VarianceByMenuTable
              lang={lang}
              rows={byMenu.map(
                (m): VarianceByMenuRow => ({
                  menu_id: m.menu_id,
                  menu_name: m.menu_name,
                  days_served: m.days_served,
                  plan_porsi: m.plan_porsi,
                  plan_kg_total: Number(m.plan_kg_total),
                  plan_cost_idr: Number(m.plan_cost_idr)
                })
              )}
            />
          )}
        </Section>

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          {t("variance.footer", lang)}
        </p>
      </PageContainer>
    </div>
  );
}
