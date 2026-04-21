import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type QuotationStatus = Database["public"]["Enums"]["quotation_status"];

const WRITE_ROLES = new Set(["admin", "operator"]);
const ALLOWED_STATUS: QuotationStatus[] = [
  "draft",
  "sent",
  "responded",
  "accepted",
  "rejected",
  "expired"
];

interface PatchBody {
  status?: QuotationStatus;
  notes?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ no: string }> | { no: string } }
) {
  const profile = await getSessionProfile();
  if (!profile || !WRITE_ROLES.has(profile.role)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  const { no } = await Promise.resolve(params);
  const qtNo = decodeURIComponent(no);

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  if (body.status && !ALLOWED_STATUS.includes(body.status)) {
    return NextResponse.json(
      { ok: false, error: "invalid_status" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (body.status) {
    patch.status = body.status;
    if (body.status === "responded") {
      patch.responded_at = new Date().toISOString();
      patch.responded_by = profile.id;
    }
  }
  if (body.notes !== undefined) patch.notes = body.notes;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_fields" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("quotations")
    .update(patch as never)
    .eq("no", qtNo);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
