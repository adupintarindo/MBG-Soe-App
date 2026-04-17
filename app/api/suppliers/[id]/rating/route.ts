import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: { score?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const score = Number(body.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return NextResponse.json(
      { ok: false, error: "score must be 0..100" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ score })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, score });
}
