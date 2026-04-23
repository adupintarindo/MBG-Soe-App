import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import {
  BomTable,
  CommodityTable,
  type BomTableRow,
  type CommodityRow,
  type MenuDetail
} from "@/components/menu-tables";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type MenuTabId = "cycle" | "commodity";
const VALID_TABS: readonly MenuTabId[] = ["cycle", "commodity"];

interface SearchParams {
  tab?: string;
}

export default async function MenuMasterPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const activeTab: MenuTabId = VALID_TABS.includes(
    searchParams.tab as MenuTabId
  )
    ? (searchParams.tab as MenuTabId)
    : "cycle";

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
    supabase
      .from("supplier_items")
      .select("supplier_id, item_code, is_main, price_idr, suppliers(id, name)")
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
    price_idr: number | string | null;
    suppliers: { id: string; name: string } | { id: string; name: string }[] | null;
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

  // Collect supplier sources per item (id + name, main first) + price table
  type SupLink = { id: string; name: string; is_main: boolean };
  const suppliersByItem = new Map<string, SupLink[]>();
  const supplierPricesByItem = new Map<string, { price: number; is_main: boolean }[]>();
  for (const s of supItems) {
    const rel = Array.isArray(s.suppliers) ? s.suppliers[0] : s.suppliers;
    if (!rel) continue;
    const list = suppliersByItem.get(s.item_code) ?? [];
    list.push({ id: rel.id, name: rel.name, is_main: s.is_main });
    suppliersByItem.set(s.item_code, list);
    const p = Number(s.price_idr ?? 0);
    if (p > 0) {
      const prices = supplierPricesByItem.get(s.item_code) ?? [];
      prices.push({ price: p, is_main: s.is_main });
      supplierPricesByItem.set(s.item_code, prices);
    }
  }
  for (const list of suppliersByItem.values()) {
    list.sort((a, b) => {
      if (a.is_main !== b.is_main) return a.is_main ? -1 : 1;
      return a.name.localeCompare(b.name, "id");
    });
  }

  // Reference price: items.price_idr if > 0, else main-supplier price, else avg of supplier prices
  const referencePriceByCode = new Map<string, number>();
  for (const it of items) {
    const basePrice = Number(it.price_idr ?? 0);
    if (basePrice > 0) {
      referencePriceByCode.set(it.code, basePrice);
      continue;
    }
    const sp = supplierPricesByItem.get(it.code) ?? [];
    if (sp.length === 0) {
      referencePriceByCode.set(it.code, 0);
      continue;
    }
    const main = sp.find((p) => p.is_main);
    if (main) {
      referencePriceByCode.set(it.code, main.price);
    } else {
      const avg = sp.reduce((a, b) => a + b.price, 0) / sp.length;
      referencePriceByCode.set(it.code, avg);
    }
  }

  // Invert bomByMenu → menu cycle_days per item
  const menusByItem = new Map<string, number[]>();
  for (const m of menus) {
    const list = bomByMenu.get(m.id) ?? [];
    for (const row of list) {
      const arr = menusByItem.get(row.item_code) ?? [];
      if (!arr.includes(m.cycle_day)) arr.push(m.cycle_day);
      menusByItem.set(row.item_code, arr);
    }
  }
  for (const arr of menusByItem.values()) arr.sort((a, b) => a - b);

  // Compute per-menu totals — use referencePriceByCode (falls back to supplier prices)
  const menuStats = menus.map((m) => {
    const list = bomByMenu.get(m.id) ?? [];
    const totalGrams = list.reduce((s, r) => s + r.grams, 0);
    const costPerPorsi = list.reduce((s, r) => {
      const price = referencePriceByCode.get(r.item_code) ?? 0;
      return s + (r.grams / 1000) * price;
    }, 0);
    return { menu: m, rows: list, totalGrams, costPerPorsi };
  });

  // Menu details (shared between cycle cards + commodity H-chip modal)
  const menuDetailsByDay: Record<number, MenuDetail> = {};
  for (const { menu, rows, costPerPorsi } of menuStats) {
    menuDetailsByDay[menu.cycle_day] = {
      id: menu.id,
      cycleDay: menu.cycle_day,
      name: menu.name,
      nameEn: menu.name_en,
      costPerPorsi,
      rows: rows.map(
        (r): BomTableRow => ({
          item_code: r.item_code,
          category: itemByCode.get(r.item_code)?.category ?? "LAIN",
          small: r.tiered ? r.kecil : r.grams,
          large: r.tiered ? r.besar : r.grams,
          tiered: r.tiered
        })
      )
    };
  }

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const totalItems = items.length;
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

  const tabs: PageTab[] = [
    {
      id: "cycle",
      icon: "🍲",
      label: lang === "EN" ? "Menu Cycle" : "Siklus Menu",
      href: "/menu?tab=cycle"
    },
    {
      id: "commodity",
      icon: "📋",
      label: lang === "EN" ? "Commodity Master" : "Master Komoditas",
      href: "/menu?tab=commodity"
    }
  ];

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader />

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "cycle" && (
          <>
        <Section
          title={ti("menu.cycleTitle", lang, { n: menus.length })}
          hint={t("menu.cycleHint", lang)}
          noPad
        >
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            {menuStats.map(({ menu, rows, costPerPorsi }) => (
              <article
                key={menu.id}
                className="overflow-hidden rounded-2xl bg-paper ring-1 ring-ink/5 transition hover:shadow-card"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100">
                  <div
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center text-6xl opacity-60"
                  >
                    🍛
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-gradient text-[12px] font-black text-white shadow-card ring-2 ring-white/70">
                    M{menu.id}
                  </span>
                  <span className="absolute right-3 top-3 rounded-md bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink2 backdrop-blur-sm">
                    {lang === "EN" ? "Placeholder" : "Foto Belum Tersedia"}
                  </span>
                </div>
                <div className="p-4">
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black leading-snug text-ink">
                      {lang === "EN" && menu.name_en ? menu.name_en : menu.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-black text-emerald-700">
                      {formatIDR(costPerPorsi)}{t("menu.perPorsi", lang)}
                    </div>
                  </div>
                </header>

                {rows.length === 0 ? (
                  <EmptyState message={t("menu.bomEmpty", lang)} />
                ) : (
                  <div className="overflow-hidden rounded-xl bg-white ring-1 ring-ink/5">
                    <BomTable
                      lang={lang}
                      rows={rows.map((r): BomTableRow => {
                        const it = itemByCode.get(r.item_code);
                        return {
                          item_code: r.item_code,
                          category: it?.category ?? "LAIN",
                          small: r.tiered ? r.kecil : r.grams,
                          large: r.tiered ? r.besar : r.grams,
                          tiered: r.tiered
                        };
                      })}
                    />
                    <div
                      className="border-t border-ink/5 bg-paper px-2 py-1 text-[9px] text-ink2/70"
                      dangerouslySetInnerHTML={{ __html: t("menu.gramasiNote", lang) }}
                    />
                  </div>
                )}
                </div>
              </article>
            ))}
          </div>
        </Section>
          </>
        )}

        {activeTab === "commodity" && (
          <>
            <Section
              title={ti("menu.commodityTitle", lang, { n: totalItems })}
              hint={t("menu.commodityHint", lang)}
            >
              <CommodityTable
                lang={lang}
                menuDetailsByDay={menuDetailsByDay}
                rows={items.map(
                  (it): CommodityRow => ({
                    code: it.code,
                    displayCode: it.code.replace(/^Buah\s*-\s*/i, ""),
                    category: it.category,
                    unit: it.unit,
                    price_idr: referencePriceByCode.get(it.code) ?? 0,
                    usedInMenus: menusByItem.get(it.code) ?? [],
                    suppliers: suppliersByItem.get(it.code) ?? [],
                    active: it.active
                  })
                )}
              />
            </Section>
          </>
        )}
      </PageContainer>
    </div>
  );
}
