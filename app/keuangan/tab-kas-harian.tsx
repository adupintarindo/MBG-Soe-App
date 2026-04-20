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
import { listDailyCashLog, listChartOfAccounts, type DailyCashLog } from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

export async function KasHarianTab({ supabase, lang, role }: Props) {
  const canWrite = role === "admin" || role === "operator";

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 30);
  const fromIso = fromDate.toISOString().slice(0, 10);

  let logs: DailyCashLog[] = [];
  let coaLookup: Record<string, string> = {};
  try {
    [logs, coaLookup] = await Promise.all([
      listDailyCashLog(supabase, { from: fromIso, limit: 200 }),
      listChartOfAccounts(supabase, { active: true }).then((rows) =>
        Object.fromEntries(rows.map((r) => [r.code, r.name]))
      )
    ]);
  } catch {
    // Migrations may not be applied yet — render empty state.
  }

  const totalMasuk = logs.reduce((s, r) => s + Number(r.uang_masuk ?? 0), 0);
  const totalKeluar = logs.reduce((s, r) => s + Number(r.uang_keluar ?? 0), 0);
  const saldo = totalMasuk - totalKeluar;
  const todayIso = today.toISOString().slice(0, 10);
  const todayTxCount = logs.filter((r) => r.log_date === todayIso).length;

  return (
    <>
      <KpiGrid>
        <KpiTile
          icon="📥"
          label={lang === "EN" ? "In (30d)" : "Uang Masuk (30h)"}
          value={formatIDR(totalMasuk)}
          size="md"
          tone="ok"
        />
        <KpiTile
          icon="📤"
          label={lang === "EN" ? "Out (30d)" : "Uang Keluar (30h)"}
          value={formatIDR(totalKeluar)}
          size="md"
          tone="bad"
        />
        <KpiTile
          icon="⚖️"
          label={lang === "EN" ? "Net Flow" : "Saldo Bersih"}
          value={formatIDR(saldo)}
          size="md"
          tone={saldo >= 0 ? "ok" : "bad"}
        />
        <KpiTile
          icon="📆"
          label={lang === "EN" ? "Today's Tx" : "Transaksi Hari Ini"}
          value={todayTxCount.toString()}
          size="md"
          sub={todayIso}
        />
      </KpiGrid>

      <Section
        title={lang === "EN" ? "Daily Cash Log (Lamp. 30b)" : "Kas Harian (Lamp. 30b)"}
        actions={
          canWrite ? (
            <LinkButton href="/keuangan/kas-harian/new" variant="primary" size="sm">
              {lang === "EN" ? "+ New Entry" : "+ Tambah Transaksi"}
            </LinkButton>
          ) : null
        }
      >
        {logs.length === 0 ? (
          <EmptyState
            icon="📒"
            message={
              lang === "EN"
                ? "No transactions in last 30 days. Apply migration 0050 + seed, or add the first entry."
                : "Belum ada transaksi 30 hari terakhir. Apply migrasi 0050 + seed, atau tambah transaksi pertama."
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
                    {lang === "EN" ? "Category" : "Kategori"}
                  </th>
                  <th className="px-2 py-2">PO</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Description" : "Keterangan"}
                  </th>
                  <th className="px-2 py-2 text-right text-emerald-700">
                    {lang === "EN" ? "In" : "Masuk"}
                  </th>
                  <th className="px-2 py-2 text-right text-red-700">
                    {lang === "EN" ? "Out" : "Keluar"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((r) => (
                  <tr key={r.id} className="border-b border-ink/5">
                    <td className="px-2 py-2 font-mono text-[12px]">
                      {r.log_date}
                      {r.log_time && (
                        <span className="ml-1 text-ink2/50">{r.log_time.slice(0, 5)}</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {r.category ? (
                        <Badge tone="info">
                          {r.category} · {coaLookup[r.category] ?? "?"}
                        </Badge>
                      ) : (
                        <span className="text-ink2/40">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono text-[12px] text-ink2/80">
                      {r.po_no ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-ink2/80">
                      {r.keterangan ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-emerald-700">
                      {Number(r.uang_masuk ?? 0) > 0
                        ? formatIDR(Number(r.uang_masuk))
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-red-700">
                      {Number(r.uang_keluar ?? 0) > 0
                        ? formatIDR(Number(r.uang_keluar))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/10 bg-paper/50 font-bold">
                  <td className="px-2 py-2" colSpan={4}>
                    Total 30 {lang === "EN" ? "days" : "hari"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-700">
                    {formatIDR(totalMasuk)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-red-700">
                    {formatIDR(totalKeluar)}
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
