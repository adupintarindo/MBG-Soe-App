"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { toISODate } from "@/lib/engine";
import { getHoliday } from "@/lib/holidays";

const WRITE_ROLES = new Set(["admin", "operator", "ahli_gizi"]);

type ActionResult<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

async function requireWriter(): Promise<
  | { ok: true; profile: NonNullable<Awaited<ReturnType<typeof getSessionProfile>>> }
  | { ok: false; error: string }
> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: "Tidak terautentikasi." };
  if (!profile.active) return { ok: false, error: "Akun non-aktif." };
  if (!WRITE_ROLES.has(profile.role)) return { ok: false, error: "Tidak diizinkan." };
  return { ok: true, profile };
}

async function requireAuth(): Promise<
  | { ok: true; profile: NonNullable<Awaited<ReturnType<typeof getSessionProfile>>> }
  | { ok: false; error: string }
> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: "Tidak terautentikasi." };
  if (!profile.active) return { ok: false, error: "Akun non-aktif." };
  return { ok: true, profile };
}

// ---------------------------------------------------------------------------
// Writes: semua pakai service-role client (bypass RLS) setelah validasi role
// di server. Ini aman karena requireWriter() sudah enforce matrix RLS yang
// sama dengan DB policy (admin/operator/ahli_gizi).
//
// Rationale: dev-shortcut login (admin/admin) tidak set JWT Supabase, jadi
// auth.uid() di DB = NULL → RLS reject. Path ini juga bikin real-user writes
// konsisten (satu jalur audit di server) tanpa bergantung JWT client.
// ---------------------------------------------------------------------------

export async function setAssignment(
  iso: string,
  menuId: number,
  note: string
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = createAdminClient();
  const cleanNote = note.trim() || null;

  const upsertRes = await supabase
    .from("menu_assign")
    .upsert(
      { assign_date: iso, menu_id: menuId, note: cleanNote } as never,
      { onConflict: "assign_date" }
    );
  if (upsertRes.error) return { ok: false, error: upsertRes.error.message };

  // Bersihkan non-op kalau dulu di-mark non-op
  const delRes = await supabase.from("non_op_days").delete().eq("op_date", iso);
  if (delRes.error) return { ok: false, error: delRes.error.message };

  revalidatePath("/calendar");
  return { ok: true };
}

export async function clearAssignment(iso: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("menu_assign")
    .delete()
    .eq("assign_date", iso);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true };
}

export async function markNonOpDay(
  iso: string,
  reason: string
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { ok: false, error: auth.error };

  const clean = reason.trim();
  if (!clean) return { ok: false, error: "Alasan non-operasional wajib diisi." };

  const supabase = createAdminClient();

  const upsertRes = await supabase
    .from("non_op_days")
    .upsert(
      { op_date: iso, reason: clean } as never,
      { onConflict: "op_date" }
    );
  if (upsertRes.error) return { ok: false, error: upsertRes.error.message };

  const delRes = await supabase
    .from("menu_assign")
    .delete()
    .eq("assign_date", iso);
  if (delRes.error) return { ok: false, error: delRes.error.message };

  revalidatePath("/calendar");
  return { ok: true };
}

export async function clearNonOpDay(iso: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("non_op_days")
    .delete()
    .eq("op_date", iso);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true };
}

export async function saveAttendanceDay(
  iso: string,
  entries: { school_id: string; qty: number | null }[]
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = createAdminClient();

  const toUpsert = entries
    .filter((e) => e.qty !== null && !Number.isNaN(e.qty))
    .map((e) => ({ school_id: e.school_id, att_date: iso, qty: e.qty as number }));
  const toDelete = entries.filter((e) => e.qty === null).map((e) => e.school_id);

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("school_attendance")
      .upsert(toUpsert as never, { onConflict: "school_id,att_date" });
    if (error) return { ok: false, error: error.message };
  }
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("school_attendance")
      .delete()
      .eq("att_date", iso)
      .in("school_id", toDelete);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/calendar");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reads via server action — dipakai kalau client-side supabase.from() gagal
// karena user login lewat dev-shortcut (tanpa JWT).
// ---------------------------------------------------------------------------

export async function fetchAttendanceFor(
  iso: string
): Promise<
  ActionResult<{ school_id: string; att_date: string; qty: number }[]>
> {
  const auth = await requireAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("school_attendance")
    .select("school_id, att_date, qty")
    .eq("att_date", iso);
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []) as { school_id: string; att_date: string; qty: number }[]
  };
}

export async function fetchCalendarReference(): Promise<
  ActionResult<{
    items: {
      code: string;
      name_en: string | null;
      category: string;
      active: boolean;
    }[];
    schools: {
      id: string;
      name: string;
      level: string;
      students: number;
      kelas13: number;
      kelas46: number;
      guru: number;
    }[];
    bom: { menu_id: number; item_code: string }[];
  }>
> {
  const auth = await requireAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = createAdminClient();
  const [itemsRes, schoolsRes, bomRes] = await Promise.all([
    supabase
      .from("items")
      .select("code, name_en, category, active")
      .eq("active", true)
      .order("code"),
    supabase
      .from("schools")
      .select("id, name, level, students, kelas13, kelas46, guru")
      .eq("active", true)
      .order("id"),
    supabase
      .from("menu_bom")
      .select("menu_id, item_code")
  ]);
  if (itemsRes.error) return { ok: false, error: itemsRes.error.message };
  if (schoolsRes.error) return { ok: false, error: schoolsRes.error.message };
  if (bomRes.error) return { ok: false, error: bomRes.error.message };
  return {
    ok: true,
    data: {
      items: (itemsRes.data ?? []) as {
        code: string;
        name_en: string | null;
        category: string;
        active: boolean;
      }[],
      schools: (schoolsRes.data ?? []) as {
        id: string;
        name: string;
        level: string;
        students: number;
        kelas13: number;
        kelas46: number;
        guru: number;
      }[],
      bom: (bomRes.data ?? []) as { menu_id: number; item_code: string }[]
    }
  };
}

// ---------------------------------------------------------------------------
// Existing: bulk auto-assign menu bulan
// ---------------------------------------------------------------------------

export async function autoAssignMonth(
  year: number,
  month: number
): Promise<{ inserted: number; error?: string }> {
  const auth = await requireWriter();
  if (!auth.ok) return { inserted: 0, error: auth.error };

  const supabase = createAdminClient();
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

// ---------------------------------------------------------------------------
// Populate bulan dari tanggal X dengan urutan menu mulai dari menu Y.
// Cycle urut by menus.id (sama seperti autoAssignMonth), tapi:
//   - start: tanggal user-defined (boleh di tengah bulan)
//   - startMenuId: menu awal (M1/M2/..) — rotasi berlanjut setelahnya
//   - overwrite: true → timpa assignment existing di range. false → skip hari yang sudah ada.
// Hari skip: weekend (Sab/Min), holiday, non-op.
// ---------------------------------------------------------------------------
export async function populateMonthFrom(
  year: number,
  month: number,
  startISO: string,
  startMenuId: number,
  overwrite: boolean
): Promise<{ inserted: number; error?: string }> {
  const auth = await requireWriter();
  if (!auth.ok) return { inserted: 0, error: auth.error };

  const supabase = createAdminClient();
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const start = toISODate(first);
  const end = toISODate(last);

  // Validate startISO is within month
  if (startISO < start || startISO > end) {
    return { inserted: 0, error: "Tanggal mulai harus di dalam bulan ini." };
  }

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

  const startIdx = menus.findIndex((m) => m.id === startMenuId);
  if (startIdx < 0) return { inserted: 0, error: "Menu awal tidak valid." };

  const existingSet = new Set(
    ((existingRes.data ?? []) as { assign_date: string }[]).map((r) => r.assign_date)
  );
  const nonOpSet = new Set(
    ((nonOpRes.data ?? []) as { op_date: string }[]).map((r) => r.op_date)
  );

  const rows: { assign_date: string; menu_id: number; note: null }[] = [];
  let opIdx = 0;
  const cursor = new Date(
    Number(startISO.slice(0, 4)),
    Number(startISO.slice(5, 7)) - 1,
    Number(startISO.slice(8, 10))
  );
  while (cursor <= last) {
    const iso = toISODate(cursor);
    const dow = cursor.getDay();
    cursor.setDate(cursor.getDate() + 1);
    if (dow === 0 || dow === 6) continue;
    if (getHoliday(iso)) continue;
    if (nonOpSet.has(iso)) continue;
    if (!overwrite && existingSet.has(iso)) {
      // tetap advance pointer kalau mau skip — supaya urutan menu tidak bergeser
      opIdx++;
      continue;
    }
    rows.push({
      assign_date: iso,
      menu_id: menus[(startIdx + opIdx) % menus.length].id,
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

// ---------------------------------------------------------------------------
// Clear semua menu_assign dalam bulan.
// ---------------------------------------------------------------------------
export async function clearAllAssignments(
  year: number,
  month: number
): Promise<{ deleted: number; error?: string }> {
  const auth = await requireWriter();
  if (!auth.ok) return { deleted: 0, error: auth.error };

  const supabase = createAdminClient();
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const start = toISODate(first);
  const end = toISODate(last);

  const { data, error } = await supabase
    .from("menu_assign")
    .delete()
    .gte("assign_date", start)
    .lte("assign_date", end)
    .select("assign_date");

  if (error) return { deleted: 0, error: error.message };

  revalidatePath("/calendar");
  return { deleted: (data ?? []).length };
}
