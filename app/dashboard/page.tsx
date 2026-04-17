import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { TransactionLog, type TxRow } from "@/components/transaction-log";
import {
  formatIDR,
  formatKg,
  formatDateID,
  stockShortageForDate,
  upcomingShortages,
  toISODate,
  monthlyRequirements,
  topSuppliersBySpend,
  dailyPlanning,
  dashboardKpis,
  type MonthlyRequirement,
  type TopSupplier,
  type DailyPlan
} from "@/lib/engine";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  po: "Purchase Order",
  grn: "Goods Receipt",
  invoice: "Invoice",
  payment: "Payment",
  adjustment: "Adjustment",
  receipt: "Receipt"
};

export default async function DashboardPage() {
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

  if (!profile || !profile.active) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-2xl bg-white p-8 shadow-cardlg">
          <h1 className="mb-3 text-lg font-black text-ink">Akun belum aktif</h1>
          <p className="text-sm text-ink2">
            Email <span className="font-mono">{user.email}</span> sudah masuk ke
            sistem, tapi admin belum meng-aktifkan profil Anda. Hubungi admin
            untuk diverifikasi.
          </p>
        </div>
      </main>
    );
  }

  // ---- date horizons ----
  const now = new Date();
  const today = toISODate(now);
  const monthStart = toISODate(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const mrStart = monthStart; // 4-month matrix starts this month

  // ---- parallel fetches ----
  const [
    kpis,
    shortages,
    upcoming,
    monthly,
    topSup,
    planning,
    txRowsRaw,
    suppliers
  ] = await Promise.all([
    dashboardKpis(supabase).catch(() => ({
      students_total: 0,
      schools_active: 0,
      menu_today_id: null,
      menu_today_name: null,
      suppliers_active: 0
    })),
    stockShortageForDate(supabase, today).catch(() => []),
    upcomingShortages(supabase, 14).catch(() => []),
    monthlyRequirements(supabase, mrStart, 4).catch(
      () => [] as MonthlyRequirement[]
    ),
    topSuppliersBySpend(supabase, monthStart, today, 10).catch(
      () => [] as TopSupplier[]
    ),
    dailyPlanning(supabase, 10).catch(() => [] as DailyPlan[]),
    supabase
      .from("transactions")
      .select(
        "id, tx_date, tx_type, ref_no, supplier_id, amount, description"
      )
      .order("tx_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(50)
      .then((r) => r.data ?? []),
    supabase
      .from("suppliers")
      .select("id, name")
      .then((r) => r.data ?? [])
  ]);

  // ---- derived ----
  const totalGap = shortages.reduce((s, x) => s + Number(x.gap || 0), 0);

  // Transaction log with supplier names
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const txRows: TxRow[] = txRowsRaw.map((r) => ({
    id: r.id,
    tx_date: r.tx_date,
    tx_type: r.tx_type as TxRow["tx_type"],
    ref_no: r.ref_no,
    supplier_id: r.supplier_id,
    supplier_name: r.supplier_id
      ? supplierMap.get(r.supplier_id) ?? null
      : null,
    amount: r.amount,
    description: r.description
  }));

  // Pivot monthly requirements: item_code × month → qty_kg
  const months = Array.from(
    new Set(monthly.map((r) => r.month.slice(0, 7)))
  ).sort();
  const itemTotals = new Map<string, number>();
  for (const r of monthly) {
    itemTotals.set(
      r.item_code,
      (itemTotals.get(r.item_code) ?? 0) + Number(r.qty_kg)
    );
  }
  const topItems = [...itemTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([code]) => code);
  const matrix: Record<string, Record<string, number>> = {};
  for (const code of topItems) matrix[code] = {};
  for (const r of monthly) {
    if (!matrix[r.item_code]) continue;
    const m = r.month.slice(0, 7);
    matrix[r.item_code][m] =
      (matrix[r.item_code][m] ?? 0) + Number(r.qty_kg);
  }
  const grandTotal = monthly.reduce((s, r) => s + Number(r.qty_kg), 0);
  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(Number(y), Number(mo) - 1, 1);
    return date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
  };

  // status today
  const todayPlan = planning.find((p) => p.op_date === today);
  const opToday = todayPlan?.operasional ?? false;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-ink">
              Selamat datang, {profile.full_name || profile.email.split("@")[0]}
            </h1>
            <p className="text-sm text-ink2/80">{formatDateID(now)}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-card">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink2">
              Status hari ini
            </span>
            {opToday ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-black text-green-800">
                OPERASIONAL
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-800">
                NON-OPERASIONAL
              </span>
            )}
          </div>
        </div>

        {/* KPI tiles (matching mockup: Siswa, Sekolah, Menu Hari Ini, Supplier) */}
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon="👥"
            label="Siswa (Total)"
            value={kpis.students_total.toLocaleString("id-ID")}
            sub={`${kpis.schools_active} sekolah aktif`}
          />
          <KpiCard
            icon="🏫"
            label="Sekolah Aktif"
            value={kpis.schools_active.toString()}
            sub="SPPG Nunumeu"
          />
          <KpiCard
            icon="🍽️"
            label="Menu Hari Ini"
            value={kpis.menu_today_name || "—"}
            sub={
              todayPlan
                ? `${todayPlan.porsi_total.toLocaleString("id-ID")} porsi · ${formatKg(todayPlan.total_kg)}`
                : "Belum ditetapkan"
            }
            valueSize="small"
          />
          <KpiCard
            icon="🤝"
            label="Supplier Aktif"
            value={kpis.suppliers_active.toString()}
            sub="BUMN + UMKM + Poktan"
          />
        </section>

        {/* 50 Transaksi Terakhir with filter */}
        <TransactionLog rows={txRows} />

        {/* 4-month requirements matrix */}
        <section className="mb-6 rounded-2xl border-l-4 border-emerald-500 bg-white p-5 shadow-card">
          <h2 className="text-sm font-black uppercase tracking-wide text-ink">
            🌾 Volume Kebutuhan Bahan · {months.length > 0 ? `${monthLabel(months[0])}–${monthLabel(months[months.length - 1])}` : "4 Bulan"} · {formatKg(grandTotal, 0)}
          </h2>
          <p className="mt-1 text-[11px] text-ink2/70">
            Top 12 komoditas berdasarkan agregat porsi × menu BOM per hari
            operasional (Senin–Jumat, skip non-op).
          </p>
          {topItems.length === 0 ? (
            <div className="mt-3 rounded-xl bg-ink/5 p-4 text-sm text-ink2">
              Belum ada data kebutuhan — pastikan menu sudah di-assign ke
              tanggal di horizon ini.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                    <th className="py-2">#</th>
                    <th className="py-2">Komoditas</th>
                    {months.map((m) => (
                      <th key={m} className="py-2 text-right">
                        {monthLabel(m)}
                      </th>
                    ))}
                    <th className="py-2 text-right">Total (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((code, i) => {
                    const total = itemTotals.get(code) ?? 0;
                    return (
                      <tr key={code} className="border-b border-ink/5">
                        <td className="py-2 text-ink2">{i + 1}</td>
                        <td className="py-2 font-semibold">{code}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 10-day planning */}
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
              🔔 10 Hari Ke Depan · Planning
            </h2>
            {planning.length === 0 ? (
              <div className="rounded-xl bg-ink/5 p-4 text-sm text-ink2">
                Belum ada planning.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                      <th className="py-2">Tanggal</th>
                      <th className="py-2">Menu</th>
                      <th className="py-2 text-right">Porsi</th>
                      <th className="py-2 text-right">Kebutuhan</th>
                      <th className="py-2 text-right">Short</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planning.map((p) => (
                      <tr key={p.op_date} className="border-b border-ink/5">
                        <td className="py-2">
                          <div className="font-mono text-[11px]">
                            {p.op_date}
                          </div>
                          {!p.operasional && (
                            <span className="text-[10px] font-bold text-amber-700">
                              NON-OP
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-xs">
                          {p.menu_name ?? (
                            <span className="text-ink2/60">—</span>
                          )}
                        </td>
                        <td className="py-2 text-right font-mono text-xs">
                          {p.porsi_total.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2 text-right font-mono text-xs">
                          {formatKg(Number(p.total_kg), 1)}
                        </td>
                        <td
                          className={`py-2 text-right font-mono text-xs font-black ${p.short_items > 0 ? "text-red-700" : "text-emerald-700"}`}
                        >
                          {p.short_items}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Alert Stok (Shortages Today) */}
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-ink">
                ⚠️ Alert Stok · Hari Ini
              </h2>
              <span className="text-[11px] text-ink2/70">
                {shortages.filter((s) => Number(s.gap) > 0).length} item · gap{" "}
                {formatKg(totalGap)}
              </span>
            </div>
            {shortages.filter((s) => Number(s.gap) > 0).length === 0 ? (
              <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
                ✅ Tidak ada kekurangan untuk hari ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                      <th className="py-2">Item</th>
                      <th className="py-2 text-right">Butuh</th>
                      <th className="py-2 text-right">Ada</th>
                      <th className="py-2 text-right">Kurang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortages
                      .filter((s) => Number(s.gap) > 0)
                      .slice(0, 10)
                      .map((s) => (
                        <tr key={s.item_code} className="border-b border-ink/5">
                          <td className="py-2 font-semibold">{s.item_code}</td>
                          <td className="py-2 text-right font-mono text-xs">
                            {Number(s.required).toFixed(2)}
                          </td>
                          <td className="py-2 text-right font-mono text-xs">
                            {Number(s.on_hand).toFixed(2)}
                          </td>
                          <td className="py-2 text-right font-mono text-xs font-black text-red-700">
                            {Number(s.gap).toFixed(2)} {s.unit}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Top Supplier */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            🏪 Top Supplier · Nilai Belanja Bulan Ini
          </h2>
          {topSup.length === 0 ? (
            <div className="rounded-xl bg-ink/5 p-4 text-sm text-ink2">
              Belum ada invoice bulan ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                    <th className="py-2">#</th>
                    <th className="py-2">Supplier</th>
                    <th className="py-2">Tipe</th>
                    <th className="py-2 text-right">Invoice</th>
                    <th className="py-2 text-right">Total Belanja</th>
                  </tr>
                </thead>
                <tbody>
                  {topSup.map((s, i) => (
                    <tr
                      key={s.supplier_id}
                      className="border-b border-ink/5"
                    >
                      <td className="py-2 text-ink2">{i + 1}</td>
                      <td className="py-2 font-semibold">{s.supplier_name}</td>
                      <td className="py-2">
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink2">
                          {s.supplier_type}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-xs">
                        {s.invoice_count}
                      </td>
                      <td className="py-2 text-right font-mono text-xs font-black">
                        {formatIDR(Number(s.total_spend))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 14-day upcoming shortages */}
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            🔭 Peramalan Shortage · 14 Hari Ke Depan
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
              ✅ Tidak ada shortage terdeteksi di horizon 14 hari.
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((u) => (
                <li
                  key={u.op_date}
                  className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200"
                >
                  <div>
                    <div className="font-bold text-amber-900">
                      {formatDateID(u.op_date)}
                    </div>
                    <div className="text-[11px] text-amber-800">
                      {u.short_items} item kurang
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-amber-900">
                      gap {formatKg(Number(u.total_gap_kg))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          Round 6 · Phase 1 · Next.js + Supabase · Go-live SPPG Nunumeu 4 Mei 2026
        </p>
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  valueSize = "large"
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  valueSize?: "large" | "small";
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink2/80">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div
        className={`font-black text-ink ${
          valueSize === "large" ? "text-2xl" : "text-base leading-tight"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] font-semibold text-ink2/70">{sub}</div>
    </div>
  );
}
