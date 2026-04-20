/**
 * Weekly Price List · /price-list
 * ---------------------------------------------------------------------------
 * Server component: loads active period, weeks, and the pivoted price matrix
 * view (v_price_list_matrix). Renders inside Nav + PageContainer chrome, hands
 * data to the interactive PriceListShell client.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { PageContainer, Section } from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import { PriceListShell } from "./price-list-shell";
import type { PriceListMatrixRow, PricePeriod, PriceWeek } from "./types";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { formatDateShort } from "@/lib/engine";

export const dynamic = "force-dynamic";

type PriceTabId = "active" | "history" | "settings";
const VALID_TABS: readonly PriceTabId[] = ["active", "history", "settings"];

interface SearchParams {
  tab?: string;
}

export default async function PriceListPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const supabase = createClient();
  const lang = getLang();

  // These tables are introduced by migration 0017. The generated
  // Database type may not yet include them — we cast to `any` and rely on
  // the local types defined in ./types.ts until `pnpm supabase:types` runs.
  const sb = supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        order: (col: string, opts?: { ascending: boolean }) => Promise<{
          data: unknown[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const [periodsRes, weeksRes, matrixRes] = await Promise.all([
    sb.from("price_periods").select("*").order("start_date", { ascending: false }),
    sb.from("price_weeks").select("*").order("week_no", { ascending: true }),
    sb.from("v_price_list_matrix").select("*").order("commodity", { ascending: true })
  ]);

  const periods = (periodsRes.data ?? []) as PricePeriod[];
  const weeks = (weeksRes.data ?? []) as PriceWeek[];
  const rows = (matrixRes.data ?? []) as PriceListMatrixRow[];

  const activePeriod = periods.find((p) => p.active) ?? periods[0] ?? null;

  const canEdit =
    profile.role === "admin" ||
    profile.role === "operator" ||
    profile.role === "ahli_gizi";
  const isAdmin = profile.role === "admin";

  const activeTab: PriceTabId = VALID_TABS.includes(
    searchParams.tab as PriceTabId
  )
    ? (searchParams.tab as PriceTabId)
    : "active";

  const tabs: PageTab[] = [
    {
      id: "active",
      icon: "💹",
      label: lang === "EN" ? "Active Period" : "Periode Aktif",
      href: "/price-list?tab=active"
    },
    {
      id: "history",
      icon: "📜",
      label: lang === "EN" ? "Period History" : "Riwayat Periode",
      href: "/price-list?tab=history"
    },
    ...(isAdmin
      ? [
          {
            id: "settings",
            icon: "⚙️",
            label: lang === "EN" ? "Period Settings" : "Setting Periode",
            href: "/price-list?tab=settings"
          }
        ]
      : [])
  ];

  // Scoped data per tab
  const historyPeriods = periods.filter((p) => !p.active);
  const activePeriods = activePeriod ? [activePeriod] : [];
  const activeRows = rows.filter(
    (r) => r.period_id === (activePeriod?.id ?? -1)
  );
  const historyRows = rows.filter((r) =>
    historyPeriods.some((p) => p.id === r.period_id)
  );

  return (
    <>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
        menuToday={null}
      />
      <PageContainer>
        {periodsRes.error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>{t("priceList.migrationWarn", lang)}</strong>{" "}
            {t("priceList.migrationRun", lang)}{" "}
            <code className="rounded bg-amber-100 px-1">0017_weekly_price_list.sql</code>{" "}
            {t("priceList.migrationBody", lang)}{" "}
            <em>{periodsRes.error.message}</em>
          </div>
        )}

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "active" && (
          <PriceListShell
            periods={activePeriods}
            weeks={weeks}
            rows={activeRows}
            currentPeriodId={activePeriod?.id ?? null}
            canEdit={canEdit}
          />
        )}

        {activeTab === "history" && (
          historyPeriods.length === 0 ? (
            <Section
              title={lang === "EN" ? "Period History" : "Riwayat Periode"}
              hint={
                lang === "EN"
                  ? "Archive of price list periods with effective dates and version numbers."
                  : "Arsip periode price list dengan tanggal berlaku dan nomor versi."
              }
            >
              <div className="px-4 py-8 text-center text-sm text-ink2/70">
                {lang === "EN"
                  ? "No historical periods yet."
                  : "Belum ada periode historis."}
              </div>
            </Section>
          ) : (
            <PriceListShell
              periods={historyPeriods}
              weeks={weeks}
              rows={historyRows}
              currentPeriodId={historyPeriods[0]?.id ?? null}
              canEdit={false}
            />
          )
        )}

        {activeTab === "settings" && isAdmin && (
          <Section
            title={lang === "EN" ? "Price Periods" : "Periode Harga"}
            hint={
              lang === "EN"
                ? "Manage active/inactive period ranges."
                : "Kelola rentang periode aktif/non-aktif."
            }
          >
            {periods.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink2/70">
                {lang === "EN" ? "No periods defined." : "Belum ada periode."}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-paper text-[11px] font-bold uppercase text-ink2/70">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">
                      {lang === "EN" ? "Start" : "Mulai"}
                    </th>
                    <th className="px-4 py-2 text-left">
                      {lang === "EN" ? "End" : "Selesai"}
                    </th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id} className="border-t border-ink/5">
                      <td className="px-4 py-2 font-mono">{p.id}</td>
                      <td className="px-4 py-2">{formatDateShort(p.start_date)}</td>
                      <td className="px-4 py-2">{p.end_date ? formatDateShort(p.end_date) : "—"}</td>
                      <td className="px-4 py-2">
                        {p.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            ● {lang === "EN" ? "Active" : "Aktif"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold text-ink2">
                            {lang === "EN" ? "Inactive" : "Non-aktif"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )}
      </PageContainer>
    </>
  );
}
