import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

const WRITE_ROLES = new Set(["admin", "operator"]);

export async function POST(
  _request: Request,
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

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("convert_quotation_to_po", {
    p_qt_no: qtNo
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, po_no: data as unknown as string });
}
