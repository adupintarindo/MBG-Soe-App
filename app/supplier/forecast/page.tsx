import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  EmptyState,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { ForecastShell } from "./forecast-shell";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type DailyRow = {
  op_date: string;
  item_code: string;
  item_name: string;
  unit: string;
  category: string;
  qty: number | string;
  source: string;
};

type MonthlyRow = {
  month: string;
  item_code: string;
  item_name: string;
  unit: string;
  category: string;
  qty_total: number | string;
  days_count: number;
};

export default async function SupplierForecastPage({
  searchParams
}: {
  searchParams?: Promise<{ supplier_id?: string }> | { supplier_id?: string };
}) {
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const sp = (await Promise.resolve(searchParams ?? {})) as {
    supplier_id?: string;
  };

  let targetSupplierId: string | null = null;
  if (profile.role === "supplier") {
    targetSupplierId = profile.supplier_id ?? null;
    if (!targetSupplierId) {
      return (
        <div>
          <Nav
            email={profile.email}
            role={profile.role}
            fullName={profile.full_name}
          />
          <PageContainer>
            <PageHeader
              icon="⚠️"
              title={t("fcst.profileIncomplete", lang)}
              subtitle={t("fcst.profileHelp", lang)}
            />
          </PageContainer>
        </div>
      );
    }
  } else if (
    profile.role === "admin" ||
    profile.role === "operator" ||
    profile.role === "ahli_gizi" ||
    profile.role === "viewer"
  ) {
    targetSupplierId = sp.supplier_id ?? null;
  } else {
    redirect("/dashboard");
  }

  const supabase = createClient();

  const [supMetaRes, suppliersRes] = await Promise.all([
    targetSupplierId
      ? supabase
          .from("suppliers")
          .select("id, name, pic, phone, email, commodity, status")
          .eq("id", targetSupplierId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
    profile.role !== "supplier"
      ? supabase
          .from("suppliers")
          .select("id, name")
          .eq("active", true)
          .order("name")
      : Promise.resolve({ data: [], error: null } as const)
  ]);

  const supMeta = (supMetaRes.data ?? null) as {
    id: string;
    name: string;
    pic: string | null;
    phone: string | null;
    email: string | null;
    commodity: string | null;
    status: string;
  } | null;
  const suppliers = (suppliersRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>;

  if (!targetSupplierId && profile.role !== "supplier") {
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
            title={t("fcst.title", lang)}
            subtitle={t("fcst.subtitlePreview", lang)}
            actions={
              <LinkButton
                href="/suppliers"
                variant="secondary"
                size="sm"
              >
                {t("fcst.backSuppliers", lang)}
              </LinkButton>
            }
          />
          <Section title={t("fcst.pickSupTitle", lang)}>
            {suppliers.length === 0 ? (
              <EmptyState message={t("fcst.noActiveSup", lang)} />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {suppliers.map((s) => (
                  <LinkButton
                    key={s.id}
                    href={`/supplier/forecast?supplier_id=${encodeURIComponent(s.id)}`}
                    variant="secondary"
                    size="sm"
                  >
                    {s.name}
                  </LinkButton>
                ))}
              </div>
            )}
          </Section>
        </PageContainer>
      </div>
    );
  }

  const [dailyRes, monthlyRes] = await Promise.all([
    supabase.rpc("supplier_forecast_90d", {
      p_supplier_id: profile.role === "supplier" ? undefined : targetSupplierId ?? undefined,
      p_horizon_days: 90
    }),
    supabase.rpc("supplier_forecast_monthly", {
      p_supplier_id: profile.role === "supplier" ? undefined : targetSupplierId ?? undefined,
      p_months: 3
    })
  ]);

  const daily = (dailyRes.data ?? []) as DailyRow[];
  const monthly = (monthlyRes.data ?? []) as MonthlyRow[];

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
          title={t("fcst.title", lang)}
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-2">
              <b>{supMeta?.name ?? targetSupplierId}</b>
              {supMeta?.pic && (
                <span>{ti("fcst.subPic", lang, { pic: supMeta.pic })}</span>
              )}
              {supMeta?.commodity && (
                <span className="rounded-full bg-accent-strong/10 px-2 py-0.5 text-[10px] font-bold text-accent-strong">
                  {supMeta.commodity}
                </span>
              )}
              <span className="text-ink2/60">
                {t("fcst.subHelp", lang)}
              </span>
            </span>
          }
          actions={
            profile.role === "supplier" ? (
              <LinkButton href="/dashboard" variant="secondary" size="sm">
                {t("fcst.backDashboard", lang)}
              </LinkButton>
            ) : (
              <LinkButton
                href="/supplier/forecast"
                variant="secondary"
                size="sm"
              >
                {t("fcst.backPickSup", lang)}
              </LinkButton>
            )
          }
        />

        {daily.length === 0 && monthly.length === 0 ? (
          <Section>
            <EmptyState
              icon="📭"
              title={t("fcst.noForecastTitle", lang)}
              message={t("fcst.noForecastMsg", lang)}
            />
          </Section>
        ) : (
          <ForecastShell
            supplierId={targetSupplierId ?? ""}
            daily={daily}
            monthly={monthly}
            isStaffPreview={profile.role !== "supplier"}
          />
        )}
      </PageContainer>
    </div>
  );
}
