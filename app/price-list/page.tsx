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
import { PageContainer, PageHeader } from "@/components/ui";
import { PriceListShell } from "./price-list-shell";
import type { PriceListMatrixRow, PricePeriod, PriceWeek } from "./types";

export const dynamic = "force-dynamic";

export default async function PriceListPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const supabase = createClient();

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

  return (
    <>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
        menuToday={null}
      />
      <PageContainer>
        <PageHeader
          icon="💹"
          title="Weekly Price List"
          subtitle={
            activePeriod
              ? `Benchmarking harga mingguan Rp/kg · ${activePeriod.name}`
              : "Benchmarking harga mingguan Rp/kg"
          }
        />

        {periodsRes.error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Migrasi 0017 belum terpasang.</strong> Jalankan{" "}
            <code className="rounded bg-amber-100 px-1">0017_weekly_price_list.sql</code> di
            Supabase SQL Editor, lalu refresh halaman ini. Detail error:{" "}
            <em>{periodsRes.error.message}</em>
          </div>
        )}

        <PriceListShell
          periods={periods}
          weeks={weeks}
          rows={rows}
          currentPeriodId={activePeriod?.id ?? null}
          canEdit={canEdit}
        />
      </PageContainer>
    </>
  );
}
