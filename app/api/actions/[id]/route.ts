import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ActionUpdate =
  Database["public"]["Tables"]["supplier_actions"]["Update"];
type ActionStatus = Database["public"]["Enums"]["action_status"];

const VALID_STATUSES: ActionStatus[] = [
  "open",
  "in_progress",
  "blocked",
  "done",
  "cancelled"
];

// PATCH: update action (status, notes, blocked_reason, target_date, owner)
// · admin/operator bebas update semua action
// · supplier hanya boleh update action miliknya (status + notes)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_id" },
      { status: 400 }
    );
  }

  let body: Partial<ActionUpdate> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Fetch existing row untuk ownership check
  const { data: existing, error: fetchErr } = await supabase
    .from("supplier_actions")
    .select("id, supplier_id")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 }
    );
  }

  // Supplier role gate: hanya boleh update action miliknya, hanya status+notes
  if (profile.role === "supplier") {
    if (!profile.supplier_id || existing.supplier_id !== profile.supplier_id) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }
    // Strip field yang tidak boleh diubah supplier
    body = {
      status: body.status,
      output_notes: body.output_notes,
      blocked_reason: body.blocked_reason
    };
  } else if (!["admin", "operator"].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  if (body.status && !VALID_STATUSES.includes(body.status as ActionStatus)) {
    return NextResponse.json(
      { ok: false, error: "invalid_status" },
      { status: 400 }
    );
  }

  // Clean up undefined
  const payload: ActionUpdate = {};
  for (const key of [
    "title",
    "description",
    "category",
    "priority",
    "status",
    "owner",
    "target_date",
    "output_notes",
    "blocked_reason",
    "related_scope"
  ] as const) {
    if (body[key] !== undefined) {
      (payload as Record<string, unknown>)[key] = body[key];
    }
  }

  // Auto-clear blocked_reason kalau status bukan blocked
  if (payload.status && payload.status !== "blocked") {
    payload.blocked_reason = null;
  }

  const { data, error } = await supabase
    .from("supplier_actions")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true, action: data });
}

// DELETE: admin only
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
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_id" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("supplier_actions")
    .delete()
    .eq("id", id);

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true });
}
