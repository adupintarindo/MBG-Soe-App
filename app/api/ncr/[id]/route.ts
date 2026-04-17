import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type NcrUpdate = Database["public"]["Tables"]["non_conformance_log"]["Update"];
type NcrStatus = Database["public"]["Enums"]["ncr_status"];

const STATUS_OK: NcrStatus[] = ["open", "in_progress", "resolved", "waived"];
const ALLOWED: (keyof NcrUpdate)[] = [
  "status",
  "severity",
  "root_cause",
  "corrective_action",
  "qty_affected",
  "unit",
  "cost_impact_idr",
  "photo_url",
  "linked_action_id"
];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getSessionProfile();
  if (!profile || !["admin", "operator"].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { ok: false, error: "bad_id" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  const patch: NcrUpdate = {};
  for (const key of ALLOWED) {
    if (key in body) {
      (patch as Record<string, unknown>)[key] = body[key];
    }
  }
  if (patch.status && !STATUS_OK.includes(patch.status as NcrStatus)) {
    return NextResponse.json(
      { ok: false, error: "bad_status" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("non_conformance_log")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true, ncr: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }
  const id = Number(params.id);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("non_conformance_log")
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true });
}
