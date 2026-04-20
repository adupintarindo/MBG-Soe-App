import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import {
  formatIDR,
  budgetBurn,
  costPerPortionDaily,
  type BudgetBurnRow,
  type CostPerPortionRow
} from "@/lib/engine";
import {
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  Section
} from "@/components/ui";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

export async function AnggaranTab({ supabase, lang, role }: Props) {
  const canWrite = role === "admin";

  const [burnRes, cppRes, budgetsRes] = await Promise.all([
    budgetBurn(supabase).catch(() => [] as BudgetBurnRow[]),
    costPerPortionDaily(supabase).catch(() => [] as CostPerPortionRow[]),
    supabase
      .from("budgets")
      .select(
        "id, period, source, source_name, amount_idr, target_cost_per_portion, note"
      )
      .order("period", { ascending: false })
      .limit(12)
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
  }>;

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const activeBurn =
    burn.find((b) => b.period === currentPeriod) ?? burn.slice(-1)[0];
  const totalBudget = Number(activeBurn?.budget_total ?? 0);
  const spentPaid = Number(activeBurn?.spent_paid ?? 0);
  const burnPct = Number(activeBurn?.burn_pct ?? 0);

  const cppWithValue = cpp.filter((r) => Number(r.cost_per_portion ?? 0) > 0);
  const avgCpp =
    cppWithValue.length > 0
      ? cppWithValue.reduce((s, r) => s + Number(r.cost_per_portion), 0) /
        cppWithValue.length
      : 0;
  const target = Number(cpp[0]?.target ?? 0);

  return (
    <>
      <KpiGrid>
        <KpiTile
          icon="💰"
          label={lang === "EN" ? "Total Budget" : "Total Anggaran"}
          value={formatIDR(totalBudget)}
          size="md"
          sub={activeBurn?.period ?? "—"}
        />
        <KpiTile
          icon="📉"
          label={lang === "EN" ? "Cash Paid" : "Realisasi Bayar"}
          value={formatIDR(spentPaid)}
          size="md"
          tone="bad"
          sub={lang === "EN" ? "burn to date" : "burn to date"}
        />
        <KpiTile
          icon="🔥"
          label="Burn %"
          value={`${burnPct.toFixed(1)}%`}
          tone={burnPct > 90 ? "bad" : burnPct > 70 ? "warn" : "ok"}
          sub={lang === "EN" ? "paid ÷ budget" : "paid ÷ budget"}
        />
        <KpiTile
          icon="🍱"
          label={lang === "EN" ? "Cost per Portion" : "Biaya per Porsi"}
          value={formatIDR(Math.round(avgCpp))}
          tone={
            target > 0 && avgCpp > target
              ? "bad"
              : target > 0 && avgCpp > 0
                ? "ok"
                : "default"
          }
          sub={
            target > 0
              ? `Target ${formatIDR(target)}`
              : lang === "EN"
                ? "last 30 days"
                : "30 hari terakhir"
          }
        />
      </KpiGrid>

      <Section
        title={lang === "EN" ? "Budget Master" : "Master Anggaran"}
        actions={
          canWrite ? (
            <LinkButton href="/budget/new" variant="primary" size="sm">
              {lang === "EN" ? "+ New Budget" : "+ Tambah Anggaran"}
            </LinkButton>
          ) : (
            <LinkButton href="/budget" variant="secondary" size="sm">
              {lang === "EN" ? "Detailed view" : "Tampilan Detail"}
            </LinkButton>
          )
        }
      >
        {budgets.length === 0 ? (
          <EmptyState
            icon="💡"
            message={
              canWrite
                ? lang === "EN"
                  ? "Click + New Budget to register an allocation."
                  : "Klik + Tambah Anggaran untuk mencatat alokasi."
                : lang === "EN"
                  ? "No data yet."
                  : "Belum ada data."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Period" : "Periode"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Source" : "Sumber"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Amount" : "Jumlah"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Target/Porsi" : "Target/Porsi"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Note" : "Catatan"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b) => (
                  <tr key={b.id} className="border-b border-ink/5">
                    <td className="px-2 py-2 font-mono text-[12px]">
                      {b.period}
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-bold">{b.source}</span>
                      {b.source_name && (
                        <span className="ml-2 text-ink2/60">
                          {b.source_name}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatIDR(Number(b.amount_idr))}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {b.target_cost_per_portion == null
                        ? "—"
                        : formatIDR(Number(b.target_cost_per_portion))}
                    </td>
                    <td className="px-2 py-2 text-ink2/70">
                      {b.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={lang === "EN" ? "Monthly Burn Rate" : "Burn Rate Bulanan"}
      >
        {burn.length === 0 ? (
          <EmptyState
            message={lang === "EN" ? "No data yet." : "Belum ada data."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Period" : "Periode"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Budget" : "Anggaran"}
                  </th>
                  <th className="px-2 py-2 text-right">PO</th>
                  <th className="px-2 py-2 text-right">Invoice</th>
                  <th className="px-2 py-2 text-right">Paid</th>
                  <th className="px-2 py-2 text-right">Burn %</th>
                </tr>
              </thead>
              <tbody>
                {burn.map((b) => (
                  <tr
                    key={b.period}
                    className={`border-b border-ink/5 ${
                      b.period === currentPeriod ? "bg-accent-strong/5" : ""
                    }`}
                  >
                    <td className="px-2 py-2 font-mono text-[12px]">
                      {b.period}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatIDR(Number(b.budget_total ?? 0))}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-ink2/80">
                      {formatIDR(Number(b.spent_po ?? 0))}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-ink2/80">
                      {formatIDR(Number(b.spent_invoice ?? 0))}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums font-bold">
                      {formatIDR(Number(b.spent_paid ?? 0))}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      <span
                        className={
                          Number(b.burn_pct ?? 0) > 90
                            ? "text-red-700"
                            : Number(b.burn_pct ?? 0) > 70
                              ? "text-amber-700"
                              : "text-emerald-700"
                        }
                      >
                        {Number(b.burn_pct ?? 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="text-[11.5px] text-ink2/60">
        {lang === "EN" ? (
          <>
            Detailed cost-per-portion view is in the{" "}
            <Link className="underline" href="/budget">
              Budget page
            </Link>
            .
          </>
        ) : (
          <>
            Analisis rinci biaya per porsi tersedia di{" "}
            <Link className="underline" href="/budget">
              halaman Anggaran lama
            </Link>
            .
          </>
        )}
      </p>
    </>
  );
}
