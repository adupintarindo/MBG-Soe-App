import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
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
  CategoryBadge,
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

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

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

  // Forecast shortage derivations
  const upcomingPeakGap = upcoming.reduce(
    (m, u) => Math.max(m, Number(u.total_gap_kg) || 0),
    0
  );
  const upcomingTotalGap = upcoming.reduce(
    (s, u) => s + (Number(u.total_gap_kg) || 0),
    0
  );
  const upcomingTotalItems = upcoming.reduce(
    (s, u) => s + (u.short_items ?? 0),
    0
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const DAY_SHORT_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const MONTH_SHORT_ID = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

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
                  <th className="py-2 pr-3 text-center">No.</th>
                  <th className="py-2 pr-3 text-center">Komoditas</th>
                  <th className="py-2 pr-3 text-center">Kategori</th>
                  {months.map((m) => (
                    <th key={m} className="py-2 pr-3 text-center">
                      {monthLabel(m)}
                    </th>
                  ))}
                  <th className="py-2 pr-3 text-center">Total kg</th>
                  <th className="py-2 pr-3 text-center">Est. Biaya</th>
                </THead>
                <tbody>
                  {sortedItems.slice(0, 30).map(([code, total], i) => {
                    const it = itemByCode.get(code);
                    return (
                      <tr
                        key={code}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pr-3 text-center text-ink2">{i + 1}</td>
                        <td className="py-2 pr-3 text-center font-semibold">{code}</td>
                        <td className="py-2 pr-3 text-center">
                          <CategoryBadge category={it?.category} size="sm" />
                        </td>
                        {months.map((m) => (
                          <td
                            key={m}
                            className="py-2 pr-3 text-center font-mono text-xs"
                          >
                            {(matrix[code][m] ?? 0).toLocaleString("id-ID", {
                              maximumFractionDigits: 1
                            })}
                          </td>
                        ))}
                        <td className="py-2 pr-3 text-center font-mono text-xs font-black">
                          {total.toLocaleString("id-ID", {
                            maximumFractionDigits: 0
                          })}
                        </td>
                        <td className="py-2 pr-3 text-center font-mono text-xs text-emerald-800">
                          {formatIDR(itemCost.get(code) ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink/20 bg-paper">
                    <td colSpan={3} className="py-2 pr-3 text-center font-black">
                      TOTAL (TOP 30)
                    </td>
                    {months.map((m) => {
                      const col = sortedItems
                        .slice(0, 30)
                        .reduce((s, [c]) => s + (matrix[c][m] ?? 0), 0);
                      return (
                        <td
                          key={m}
                          className="py-2 pr-3 text-center font-mono text-xs font-black"
                        >
                          {col.toLocaleString("id-ID", {
                            maximumFractionDigits: 0
                          })}
                        </td>
                      );
                    })}
                    <td className="py-2 pr-3 text-center font-mono text-xs font-black">
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
          hint="Proyeksi hari dengan kekurangan stok relatif terhadap rencana BOM."
          accent={upcoming.length > 0 ? "warn" : "ok"}
          actions={
            upcoming.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-medium text-ink2/70">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Kritis
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Tinggi
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" /> Sedang
                </span>
              </div>
            ) : undefined
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon="✅"
              tone="ok"
              message="Tidak ada shortage terdeteksi dalam 30 hari ke depan."
            />
          ) : (
            <div>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-white px-3 py-2.5 ring-1 ring-amber-200/70">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
                    Hari Terdampak
                  </div>
                  <div className="mt-0.5 text-lg font-bold leading-tight text-amber-900">
                    {upcoming.length}
                    <span className="ml-1 text-[10px] font-medium text-amber-700/70">
                      / 30
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-white px-3 py-2.5 ring-1 ring-amber-200/70">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
                    Total Gap
                  </div>
                  <div className="mt-0.5 text-lg font-bold leading-tight text-amber-900">
                    {formatKg(upcomingTotalGap)}
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-white px-3 py-2.5 ring-1 ring-amber-200/70">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
                    Puncak / Hari
                  </div>
                  <div className="mt-0.5 text-lg font-bold leading-tight text-amber-900">
                    {formatKg(upcomingPeakGap)}
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-white px-3 py-2.5 ring-1 ring-amber-200/70">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
                    Total Item Kurang
                  </div>
                  <div className="mt-0.5 text-lg font-bold leading-tight text-amber-900">
                    {upcomingTotalItems}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((u) => {
                  const d = new Date(u.op_date);
                  const gap = Number(u.total_gap_kg) || 0;
                  const ratio = upcomingPeakGap > 0 ? gap / upcomingPeakGap : 0;
                  const tier =
                    ratio >= 0.8 ? "crit" : ratio >= 0.55 ? "high" : "med";
                  const cfg = {
                    crit: {
                      dot: "bg-red-500",
                      bar: "bg-gradient-to-r from-red-500 to-red-400",
                      track: "bg-red-100",
                      text: "text-red-900",
                      sub: "text-red-700/80",
                      ring: "ring-red-200/80",
                      bg: "bg-gradient-to-br from-red-50 to-white"
                    },
                    high: {
                      dot: "bg-amber-500",
                      bar: "bg-gradient-to-r from-amber-500 to-amber-400",
                      track: "bg-amber-100",
                      text: "text-amber-900",
                      sub: "text-amber-800/80",
                      ring: "ring-amber-200/80",
                      bg: "bg-gradient-to-br from-amber-50 to-white"
                    },
                    med: {
                      dot: "bg-yellow-400",
                      bar: "bg-gradient-to-r from-yellow-400 to-yellow-300",
                      track: "bg-yellow-100",
                      text: "text-yellow-900",
                      sub: "text-yellow-800/80",
                      ring: "ring-yellow-200/80",
                      bg: "bg-gradient-to-br from-yellow-50 to-white"
                    }
                  }[tier];
                  const isWknd = d.getDay() === 0 || d.getDay() === 6;
                  const diffDays = Math.round(
                    (d.getTime() - todayStart.getTime()) / 86400000
                  );
                  const rel =
                    diffDays === 0
                      ? "Hari ini"
                      : diffDays === 1
                        ? "Besok"
                        : diffDays > 1
                          ? `H+${diffDays}`
                          : `${diffDays}`;

                  return (
                    <div
                      key={u.op_date}
                      className={`group relative overflow-hidden rounded-xl ${cfg.bg} px-4 py-3 ring-1 ${cfg.ring} transition hover:-translate-y-0.5 hover:shadow-card`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-white/80 ring-1 ${cfg.ring}`}
                          >
                            <span
                              className={`text-[9px] font-bold uppercase leading-none tracking-wide ${cfg.sub}`}
                            >
                              {DAY_SHORT_ID[d.getDay()]}
                            </span>
                            <span
                              className={`mt-0.5 text-base font-bold leading-none ${cfg.text}`}
                            >
                              {d.getDate()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`flex items-center gap-1.5 text-[13px] font-bold ${cfg.text}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                              />
                              {MONTH_SHORT_ID[d.getMonth()]} {d.getFullYear()}
                              {isWknd && (
                                <span className="ml-1 rounded bg-white/70 px-1.5 py-px text-[9px] font-semibold tracking-wide text-ink2/70">
                                  WKND
                                </span>
                              )}
                            </div>
                            <div className={`mt-0.5 text-[11px] ${cfg.sub}`}>
                              {rel} · {u.short_items} item kurang
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${cfg.text}`}>
                            {formatKg(gap)}
                          </div>
                          <div
                            className={`text-[9px] font-semibold uppercase tracking-wider ${cfg.sub}`}
                          >
                            gap
                          </div>
                        </div>
                      </div>
                      <div
                        className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${cfg.track}`}
                      >
                        <div
                          className={`h-full rounded-full ${cfg.bar}`}
                          style={{
                            width: `${Math.max(8, Math.round(ratio * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
