import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

async function gate() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") return false;
  return true;
}

// POST body { name, valid_until? }
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await gate()))
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: { name?: string; valid_until?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { ok: false, error: "name required" },
      { status: 400 }
    );
  }

  const validUntil =
    body.valid_until && body.valid_until.trim() ? body.valid_until : null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("supplier_certs")
    .insert({
      supplier_id: params.id,
      name,
      valid_until: validUntil
    })
    .select("id, name, valid_until, created_at")
    .single();

  if (error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cert: data });
}

// DELETE ?cid=N
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await gate()))
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const cid = Number(searchParams.get("cid"));
  if (!Number.isFinite(cid) || cid <= 0) {
    return NextResponse.json(
      { ok: false, error: "cid param required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("supplier_certs")
    .delete()
    .eq("id", cid)
    .eq("supplier_id", params.id);

  if (error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
