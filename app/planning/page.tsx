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

export const dynamic = "force-dynamic";

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

  const items = itemsRes.data ?? [];
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

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-black text-ink">📈 Rencana Kebutuhan Bahan</h1>
          <p className="text-sm text-ink2/80">
            Proyeksi 6 bulan berdasarkan menu assignment × porsi efektif × BOM
          </p>
        </div>

        {/* KPI row */}
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI
            icon="📅"
            label="Hari Operasional"
            value={`${opDays} / ${daily.length}`}
            sub="30 hari ke depan"
          />
          <KPI
            icon="🍽️"
            label="Total Porsi"
            value={totalPorsi.toLocaleString("id-ID")}
            sub="akumulasi horizon"
          />
          <KPI
            icon="⚖️"
            label="Total Kebutuhan"
            value={formatKg(totalKg, 0)}
            sub="bahan basah"
          />
          <KPI
            icon="💰"
            label="Estimasi Belanja"
            value={formatIDR(grandTotalCost)}
            sub="6 bulan ke depan"
          />
        </section>

        {/* Category pie (as bars) */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            Distribusi Kebutuhan per Kategori (6 bulan)
          </h2>
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
                        className="h-full bg-ink"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Monthly matrix */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            Matriks Kebutuhan · {months.length} Bulan · {sortedItems.length} komoditas
          </h2>
          {sortedItems.length === 0 ? (
            <div className="rounded-xl bg-ink/5 p-4 text-sm text-ink2">
              Belum ada data kebutuhan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                    <th className="py-2">#</th>
                    <th className="py-2">Komoditas</th>
                    <th className="py-2">Kategori</th>
                    {months.map((m) => (
                      <th key={m} className="py-2 text-right">
                        {monthLabel(m)}
                      </th>
                    ))}
                    <th className="py-2 text-right">Total kg</th>
                    <th className="py-2 text-right">Est. Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.slice(0, 30).map(([code, total], i) => {
                    const it = itemByCode.get(code);
                    return (
                      <tr key={code} className="border-b border-ink/5">
                        <td className="py-2 text-ink2">{i + 1}</td>
                        <td className="py-2 font-semibold">{code}</td>
                        <td className="py-2 text-[10px] font-bold text-ink2/70">
                          {it?.category}
                        </td>
                        {months.map((m) => (
                          <td
                            key={m}
                            className="py-2 text-right font-mono text-xs"
                          >
                            {(matrix[code][m] ?? 0).toLocaleString("id-ID", {
                              maximumFractionDigits: 1
                            })}
                          </td>
                        ))}
                        <td className="py-2 text-right font-mono text-xs font-black">
                          {total.toLocaleString("id-ID", {
                            maximumFractionDigits: 0
                          })}
                        </td>
                        <td className="py-2 text-right font-mono text-xs text-emerald-800">
                          {formatIDR(itemCost.get(code) ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink/20 bg-paper">
                    <td colSpan={3} className="py-2 font-black">
                      TOTAL (TOP 30)
                    </td>
                    {months.map((m) => {
                      const col = sortedItems
                        .slice(0, 30)
                        .reduce((s, [c]) => s + (matrix[c][m] ?? 0), 0);
                      return (
                        <td
                          key={m}
                          className="py-2 text-right font-mono text-xs font-black"
                        >
                          {col.toLocaleString("id-ID", {
                            maximumFractionDigits: 0
                          })}
                        </td>
                      );
                    })}
                    <td className="py-2 text-right font-mono text-xs font-black">
                      {sortedItems
                        .slice(0, 30)
                        .reduce((s, [, q]) => s + q, 0)
                        .toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 text-right font-mono text-xs font-black text-emerald-800">
                      {formatIDR(
                        sortedItems
                          .slice(0, 30)
                          .reduce((s, [c]) => s + (itemCost.get(c) ?? 0), 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* 30-day daily planning */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            30 Hari ke Depan · Planning Harian
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                  <th className="py-2">Tanggal</th>
                  <th className="py-2">Menu</th>
                  <th className="py-2 text-right">Porsi</th>
                  <th className="py-2 text-right">Porsi Eff</th>
                  <th className="py-2 text-right">Kebutuhan</th>
                  <th className="py-2 text-right">Short</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((p) => (
                  <tr key={p.op_date} className="border-b border-ink/5">
                    <td className="py-2 font-mono text-xs">{p.op_date}</td>
                    <td className="py-2 text-xs">
                      {p.menu_name ?? (
                        <span className="text-ink2/60">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {p.porsi_total.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {Number(p.porsi_eff).toLocaleString("id-ID", {
                        maximumFractionDigits: 1
                      })}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {formatKg(Number(p.total_kg), 1)}
                    </td>
                    <td
                      className={`py-2 text-right font-mono text-xs font-black ${p.short_items > 0 ? "text-red-700" : "text-emerald-700"}`}
                    >
                      {p.short_items}
                    </td>
                    <td className="py-2 text-xs">
                      {p.operasional ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                          OP
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          NON-OP
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Shortage forecast */}
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            🔭 Forecast Shortage · 30 Hari
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
              ✅ Tidak ada shortage terdeteksi.
            </div>
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
        </section>
      </main>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  sub
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink2/80">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-2xl font-black text-ink">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-ink2/70">{sub}</div>
    </div>
  );
}
