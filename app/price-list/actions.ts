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
  // RPC tipe belum ada di generated types sebelum `pnpm supabase:types` jalan
  // — cast ke any seperti di page.tsx.
  const rpc = (
    supabase as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc;

  const { error } = await rpc("upsert_supplier_price", {
    p_week_id: input.weekId,
    p_supplier_id: input.supplierId,
    p_commodity: input.commodity,
    p_ingredient_name: input.ingredientName,
    p_price_per_kg: input.pricePerKg,
    p_price_per_item: input.pricePerItem ?? null,
    p_unit: input.unit ?? "kg",
    p_item_code: input.itemCode ?? null,
    p_notes: input.notes ?? null
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
  const rpc = (
    supabase as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>
      ) => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    }
  ).rpc;

  const { data, error } = await rpc("import_price_list_json", {
    p_period_id: input.periodId,
    p_payload: input.payload
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
