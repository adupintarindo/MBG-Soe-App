import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { listSupplierActions } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!profile.active) {
    return NextResponse.json({ ok: false, error: "inactive" }, { status: 403 });
  }

  const supabase = createClient();
  const { id } = params;

  const [supRes, itemsRes, certsRes, poRes, invRes, catalogRes, actions] =
    await Promise.all([
      supabase
        .from("suppliers")
        .select(
          "id, name, type, commodity, pic, phone, address, email, notes, score, status, active"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("supplier_items")
        .select("supplier_id, item_code, is_main, price_idr, lead_time_days")
        .eq("supplier_id", id),
      supabase
        .from("supplier_certs")
        .select("id, supplier_id, name, valid_until, created_at")
        .eq("supplier_id", id)
        .order("valid_until", { ascending: true }),
      supabase
        .from("purchase_orders")
        .select("no, supplier_id, po_date, total, status")
        .eq("supplier_id", id)
        .order("po_date", { ascending: false })
        .limit(25),
      supabase
        .from("invoices")
        .select("no, supplier_id, inv_date, total, status, po_no")
        .eq("supplier_id", id)
        .order("inv_date", { ascending: false })
        .limit(25),
      supabase
        .from("items")
        .select("code, name_en, unit, category")
        .order("code"),
      listSupplierActions(supabase, { supplierId: id }).catch(() => [])
    ]);

  if (!supRes.data) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const isAdmin = profile.role === "admin";
  const canWriteActions =
    profile.role === "admin" ||
    profile.role === "operator" ||
    (profile.role === "supplier" && profile.supplier_id === id);
  const isSupplierRole = profile.role === "supplier";

  return NextResponse.json({
    ok: true,
    supplier: supRes.data,
    supItems: itemsRes.data ?? [],
    certs: certsRes.data ?? [],
    pos: poRes.data ?? [],
    invoices: invRes.data ?? [],
    items: catalogRes.data ?? [],
    actions,
    isAdmin,
    canWriteActions,
    isSupplierRole
  });
}
