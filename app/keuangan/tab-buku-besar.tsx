import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import { formatIDR } from "@/lib/engine";
import {
  Badge,
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  Section
} from "@/components/ui";
import {
  listChartOfAccounts,
  listGlEntry,
  type ChartOfAccount,
  type GlEntry
} from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

const CATEGORY_TONE: Record<
  ChartOfAccount["category"],
  "ok" | "warn" | "bad" | "info" | "accent"
> = {
  asset: "info",
  liability: "warn",
  equity: "accent",
  revenue: "ok",
  expense: "bad"
};

export async function BukuBesarTab({ supabase, lang, role }: Props) {
  const canWrite = role === "admin" || role === "operator";

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 30);
  const fromIso = fromDate.toISOString().slice(0, 10);

  let accounts: ChartOfAccount[] = [];
  let entries: GlEntry[] = [];
  try {
    [accounts, entries] = await Promise.all([
      listChartOfAccounts(supabase, { active: true }),
      listGlEntry(supabase, { from: fromIso, limit: 200 })
    ]);
  } catch {
    // no-op
  }

  const acctName = Object.fromEntries(accounts.map((a) => [a.code, a.name]));

  const totalDebit = entries.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  // Category rollup (expense/revenue/asset/...)
  const rollup: Record<string, number> = {};
  entries.forEach((e) => {
    const cat = accounts.find((a) => a.code === e.debit_account)?.category;
    if (!cat) return;
    rollup[cat] = (rollup[cat] ?? 0) + Number(e.amount ?? 0);
  });

  return (
    <>
      <KpiGrid>
        <KpiTile
          icon="📚"
          label={lang === "EN" ? "Accounts (active)" : "Akun Aktif"}
          value={accounts.length.toString()}
          size="md"
        />
        <KpiTile
          icon="🧾"
          label={lang === "EN" ? "Entries (30d)" : "Jurnal (30h)"}
          value={entries.length.toString()}
          size="md"
        />
        <KpiTile
          icon="💸"
          label={lang === "EN" ? "Expense (30d)" : "Beban (30h)"}
          value={formatIDR(rollup.expense ?? 0)}
          size="md"
          tone="bad"
        />
        <KpiTile
          icon="💰"
          label={lang === "EN" ? "Revenue (30d)" : "Pendapatan (30h)"}
          value={formatIDR(rollup.revenue ?? 0)}
          size="md"
          tone="ok"
        />
      </KpiGrid>

      <Section
        title={lang === "EN" ? "Chart of Accounts" : "Chart of Accounts (Bagan Akun)"}
      >
        {accounts.length === 0 ? (
          <EmptyState
            icon="📚"
            message={
              lang === "EN"
                ? "No COA seeded. Apply seed 0050_sppg_staff_and_coa.sql."
                : "Chart of Accounts belum di-seed. Jalankan seed 0050_sppg_staff_and_coa.sql."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Name" : "Nama Akun"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Category" : "Kategori"}
                  </th>
                  <th className="px-2 py-2">Parent</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Note" : "Catatan"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.code} className="border-b border-ink/5">
                    <td className="px-2 py-2 font-mono text-[12px]">
                      {a.code}
                    </td>
                    <td className="px-2 py-2 font-bold">{a.name}</td>
                    <td className="px-2 py-2">
                      <Badge tone={CATEGORY_TONE[a.category]}>
                        {a.category}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 font-mono text-[12px] text-ink2/60">
                      {a.parent_code ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-ink2/70">{a.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={lang === "EN" ? "General Ledger (Lamp. 30e)" : "Buku Besar (Lamp. 30e)"}
        actions={
          canWrite ? (
            <LinkButton href="/keuangan/buku-besar/new" variant="primary" size="sm">
              {lang === "EN" ? "+ New Entry" : "+ Jurnal Baru"}
            </LinkButton>
          ) : null
        }
      >
        {entries.length === 0 ? (
          <EmptyState
            message={
              lang === "EN" ? "No ledger entries yet." : "Belum ada jurnal."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Date" : "Tanggal"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Description" : "Keterangan"}
                  </th>
                  <th className="px-2 py-2">Debit</th>
                  <th className="px-2 py-2">Credit</th>
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Amount" : "Jumlah"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-ink/5">
                    <td className="px-2 py-2 font-mono text-[12px]">
                      {e.entry_date}
                    </td>
                    <td className="px-2 py-2 text-ink2/80">
                      {e.description ?? "—"}
                    </td>
                    <td className="px-2 py-2 font-mono text-[12px]">
                      {e.debit_account ?? "—"}
                      {e.debit_account && (
                        <span className="ml-1 text-ink2/60">
                          {acctName[e.debit_account] ?? ""}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono text-[12px]">
                      {e.credit_account ?? "—"}
                      {e.credit_account && (
                        <span className="ml-1 text-ink2/60">
                          {acctName[e.credit_account] ?? ""}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-[11px] text-ink2/60">
                      {e.source_type ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatIDR(Number(e.amount ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/10 bg-paper/50 font-bold">
                  <td className="px-2 py-2" colSpan={5}>
                    Total 30 {lang === "EN" ? "days" : "hari"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatIDR(totalDebit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
