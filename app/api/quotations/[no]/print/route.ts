import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

function esc(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function idr(n: number | string | null | undefined): string {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return "Rp " + v.toLocaleString("id-ID");
}

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
    supabase.from("items").select("code, name_en"),
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

  const rowHtml = rows
    .map((r) => {
      const it = itemByCode.get(r.item_code);
      return `<tr>
  <td class="c">${r.line_no}</td>
  <td><b>${esc(it?.name_en ?? r.item_code)}</b><br/><span class="mono">${esc(r.item_code)}</span></td>
  <td class="r mono">${Number(r.qty).toLocaleString("id-ID")}</td>
  <td class="c">${esc(r.unit)}</td>
  <td class="r mono">${idr(r.price_suggested)}</td>
  <td class="r mono">${idr(r.price_quoted)}</td>
  <td class="r mono">${r.qty_quoted != null ? Number(r.qty_quoted).toLocaleString("id-ID") : "—"}</td>
  <td class="r mono"><b>${idr(r.subtotal)}</b></td>
  <td>${esc(r.note ?? "")}</td>
</tr>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<title>Quotation ${esc(qt.no)}</title>
<style>
  @media print { .no-print { display:none } body { margin: 0 } }
  body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 24px; color:#111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 16px 0; }
  table { width:100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
  th { background: #f4f4f4; text-align:left; }
  .c { text-align: center } .r { text-align: right }
  .mono { font-family: ui-monospace, SFMono-Regular, monospace; }
  .muted { color: #666; font-size: 11px; }
  .total { font-size: 14px; }
  .sig { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .sig .box { border: 1px solid #ccc; padding: 12px; min-height: 90px; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:#eef; font-size:11px; font-weight:700 }
</style>
</head>
<body>
<div class="no-print" style="margin-bottom:12px">
  <button onclick="window.print()" style="padding:6px 12px;border:1px solid #111;background:#111;color:#fff;border-radius:6px;cursor:pointer">🖨 Print</button>
</div>

<h1>QUOTATION / RFQ · MBG SOE</h1>
<div class="muted">No: <b>${esc(qt.no)}</b> · Status: <span class="badge">${esc(qt.status)}</span></div>

<div class="grid">
  <div>
    <b>Kepada Supplier</b><br/>
    ${esc(supplier?.name ?? qt.supplier_id)}<br/>
    PIC: ${esc(supplier?.pic ?? "—")}<br/>
    Tel: ${esc(supplier?.phone ?? "—")}<br/>
    Email: ${esc(supplier?.email ?? "—")}<br/>
    ${esc(supplier?.address ?? "")}
  </div>
  <div>
    <b>Tanggal</b><br/>
    Quotation: ${esc(qt.quote_date)}<br/>
    Berlaku s/d: ${esc(qt.valid_until ?? "—")}<br/>
    Butuh barang: ${esc(qt.need_date ?? "—")}<br/>
    ${qt.notes ? `<br/><b>Catatan:</b> ${esc(qt.notes)}` : ""}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>#</th><th>Item</th><th>Qty</th><th>Unit</th>
      <th>Harga Saran</th><th>Harga Final</th><th>Qty Final</th>
      <th>Subtotal</th><th>Catatan</th>
    </tr>
  </thead>
  <tbody>${rowHtml}</tbody>
  <tfoot>
    <tr>
      <td colspan="7" class="r"><b>TOTAL</b></td>
      <td class="r mono total"><b>${idr(qt.total)}</b></td>
      <td></td>
    </tr>
  </tfoot>
</table>

<div class="sig">
  <div class="box">
    <b>Tanda Tangan Supplier</b>
    <div style="height:60px"></div>
    Nama: ____________________<br/>
    Tanggal: __________________
  </div>
  <div class="box">
    <b>Tanda Tangan Operator</b>
    <div style="height:60px"></div>
    Nama: ____________________<br/>
    Tanggal: __________________
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
