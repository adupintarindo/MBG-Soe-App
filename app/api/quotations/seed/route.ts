import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

const WRITE_ROLES = new Set(["admin", "operator"]);

type SeedRow = {
  item_code: string;
  qty: number;
  unit: string;
  price_suggested: number | null;
};

type MenuPreview = {
  date: string;
  menu_id: number | null;
  menu_name: string | null;
  menu_name_en: string | null;
  is_custom: boolean;
  effective_menu_id: number | null; // yg benar2 dipakai (override || assigned)
  effective_source: "assigned" | "override" | "custom" | "none";
};

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !WRITE_ROLES.has(profile.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const menuParam = url.searchParams.get("menu");
  const overrideMenuId = menuParam ? Number(menuParam) : null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { ok: false, error: "date (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 1. Tentukan preview: custom? assigned? override?
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
  let effectiveMenuId: number | null = null;
  let effectiveSource: MenuPreview["effective_source"] = "none";

  if (overrideMenuId && Number.isFinite(overrideMenuId)) {
    effectiveMenuId = overrideMenuId;
    effectiveSource = "override";
  } else if (isCustom) {
    effectiveSource = "custom";
  } else if (assignedMenuId) {
    effectiveMenuId = assignedMenuId;
    effectiveSource = "assigned";
  }

  // menu_name selalu nama menu yang TERJADWAL untuk tanggal itu (bukan override)
  // supaya client bisa tampilkan "Menu terjadwal: X (override → Y)".
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

  const preview: MenuPreview = {
    date,
    menu_id: assignedMenuId,
    menu_name: menuName,
    menu_name_en: menuNameEn,
    is_custom: isCustom,
    effective_menu_id: effectiveMenuId,
    effective_source: effectiveSource
  };

  // 2. Seed rows
  let rows: SeedRow[] = [];

  if (effectiveSource === "override" && effectiveMenuId) {
    // RPC baru dari migration 0054 — types Supabase akan update saat regen.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)(
      "quotation_seed_from_menu",
      { p_date: date, p_menu_id: effectiveMenuId }
    );
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, preview },
        { status: 500 }
      );
    }
    rows = (data ?? []) as SeedRow[];
  } else {
    const { data, error } = await supabase.rpc("quotation_seed_from_date", {
      p_date: date
    });
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, preview },
        { status: 500 }
      );
    }
    rows = (data ?? []) as SeedRow[];
  }

  return NextResponse.json({ ok: true, preview, rows });
}
