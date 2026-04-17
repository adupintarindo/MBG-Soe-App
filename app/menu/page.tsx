import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";
import {
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";

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

const CAT_ICON: Record<string, string> = {
  BERAS: "🌾",
  HEWANI: "🍗",
  NABATI: "🫘",
  SAYUR_HIJAU: "🥬",
  SAYUR: "🥕",
  UMBI: "🥔",
  BUMBU: "🧅",
  REMPAH: "🌶️",
  SEMBAKO: "🛒",
  BUAH: "🍎",
  LAIN: "🍽️"
};

export default async function MenuMasterPage() {
  const supabase = createClient();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  // Fetch all menus + BOM + items + supplier_items in parallel
  const [menusRes, bomRes, itemsRes, supItemsRes] = await Promise.all([
    supabase
      .from("menus")
      .select("id, name, name_en, cycle_day, active, notes")
      .order("id"),
    supabase
      .from("menu_bom")
      .select(
        "menu_id, item_code, grams_per_porsi, grams_paud, grams_sd13, grams_sd46, grams_smp"
      ),
    supabase
      .from("items")
      .select("code, name_en, unit, category, price_idr, vol_weekly, active")
      .order("category")
      .order("code"),
    supabase.from("supplier_items").select("supplier_id, item_code, is_main")
  ]);

  interface ItemRow {
    code: string;
    name_en: string | null;
    unit: string;
    category: string;
    price_idr: number | string;
    vol_weekly: number | string;
    active: boolean;
  }
  interface MenuRow {
    id: number;
    name: string;
    name_en: string | null;
    cycle_day: number;
    active: boolean;
    notes?: string | null;
  }
  interface BomRow {
    menu_id: number;
    item_code: string;
    grams_per_porsi: number | string;
    grams_paud: number | string;
    grams_sd13: number | string;
    grams_sd46: number | string;
    grams_smp: number | string;
  }
  interface SupItemRow {
    supplier_id: string;
    item_code: string;
    is_main: boolean;
  }

  const menus = (menusRes.data ?? []) as MenuRow[];
  const bom = (bomRes.data ?? []) as BomRow[];
  const items = (itemsRes.data ?? []) as ItemRow[];
  const supItems = (supItemsRes.data ?? []) as SupItemRow[];

  const itemByCode = new Map(items.map((i) => [i.code, i]));

  // Group BOM by menu — ikut tiered gramasi
  type BomEntry = {
    item_code: string;
    grams: number;
    kecil: number;
    besar: number;
    tiered: boolean;
  };
  const bomByMenu = new Map<number, BomEntry[]>();
  for (const row of bom) {
    const list = bomByMenu.get(row.menu_id) ?? [];
    const paud = Number(row.grams_paud ?? 0);
    const sd13 = Number(row.grams_sd13 ?? 0);
    const sd46 = Number(row.grams_sd46 ?? 0);
    const smp = Number(row.grams_smp ?? 0);
    const tiered = paud + sd13 + sd46 + smp > 0;
    list.push({
      item_code: row.item_code,
      grams: Number(row.grams_per_porsi),
      kecil: Math.max(paud, sd13),
      besar: Math.max(sd46, smp),
      tiered
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

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const totalItems = items.length;
  const totalBOM = bom.length;
  const avgGrams =
    menuStats.length > 0
      ? Math.round(
          menuStats.reduce((s, x) => s + x.totalGrams, 0) / menuStats.length
        )
      : 0;
  const avgCost =
    menuStats.length > 0
      ? menuStats.reduce((s, x) => s + x.costPerPorsi, 0) / menuStats.length
      : 0;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="🍽️"
          title="Master Menu · BOM"
          subtitle={
            <>
              Siklus {menus.length} hari · {totalItems} komoditas · {totalBOM}{" "}
              entri BOM · 2 porsi (Kecil 3-9 th / Besar 10 th+)
            </>
          }
          actions={
            <>
              <LinkButton href="/calendar" variant="secondary" size="sm">
                📅 Kalender Menu
              </LinkButton>
              <LinkButton href="/menu/variance" variant="secondary" size="sm">
                📉 BOM Variance
              </LinkButton>
              <LinkButton href="/planning" variant="primary" size="sm">
                📊 Rencana Kebutuhan →
              </LinkButton>
            </>
          }
        />

        <KpiGrid>
          <KpiTile
            label="Menu Aktif"
            value={menus.filter((m) => m.active).length.toString()}
            sub={`dari ${menus.length} siklus`}
          />
          <KpiTile
            label="Rata-rata Gram/Porsi"
            value={avgGrams.toString()}
            sub="gram bahan basah"
          />
          <KpiTile
            label="Rata-rata Cost/Porsi"
            value={formatIDR(avgCost)}
            size="md"
            tone="ok"
            sub="harga bahan saja"
          />
          <KpiTile
            label="Komoditas"
            value={totalItems.toString()}
            sub={`${categories.length} kategori`}
          />
        </KpiGrid>

        <Section
          title={`${menus.length} Siklus Menu · BOM per Porsi`}
          hint="Tiap kartu menampilkan Bill of Materials per porsi (gram bahan basah)."
          noPad
        >
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            {menuStats.map(({ menu, rows, totalGrams, costPerPorsi }) => (
              <article
                key={menu.id}
                className="rounded-2xl bg-paper p-4 ring-1 ring-ink/5 transition hover:shadow-card"
              >
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-gradient text-[11px] font-black text-white shadow-card">
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
                  <EmptyState message="Belum ada BOM untuk menu ini." />
                ) : (
                  <div className="overflow-hidden rounded-xl bg-white ring-1 ring-ink/5">
                    <table className="w-full text-xs">
                      <thead className="bg-paper text-[10px] font-bold uppercase tracking-wide text-ink2">
                        <tr>
                          <th className="px-2 py-2 text-left">Item</th>
                          <th className="px-2 py-2 text-left">Kat</th>
                          <th className="px-2 py-2 text-right" title="PAUD + SD 1-3 (3-9 th)">Kecil</th>
                          <th className="px-2 py-2 text-right" title="SD 4-6 + SMP/SMA + Guru (10 th+)">Besar</th>
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
                              <td className="px-2 py-1.5 font-semibold text-ink">
                                {r.item_code}
                              </td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1 ${CAT_COLOR[cat] ?? CAT_COLOR.LAIN}`}
                                >
                                  <span aria-hidden className="text-[11px] leading-none">
                                    {CAT_ICON[cat] ?? CAT_ICON.LAIN}
                                  </span>
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono text-ink">
                                {r.tiered ? r.kecil.toFixed(1) : r.grams.toFixed(1)}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono font-black text-ink">
                                {r.tiered ? r.besar.toFixed(1) : r.grams.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="border-t border-ink/5 bg-paper px-2 py-1 text-[9px] text-ink2/70">
                      Gramasi: <b>Kecil</b> = PAUD + SD 1-3 (3-9 th) · <b>Besar</b> = SD 4-6 + SMP/SMA + Guru (10 th+)
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </Section>

        <Section
          title={`📦 Master Komoditas · ${totalItems} item`}
          hint="Harga referensi · Volume mingguan · Sumber supplier"
        >
          <TableWrap>
            <table className="w-full text-sm">
              <THead>
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">EN</th>
                <th className="py-2 pr-3">Kategori</th>
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 pr-3 text-right">Harga (IDR)</th>
                <th className="py-2 pr-3 text-right">Vol Mingguan</th>
                <th className="py-2 pr-3 text-right">Supplier</th>
              </THead>
              <tbody>
                {items.map((it, i) => (
                  <tr
                    key={it.code}
                    className={`row-hover border-b border-ink/5 ${!it.active ? "opacity-50" : ""}`}
                  >
                    <td className="py-2 pr-3 text-ink2">{i + 1}</td>
                    <td className="py-2 pr-3 font-semibold">{it.code}</td>
                    <td className="py-2 pr-3 text-xs italic text-ink2/70">
                      {it.name_en || "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CAT_COLOR[it.category] ?? CAT_COLOR.LAIN}`}
                      >
                        <span aria-hidden className="text-[12px] leading-none">
                          {CAT_ICON[it.category] ?? CAT_ICON.LAIN}
                        </span>
                        {it.category}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{it.unit}</td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {formatIDR(Number(it.price_idr))}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {Number(it.vol_weekly).toFixed(1)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {supCountByItem.get(it.code) ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Section>

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          Master Menu · Bill of Materials · Data siklus {menus.length} hari —
          revisi per Go-Live 4 Mei 2026
        </p>
      </PageContainer>
    </div>
  );
}
