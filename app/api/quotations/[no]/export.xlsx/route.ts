import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = createClient();
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

  // Header block (two-column A/B)
  const aoa: (string | number | null)[][] = [
    ["QUOTATION / RFQ · MBG SOE"],
    [],
    ["No Quotation", qt.no],
    ["Tanggal", qt.quote_date],
    ["Berlaku s/d", qt.valid_until ?? ""],
    ["Tanggal Butuh", qt.need_date ?? ""],
    ["Status", qt.status],
    [],
    ["Kepada Supplier"],
    ["Nama", supplier?.name ?? qt.supplier_id],
    ["PIC", supplier?.pic ?? ""],
    ["Telepon", supplier?.phone ?? ""],
    ["Email", supplier?.email ?? ""],
    ["Alamat", supplier?.address ?? ""],
    [],
    ["Catatan", qt.notes ?? ""],
    [],
    [
      "#",
      "Kode Item",
      "Nama Item",
      "Qty Diminta",
      "Unit",
      "Harga Saran (IDR)",
      "Harga Final (IDR)",
      "Qty Final",
      "Subtotal (IDR)",
      "Catatan Supplier"
    ]
  ];

  for (const r of rows) {
    const it = itemByCode.get(r.item_code);
    aoa.push([
      r.line_no,
      r.item_code,
      it?.name_en ?? r.item_code,
      Number(r.qty),
      r.unit,
      r.price_suggested != null ? Number(r.price_suggested) : "",
      r.price_quoted != null ? Number(r.price_quoted) : "",
      r.qty_quoted != null ? Number(r.qty_quoted) : "",
      Number(r.subtotal) || "",
      r.note ?? ""
    ]);
  }

  aoa.push([]);
  aoa.push(["", "", "", "", "", "", "", "TOTAL", Number(qt.total), ""]);
  aoa.push([]);
  aoa.push(["Instruksi Supplier"]);
  aoa.push([
    "Isi kolom 'Harga Final' dan 'Qty Final' di tiap baris kalau ada perubahan."
  ]);
  aoa.push([
    "Kalau item tidak tersedia, kosongkan harga/qty final dan catat alasan di kolom 'Catatan Supplier'."
  ]);
  aoa.push([
    "Kirim kembali file ini (atau tanda tangan scan) ke tim procurement."
  ]);
  aoa.push([]);
  aoa.push(["Tanda Tangan Supplier", "", "", "Tanda Tangan Operator"]);
  aoa.push(["", "", "", ""]);
  aoa.push([
    "Nama: ______________",
    "",
    "",
    "Nama: ______________"
  ]);
  aoa.push([
    "Tanggal: ___________",
    "",
    "",
    "Tanggal: ___________"
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws["!cols"] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 28 },
    { wch: 12 },
    { wch: 8 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 24 }
  ];

  // Merge title
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quotation");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const u8 = new Uint8Array(buf as ArrayBuffer);

  return new NextResponse(u8, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${qt.no}.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}
