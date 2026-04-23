"use server";

/**
 * Weekly Price List · Server actions
 * ---------------------------------------------------------------------------
 * Thin wrappers over Supabase RPCs defined in migration 0018.
 * RLS still enforces who can write — admin/operator/ahli_gizi full, supplier
 * write baris sendiri.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PriceCommodity } from "./types";

export interface UpsertPriceInput {
  weekId: number;
  supplierId: string;
  commodity: PriceCommodity;
  ingredientName: string;
  pricePerKg: number | null;
  pricePerItem?: number | null;
  unit?: string;
  itemCode?: string | null;
  notes?: string | null;
}

export interface UpsertPriceResult {
  ok: boolean;
  error?: string;
}

export async function upsertSupplierPrice(
  input: UpsertPriceInput
): Promise<UpsertPriceResult> {
  const supabase = createClient();

  const { error } = await supabase.rpc("upsert_supplier_price", {
    p_week_id: input.weekId,
    p_supplier_id: input.supplierId,
    p_commodity: input.commodity,
    p_ingredient_name: input.ingredientName,
    p_price_per_kg: input.pricePerKg ?? undefined,
    p_price_per_item: input.pricePerItem ?? undefined,
    p_unit: input.unit ?? "kg",
    p_item_code: input.itemCode ?? undefined,
    p_notes: input.notes ?? undefined
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/price-list");
  return { ok: true };
}

export interface ImportPriceListInput {
  periodId: number;
  payload: unknown[]; // STATE.priceList dump dari HTML dashboard
}

export interface ImportPriceListResult {
  ok: boolean;
  rowsProcessed?: number;
  cellsUpserted?: number;
  suppliersMissing?: string[];
  error?: string;
}

export async function importPriceListJson(
  input: ImportPriceListInput
): Promise<ImportPriceListResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("import_price_list_json", {
    p_period_id: input.periodId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p_payload: input.payload as any
  });

  if (error) return { ok: false, error: error.message };

  const row = Array.isArray(data) ? (data[0] as Record<string, unknown>) : null;
  revalidatePath("/price-list");
  return {
    ok: true,
    rowsProcessed: Number(row?.rows_processed ?? 0),
    cellsUpserted: Number(row?.cells_upserted ?? 0),
    suppliersMissing: (row?.suppliers_missing as string[] | null) ?? []
  };
}
