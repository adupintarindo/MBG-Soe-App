import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import {
  formatIDR,
  stockShortageForDate,
  toISODate,
  type Shortage
} from "@/lib/engine";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  receipt: "Terima",
  consumption: "Konsumsi",
  adjustment: "Adjust",
  waste: "Waste",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  opening: "Opening"
};

const REASON_COLOR: Record<string, string> = {
  receipt: "bg-emerald-50 text-emerald-900",
  consumption: "bg-rose-50 text-rose-900",
  adjustment: "bg-amber-50 text-amber-900",
  waste: "bg-red-50 text-red-900",
  transfer_in: "bg-blue-50 text-blue-900",
  transfer_out: "bg-indigo-50 text-indigo-900",
  opening: "bg-slate-50 text-slate-900"
};

export default async function StockPage() {
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

  const today = toISODate(new Date());

  const [stockRes, itemsRes, movesRes, shortages] = await Promise.all([
    supabase.from("stock").select("item_code, qty, updated_at"),
    supabase
      .from("items")
      .select("code, name_en, unit, category, price_idr, vol_weekly")
      .order("category")
      .order("code"),
    supabase
      .from("stock_moves")
      .select("id, item_code, delta, reason, ref_doc, ref_no, note, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50),
    stockShortageForDate(supabase, today).catch(() => [] as Shortage[])
  ]);

  const stock = stockRes.data ?? [];
  const items = itemsRes.data ?? [];
  const moves = movesRes.data ?? [];

  const stockByCode = new Map(stock.map((s) => [s.item_code, s]));
  const shortByCode = new Map(shortages.map((s) => [s.item_code, s]));

  const totalValue = items.reduce((s, it) => {
    const qty = Number(stockByCode.get(it.code)?.qty ?? 0);
    return s + qty * Number(it.price_idr);
  }, 0);
  const emptyItems = items.filter(
    (it) => Number(stockByCode.get(it.code)?.qty ?? 0) <= 0
  ).length;
  const shortCount = shortages.filter((s) => Number(s.gap) > 0).length;

  // Group stock by category
  const itemsByCat = new Map<string, typeof items>();
  for (const it of items) {
    const list = itemsByCat.get(it.category) ?? [];
    list.push(it);
    itemsByCat.set(it.category, list);
  }

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
            <h1 className="text-xl font-black text-ink">📦 Stok Gudang SPPG</h1>
            <p className="text-sm text-ink2/80">
              {items.length} SKU · {items.length - emptyItems} ada stok · {emptyItems}{" "}
              kosong · nilai stok {formatIDR(totalValue)}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/procurement"
              className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-ink shadow-card hover:bg-paper"
            >
              🧾 PO / GRN →
            </a>
            <a
              href="/planning"
              className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white shadow-card hover:bg-ink2"
            >
              📈 Lihat Kebutuhan →
            </a>
          </div>
        </div>

        {/* Alert shortages */}
        {shortCount > 0 && (
          <section className="mb-6 rounded-2xl border-l-4 border-red-500 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-red-700">
              ⚠️ {shortCount} Item Kurang untuk Hari Ini
            </h2>
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
          </section>
        )}

        {/* Stock by category */}
        <section className="mb-6 space-y-4">
          {[...itemsByCat.entries()].map(([cat, list]) => (
            <div key={cat} className="rounded-2xl bg-white p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wide text-ink">
                  {cat} · {list.length} item
                </h2>
                <span className="text-[11px] font-semibold text-ink2/70">
                  Total nilai{" "}
                  {formatIDR(
                    list.reduce(
                      (s, it) =>
                        s +
                        Number(stockByCode.get(it.code)?.qty ?? 0) *
                          Number(it.price_idr),
                      0
                    )
                  )}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                      <th className="py-2">Item</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2">Unit</th>
                      <th className="py-2 text-right">Harga</th>
                      <th className="py-2 text-right">Nilai</th>
                      <th className="py-2 text-right">Vol Mingguan</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((it) => {
                      const qty = Number(stockByCode.get(it.code)?.qty ?? 0);
                      const value = qty * Number(it.price_idr);
                      const short = shortByCode.get(it.code);
                      const weekly = Number(it.vol_weekly ?? 0);
                      const weeksCover = weekly > 0 ? qty / weekly : 999;
                      return (
                        <tr key={it.code} className="border-b border-ink/5">
                          <td className="py-2 font-semibold">{it.code}</td>
                          <td className="py-2 text-right font-mono text-xs font-black">
                            {qty.toLocaleString("id-ID", {
                              maximumFractionDigits: 2
                            })}
                          </td>
                          <td className="py-2 text-xs">{it.unit}</td>
                          <td className="py-2 text-right font-mono text-xs">
                            {formatIDR(Number(it.price_idr))}
                          </td>
                          <td className="py-2 text-right font-mono text-xs">
                            {formatIDR(value)}
                          </td>
                          <td className="py-2 text-right font-mono text-xs text-ink2/70">
                            {weekly > 0 ? weekly.toFixed(1) : "—"}
                          </td>
                          <td className="py-2 text-right">
                            {short && Number(short.gap) > 0 ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                                Kurang {Number(short.gap).toFixed(1)}
                              </span>
                            ) : qty <= 0 ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                Kosong
                              </span>
                            ) : weeksCover < 1 ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Low · {weeksCover.toFixed(1)}w
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                OK · {weeksCover < 99 ? weeksCover.toFixed(1) + "w" : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* Recent moves */}
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            📋 50 Pergerakan Stok Terakhir
          </h2>
          {moves.length === 0 ? (
            <div className="rounded-xl bg-ink/5 p-4 text-sm text-ink2">
              Belum ada pergerakan stok.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                    <th className="py-2">Waktu</th>
                    <th className="py-2">Item</th>
                    <th className="py-2">Reason</th>
                    <th className="py-2 text-right">Delta</th>
                    <th className="py-2">Referensi</th>
                    <th className="py-2">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {moves.map((m) => (
                    <tr key={m.id} className="border-b border-ink/5">
                      <td className="py-2 font-mono text-[11px]">
                        {new Date(m.created_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="py-2 font-semibold">{m.item_code}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${REASON_COLOR[m.reason] ?? REASON_COLOR.adjustment}`}
                        >
                          {REASON_LABEL[m.reason] ?? m.reason}
                        </span>
                      </td>
                      <td
                        className={`py-2 text-right font-mono text-xs font-black ${Number(m.delta) >= 0 ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {Number(m.delta) >= 0 ? "+" : ""}
                        {Number(m.delta).toFixed(2)}
                      </td>
                      <td className="py-2 font-mono text-[11px] text-ink2">
                        {m.ref_doc && m.ref_no
                          ? `${m.ref_doc.toUpperCase()} ${m.ref_no}`
                          : m.ref_doc || "—"}
                      </td>
                      <td className="py-2 text-xs text-ink2/70">
                        {m.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
