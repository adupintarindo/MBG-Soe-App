import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

async function gate() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") return false;
  return true;
}

// POST body: { item_code, price_idr?, is_main?, lead_time_days? }  → add or upsert
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await gate()))
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: {
    item_code?: string;
    price_idr?: number | string | null;
    is_main?: boolean;
    lead_time_days?: number | null;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const itemCode = (body.item_code ?? "").trim();
  if (!itemCode) {
    return NextResponse.json(
      { ok: false, error: "item_code required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const price =
    body.price_idr == null || body.price_idr === ""
      ? null
      : Number(body.price_idr);

  const { error } = await supabase.from("supplier_items").upsert(
    {
      supplier_id: params.id,
      item_code: itemCode,
      is_main: body.is_main ?? false,
      price_idr: price,
      lead_time_days: body.lead_time_days ?? null
    },
    { onConflict: "supplier_id,item_code" }
  );

  if (error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH ?code=ITEM  body { price_idr, is_main?, lead_time_days? }
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await gate()))
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { ok: false, error: "code param required" },
      { status: 400 }
    );
  }

  let body: {
    price_idr?: number | string | null;
    is_main?: boolean;
    lead_time_days?: number | null;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.price_idr !== undefined) {
    patch.price_idr =
      body.price_idr == null || body.price_idr === ""
        ? null
        : Number(body.price_idr);
  }
  if (body.is_main !== undefined) patch.is_main = body.is_main;
  if (body.lead_time_days !== undefined)
    patch.lead_time_days = body.lead_time_days;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("supplier_items")
    .update(patch)
    .eq("supplier_id", params.id)
    .eq("item_code", code);

  if (error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE ?code=ITEM
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await gate()))
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { ok: false, error: "code param required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("supplier_items")
    .delete()
    .eq("supplier_id", params.id)
    .eq("item_code", code);

  if (error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
