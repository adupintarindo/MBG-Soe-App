import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ActionInsert =
  Database["public"]["Tables"]["supplier_actions"]["Insert"];
type ActionStatus = Database["public"]["Enums"]["action_status"];
type ActionPriority = Database["public"]["Enums"]["action_priority"];
type ActionSource = Database["public"]["Enums"]["action_source"];

// POST: create new action (admin/operator)
export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !["admin", "operator"].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  let body: Partial<ActionInsert> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  const title = (body.title ?? "").toString().trim();
  if (!title) {
    return NextResponse.json(
      { ok: false, error: "title required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const payload: ActionInsert = {
    title,
    supplier_id: body.supplier_id ?? null,
    related_scope: body.related_scope ?? null,
    description: body.description ?? null,
    category: body.category ?? null,
    priority: (body.priority as ActionPriority) ?? "medium",
    status: (body.status as ActionStatus) ?? "open",
    owner: body.owner ?? "IFSR-WFP",
    target_date: body.target_date ?? null,
    source: (body.source as ActionSource) ?? "ad_hoc",
    source_ref: body.source_ref ?? null,
    created_by: profile.id
  };

  const { data, error } = await supabase
    .from("supplier_actions")
    .insert(payload)
    .select("*")
    .single();

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true, action: data });
}
