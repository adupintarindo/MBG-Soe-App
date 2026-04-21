import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

const READ_ROLES = new Set([
  "admin",
  "operator",
  "ahli_gizi",
  "viewer"
]);

// Lightweight: resolve menu untuk tanggal tanpa seed row.
// Dipakai form quotation baru untuk preview "menu terjadwal".
export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !READ_ROLES.has(profile.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { ok: false, error: "date (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const [customRes, assignRes] = await Promise.all([
    supabase
      .from("custom_menus")
      .select("menu_date")
      .eq("menu_date", date)
      .maybeSingle(),
    supabase
      .from("menu_assign")
      .select("menu_id")
      .eq("assign_date", date)
      .maybeSingle()
  ]);

  const isCustom = !!customRes.data;
  const assignedMenuId = (assignRes.data?.menu_id as number | null) ?? null;

  let menuName: string | null = null;
  let menuNameEn: string | null = null;

  if (assignedMenuId) {
    const { data: menuRow } = await supabase
      .from("menus")
      .select("name, name_en")
      .eq("id", assignedMenuId)
      .maybeSingle();
    if (menuRow) {
      menuName = (menuRow.name as string | null) ?? null;
      menuNameEn = (menuRow.name_en as string | null) ?? null;
    }
  }

  return NextResponse.json({
    ok: true,
    preview: {
      date,
      menu_id: assignedMenuId,
      menu_name: menuName,
      menu_name_en: menuNameEn,
      is_custom: isCustom,
      effective_menu_id: assignedMenuId,
      effective_source: isCustom
        ? "custom"
        : assignedMenuId
          ? "assigned"
          : "none"
    }
  });
}
