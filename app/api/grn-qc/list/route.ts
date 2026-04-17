import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { listGrnQcChecks } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 }
    );
  }
  const url = new URL(request.url);
  const grn = url.searchParams.get("grn") ?? "";
  if (!grn) {
    return NextResponse.json(
      { ok: false, error: "grn param required" },
      { status: 400 }
    );
  }
  const supabase = createClient();
  try {
    const checks = await listGrnQcChecks(supabase, grn);
    return NextResponse.json({ ok: true, checks });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
