import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";

export const dynamic = "force-dynamic";

const CAT_COLOR: Record<string, string> = {
  BERAS: "bg-amber-50 text-amber-900 ring-amber-200",
  HEWANI: "bg-rose-50 text-rose-900 ring-rose-200",
  NABATI: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  SAYUR_HIJAU: "bg-green-50 text-green-900 ring-green-200",
  SAYUR: "bg-lime-50 text-lime-900 ring-lime-200",
  UMBI: "bg-orange-50 text-orange-900 ring-orange-200",
  BUMBU: "bg-yellow-50 text-yellow-900 ring-yellow-200",
  REMPAH: "bg-red-50 text-red-900 ring-red-200",
  SEMBAKO: "bg-slate-50 text-slate-900 ring-slate-200",
  BUAH: "bg-pink-50 text-pink-900 ring-pink-200",
  LAIN: "bg-gray-50 text-gray-900 ring-gray-200"
};

export default async function MenuMasterPage() {
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

  // Fetch all menus + BOM + items + supplier_items in parallel
  const [menusRes, bomRes, itemsRes, supItemsRes] = await Promise.all([
    supabase
      .from("menus")
      .select("id, name, name_en, cycle_day, active, notes")
      .order("id"),
    supabase.from("menu_bom").select("menu_id, item_code, grams_per_porsi"),
    supabase
      .from("items")
      .select("code, name_en, unit, category, price_idr, vol_weekly, active")
      .order("category")
      .order("code"),
    supabase.from("supplier_items").select("supplier_id, item_code, is_main")
  ]);

  const menus = menusRes.data ?? [];
  const bom = bomRes.data ?? [];
  const items = itemsRes.data ?? [];
  const supItems = supItemsRes.data ?? [];

  const itemByCode = new Map(items.map((i) => [i.code, i]));

  // Group BOM by menu
  const bomByMenu = new Map<number, { item_code: string; grams: number }[]>();
  for (const row of bom) {
    const list = bomByMenu.get(row.menu_id) ?? [];
    list.push({
      item_code: row.item_code,
      grams: Number(row.grams_per_porsi)
    });
    bomByMenu.set(row.menu_id, list);
  }
  for (const list of bomByMenu.values()) list.sort((a, b) => b.grams - a.grams);

  // Count supplier sources per item
  const supCountByItem = new Map<string, number>();
  for (const s of supItems) {
    supCountByItem.set(s.item_code, (supCountByItem.get(s.item_code) ?? 0) + 1);
  }

  // Compute per-menu totals
  const menuStats = menus.map((m) => {
    const list = bomByMenu.get(m.id) ?? [];
    const totalGrams = list.reduce((s, r) => s + r.grams, 0);
    const costPerPorsi = list.reduce((s, r) => {
      const it = itemByCode.get(r.item_code);
      const price = Number(it?.price_idr ?? 0);
      return s + (r.grams / 1000) * price;
    }, 0);
    return { menu: m, rows: list, totalGrams, costPerPorsi };
  });

  // Items grouped by category for matrix
  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const itemsByCat = new Map<string, typeof items>();
  for (const c of categories) itemsByCat.set(c, []);
  for (const it of items) itemsByCat.get(it.category)?.push(it);

  const totalItems = items.length;
  const totalBOM = bom.length;

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
            <h1 className="text-xl font-black text-ink">🍽️ Master Menu · BOM</h1>
            <p className="text-sm text-ink2/80">
              Siklus {menus.length} hari · {totalItems} komoditas · {totalBOM}{" "}
              entri BOM · porsi weight kecil 0.7 · besar 1.0
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/calendar"
              className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-ink shadow-card hover:bg-paper"
            >
              📅 Kalender Menu →
            </a>
            <a
              href="/planning"
              className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white shadow-card hover:bg-ink2"
            >
              📊 Rencana Kebutuhan →
            </a>
          </div>
        </div>

        {/* Summary tiles */}
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryTile
            label="Menu Aktif"
            value={menus.filter((m) => m.active).length.toString()}
            sub={`dari ${menus.length} siklus`}
          />
          <SummaryTile
            label="Rata-rata Gram/Porsi"
            value={
              menuStats.length > 0
                ? Math.round(
                    menuStats.reduce((s, x) => s + x.totalGrams, 0) /
                      menuStats.length
                  ).toString()
                : "0"
            }
            sub="gram bahan basah"
          />
          <SummaryTile
            label="Rata-rata Cost/Porsi"
            value={formatIDR(
              menuStats.length > 0
                ? menuStats.reduce((s, x) => s + x.costPerPorsi, 0) /
                    menuStats.length
                : 0
            )}
            sub="harga bahan saja"
          />
          <SummaryTile
            label="Komoditas"
            value={totalItems.toString()}
            sub={`${categories.length} kategori`}
          />
        </section>

        {/* Menu cards — 14 siklus */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink2">
            14 Siklus Menu · BOM per Porsi
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {menuStats.map(({ menu, rows, totalGrams, costPerPorsi }) => (
              <article
                key={menu.id}
                className="rounded-2xl bg-white p-5 shadow-card"
              >
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-[11px] font-black text-white">
                        H{menu.cycle_day}
                      </span>
                      <h3 className="text-sm font-black text-ink">
                        {menu.name}
                      </h3>
                    </div>
                    {menu.name_en && (
                      <div className="mt-1 text-[11px] italic text-ink2/70">
                        {menu.name_en}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/60">
                      Total
                    </div>
                    <div className="font-mono text-sm font-black text-ink">
                      {totalGrams.toFixed(0)} g
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold text-emerald-700">
                      {formatIDR(costPerPorsi)}/porsi
                    </div>
                  </div>
                </header>

                {rows.length === 0 ? (
                  <div className="rounded-xl bg-paper p-3 text-xs text-ink2/70">
                    Belum ada BOM untuk menu ini.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl ring-1 ring-ink/5">
                    <table className="w-full text-xs">
                      <thead className="bg-paper text-[10px] font-bold uppercase tracking-wide text-ink2">
                        <tr>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-left">Kategori</th>
                          <th className="px-3 py-2 text-right">g/Porsi</th>
                          <th className="px-3 py-2 text-right">kg/1000</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const it = itemByCode.get(r.item_code);
                          const cat = it?.category ?? "LAIN";
                          return (
                            <tr
                              key={r.item_code}
                              className="border-t border-ink/5"
                            >
                              <td className="px-3 py-1.5 font-semibold text-ink">
                                {r.item_code}
                              </td>
                              <td className="px-3 py-1.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ${CAT_COLOR[cat] ?? CAT_COLOR.LAIN}`}
                                >
                                  {cat}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-ink2">
                                {r.grams.toFixed(1)}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono font-black text-ink">
                                {(r.grams).toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Items master table */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-wide text-ink">
              📦 Master Komoditas · {totalItems} item
            </h2>
            <div className="text-[11px] text-ink2/70">
              Harga referensi · Volume mingguan · Sumber supplier
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                  <th className="py-2">#</th>
                  <th className="py-2">Item</th>
                  <th className="py-2">EN</th>
                  <th className="py-2">Kategori</th>
                  <th className="py-2">Unit</th>
                  <th className="py-2 text-right">Harga (IDR)</th>
                  <th className="py-2 text-right">Vol Mingguan</th>
                  <th className="py-2 text-right">Supplier</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr
                    key={it.code}
                    className={`border-b border-ink/5 ${!it.active ? "opacity-50" : ""}`}
                  >
                    <td className="py-2 text-ink2">{i + 1}</td>
                    <td className="py-2 font-semibold">{it.code}</td>
                    <td className="py-2 text-xs italic text-ink2/70">
                      {it.name_en || "—"}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CAT_COLOR[it.category] ?? CAT_COLOR.LAIN}`}
                      >
                        {it.category}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-xs">{it.unit}</td>
                    <td className="py-2 text-right font-mono text-xs">
                      {formatIDR(Number(it.price_idr))}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {Number(it.vol_weekly).toFixed(1)}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {supCountByItem.get(it.code) ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          Master Menu · Bill of Materials · Data siklus {menus.length} hari —
          revisi per Go-Live 4 Mei 2026
        </p>
      </main>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/80">
        {label}
      </div>
      <div className="mt-1 text-xl font-black leading-tight text-ink">
        {value}
      </div>
      <div className="mt-1 text-[11px] font-semibold text-ink2/70">{sub}</div>
    </div>
  );
}
