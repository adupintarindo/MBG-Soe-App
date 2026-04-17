import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import {
  dailyPlanning,
  monthlyRequirements,
  upcomingShortages,
  formatKg,
  formatIDR,
  toISODate,
  type MonthlyRequirement,
  type DailyPlan,
  type UpcomingShortage
} from "@/lib/engine";
import {
  Badge,
  EmptyState,
  KpiGrid,
  KpiTile,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";

export const dynamic = "force-dynamic";

interface ItemLite {
  code: string;
  unit: string;
  category: string;
  price_idr: number | string;
}

export default async function PlanningPage() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active, supplier_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.active) redirect("/dashboard");

  const now = new Date();
  const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));

  const [daily, monthly, upcoming, itemsRes] = await Promise.all([
    dailyPlanning(supabase, 30).catch(() => [] as DailyPlan[]),
    monthlyRequirements(supabase, monthStart, 6).catch(
      () => [] as MonthlyRequirement[]
    ),
    upcomingShortages(supabase, 30).catch(() => [] as UpcomingShortage[]),
    supabase.from("items").select("code, unit, category, price_idr")
  ]);

  const items = (itemsRes.data ?? []) as ItemLite[];
  const itemByCode = new Map(items.map((i) => [i.code, i]));

  // Monthly matrix
  const months = Array.from(
    new Set(monthly.map((r) => r.month.slice(0, 7)))
  ).sort();
  const itemTotals = new Map<string, number>();
  const itemCost = new Map<string, number>();
  for (const r of monthly) {
    const qty = Number(r.qty_kg);
    itemTotals.set(r.item_code, (itemTotals.get(r.item_code) ?? 0) + qty);
    const price = Number(itemByCode.get(r.item_code)?.price_idr ?? 0);
    itemCost.set(r.item_code, (itemCost.get(r.item_code) ?? 0) + qty * price);
  }

  const sortedItems = [...itemTotals.entries()].sort((a, b) => b[1] - a[1]);
  const grandTotalKg = sortedItems.reduce((s, [, q]) => s + q, 0);
  const grandTotalCost = [...itemCost.values()].reduce((s, q) => s + q, 0);

  const matrix: Record<string, Record<string, number>> = {};
  for (const [code] of sortedItems) matrix[code] = {};
  for (const r of monthly) {
    if (!matrix[r.item_code]) continue;
    const m = r.month.slice(0, 7);
    matrix[r.item_code][m] =
      (matrix[r.item_code][m] ?? 0) + Number(r.qty_kg);
  }

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(Number(y), Number(mo) - 1, 1);
    return date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
  };

  const opDays = daily.filter((d) => d.operasional).length;
  const totalPorsi = daily.reduce((s, d) => s + d.porsi_total, 0);
  const totalKg = daily.reduce((s, d) => s + Number(d.total_kg), 0);

  // Category aggregation
  const catTotals = new Map<string, number>();
  for (const [code, qty] of itemTotals) {
    const cat = itemByCode.get(code)?.category ?? "LAIN";
    catTotals.set(cat, (catTotals.get(cat) ?? 0) + qty);
  }

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📈"
          title="Rencana Kebutuhan Bahan"
          subtitle="Proyeksi 6 bulan berdasarkan menu assignment × porsi efektif × BOM"
        />

        <KpiGrid>
          <KpiTile
            icon="📅"
            label="Hari Operasional"
            value={`${opDays} / ${daily.length}`}
            sub="30 hari ke depan"
          />
          <KpiTile
            icon="🍽️"
            label="Total Porsi"
            value={totalPorsi.toLocaleString("id-ID")}
            sub="akumulasi horizon"
          />
          <KpiTile
            icon="⚖️"
            label="Total Kebutuhan"
            value={formatKg(totalKg, 0)}
            sub="bahan basah"
          />
          <KpiTile
            icon="💰"
            label="Estimasi Belanja"
            value={formatIDR(grandTotalCost)}
            tone="ok"
            size="md"
            sub="6 bulan ke depan"
          />
        </KpiGrid>

        <Section title="Distribusi Kebutuhan per Kategori (6 bulan)" accent="info">
          <div className="space-y-2">
            {[...catTotals.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cat, qty]) => {
                const pct = grandTotalKg > 0 ? (qty / grandTotalKg) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-ink">{cat}</span>
                      <span className="font-mono text-ink2">
                        {formatKg(qty, 0)} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/5">
                      <div
                        className="h-full bg-primary-gradient transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Section>

        <Section
          title={`Matriks Kebutuhan · ${months.length} Bulan · ${sortedItems.length} komoditas`}
          hint="Top 30 komoditas, urut dari volume terbesar."
        >
          {sortedItems.length === 0 ? (
            <EmptyState message="Belum ada data kebutuhan." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Komoditas</th>
                  <th className="py-2 pr-3">Kategori</th>
                  {months.map((m) => (
                    <th key={m} className="py-2 pr-3 text-right">
                      {monthLabel(m)}
                    </th>
                  ))}
                  <th className="py-2 pr-3 text-right">Total kg</th>
                  <th className="py-2 pr-3 text-right">Est. Biaya</th>
                </THead>
                <tbody>
                  {sortedItems.slice(0, 30).map(([code, total], i) => {
                    const it = itemByCode.get(code);
                    return (
                      <tr
                        key={code}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pr-3 text-ink2">{i + 1}</td>
                        <td className="py-2 pr-3 font-semibold">{code}</td>
                        <td className="py-2 pr-3 text-[10px] font-bold text-ink2/70">
                          {it?.category}
                        </td>
                        {months.map((m) => (
                          <td
                            key={m}
                            className="py-2 pr-3 text-right font-mono text-xs"
                          >
                            {(matrix[code][m] ?? 0).toLocaleString("id-ID", {
                              maximumFractionDigits: 1
                            })}
                          </td>
                        ))}
                        <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                          {total.toLocaleString("id-ID", {
                            maximumFractionDigits: 0
                          })}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs text-emerald-800">
                          {formatIDR(itemCost.get(code) ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink/20 bg-paper">
                    <td colSpan={3} className="py-2 pr-3 font-black">
                      TOTAL (TOP 30)
                    </td>
                    {months.map((m) => {
                      const col = sortedItems
                        .slice(0, 30)
                        .reduce((s, [c]) => s + (matrix[c][m] ?? 0), 0);
                      return (
                        <td
                          key={m}
                          className="py-2 pr-3 text-right font-mono text-xs font-black"
                        >
                          {col.toLocaleString("id-ID", {
                            maximumFractionDigits: 0
                          })}
                        </td>
                      );
                    })}
                    <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                      {sortedItems
                        .slice(0, 30)
                        .reduce((s, [, q]) => s + q, 0)
                        .toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs font-black text-emerald-800">
                      {formatIDR(
                        sortedItems
                          .slice(0, 30)
                          .reduce((s, [c]) => s + (itemCost.get(c) ?? 0), 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section title="30 Hari ke Depan · Planning Harian">
          <TableWrap>
            <table className="w-full text-sm">
              <THead>
                <th className="py-2 pr-3">Tanggal</th>
                <th className="py-2 pr-3">Menu</th>
                <th className="py-2 pr-3 text-right">Porsi</th>
                <th className="py-2 pr-3 text-right">Porsi Eff</th>
                <th className="py-2 pr-3 text-right">Kebutuhan</th>
                <th className="py-2 pr-3 text-right">Short</th>
                <th className="py-2 pr-3">Status</th>
              </THead>
              <tbody>
                {daily.map((p) => (
                  <tr
                    key={p.op_date}
                    className="row-hover border-b border-ink/5"
                  >
                    <td className="py-2 pr-3 font-mono text-xs">{p.op_date}</td>
                    <td className="py-2 pr-3 text-xs">
                      {p.menu_name ?? (
                        <span className="text-ink2/60">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {p.porsi_total.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {Number(p.porsi_eff).toLocaleString("id-ID", {
                        maximumFractionDigits: 1
                      })}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {formatKg(Number(p.total_kg), 1)}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-mono text-xs font-black ${p.short_items > 0 ? "text-red-700" : "text-emerald-700"}`}
                    >
                      {p.short_items}
                    </td>
                    <td className="py-2 pr-3">
                      {p.operasional ? (
                        <Badge tone="ok">OP</Badge>
                      ) : (
                        <Badge tone="warn">NON-OP</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Section>

        <Section
          title="🔭 Forecast Shortage · 30 Hari"
          accent={upcoming.length > 0 ? "warn" : "ok"}
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon="✅"
              tone="ok"
              message="Tidak ada shortage terdeteksi."
            />
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {upcoming.map((u) => (
                <div
                  key={u.op_date}
                  className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200"
                >
                  <div>
                    <div className="text-xs font-bold text-amber-900">
                      {u.op_date}
                    </div>
                    <div className="text-[11px] text-amber-800">
                      {u.short_items} item kurang
                    </div>
                  </div>
                  <div className="text-right text-xs font-bold text-amber-900">
                    gap {formatKg(Number(u.total_gap_kg))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
