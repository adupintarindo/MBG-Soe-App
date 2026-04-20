// ============================================================================
// Shared Zod schemas · server actions & client forms
// ----------------------------------------------------------------------------
// Pakai: `supplierSchema.parse(input)` di server action untuk validasi keras,
//         `supplierSchema.safeParse(input)` di client untuk inline error.
// ============================================================================

import { z } from "zod";

// ---------- Primitives ------------------------------------------------------
export const idrAmount = z
  .number({ invalid_type_error: "Nominal harus angka" })
  .int("Bulatkan ke rupiah bulat")
  .nonnegative("Tidak boleh negatif");

export const phoneID = z
  .string()
  .trim()
  .regex(/^\+?[0-9\-\s]{7,20}$/i, "Format telepon tidak valid");

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus YYYY-MM-DD");

// ---------- Supplier --------------------------------------------------------
export const supplierSchema = z.object({
  id: z
    .string()
    .trim()
    .min(3, "ID minimal 3 karakter")
    .max(24)
    .regex(/^[A-Z0-9\-]+$/i, "ID hanya huruf, angka, dan strip"),
  name: z.string().trim().min(2, "Nama wajib diisi").max(120),
  type: z.enum([
    "PT",
    "CV",
    "UD",
    "TOKO",
    "KOPERASI",
    "PERSEORANGAN",
    "BUMDES",
    "LAIN"
  ]),
  commodity: z.string().trim().max(200).optional().nullable(),
  pic: z.string().trim().max(120).optional().nullable(),
  phone: phoneID.optional().nullable().or(z.literal("")),
  email: z.string().email("Email tidak valid").optional().nullable().or(z.literal("")),
  address: z.string().trim().max(240).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  score: z.number().min(0).max(100).optional().default(75),
  status: z
    .enum(["signed", "awaiting", "rejected", "draft"])
    .optional()
    .default("awaiting"),
  active: z.boolean().optional().default(true)
});
export type SupplierInput = z.infer<typeof supplierSchema>;

// ---------- Item (master bahan) --------------------------------------------
export const itemSchema = z.object({
  code: z.string().trim().min(2).max(80),
  name_en: z.string().trim().max(120).optional().nullable(),
  unit: z.enum(["kg", "gr", "lt", "ml", "pcs", "butir", "ikat", "sisir", "bungkus"]),
  category: z.enum([
    "BERAS",
    "HEWANI",
    "NABATI",
    "SAYUR_HIJAU",
    "SAYUR",
    "UMBI",
    "BUMBU",
    "REMPAH",
    "BUAH",
    "SEMBAKO",
    "LAIN"
  ]),
  price_idr: idrAmount,
  vol_weekly: z.number().nonnegative().optional().default(0)
});
export type ItemInput = z.infer<typeof itemSchema>;

// ---------- School ---------------------------------------------------------
export const schoolSchema = z.object({
  id: z.string().trim().min(3).max(16),
  name: z.string().trim().min(2).max(120),
  level: z.enum(["PAUD/TK", "SD", "SMP", "SMA", "SMK"]),
  students: z.number().int().nonnegative(),
  kelas13: z.number().int().nonnegative().optional().default(0),
  kelas46: z.number().int().nonnegative().optional().default(0),
  guru: z.number().int().nonnegative().optional().default(0),
  distance_km: z.number().nonnegative().optional().default(0),
  pic: z.string().trim().max(120).optional().nullable(),
  phone: phoneID.optional().nullable().or(z.literal("")),
  address: z.string().trim().max(240).optional().nullable()
});
export type SchoolInput = z.infer<typeof schoolSchema>;

// ---------- PO row ----------------------------------------------------------
export const poRowSchema = z.object({
  item_code: z.string().min(1, "Pilih item"),
  qty: z.number().positive("Qty harus > 0"),
  unit: z.string().min(1),
  price: idrAmount
});

export const poSchema = z.object({
  po_date: isoDate,
  supplier_id: z.string().min(1, "Pilih supplier"),
  delivery_date: isoDate.optional(),
  rows: z.array(poRowSchema).min(1, "Minimal 1 baris item"),
  top: z.string().regex(/^\d+$/, "Hanya angka hari").optional(),
  pay_method: z.string().optional(),
  ref_contract: z.string().optional(),
  notes: z.string().max(500).optional()
});
export type PoInput = z.infer<typeof poSchema>;

// ---------- Payment ---------------------------------------------------------
export const paymentSchema = z.object({
  invoice_no: z.string().min(1),
  supplier_id: z.string().min(1),
  pay_date: isoDate,
  amount: idrAmount.refine((v) => v > 0, "Nominal harus > 0"),
  method: z.enum(["transfer", "cash", "giro", "va", "other"]).default("transfer"),
  reference: z.string().max(120).optional(),
  note: z.string().max(500).optional()
});
export type PaymentInput = z.infer<typeof paymentSchema>;

// ---------- Helpers ---------------------------------------------------------
export type ZodFieldErrors = Record<string, string[] | undefined>;

export function flattenErrors<T>(err: z.ZodError<T>): ZodFieldErrors {
  return err.flatten().fieldErrors as ZodFieldErrors;
}

export function firstError(errors: ZodFieldErrors, field: string): string | null {
  return errors[field]?.[0] ?? null;
}
