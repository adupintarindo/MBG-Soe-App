// ============================================================================
// MBG Engine · TypeScript port of client-side MBG_ENGINE (HTML dashboard)
// Jembatan ke RPC Supabase — gunakan ini di server components / route handlers.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface PorsiCounts {
  kecil: number;
  besar: number;
  guru: number;
  total: number;
  operasional: boolean;
}

export interface Requirement {
  item_code: string;
  qty: number;
  unit: string;
  category: Database["public"]["Enums"]["item_category"];
  price_idr: number;
}

export interface Shortage {
  item_code: string;
  required: number;
  on_hand: number;
  gap: number;
  unit: string;
}

export interface UpcomingShortage {
  op_date: string;
  short_items: number;
  total_gap_kg: number;
}

// ---------- RPC wrappers ----------

export async function porsiCounts(supabase: Client, date: string): Promise<PorsiCounts> {
  const { data, error } = await supabase
    .rpc("porsi_counts", { p_date: date })
    .single();
  if (error) throw error;
  return (
    data ?? { kecil: 0, besar: 0, guru: 0, total: 0, operasional: false }
  );
}

export async function porsiEffective(supabase: Client, date: string): Promise<number> {
  const { data, error } = await supabase.rpc("porsi_effective", { p_date: date });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function requirementForDate(
  supabase: Client,
  date: string
): Promise<Requirement[]> {
  const { data, error } = await supabase.rpc("requirement_for_date", {
    p_date: date
  });
  if (error) throw error;
  return (data ?? []) as Requirement[];
}

export async function stockShortageForDate(
  supabase: Client,
  date: string
): Promise<Shortage[]> {
  const { data, error } = await supabase.rpc("stock_shortage_for_date", {
    p_date: date
  });
  if (error) throw error;
  return (data ?? []) as Shortage[];
}

export async function upcomingShortages(
  supabase: Client,
  horizon = 14
): Promise<UpcomingShortage[]> {
  const { data, error } = await supabase.rpc("upcoming_shortages", {
    p_horizon: horizon
  });
  if (error) throw error;
  return (data ?? []) as UpcomingShortage[];
}

// ---------- Client-side pure helpers (tidak perlu RPC) ----------

export function formatIDR(n: number | null | undefined): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(v);
}

export function formatKg(n: number | null | undefined, digits = 1): string {
  const v = Number(n || 0);
  return `${v.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })} kg`;
}

export function formatDateID(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function isWeekend(d: Date | string): boolean {
  const date = typeof d === "string" ? new Date(d) : d;
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

export function toISODate(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}
