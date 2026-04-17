// ============================================================================
// Weekly Price List · Types (matches migration 0017_weekly_price_list.sql)
// ============================================================================

export type PriceCommodity =
  | "BERAS"
  | "SAYURAN"
  | "BUAH"
  | "PROTEIN_HEWANI"
  | "PROTEIN_NABATI"
  | "BUMBU_KERING"
  | "MINYAK";

export interface PricePeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  active: boolean;
  notes: string | null;
}

export interface PriceWeek {
  id: number;
  period_id: number;
  week_no: number;
  start_date: string;
  end_date: string;
  label: string;
}

export interface SupplierPrice {
  id: number;
  week_id: number;
  supplier_id: string;
  commodity: PriceCommodity;
  ingredient_name: string;
  item_code: string | null;
  price_per_item: number | null;
  price_per_kg: number | null;
  unit: string | null;
  notes: string | null;
}

export interface PriceListMatrixRow {
  supplier_id: string;
  supplier_name: string;
  commodity: PriceCommodity;
  ingredient_name: string;
  item_code: string | null;
  period_id: number;
  period_name: string;
  w1: number | null;
  w2: number | null;
  w3: number | null;
  w4: number | null;
  w5: number | null;
  w6: number | null;
  w7: number | null;
  w8: number | null;
  w9: number | null;
  w10: number | null;
  w11: number | null;
  w12: number | null;
  avg_per_kg: number | null;
  min_per_kg: number | null;
  max_per_kg: number | null;
}

export const COMMODITY_LABELS: Record<PriceCommodity, string> = {
  BERAS: "Beras",
  SAYURAN: "Sayuran",
  BUAH: "Buah",
  PROTEIN_HEWANI: "Protein Hewani",
  PROTEIN_NABATI: "Protein Nabati",
  BUMBU_KERING: "Bumbu Kering",
  MINYAK: "Minyak"
};

export const COMMODITY_COLORS: Record<PriceCommodity, string> = {
  BERAS: "bg-amber-50 text-amber-900 ring-amber-200",
  SAYURAN: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  BUAH: "bg-orange-50 text-orange-900 ring-orange-200",
  PROTEIN_HEWANI: "bg-rose-50 text-rose-900 ring-rose-200",
  PROTEIN_NABATI: "bg-violet-50 text-violet-900 ring-violet-200",
  BUMBU_KERING: "bg-slate-50 text-slate-900 ring-slate-200",
  MINYAK: "bg-yellow-50 text-yellow-900 ring-yellow-200"
};
