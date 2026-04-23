/**
 * POST /api/purchase-orders
 * Create a new Purchase Order from an existing quotation.
 *
 * Body:
 *   { qt_no: "QT-2026-001", delivery_date?: "2026-04-30", pay_method?, top?, notes? }
 *
 * Behavior:
 *   - Pakai admin client (bypass RLS) — konsisten dengan /api/quotations.
 *   - Ambil quotations + quotation_rows → buat PO header + po_rows.
 *   - Update quotation: status='converted', converted_po_no=<new PO>.
 *   - Harga & qty: pakai quoted > suggested (fallback) > 0.
 *   - Nomor PO auto: PO-YYYY-NNN (mirror logic RPC lama).
 */
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const DEV_ADMIN_FAKE_ID = "00000000-0000-0000-0000-000000000001";
const WRITE_ROLES = new Set(["admin", "operator"]);

type PoInsert = Database["public"]["Tables"]["purchase_orders"]["Insert"];
type PoRowInsert = Database["public"]["Tables"]["po_rows"]["Insert"];

interface CreatePOBody {
  qt_no?: string;
  delivery_date?: string | null;
  pay_method?: string | null;
  top?: string | null;
  notes?: string | null;
  ref_contract?: string | null;
}

export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !WRITE_ROLES.has(profile.role)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  let body: CreatePOBody;
  try {
    body = (await request.json()) as CreatePOBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  const qtNo = (body.qt_no ?? "").trim();
  if (!qtNo) {
    return NextResponse.json(
      { ok: false, error: "qt_no required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Fetch quotation header + rows
  const [qtRes, qtRowsRes] = await Promise.all([
    supabase
      .from("quotations")
      .select(
        "no, supplier_id, quote_date, valid_until, need_date, status, converted_po_no, notes"
      )
      .eq("no", qtNo)
      .maybeSingle(),
    supabase
      .from("quotation_rows")
      .select(
        "line_no, item_code, qty, qty_quoted, unit, price_suggested, price_quoted, note"
      )
      .eq("qt_no", qtNo)
      .order("line_no", { ascending: true })
  ]);

  const qt = qtRes.data;
  if (qtRes.error || !qt) {
    return NextResponse.json(
      { ok: false, error: `quotation ${qtNo} not found` },
      { status: 404 }
    );
  }

  if (qt.converted_po_no) {
    return NextResponse.json({ ok: true, no: qt.converted_po_no, existing: true });
  }

  const qtRows = qtRowsRes.data ?? [];
  if (qtRows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "quotation has no rows" },
      { status: 400 }
    );
  }

  // Generate PO-YYYY-NNN
  const year = new Date().getFullYear().toString();
  const { data: lastPOs } = await supabase
    .from("purchase_orders")
    .select("no")
    .like("no", `PO-${year}-%`)
    .order("no", { ascending: false })
    .limit(1);
  const lastSeq =
    lastPOs && lastPOs.length > 0
      ? Number(
          (lastPOs[0].no as string).replace(`PO-${year}-`, "")
        ) || 0
      : 0;
  const nextSeq = lastSeq + 1;
  const poNo = `PO-${year}-${String(nextSeq).padStart(3, "0")}`;

  // Build rows
  let total = 0;
  const poRowPayload: PoRowInsert[] = qtRows.map((r, i) => {
    const qty = Number(r.qty_quoted ?? r.qty ?? 0);
    const price = Number(r.price_quoted ?? r.price_suggested ?? 0);
    total += qty * price;
    return {
      po_no: poNo,
      line_no: i + 1,
      item_code: r.item_code,
      qty,
      unit: r.unit || "kg",
      price
    } as PoRowInsert;
  });

  // Build header
  const today = new Date().toISOString().slice(0, 10);
  const derivedNotes = `Dari ${qtNo}${qt.notes ? " · " + qt.notes : ""}${body.notes ? " · " + body.notes : ""}`;
  const headerPayload: PoInsert = {
    no: poNo,
    po_date: today,
    supplier_id: qt.supplier_id,
    delivery_date: body.delivery_date ?? qt.need_date ?? null,
    status: "draft",
    total,
    pay_method: body.pay_method ?? null,
    top: body.top ?? null,
    ref_contract: body.ref_contract ?? null,
    notes: derivedNotes,
    created_by: profile.id === DEV_ADMIN_FAKE_ID ? null : profile.id
  } as PoInsert;

  // Insert header
  const { error: poErr } = await supabase
    .from("purchase_orders")
    .insert(headerPayload);
  if (poErr) {
    return NextResponse.json(
      { ok: false, error: poErr.message },
      { status: 500 }
    );
  }

  // Insert rows
  const { error: rowErr } = await supabase
    .from("po_rows")
    .insert(poRowPayload);
  if (rowErr) {
    // Rollback header
    await supabase.from("purchase_orders").delete().eq("no", poNo);
    return NextResponse.json(
      { ok: false, error: rowErr.message },
      { status: 500 }
    );
  }

  // Link quotation
  const { error: qtUpdErr } = await supabase
    .from("quotations")
    .update({ status: "converted", converted_po_no: poNo })
    .eq("no", qtNo);
  if (qtUpdErr) {
    // Non-fatal — PO already created. Just log the mismatch via response.
    return NextResponse.json({
      ok: true,
      no: poNo,
      warning: `PO created but quotation link failed: ${qtUpdErr.message}`
    });
  }

  return NextResponse.json({ ok: true, no: poNo });
}
