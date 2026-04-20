import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import { formatIDR, formatDateLong } from "@/lib/engine";
import {
  Badge,
  EmptyState,
  LinkButton,
  Section
} from "@/components/ui";
import { listPettyCash, type PettyCash } from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

export async function PettyCashTab({ supabase, lang, role }: Props) {
  const canWrite = role === "admin" || role === "operator";

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 60);
  const fromIso = fromDate.toISOString().slice(0, 10);

  let txs: PettyCash[] = [];
  try {
    txs = await listPettyCash(supabase, { from: fromIso, limit: 200 });
  } catch {
    // no-op
  }

  const totalMasuk = txs
    .filter((r) => r.direction === "masuk")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalKeluar = txs
    .filter((r) => r.direction === "keluar")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const saldo = totalMasuk - totalKeluar;

  return (
    <>
      <Section
        title={lang === "EN" ? "Petty Cash (Lamp. 30f)" : "Kas Kecil (Lamp. 30f)"}
        hint={
          lang === "EN"
            ? "Small operational disbursements under the petty cash float. Log for Lampiran 30f."
            : "Pengeluaran operasional kecil dari kas kecil. Log untuk Lampiran 30f."
        }
        actions={
          canWrite ? (
            <LinkButton href="/keuangan/petty-cash/new" variant="primary" size="sm">
              {lang === "EN" ? "+ New Tx" : "+ Transaksi Baru"}
            </LinkButton>
          ) : null
        }
      >
        {txs.length === 0 ? (
          <EmptyState
            icon="💴"
            message={
              lang === "EN"
                ? "No petty-cash transactions in last 60 days."
                : "Belum ada transaksi kas kecil 60 hari terakhir."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Day, Date" : "Hari, Tanggal"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Direction" : "Arah"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Description" : "Keterangan"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Amount" : "Jumlah"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Balance" : "Saldo"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {txs.map((r) => (
                  <tr key={r.id} className="border-b border-ink/5">
                    <td className="px-2 py-2 text-[12px] font-semibold">
                      {formatDateLong(r.tx_date, lang)}
                      {r.tx_time && (
                        <span className="ml-1 font-mono text-ink2/50">
                          {r.tx_time.slice(0, 5)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={r.direction === "masuk" ? "ok" : "bad"}>
                        {r.direction === "masuk"
                          ? lang === "EN"
                            ? "In"
                            : "Masuk"
                          : lang === "EN"
                            ? "Out"
                            : "Keluar"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-ink2/80">
                      {r.description ?? "—"}
                    </td>
                    <td
                      className={`px-2 py-2 text-right tabular-nums ${
                        r.direction === "masuk"
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {formatIDR(Number(r.amount ?? 0))}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-ink2/70">
                      {r.balance_after != null
                        ? formatIDR(Number(r.balance_after))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
