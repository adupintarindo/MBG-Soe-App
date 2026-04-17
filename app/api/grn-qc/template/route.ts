import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { qcTemplateForItem } from "@/lib/engine";

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
  const item = url.searchParams.get("item") ?? "";
  if (!item) {
    return NextResponse.json(
      { ok: false, error: "item param required" },
      { status: 400 }
    );
  }
  const supabase = createClient();
  try {
    const template = await qcTemplateForItem(supabase, item);
    return NextResponse.json({ ok: true, template });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
