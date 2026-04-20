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
  type CommodityRow
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
      .select("supplier_id, item_code, is_main, suppliers(id, name)")
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

  // Collect supplier sources per item (id + name, main first)
  type SupLink = { id: string; name: string; is_main: boolean };
  const suppliersByItem = new Map<string, SupLink[]>();
  for (const s of supItems) {
    const rel = Array.isArray(s.suppliers) ? s.suppliers[0] : s.suppliers;
    if (!rel) continue;
    const list = suppliersByItem.get(s.item_code) ?? [];
    list.push({ id: rel.id, name: rel.name, is_main: s.is_main });
    suppliersByItem.set(s.item_code, list);
  }
  for (const list of suppliersByItem.values()) {
    list.sort((a, b) => {
      if (a.is_main !== b.is_main) return a.is_main ? -1 : 1;
      return a.name.localeCompare(b.name, "id");
    });
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
                className="rounded-2xl bg-paper p-4 ring-1 ring-ink/5 transition hover:shadow-card"
              >
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-gradient text-[11px] font-black text-white shadow-card">
                        H{menu.cycle_day}
                      </span>
                      <h3 className="text-sm font-black text-ink">
                        {lang === "EN" && menu.name_en ? menu.name_en : menu.name}
                      </h3>
                    </div>
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
                rows={items.map(
                  (it): CommodityRow => ({
                    code: it.code,
                    displayCode: it.code.replace(/^Buah\s*-\s*/i, ""),
                    category: it.category,
                    unit: it.unit,
                    price_idr: Number(it.price_idr),
                    vol_weekly: Number(it.vol_weekly),
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
