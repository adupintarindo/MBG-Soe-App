import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/cron/maintenance
// Dipanggil oleh Vercel Cron (lihat vercel.json "crons").
// Gate: header `Authorization: Bearer $CRON_SECRET` atau `x-cron-secret: $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "cron_secret_unset" },
      { status: 500 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const legacy = request.headers.get("x-cron-secret") ?? "";
  const expected = `Bearer ${secret}`;
  if (header !== expected && legacy !== secret) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  // RPC names belum ada di generated Database types (migration 0055 baru).
  // Cast ke loose client agar typecheck pass sampai types di-regenerate.
  const supabase = createAdminClient() as unknown as {
    rpc: (
      fn: string
    ) => Promise<{ data: number | null; error: { message: string } | null }>;
  };
  const started = new Date().toISOString();

  const [ovRes, qtRes] = await Promise.all([
    supabase.rpc("invoices_flag_overdue"),
    supabase.rpc("quotations_flag_expired")
  ]);

  const errors: Record<string, string> = {};
  if (ovRes.error) errors.invoices_flag_overdue = ovRes.error.message;
  if (qtRes.error) errors.quotations_flag_expired = qtRes.error.message;

  const ok = Object.keys(errors).length === 0;
  return NextResponse.json(
    {
      ok,
      started,
      finished: new Date().toISOString(),
      flipped: {
        invoices_overdue: ovRes.data ?? null,
        quotations_expired: qtRes.data ?? null
      },
      errors: ok ? undefined : errors
    },
    { status: ok ? 200 : 500 }
  );
}
