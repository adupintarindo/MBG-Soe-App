import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  budgetBurn,
  costPerPortionDaily,
  type BudgetBurnRow,
  type CostPerPortionRow
} from "@/lib/engine";
import {
  EmptyState,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import {
  BurnTable,
  CPPTable,
  BudgetsTable,
  type BudgetRow
} from "./budget-tables";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const canWrite = profile.role === "admin";

  const [burnRes, cppRes, budgetsRes] = await Promise.all([
    budgetBurn(supabase).catch(() => [] as BudgetBurnRow[]),
    costPerPortionDaily(supabase).catch(() => [] as CostPerPortionRow[]),
    supabase
      .from("budgets")
      .select(
        "id, period, source, source_name, amount_idr, target_cost_per_portion, note, created_at"
      )
      .order("period", { ascending: false })
      .order("source")
  ]);

  const burn = burnRes;
  const cpp = cppRes;
  const budgets = (budgetsRes.data ?? []) as Array<{
    id: number;
    period: string;
    source: string;
    source_name: string | null;
    amount_idr: number | string;
    target_cost_per_portion: number | string | null;
    note: string | null;
    created_at: string;
  }>;

  const budgetRows: BudgetRow[] = budgets.map((b) => ({
    id: b.id,
    period: b.period,
    source: b.source,
    source_name: b.source_name,
    amount_idr: Number(b.amount_idr),
    target_cost_per_portion:
      b.target_cost_per_portion == null
        ? null
        : Number(b.target_cost_per_portion),
    note: b.note
  }));

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          actions={
            canWrite ? (
              <LinkButton href="/budget/new" variant="primary" size="sm">
                {t("bud.btnNew", lang)}
              </LinkButton>
            ) : (
              <LinkButton href="/payments" variant="secondary" size="sm">
                {t("tabPayments", lang)}
              </LinkButton>
            )
          }
        />

        <Section banner icon="🔥" title={t("bud.burnTitle", lang)} hint={t("bud.burnHint", lang)}>
          {burn.length === 0 ? (
            <EmptyState message={t("common.noData", lang)} />
          ) : (
            <BurnTable lang={lang} rows={burn} />
          )}
        </Section>

        <Section banner icon="🍱" title={t("bud.cppTitle", lang)} hint={t("bud.cppHint", lang)}>
          {cpp.length === 0 ? (
            <EmptyState message={t("common.noData", lang)} />
          ) : (
            <CPPTable lang={lang} rows={cpp} />
          )}
        </Section>

        <Section banner icon="💰" title={t("bud.budgetsTitle", lang)} hint={t("bud.budgetsHint", lang)}>
          {budgetRows.length === 0 ? (
            <EmptyState
              icon="💡"
              message={
                canWrite
                  ? lang === "EN"
                    ? "Click + New Budget to register an allocation."
                    : "Klik + Tambah Anggaran untuk mencatat alokasi."
                  : t("common.noData", lang)
              }
            />
          ) : (
            <BudgetsTable lang={lang} rows={budgetRows} />
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
