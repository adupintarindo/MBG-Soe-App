import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import {
  formatIDR,
  formatKg,
  formatDateID,
  porsiCounts,
  upcomingShortages,
  stockShortageForDate,
  toISODate
} from "@/lib/engine";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active, supplier_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.active) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-2xl bg-white p-8 shadow-cardlg">
          <h1 className="mb-3 text-lg font-black text-ink">
            Akun belum aktif
          </h1>
          <p className="text-sm text-ink2">
            Email <span className="font-mono">{user.email}</span> sudah masuk ke
            sistem, tapi admin belum meng-aktifkan profil Anda. Hubungi admin
            untuk diverifikasi.
          </p>
        </div>
      </main>
    );
  }

  // Today's metrics
  const today = toISODate(new Date());
  const [porsi, shortages, upcoming, stockCount, supplierCount, schoolCount] =
    await Promise.all([
      porsiCounts(supabase, today).catch(() => ({
        kecil: 0,
        besar: 0,
        guru: 0,
        total: 0,
        operasional: false
      })),
      stockShortageForDate(supabase, today).catch(() => []),
      upcomingShortages(supabase, 14).catch(() => []),
      supabase
        .from("stock")
        .select("item_code", { count: "exact", head: true })
        .then((r) => r.count ?? 0),
      supabase
        .from("suppliers")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .then((r) => r.count ?? 0),
      supabase
        .from("schools")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .then((r) => r.count ?? 0)
    ]);

  const totalGap = shortages.reduce((s, x) => s + Number(x.gap || 0), 0);

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-ink">
              Selamat datang, {profile.full_name || profile.email.split("@")[0]}
            </h1>
            <p className="text-sm text-ink2/80">{formatDateID(new Date())}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-card">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink2">
              Status hari ini
            </span>
            {porsi.operasional ? (
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

        {/* KPI cards */}
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon="👥"
            label="Total Porsi Hari Ini"
            value={porsi.total.toLocaleString("id-ID")}
            sub={`${porsi.kecil.toLocaleString("id-ID")} kecil · ${porsi.besar.toLocaleString("id-ID")} besar · ${porsi.guru.toLocaleString("id-ID")} guru`}
          />
          <KpiCard
            icon="🏫"
            label="Sekolah Aktif"
            value={schoolCount.toString()}
            sub="SPPG Nunumeu"
          />
          <KpiCard
            icon="🚚"
            label="Supplier Aktif"
            value={supplierCount.toString()}
            sub="Termasuk BUMN + UMKM"
          />
          <KpiCard
            icon="📦"
            label="Item di Stok"
            value={stockCount.toString()}
            sub="Master bahan"
          />
        </section>

        {/* Shortage today */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-ink">
                ⚠️ Kekurangan Stok · Hari Ini
              </h2>
              <p className="text-[11px] text-ink2/70">
                {shortages.filter((s) => Number(s.gap) > 0).length} item · total
                gap {formatKg(totalGap)}
              </p>
            </div>
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
                    <th className="py-2">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {shortages
                    .filter((s) => Number(s.gap) > 0)
                    .slice(0, 10)
                    .map((s) => (
                      <tr key={s.item_code} className="border-b border-ink/5">
                        <td className="py-2 font-semibold">{s.item_code}</td>
                        <td className="py-2 text-right">
                          {Number(s.required).toFixed(2)}
                        </td>
                        <td className="py-2 text-right">
                          {Number(s.on_hand).toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-black text-red-700">
                          {Number(s.gap).toFixed(2)}
                        </td>
                        <td className="py-2 text-ink2">{s.unit}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Upcoming shortages */}
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            🔭 Peramalan Shortage · 14 Hari Ke Depan
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
              ✅ Tidak ada shortage terdeteksi di horizon 14 hari. Periksa lagi
              setelah PO baru terbit.
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
