import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type CheckInsert = Database["public"]["Tables"]["grn_qc_checks"]["Insert"];
type QcResult = Database["public"]["Enums"]["qc_result"];

const VALID: QcResult[] = ["pass", "minor", "major", "critical", "na"];

// POST: bulk submit QC checks for a GRN (admin/operator)
export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !["admin", "operator"].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  let body: {
    grn_no?: string;
    item_code?: string | null;
    checks?: Array<{
      checkpoint: string;
      result: QcResult;
      is_critical?: boolean;
      note?: string | null;
      photo_url?: string | null;
    }>;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  const grnNo = body.grn_no?.trim();
  if (!grnNo) {
    return NextResponse.json(
      { ok: false, error: "grn_no required" },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.checks) || body.checks.length === 0) {
    return NextResponse.json(
      { ok: false, error: "checks empty" },
      { status: 400 }
    );
  }

  const rows: CheckInsert[] = body.checks
    .filter((c) => c.checkpoint && VALID.includes(c.result))
    .map((c) => ({
      grn_no: grnNo,
      item_code: body.item_code ?? null,
      checkpoint: c.checkpoint,
      is_critical: Boolean(c.is_critical),
      result: c.result,
      note: c.note ?? null,
      photo_url: c.photo_url ?? null,
      checked_by: profile.id
    }));

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no valid checks" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("grn_qc_checks")
    .insert(rows)
    .select("*");

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );

  // Auto-promote GRN status jika ada critical fail
  const anyCritical = rows.some((r) => r.result === "critical");
  const anyFail = rows.some((r) =>
    ["minor", "major", "critical"].includes(r.result ?? "pass")
  );
  if (anyCritical || anyFail) {
    await supabase
      .from("grns")
      .update({ status: anyCritical ? "rejected" : "partial" })
      .eq("no", grnNo);
  }

  return NextResponse.json({ ok: true, inserted: data?.length ?? 0 });
}
