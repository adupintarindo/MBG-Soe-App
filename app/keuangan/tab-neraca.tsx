import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import { formatIDR } from "@/lib/engine";
import {
  Badge,
  EmptyState,
  Section
} from "@/components/ui";
import {
  listChartOfAccounts,
  listGlEntry,
  type ChartOfAccount,
  type GlEntry,
  type CoaCategory
} from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

interface TrialBalanceRow {
  code: string;
  name: string;
  category: CoaCategory;
  debit: number;
  credit: number;
  balance: number;
}

export async function NeracaTab({ supabase, lang }: Props) {
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(1); // current month start
  const fromIso = fromDate.toISOString().slice(0, 10);

  let accounts: ChartOfAccount[] = [];
  let entries: GlEntry[] = [];
  try {
    [accounts, entries] = await Promise.all([
      listChartOfAccounts(supabase, { active: true }),
      listGlEntry(supabase, { from: fromIso, limit: 1000 })
    ]);
  } catch {
    // no-op
  }

  // Build trial balance per account (month-to-date)
  const rows: Record<string, TrialBalanceRow> = {};
  for (const a of accounts) {
    if (a.parent_code === null) continue; // skip header accounts
    rows[a.code] = {
      code: a.code,
      name: a.name,
      category: a.category,
      debit: 0,
      credit: 0,
      balance: 0
    };
  }
  for (const e of entries) {
    const amt = Number(e.amount ?? 0);
    if (e.debit_account && rows[e.debit_account]) {
      rows[e.debit_account].debit += amt;
    }
    if (e.credit_account && rows[e.credit_account]) {
      rows[e.credit_account].credit += amt;
    }
  }
  // Balance: asset/expense = debit - credit; liability/equity/revenue = credit - debit
  for (const r of Object.values(rows)) {
    if (r.category === "asset" || r.category === "expense") {
      r.balance = r.debit - r.credit;
    } else {
      r.balance = r.credit - r.debit;
    }
  }

  const groups: Record<CoaCategory, TrialBalanceRow[]> = {
    asset: [],
    liability: [],
    equity: [],
    revenue: [],
    expense: []
  };
  Object.values(rows).forEach((r) => {
    groups[r.category].push(r);
  });

  const sumOf = (cat: CoaCategory) =>
    groups[cat].reduce((s, r) => s + r.balance, 0);

  const totalAsset = sumOf("asset");
  const totalLiability = sumOf("liability");
  const totalEquity = sumOf("equity");
  const totalRevenue = sumOf("revenue");
  const totalExpense = sumOf("expense");
  const netIncome = totalRevenue - totalExpense;
  const equityPlusIncome = totalEquity + netIncome;
  const liabPlusEquity = totalLiability + equityPlusIncome;
  const isBalanced = Math.abs(totalAsset - liabPlusEquity) < 0.01;

  const CATEGORY_LABEL: Record<CoaCategory, { id: string; en: string }> = {
    asset: { id: "Aset", en: "Assets" },
    liability: { id: "Liabilitas", en: "Liabilities" },
    equity: { id: "Ekuitas", en: "Equity" },
    revenue: { id: "Pendapatan", en: "Revenue" },
    expense: { id: "Beban", en: "Expenses" }
  };

  return (
    <>
      {accounts.length === 0 ? (
        <Section
          title={lang === "EN" ? "Trial Balance" : "Neraca (Month-to-Date)"}
          hint={
            lang === "EN"
              ? "Month-to-date account balances aggregated from journal entries. Debit should equal credit."
              : "Saldo akun MTD hasil agregat jurnal. Total debit harus sama dengan total kredit."
          }
        >
          <EmptyState
            icon="⚖️"
            message={
              lang === "EN"
                ? "No accounts seeded. Apply seed 0050_sppg_staff_and_coa.sql."
                : "Chart of Accounts belum di-seed. Jalankan seed 0050_sppg_staff_and_coa.sql."
            }
          />
        </Section>
      ) : (
        (Object.keys(groups) as CoaCategory[]).map((cat) => {
          const list = groups[cat];
          if (list.length === 0) return null;
          const subtotal = sumOf(cat);
          return (
            <Section
              key={cat}
              title={
                lang === "EN"
                  ? CATEGORY_LABEL[cat].en
                  : CATEGORY_LABEL[cat].id
              }
              hint={
                lang === "EN"
                  ? `${list.length} account(s) in ${CATEGORY_LABEL[cat].en}. Subtotal is the normal-balance sum for this category.`
                  : `${list.length} akun pada kategori ${CATEGORY_LABEL[cat].id}. Subtotal adalah jumlah saldo normal kategori ini.`
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                    <tr>
                      <th className="px-2 py-2">Code</th>
                      <th className="px-2 py-2">
                        {lang === "EN" ? "Account" : "Akun"}
                      </th>
                      <th className="px-2 py-2 text-right">Debit MTD</th>
                      <th className="px-2 py-2 text-right">Credit MTD</th>
                      <th className="px-2 py-2 text-right">
                        {lang === "EN" ? "Balance" : "Saldo"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.code} className="border-b border-ink/5">
                        <td className="px-2 py-2 font-mono text-[12px]">
                          {r.code}
                        </td>
                        <td className="px-2 py-2">{r.name}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-ink2/70">
                          {r.debit > 0 ? formatIDR(r.debit) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-ink2/70">
                          {r.credit > 0 ? formatIDR(r.credit) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums font-bold">
                          {formatIDR(r.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink/10 bg-paper/50 font-bold">
                      <td className="px-2 py-2" colSpan={4}>
                        Subtotal
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        <Badge
                          tone={
                            cat === "asset" || cat === "revenue"
                              ? "ok"
                              : cat === "expense"
                                ? "bad"
                                : "info"
                          }
                        >
                          {formatIDR(subtotal)}
                        </Badge>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>
          );
        })
      )}

      <p className="text-[11.5px] text-ink2/60">
        {lang === "EN"
          ? "Balance period: month-to-date. Full trial balance PDF generated via /api/bgn/generate?lampiran=30e."
          : "Periode: awal bulan s/d hari ini. Neraca PDF lengkap dibuat via /api/bgn/generate?lampiran=30e."}
      </p>
    </>
  );
}
