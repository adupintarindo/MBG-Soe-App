import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

type Entry = {
  school_id?: string;
  att_date?: string;
  qty?: number | string;
};

// POST body: { entries: Entry[] }  → batch upsert perkiraan kehadiran
export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "operator")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: { entries?: Entry[] } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) {
    return NextResponse.json(
      { ok: false, error: "entries array required" },
      { status: 400 }
    );
  }

  const rows = entries
    .map((e) => {
      const sid = (e.school_id ?? "").trim();
      const date = (e.att_date ?? "").trim();
      const qty = Number(e.qty ?? 0);
      if (!sid || !date || !Number.isFinite(qty) || qty < 0) return null;
      return {
        school_id: sid,
        att_date: date,
        qty: Math.round(qty),
        updated_by: profile.id,
        updated_at: new Date().toISOString()
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no valid rows" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("school_attendance")
    .upsert(rows, { onConflict: "school_id,att_date" });

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true, saved: rows.length });
}
