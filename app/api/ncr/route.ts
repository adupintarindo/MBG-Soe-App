import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type NcrInsert = Database["public"]["Tables"]["non_conformance_log"]["Insert"];
type NcrSeverity = Database["public"]["Enums"]["ncr_severity"];
type NcrStatus = Database["public"]["Enums"]["ncr_status"];

const SEV_OK: NcrSeverity[] = ["minor", "major", "critical"];
const STATUS_OK: NcrStatus[] = ["open", "in_progress", "resolved", "waived"];

// POST: create new NCR (admin/operator)
export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !["admin", "operator"].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  let body: Partial<NcrInsert> & {
    issue?: string;
    severity?: NcrSeverity;
    status?: NcrStatus;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  const issue = (body.issue ?? "").toString().trim();
  if (!issue) {
    return NextResponse.json(
      { ok: false, error: "issue required" },
      { status: 400 }
    );
  }
  const severity: NcrSeverity = SEV_OK.includes(
    body.severity as NcrSeverity
  )
    ? (body.severity as NcrSeverity)
    : "minor";
  const status: NcrStatus = STATUS_OK.includes(body.status as NcrStatus)
    ? (body.status as NcrStatus)
    : "open";

  const supabase = createAdminClient();
  const payload: NcrInsert = {
    grn_no: body.grn_no ?? null,
    supplier_id: body.supplier_id ?? null,
    item_code: body.item_code ?? null,
    severity,
    status,
    issue,
    root_cause: body.root_cause ?? null,
    corrective_action: body.corrective_action ?? null,
    qty_affected: body.qty_affected ?? null,
    unit: body.unit ?? null,
    cost_impact_idr: body.cost_impact_idr ?? null,
    reported_by: profile.id,
    photo_url: body.photo_url ?? null
  };

  const { data, error } = await supabase
    .from("non_conformance_log")
    .insert(payload)
    .select("*")
    .single();

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true, ncr: data });
}
