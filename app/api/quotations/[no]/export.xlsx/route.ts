import { NextResponse } from "next/server";
import { buildStyledXlsxBuffer } from "@/lib/excel-export";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ no: string }> | { no: string } }
) {
  const { no } = await Promise.resolve(params);
  const qtNo = decodeURIComponent(no);

  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [qtRes, rowsRes, itemsRes, supRes] = await Promise.all([
    supabase.from("quotations").select("*").eq("no", qtNo).maybeSingle(),
    supabase
      .from("quotation_rows")
      .select("*")
      .eq("qt_no", qtNo)
      .order("line_no"),
    supabase.from("items").select("code, name_en, unit"),
    supabase.from("suppliers").select("id, name, pic, phone, email, address")
  ]);

  if (qtRes.error || !qtRes.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const qt = qtRes.data as {
    no: string;
    supplier_id: string;
    quote_date: string;
    valid_until: string | null;
    need_date: string | null;
    status: string;
    total: number | string;
    notes: string | null;
  };
  const rows = (rowsRes.data ?? []) as Array<{
    line_no: number;
    item_code: string;
    qty: number | string;
    unit: string;
    price_suggested: number | string | null;
    price_quoted: number | string | null;
    qty_quoted: number | string | null;
    note: string | null;
    subtotal: number | string;
  }>;
  const items = (itemsRes.data ?? []) as Array<{
    code: string;
    name_en: string | null;
    unit: string;
  }>;
  const suppliers = (supRes.data ?? []) as Array<{
    id: string;
    name: string;
    pic: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  }>;
  const supplier = suppliers.find((s) => s.id === qt.supplier_id);
  const itemByCode = new Map(items.map((i) => [i.code, i]));

  const itemRows = rows.map((r) => {
    const it = itemByCode.get(r.item_code);
    return {
      line: r.line_no,
      code: r.item_code,
      name: it?.name_en ?? r.item_code,
      qty: Number(r.qty),
      unit: r.unit,
      priceSuggested:
        r.price_suggested != null ? Number(r.price_suggested) : "",
      priceQuoted: r.price_quoted != null ? Number(r.price_quoted) : "",
      qtyQuoted: r.qty_quoted != null ? Number(r.qty_quoted) : "",
      subtotal: Number(r.subtotal) || "",
      note: r.note ?? ""
    };
  });

  const buffer = await buildStyledXlsxBuffer({
    fileName: qt.no,
    sheets: [
      {
        name: "Quotation",
        title: `QUOTATION / RFQ · ${qt.no}`,
        subtitle: `Tanggal ${qt.quote_date} · Status ${qt.status.toUpperCase()}`,
        columns: [
          { key: "line", header: "#", width: 5, align: "center" },
          { key: "code", header: "Kode Item", width: 14, align: "left" },
          { key: "name", header: "Nama Item", width: 30, align: "left" },
          {
            key: "qty",
            header: "Qty Diminta",
            width: 12,
            align: "right",
            hint: "number",
            numFmt: "#,##0.00"
          },
          { key: "unit", header: "Unit", width: 8, align: "center" },
          {
            key: "priceSuggested",
            header: "Harga Saran",
            width: 16,
            align: "right",
            hint: "money",
            numFmt: '"Rp "#,##0'
          },
          {
            key: "priceQuoted",
            header: "Harga Final",
            width: 16,
            align: "right",
            hint: "money",
            numFmt: '"Rp "#,##0'
          },
          {
            key: "qtyQuoted",
            header: "Qty Final",
            width: 12,
            align: "right",
            hint: "number",
            numFmt: "#,##0.00"
          },
          {
            key: "subtotal",
            header: "Subtotal",
            width: 18,
            align: "right",
            hint: "money",
            numFmt: '"Rp "#,##0'
          },
          { key: "note", header: "Catatan Supplier", width: 28, align: "left" }
        ],
        meta: [
          ["No Quotation", qt.no],
          ["Tanggal", qt.quote_date],
          ["Berlaku s/d", qt.valid_until ?? "—"],
          ["Tanggal Butuh", qt.need_date ?? "—"],
          ["Status", qt.status],
          ["Supplier", supplier?.name ?? qt.supplier_id],
          ["PIC", supplier?.pic ?? "—"],
          ["Telepon", supplier?.phone ?? "—"],
          ["Email", supplier?.email ?? "—"],
          ["Alamat", supplier?.address ?? "—"],
          ["Catatan", qt.notes ?? "—"]
        ],
        rows: itemRows,
        totals: {
          labelColSpan: 8,
          labelText: "TOTAL",
          values: { subtotal: Number(qt.total) }
        },
        zebra: true,
        freezeHeader: true,
        notes: [
          "Instruksi Supplier:",
          "1. Isi kolom 'Harga Final' dan 'Qty Final' di tiap baris kalau ada perubahan.",
          "2. Kalau item tidak tersedia, kosongkan harga/qty final dan catat alasan di kolom 'Catatan Supplier'.",
          "3. Kirim kembali file ini (atau tanda tangan scan) ke tim procurement."
        ],
        signatures: [
          { left: "Tanda Tangan Supplier", right: "Tanda Tangan Operator" },
          { left: " ", right: " " },
          { left: " ", right: " " },
          { left: "Nama: ______________", right: "Nama: ______________" },
          { left: "Tanggal: ___________", right: "Tanggal: ___________" }
        ]
      }
    ]
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${qt.no}.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}
