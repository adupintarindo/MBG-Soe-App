// ============================================================================
// Delivery Schedule Engine
// Pure TS — given menu assignments + BOM + items + porsi, produces the
// inbound delivery plan (supplier → dapur SPPG) according to:
//
//   DRY goods          : batched 1–2×/bulan (minggu-1 dan minggu-3, Senin)
//   FISH (ikan)        : batched 2×/bulan   (minggu-1 dan minggu-3, Senin)
//   VEG/FRUIT          : H-1 cooking date   (skip Minggu/libur → mundur)
//   PROTEIN_OTHER      : H-2 cooking date   (ayam, telur, tahu, tempe, daging)
//                        (skip Minggu/libur → mundur)
//
// Tidak ada pengiriman di hari Minggu atau hari libur nasional.
// Kalau delivery_date jatuh di Minggu/libur → mundur ke hari kerja terdekat.
// ============================================================================

import { getHoliday } from "./holidays";

export type DeliveryCategory =
  | "dry"
  | "veg_fruit"
  | "fish"
  | "protein_other";

export const DELIVERY_CATEGORIES: DeliveryCategory[] = [
  "dry",
  "veg_fruit",
  "fish",
  "protein_other"
];

/**
 * Visual metadata per delivery category. Kept co-located with engine so
 * UI & exporters share a single palette.
 */
export interface DeliveryCategoryMeta {
  key: DeliveryCategory;
  label: { ID: string; EN: string };
  emoji: string;
  chipBg: string; // tailwind background
  chipFg: string; // tailwind text
  ring: string; // tailwind ring
}

export const DELIVERY_CATEGORY_META: Record<DeliveryCategory, DeliveryCategoryMeta> = {
  dry: {
    key: "dry",
    label: { ID: "Kering", EN: "Dry Goods" },
    emoji: "📦",
    chipBg: "bg-amber-50",
    chipFg: "text-amber-900",
    ring: "ring-amber-200"
  },
  veg_fruit: {
    key: "veg_fruit",
    label: { ID: "Sayur & Buah", EN: "Veg & Fruit" },
    emoji: "🥬",
    chipBg: "bg-emerald-50",
    chipFg: "text-emerald-900",
    ring: "ring-emerald-200"
  },
  fish: {
    key: "fish",
    label: { ID: "Ikan", EN: "Fish" },
    emoji: "🐟",
    chipBg: "bg-sky-50",
    chipFg: "text-sky-900",
    ring: "ring-sky-200"
  },
  protein_other: {
    key: "protein_other",
    label: { ID: "Ayam/Telur/Tahu", EN: "Poultry/Egg/Tofu" },
    emoji: "🍗",
    chipBg: "bg-rose-50",
    chipFg: "text-rose-900",
    ring: "ring-rose-200"
  }
};

// ---------- Input types ----------

export interface ItemLite {
  code: string;
  name_en: string | null;
  unit: string;
  category: string; // BERAS | HEWANI | NABATI | SAYUR_HIJAU | SAYUR | UMBI | BUMBU | REMPAH | BUAH | SEMBAKO | LAIN
}

export interface MenuLite {
  id: number;
  name: string;
  name_en?: string | null;
}

export interface MenuBomRow {
  menu_id: number;
  item_code: string;
  grams_per_porsi: number;
}

export interface MenuAssignRow {
  assign_date: string; // ISO yyyy-mm-dd
  menu_id: number;
}

/**
 * Porsi total per tanggal masak. Kalau tidak ada entry → anggap hari non-op
 * (dilewati). Idealnya diisi untuk semua hari op yang punya menu_assign.
 */
export type PorsiByDate = Record<string, number>;

// ---------- Output types ----------

export interface DeliveryLine {
  delivery_date: string;
  cooking_date: string;
  menu_id: number;
  menu_name: string;
  item_code: string;
  item_name: string;
  item_unit: string;
  item_category: string;
  delivery_category: DeliveryCategory;
  grams_per_porsi: number;
  porsi: number;
  qty_kg: number; // porsi × grams / 1000 (note: unit "lt" items still keep qty_kg semantics — label shows unit)
}

/**
 * Aggregated per (delivery_date, item_code) — one line per SKU per delivery trip.
 * Contains which cooking dates the delivery is serving.
 */
export interface DeliveryGroupRow {
  delivery_date: string;
  item_code: string;
  item_name: string;
  item_unit: string;
  item_category: string;
  delivery_category: DeliveryCategory;
  qty_kg: number;
  servings: Array<{
    cooking_date: string;
    menu_id: number;
    menu_name: string;
    qty_kg: number;
    porsi: number;
  }>;
}

/**
 * Aggregated per delivery_date — summary for calendar cell.
 */
export interface DeliveryDaySummary {
  delivery_date: string;
  by_category: Record<DeliveryCategory, { item_count: number; qty_kg: number }>;
  total_items: number;
  total_qty_kg: number;
  serves_cooking_dates: string[];
}

// ============================================================================
// Classification
// ============================================================================

const FISH_HINTS = ["ikan", "tuna", "tongkol", "kembung", "lele", "nila"];

/**
 * Classify an item into its delivery category.
 *
 * Rules:
 *   HEWANI + name hints "ikan/tuna/tongkol/…"  → fish
 *   HEWANI (rest: ayam, daging, telur)          → protein_other
 *   NABATI (tahu, tempe)                        → protein_other
 *   SAYUR, SAYUR_HIJAU, UMBI, BUAH              → veg_fruit
 *   BERAS, SEMBAKO, BUMBU, REMPAH               → dry
 *   (LAIN fallback)                             → dry
 */
export function classifyDeliveryCategory(item: ItemLite): DeliveryCategory {
  const code = item.code.toLowerCase();
  const nameEn = (item.name_en ?? "").toLowerCase();

  if (item.category === "HEWANI") {
    const isFish = FISH_HINTS.some(
      (h) => code.includes(h) || nameEn.includes(h)
    );
    return isFish ? "fish" : "protein_other";
  }

  if (item.category === "NABATI") return "protein_other";

  if (
    item.category === "SAYUR" ||
    item.category === "SAYUR_HIJAU" ||
    item.category === "UMBI" ||
    item.category === "BUAH"
  ) {
    return "veg_fruit";
  }

  return "dry";
}

// ============================================================================
// Date helpers
// ============================================================================

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Minggu (0) atau hari libur nasional. */
function isNonDeliveryDay(iso: string): boolean {
  const d = parseIso(iso);
  if (d.getDay() === 0) return true; // Sunday
  if (getHoliday(iso)) return true;
  return false;
}

/**
 * Kalau tanggal target = Minggu atau libur, mundur 1 hari sampai dapat hari
 * kerja. Dipakai untuk veg/fruit (H-1) dan protein (H-2).
 */
function rollBackToWorkday(iso: string): string {
  let cur = iso;
  let safety = 7;
  while (isNonDeliveryDay(cur) && safety-- > 0) {
    cur = addDays(cur, -1);
  }
  return cur;
}

/**
 * Untuk batched delivery (dry & fish). Cari Senin di minggu `weekIndex`
 * (1 = minggu pertama yang punya Senin, 3 = minggu ketiga).
 * Kalau Senin kebetulan libur → maju ke Selasa, dst.
 */
function nthMondayOfMonth(
  year: number,
  month: number,
  nth: 1 | 2 | 3 | 4
): string {
  // month is 1-based
  const first = new Date(year, month - 1, 1);
  const dow = first.getDay(); // 0..6
  // Days until Monday (1). If already Monday → 0.
  const offset = (1 - dow + 7) % 7;
  const firstMonday = new Date(year, month - 1, 1 + offset);
  const target = new Date(firstMonday);
  target.setDate(firstMonday.getDate() + (nth - 1) * 7);

  let iso = toIso(target);
  let safety = 6;
  while (isNonDeliveryDay(iso) && safety-- > 0) {
    iso = addDays(iso, 1);
  }
  return iso;
}

/**
 * Untuk dry & fish goods: batched 2×/bulan (Senin minggu-1 & minggu-3).
 * Pilih slot berdasar posisi cooking_date dalam bulan (<=15 → slot-1, >15 → slot-2).
 */
function batchedDeliveryDate(cookingIso: string): string {
  const d = parseIso(cookingIso);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (day <= 15) {
    return nthMondayOfMonth(year, month, 1);
  }
  return nthMondayOfMonth(year, month, 3);
}

// ============================================================================
// Main delivery-date resolver
// ============================================================================

export function computeDeliveryDate(
  cookingIso: string,
  category: DeliveryCategory
): string {
  switch (category) {
    case "veg_fruit":
      return rollBackToWorkday(addDays(cookingIso, -1));
    case "protein_other":
      return rollBackToWorkday(addDays(cookingIso, -2));
    case "fish":
    case "dry":
      return batchedDeliveryDate(cookingIso);
  }
}

// ============================================================================
// Build schedule
// ============================================================================

export interface BuildScheduleInput {
  assigns: MenuAssignRow[]; // cooking days with menu
  menus: MenuLite[];
  menuBom: MenuBomRow[];
  items: ItemLite[];
  porsiByDate: PorsiByDate; // porsi total per cooking_date (already computed)
}

/**
 * Expand (assign × bom) into per-item per-cooking-date lines, then compute
 * delivery_date for each. One assignment → N lines (one per ingredient).
 */
export function buildDeliveryLines(input: BuildScheduleInput): DeliveryLine[] {
  const menuById = new Map<number, MenuLite>(
    input.menus.map((m) => [m.id, m])
  );
  const itemByCode = new Map<string, ItemLite>(
    input.items.map((i) => [i.code, i])
  );
  const bomByMenu = new Map<number, MenuBomRow[]>();
  for (const b of input.menuBom) {
    const arr = bomByMenu.get(b.menu_id) ?? [];
    arr.push(b);
    bomByMenu.set(b.menu_id, arr);
  }

  const lines: DeliveryLine[] = [];

  for (const a of input.assigns) {
    const porsi = input.porsiByDate[a.assign_date] ?? 0;
    if (porsi <= 0) continue; // non-op atau tak ada sekolah aktif

    const menu = menuById.get(a.menu_id);
    if (!menu) continue;

    const bom = bomByMenu.get(a.menu_id) ?? [];
    for (const row of bom) {
      const item = itemByCode.get(row.item_code);
      if (!item) continue;

      const deliveryCategory = classifyDeliveryCategory(item);
      const deliveryDate = computeDeliveryDate(a.assign_date, deliveryCategory);
      const qty_kg = (porsi * row.grams_per_porsi) / 1000;

      lines.push({
        delivery_date: deliveryDate,
        cooking_date: a.assign_date,
        menu_id: a.menu_id,
        menu_name: menu.name,
        item_code: item.code,
        item_name: item.code, // code already human-readable ("Ayam Segar")
        item_unit: item.unit,
        item_category: item.category,
        delivery_category: deliveryCategory,
        grams_per_porsi: row.grams_per_porsi,
        porsi,
        qty_kg
      });
    }
  }

  return lines;
}

/**
 * Group lines by (delivery_date, item_code) — one row per SKU per trip,
 * with the cooking-date breakdown inside `servings`.
 */
export function groupLinesByDelivery(lines: DeliveryLine[]): DeliveryGroupRow[] {
  const map = new Map<string, DeliveryGroupRow>();
  for (const l of lines) {
    const key = `${l.delivery_date}|${l.item_code}`;
    let row = map.get(key);
    if (!row) {
      row = {
        delivery_date: l.delivery_date,
        item_code: l.item_code,
        item_name: l.item_name,
        item_unit: l.item_unit,
        item_category: l.item_category,
        delivery_category: l.delivery_category,
        qty_kg: 0,
        servings: []
      };
      map.set(key, row);
    }
    row.qty_kg += l.qty_kg;
    row.servings.push({
      cooking_date: l.cooking_date,
      menu_id: l.menu_id,
      menu_name: l.menu_name,
      qty_kg: l.qty_kg,
      porsi: l.porsi
    });
  }
  // Sort servings per group by date
  for (const row of map.values()) {
    row.servings.sort((a, b) =>
      a.cooking_date.localeCompare(b.cooking_date)
    );
  }
  const out = Array.from(map.values());
  out.sort((a, b) => {
    if (a.delivery_date !== b.delivery_date) {
      return a.delivery_date.localeCompare(b.delivery_date);
    }
    // Sort by category order, then name
    const ca = DELIVERY_CATEGORIES.indexOf(a.delivery_category);
    const cb = DELIVERY_CATEGORIES.indexOf(b.delivery_category);
    if (ca !== cb) return ca - cb;
    return a.item_name.localeCompare(b.item_name);
  });
  return out;
}

/**
 * Aggregate per-day summary for calendar cell rendering.
 */
export function summarizeByDay(
  groups: DeliveryGroupRow[]
): Map<string, DeliveryDaySummary> {
  const map = new Map<string, DeliveryDaySummary>();

  for (const g of groups) {
    let s = map.get(g.delivery_date);
    if (!s) {
      s = {
        delivery_date: g.delivery_date,
        by_category: {
          dry: { item_count: 0, qty_kg: 0 },
          veg_fruit: { item_count: 0, qty_kg: 0 },
          fish: { item_count: 0, qty_kg: 0 },
          protein_other: { item_count: 0, qty_kg: 0 }
        },
        total_items: 0,
        total_qty_kg: 0,
        serves_cooking_dates: []
      };
      map.set(g.delivery_date, s);
    }
    s.by_category[g.delivery_category].item_count += 1;
    s.by_category[g.delivery_category].qty_kg += g.qty_kg;
    s.total_items += 1;
    s.total_qty_kg += g.qty_kg;
    for (const serv of g.servings) {
      if (!s.serves_cooking_dates.includes(serv.cooking_date)) {
        s.serves_cooking_dates.push(serv.cooking_date);
      }
    }
  }

  for (const s of map.values()) {
    s.serves_cooking_dates.sort();
  }
  return map;
}
