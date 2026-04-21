import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type QuotationInsert = Database["public"]["Tables"]["quotations"]["Insert"];
type QuotationRowInsert =
  Database["public"]["Tables"]["quotation_rows"]["Insert"];
type QuotationStatus = Database["public"]["Enums"]["quotation_status"];

const WRITE_ROLES = new Set(["admin", "operator"]);

interface DraftRowPayload {
  item_code: string;
  unit: string;
  qty: number;
  price_suggested: number | null;
  note: string | null;
}

interface CreateQuotationBody {
  supplier_id?: string;
  quote_date?: string;
  valid_until?: string | null;
  need_date?: string | null;
  notes?: string | null;
  status?: QuotationStatus;
  rows?: DraftRowPayload[];
}

export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !WRITE_ROLES.has(profile.role)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  let body: CreateQuotationBody;
  try {
    body = (await request.json()) as CreateQuotationBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  const supplierId = (body.supplier_id ?? "").trim();
  if (!supplierId) {
    return NextResponse.json(
      { ok: false, error: "supplier_id required" },
      { status: 400 }
    );
  }

  const cleanRows = (body.rows ?? []).filter(
    (r) => r && r.item_code && Number(r.qty) > 0
  );
  if (cleanRows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "at least one valid row required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const headerPayload: QuotationInsert = {
    supplier_id: supplierId,
    quote_date: body.quote_date ?? new Date().toISOString().slice(0, 10),
    valid_until: body.valid_until ?? null,
    need_date: body.need_date ?? null,
    notes: body.notes ?? null,
    status: body.status ?? "draft",
    created_by: profile.id
  } as QuotationInsert;

  const { data: qtData, error: qtErr } = await supabase
    .from("quotations")
    .insert(headerPayload)
    .select("no")
    .single();

  if (qtErr || !qtData) {
    return NextResponse.json(
      { ok: false, error: qtErr?.message ?? "insert failed" },
      { status: 500 }
    );
  }

  const qtNo = (qtData as { no: string }).no;
  const rowPayload: QuotationRowInsert[] = cleanRows.map((r, i) => ({
    qt_no: qtNo,
    line_no: i + 1,
    item_code: r.item_code,
    qty: Number(r.qty),
    unit: r.unit || "kg",
    price_suggested:
      r.price_suggested === null || r.price_suggested === undefined
        ? null
        : Number(r.price_suggested),
    note: r.note ?? null
  })) as QuotationRowInsert[];

  const { error: rowErr } = await supabase
    .from("quotation_rows")
    .insert(rowPayload);

  if (rowErr) {
    return NextResponse.json(
      { ok: false, error: rowErr.message, no: qtNo },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, no: qtNo });
}
