"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { toISODate } from "@/lib/engine";
import { getHoliday } from "@/lib/holidays";

const WRITE_ROLES = new Set(["admin", "operator", "ahli_gizi"]);

export async function autoAssignMonth(
  year: number,
  month: number
): Promise<{ inserted: number; error?: string }> {
  const profile = await getSessionProfile();
  if (!profile || !WRITE_ROLES.has(profile.role)) {
    return { inserted: 0, error: "Tidak diizinkan." };
  }

  const supabase = createClient();
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const start = toISODate(first);
  const end = toISODate(last);

  const [menusRes, existingRes, nonOpRes] = await Promise.all([
    supabase.from("menus").select("id").order("id"),
    supabase
      .from("menu_assign")
      .select("assign_date")
      .gte("assign_date", start)
      .lte("assign_date", end),
    supabase
      .from("non_op_days")
      .select("op_date")
      .gte("op_date", start)
      .lte("op_date", end)
  ]);

  const menus = (menusRes.data ?? []) as { id: number }[];
  if (menus.length === 0) return { inserted: 0, error: "Belum ada menu siklus." };

  const existingSet = new Set(
    ((existingRes.data ?? []) as { assign_date: string }[]).map((r) => r.assign_date)
  );
  const nonOpSet = new Set(
    ((nonOpRes.data ?? []) as { op_date: string }[]).map((r) => r.op_date)
  );

  const rows: { assign_date: string; menu_id: number; note: null }[] = [];
  let opIdx = 0;
  const cursor = new Date(first);
  while (cursor <= last) {
    const iso = toISODate(cursor);
    const dow = cursor.getDay();
    cursor.setDate(cursor.getDate() + 1);
    if (dow === 0 || dow === 6) continue;
    if (getHoliday(iso)) continue;
    if (nonOpSet.has(iso)) continue;
    if (existingSet.has(iso)) continue;
    rows.push({
      assign_date: iso,
      menu_id: menus[opIdx % menus.length].id,
      note: null
    });
    opIdx++;
  }

  if (rows.length === 0) return { inserted: 0 };

  const { error } = await supabase
    .from("menu_assign")
    .upsert(rows as never, { onConflict: "assign_date" });
  if (error) return { inserted: 0, error: error.message };

  revalidatePath("/calendar");
  return { inserted: rows.length };
}
