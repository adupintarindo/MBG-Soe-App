/**
 * /api/transaction-detail?id=<transactions.id>&format=json|xlsx|docx
 *
 * Return rincian detail untuk satu baris di tabel transaksi rantai pasok.
 * - format=json  (default) → DetailResponse JSON
 * - format=xlsx            → .xlsx (ExcelJS, styled MBG preset)
 * - format=docx            → .doc (HTML-as-Word, tanpa dependency tambahan)
 */
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { buildStyledXlsxBuffer } from "@/lib/excel-export";

export const dynamic = "force-dynamic";

type TxType =
  | "po"
  | "grn"
  | "invoice"
  | "payment"
  | "adjustment"
  | "receipt";

type LineItem = {
  line_no: number;
  item_code: string;
  item_name: string | null;
  qty: number;
  qty_ordered?: number;
  qty_received?: number;
  qty_rejected?: number;
  unit: string;
  price?: number;
  subtotal?: number;
  note?: string | null;
};

export type TxSupplier = {
  id: string | null;
  name: string | null;
  address: string | null;
  pic: string | null;
  phone: string | null;
  email: string | null;
};

export type DetailResponse = {
  ok: true;
  tx: {
    id: number;
    tx_date: string;
    tx_type: TxType;
    ref_no: string | null;
    amount: number | null;
    description: string | null;
  };
  supplier: TxSupplier;
  po?: {
    no: string;
    po_date: string;
    delivery_date: string | null;
    status: string;
    total: number;
    ref_contract: string | null;
    pay_method: string | null;
    top: string | null;
    notes: string | null;
    rows: LineItem[];
  };
  grn?: {
    no: string;
    grn_date: string;
    po_no: string | null;
    status: string;
    qc_note: string | null;
    rows: LineItem[];
  };
  invoice?: {
    no: string;
    inv_date: string;
    due_date: string | null;
    po_no: string | null;
    status: string;
    total: number;
    rows?: LineItem[];
  };
  payment?: {
    no: string;
    pay_date: string;
    amount: number;
    method: string;
    reference: string | null;
    note: string | null;
    invoice_no: string | null;
    invoice_total?: number;
    invoice_due_date?: string | null;
  };
  cash_receipt?: {
    no: string;
    receipt_date: string;
    source: string;
    source_name: string | null;
    amount: number;
    period: string | null;
    reference: string | null;
    note: string | null;
  };
};

type SB = SupabaseClient<Database>;

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  const id = idParam ? Number(idParam) : NaN;
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { ok: false, error: "id (transactions.id) required" },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const data = await fetchDetail(supabase, id);
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "transaction not found" },
      { status: 404 }
    );
  }

  if (format === "xlsx") return xlsxResponse(data);
  if (format === "docx") return docxResponse(data);
  return NextResponse.json(data);
}

// ============================================================================
// Data fetch
// ============================================================================

async function fetchDetail(
  supabase: SB,
  id: number
): Promise<DetailResponse | null> {
  const { data: tx } = await supabase
    .from("transactions")
    .select("id, tx_date, tx_type, ref_no, supplier_id, amount, description")
    .eq("id", id)
    .maybeSingle();
  if (!tx) return null;

  let supplier: TxSupplier = {
    id: null,
    name: null,
    address: null,
    pic: null,
    phone: null,
    email: null
  };
  if (tx.supplier_id) {
    const { data: s } = await supabase
      .from("suppliers")
      .select("id, name, address, pic, phone, email")
      .eq("id", tx.supplier_id)
      .maybeSingle();
    if (s) {
      supplier = {
        id: s.id,
        name: s.name,
        address: s.address,
        pic: s.pic,
        phone: s.phone,
        email: s.email
      };
    } else {
      supplier = { ...supplier, id: tx.supplier_id };
    }
  }

  const result: DetailResponse = {
    ok: true,
    tx: {
      id: tx.id,
      tx_date: tx.tx_date,
      tx_type: tx.tx_type as TxType,
      ref_no: tx.ref_no,
      amount: tx.amount === null ? null : Number(tx.amount),
      description: tx.description
    },
    supplier
  };

  const ref = tx.ref_no;
  const txType = tx.tx_type as TxType;

  if (txType === "po" && ref) {
    const [{ data: po }, { data: rows }, { data: items }] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select(
          "no, po_date, delivery_date, status, total, ref_contract, pay_method, top, notes"
        )
        .eq("no", ref)
        .maybeSingle(),
      supabase
        .from("po_rows")
        .select("line_no, item_code, qty, unit, price, subtotal")
        .eq("po_no", ref)
        .order("line_no", { ascending: true }),
      supabase.from("items").select("code, name_en")
    ]);
    if (po) {
      const nameByCode = new Map(
        (items ?? []).map((i) => [i.code, i.name_en ?? null])
      );
      result.po = {
        no: po.no,
        po_date: po.po_date,
        delivery_date: po.delivery_date,
        status: po.status,
        total: Number(po.total ?? 0),
        ref_contract: po.ref_contract,
        pay_method: po.pay_method,
        top: po.top,
        notes: po.notes,
        rows: (rows ?? []).map((r) => ({
          line_no: r.line_no,
          item_code: r.item_code,
          item_name: nameByCode.get(r.item_code) ?? null,
          qty: Number(r.qty ?? 0),
          unit: r.unit,
          price: Number(r.price ?? 0),
          subtotal: Number(r.subtotal ?? 0)
        }))
      };
    }
  }

  if (txType === "grn" && ref) {
    const [{ data: grn }, { data: gRows }, { data: items }] = await Promise.all(
      [
        supabase
          .from("grns")
          .select("no, po_no, grn_date, status, qc_note")
          .eq("no", ref)
          .maybeSingle(),
        supabase
          .from("grn_rows")
          .select(
            "line_no, item_code, qty_ordered, qty_received, qty_rejected, unit, note"
          )
          .eq("grn_no", ref)
          .order("line_no", { ascending: true }),
        supabase.from("items").select("code, name_en")
      ]
    );
    if (grn) {
      const nameByCode = new Map(
        (items ?? []).map((i) => [i.code, i.name_en ?? null])
      );
      let rows: LineItem[] = (gRows ?? []).map((r) => ({
        line_no: r.line_no,
        item_code: r.item_code,
        item_name: nameByCode.get(r.item_code) ?? null,
        qty: Number(r.qty_received ?? 0),
        qty_ordered: Number(r.qty_ordered ?? 0),
        qty_received: Number(r.qty_received ?? 0),
        qty_rejected: Number(r.qty_rejected ?? 0),
        unit: r.unit,
        note: r.note
      }));
      if (rows.length === 0 && grn.po_no) {
        const { data: poRows } = await supabase
          .from("po_rows")
          .select("line_no, item_code, qty, unit, price, subtotal")
          .eq("po_no", grn.po_no)
          .order("line_no", { ascending: true });
        rows = (poRows ?? []).map((r) => ({
          line_no: r.line_no,
          item_code: r.item_code,
          item_name: nameByCode.get(r.item_code) ?? null,
          qty: Number(r.qty ?? 0),
          unit: r.unit,
          price: Number(r.price ?? 0),
          subtotal: Number(r.subtotal ?? 0)
        }));
      }
      result.grn = {
        no: grn.no,
        grn_date: grn.grn_date,
        po_no: grn.po_no,
        status: grn.status,
        qc_note: grn.qc_note,
        rows
      };
    }
  }

  if (txType === "invoice" && ref) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("no, po_no, inv_date, total, due_date, status")
      .eq("no", ref)
      .maybeSingle();
    if (inv) {
      let rows: LineItem[] | undefined;
      if (inv.po_no) {
        const [{ data: poRows }, { data: items }] = await Promise.all([
          supabase
            .from("po_rows")
            .select("line_no, item_code, qty, unit, price, subtotal")
            .eq("po_no", inv.po_no)
            .order("line_no", { ascending: true }),
          supabase.from("items").select("code, name_en")
        ]);
        const nameByCode = new Map(
          (items ?? []).map((i) => [i.code, i.name_en ?? null])
        );
        rows = (poRows ?? []).map((r) => ({
          line_no: r.line_no,
          item_code: r.item_code,
          item_name: nameByCode.get(r.item_code) ?? null,
          qty: Number(r.qty ?? 0),
          unit: r.unit,
          price: Number(r.price ?? 0),
          subtotal: Number(r.subtotal ?? 0)
        }));
      }
      result.invoice = {
        no: inv.no,
        inv_date: inv.inv_date,
        due_date: inv.due_date,
        po_no: inv.po_no,
        status: inv.status,
        total: Number(inv.total ?? 0),
        rows
      };
    }
  }

  if (txType === "payment" && ref) {
    const { data: pay } = await supabase
      .from("payments")
      .select("no, pay_date, amount, method, reference, note, invoice_no")
      .eq("no", ref)
      .maybeSingle();
    if (pay) {
      let invoice_total: number | undefined;
      let invoice_due_date: string | null | undefined;
      if (pay.invoice_no) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("total, due_date")
          .eq("no", pay.invoice_no)
          .maybeSingle();
        if (inv) {
          invoice_total = Number(inv.total ?? 0);
          invoice_due_date = inv.due_date;
        }
      }
      result.payment = {
        no: pay.no,
        pay_date: pay.pay_date,
        amount: Number(pay.amount ?? 0),
        method: pay.method,
        reference: pay.reference,
        note: pay.note,
        invoice_no: pay.invoice_no,
        invoice_total,
        invoice_due_date
      };
    }
  }

  if (txType === "receipt" && ref) {
    const { data: cr } = await supabase
      .from("cash_receipts")
      .select(
        "no, receipt_date, source, source_name, amount, period, reference, note"
      )
      .eq("no", ref)
      .maybeSingle();
    if (cr) {
      result.cash_receipt = {
        no: cr.no,
        receipt_date: cr.receipt_date,
        source: cr.source,
        source_name: cr.source_name,
        amount: Number(cr.amount ?? 0),
        period: cr.period,
        reference: cr.reference,
        note: cr.note
      };
    }
  }

  return result;
}

// ============================================================================
// Shared formatting
// ============================================================================

const TYPE_TITLE: Record<TxType, string> = {
  po: "PURCHASE ORDER",
  grn: "GOODS RECEIPT NOTE",
  invoice: "INVOICE",
  payment: "BUKTI PEMBAYARAN",
  adjustment: "ADJUSTMENT",
  receipt: "BUKTI PENERIMAAN KAS"
};

function idr(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(v);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function fileStem(d: DetailResponse): string {
  const ref = d.tx.ref_no ?? `tx-${d.tx.id}`;
  return ref.replace(/[^a-z0-9\-_]/gi, "_");
}

// ============================================================================
// XLSX export
// ============================================================================

async function xlsxResponse(d: DetailResponse): Promise<NextResponse> {
  const title = `${TYPE_TITLE[d.tx.tx_type]} · ${d.tx.ref_no ?? "—"}`;
  const meta: Array<[string, string | number]> = [
    ["Tanggal", formatDate(d.tx.tx_date)],
    ["No. Referensi", d.tx.ref_no ?? "—"],
    ["Supplier", d.supplier.name ?? "—"],
    ["Alamat", d.supplier.address ?? "—"],
    ["PIC", d.supplier.pic ?? "—"],
    ["Telepon", d.supplier.phone ?? "—"],
    ["Email", d.supplier.email ?? "—"],
    [
      "Nilai Transaksi",
      d.tx.amount == null ? "—" : idr(d.tx.amount)
    ],
    ["Keterangan", d.tx.description ?? "—"]
  ];

  type SheetInput = Parameters<typeof buildStyledXlsxBuffer>[0]["sheets"][number];
  const sheets: SheetInput[] = [];

  if (d.po) {
    sheets.push({
      name: "Purchase Order",
      title,
      subtitle: `Status: ${d.po.status.toUpperCase()} · Delivery: ${formatDate(d.po.delivery_date)}`,
      meta,
      columns: [
        { key: "no", header: "No", width: 6, align: "center" },
        { key: "item", header: "Barang", width: 32, align: "left" },
        { key: "qty", header: "Qty", width: 10, align: "right", numFmt: "#,##0.00", hint: "number" },
        { key: "unit", header: "Satuan", width: 10, align: "center" },
        { key: "price", header: "Harga", width: 14, align: "right", numFmt: '"Rp "#,##0', hint: "money" },
        { key: "subtotal", header: "Subtotal", width: 16, align: "right", numFmt: '"Rp "#,##0', hint: "bold" }
      ],
      rows: d.po.rows.map((r, i) => ({
        no: i + 1,
        item: r.item_name ? `${r.item_code} (${r.item_name})` : r.item_code,
        qty: r.qty,
        unit: r.unit,
        price: r.price ?? 0,
        subtotal: r.subtotal ?? 0
      })),
      totals: {
        labelColSpan: 5,
        labelText: "GRAND TOTAL",
        values: { subtotal: d.po.total }
      },
      freezeHeader: true,
      zebra: true,
      notes: d.po.notes ? [`Catatan: ${d.po.notes}`] : undefined,
      signatures: [
        { left: "Dibuat oleh (Operator)", right: "Disetujui oleh (Kepala)" }
      ]
    });
  } else if (d.grn) {
    sheets.push({
      name: "Goods Receipt",
      title,
      subtitle: `Status: ${d.grn.status.toUpperCase()} · PO: ${d.grn.po_no ?? "—"}`,
      meta,
      columns: [
        { key: "no", header: "No", width: 6, align: "center" },
        { key: "item", header: "Barang", width: 32, align: "left" },
        { key: "ordered", header: "Qty Pesan", width: 12, align: "right", numFmt: "#,##0.00", hint: "number" },
        { key: "received", header: "Qty Terima", width: 12, align: "right", numFmt: "#,##0.00", hint: "status-ok" },
        { key: "rejected", header: "Qty Tolak", width: 12, align: "right", numFmt: "#,##0.00", hint: "status-bad" },
        { key: "unit", header: "Satuan", width: 10, align: "center" },
        { key: "note", header: "Catatan", width: 24, align: "left" }
      ],
      rows: d.grn.rows.map((r, i) => ({
        no: i + 1,
        item: r.item_name ? `${r.item_code} (${r.item_name})` : r.item_code,
        ordered: r.qty_ordered ?? 0,
        received: r.qty_received ?? 0,
        rejected: r.qty_rejected ?? 0,
        unit: r.unit,
        note: r.note ?? ""
      })),
      freezeHeader: true,
      zebra: true,
      notes: d.grn.qc_note ? [`Catatan QC: ${d.grn.qc_note}`] : undefined,
      signatures: [
        { left: "Diterima oleh (Operator)", right: "Disetujui oleh (Kepala)" }
      ]
    });
  } else if (d.invoice) {
    const invRows = d.invoice.rows ?? [];
    sheets.push({
      name: "Invoice",
      title,
      subtitle: `Status: ${d.invoice.status.toUpperCase()} · Jatuh tempo: ${formatDate(d.invoice.due_date)}`,
      meta,
      columns: [
        { key: "no", header: "No", width: 6, align: "center" },
        { key: "item", header: "Barang", width: 32, align: "left" },
        { key: "qty", header: "Qty", width: 10, align: "right", numFmt: "#,##0.00", hint: "number" },
        { key: "unit", header: "Satuan", width: 10, align: "center" },
        { key: "price", header: "Harga", width: 14, align: "right", numFmt: '"Rp "#,##0', hint: "money" },
        { key: "subtotal", header: "Subtotal", width: 16, align: "right", numFmt: '"Rp "#,##0', hint: "bold" }
      ],
      rows: invRows.map((r, i) => ({
        no: i + 1,
        item: r.item_name ? `${r.item_code} (${r.item_name})` : r.item_code,
        qty: r.qty,
        unit: r.unit,
        price: r.price ?? 0,
        subtotal: r.subtotal ?? 0
      })),
      totals: {
        labelColSpan: 5,
        labelText: "TOTAL TAGIHAN",
        values: { subtotal: d.invoice.total }
      },
      freezeHeader: true,
      zebra: true,
      signatures: [
        { left: "Diverifikasi oleh (Keuangan)", right: "Disetujui oleh (Kepala)" }
      ]
    });
  } else if (d.payment) {
    sheets.push({
      name: "Pembayaran",
      title,
      subtitle: `Metode: ${d.payment.method.toUpperCase()}`,
      meta: [
        ...meta,
        ["Invoice Terkait", d.payment.invoice_no ?? "—"],
        ["Metode", d.payment.method.toUpperCase()],
        ["No. Bukti", d.payment.reference ?? "—"],
        ["Nilai Bayar", idr(d.payment.amount)],
        [
          "Total Invoice",
          d.payment.invoice_total == null ? "—" : idr(d.payment.invoice_total)
        ],
        [
          "Jatuh Tempo Invoice",
          d.payment.invoice_due_date
            ? formatDate(d.payment.invoice_due_date)
            : "—"
        ],
        ["Catatan", d.payment.note ?? "—"]
      ],
      columns: [
        { key: "label", header: "Keterangan", width: 32, align: "left" },
        { key: "value", header: "Nilai", width: 24, align: "left" }
      ],
      rows: [],
      signatures: [
        { left: "Dibayarkan oleh (Keuangan)", right: "Diterima oleh (Supplier)" }
      ]
    });
  } else if (d.cash_receipt) {
    const cr = d.cash_receipt;
    sheets.push({
      name: "Penerimaan Kas",
      title,
      subtitle: `Sumber: ${cr.source.toUpperCase()}${cr.source_name ? " · " + cr.source_name : ""}`,
      meta: [
        ...meta,
        ["Sumber", cr.source.toUpperCase()],
        ["Nama Sumber", cr.source_name ?? "—"],
        ["Periode", cr.period ?? "—"],
        ["No. Bukti", cr.reference ?? "—"],
        ["Nilai Diterima", idr(cr.amount)],
        ["Catatan", cr.note ?? "—"]
      ],
      columns: [
        { key: "label", header: "Keterangan", width: 32, align: "left" },
        { key: "value", header: "Nilai", width: 24, align: "left" }
      ],
      rows: [],
      signatures: [
        { left: "Dicatat oleh (Operator)", right: "Diverifikasi oleh (Keuangan)" }
      ]
    });
  } else {
    // Adjustment or empty — show meta only
    sheets.push({
      name: "Detail",
      title,
      subtitle: `Tipe: ${d.tx.tx_type.toUpperCase()}`,
      meta,
      columns: [
        { key: "label", header: "Keterangan", width: 32, align: "left" },
        { key: "value", header: "Nilai", width: 24, align: "left" }
      ],
      rows: [],
      signatures: [{ left: "Dicatat oleh (Operator)" }]
    });
  }

  const buffer = await buildStyledXlsxBuffer({
    fileName: `transaksi-${fileStem(d)}`,
    sheets
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transaksi-${fileStem(d)}.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}

// ============================================================================
// DOCX export (HTML-as-Word — Microsoft Word opens .doc HTML natively)
// ============================================================================

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function docxResponse(d: DetailResponse): NextResponse {
  const html = renderWordHtml(d);
  const filename = `transaksi-${fileStem(d)}.doc`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}

function renderWordHtml(d: DetailResponse): string {
  const title = `${TYPE_TITLE[d.tx.tx_type]} · ${d.tx.ref_no ?? "—"}`;
  const supplierBlock = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
      <tr>
        <td style="width:55%;vertical-align:top">
          <div style="font-size:9pt;color:#555;text-transform:uppercase;letter-spacing:0.08em;font-weight:bold">Supplier</div>
          <div style="font-size:12pt;font-weight:bold;margin-top:2px">${escapeHtml(d.supplier.name) || "—"}</div>
          <div style="font-size:10pt;color:#444">${escapeHtml(d.supplier.address) || ""}</div>
          <div style="font-size:10pt;color:#444">PIC: ${escapeHtml(d.supplier.pic) || "—"} · ${escapeHtml(d.supplier.phone) || "—"}</div>
          <div style="font-size:10pt;color:#444">${escapeHtml(d.supplier.email) || ""}</div>
        </td>
        <td style="width:45%;vertical-align:top;text-align:right">
          <div style="font-size:9pt;color:#555;text-transform:uppercase;font-weight:bold">No. Referensi</div>
          <div style="font-size:12pt;font-weight:bold;font-family:Consolas,monospace">${escapeHtml(d.tx.ref_no) || "—"}</div>
          <div style="margin-top:8px;font-size:9pt;color:#555;text-transform:uppercase;font-weight:bold">Tanggal</div>
          <div style="font-size:11pt">${escapeHtml(formatDate(d.tx.tx_date))}</div>
          <div style="margin-top:8px;font-size:9pt;color:#555;text-transform:uppercase;font-weight:bold">Nilai</div>
          <div style="font-size:12pt;font-weight:bold">${d.tx.amount == null ? "—" : escapeHtml(idr(d.tx.amount))}</div>
        </td>
      </tr>
    </table>
  `;

  let body = "";
  if (d.po) body = renderPoBody(d.po);
  else if (d.grn) body = renderGrnBody(d.grn);
  else if (d.invoice) body = renderInvoiceBody(d.invoice);
  else if (d.payment) body = renderPaymentBody(d.payment);
  else if (d.cash_receipt) body = renderReceiptBody(d.cash_receipt);
  else body = renderAdjustmentBody(d);

  const signBlock = `
    <table style="width:100%;margin-top:40px;border-collapse:collapse">
      <tr>
        <td style="width:33%;text-align:center;font-size:10pt">
          <div style="color:#555;text-transform:uppercase;font-weight:bold;font-size:9pt">Dibuat oleh</div>
          <div style="height:60px"></div>
          <div style="border-top:1px solid #000;padding-top:4px">(________________)</div>
        </td>
        <td style="width:33%;text-align:center;font-size:10pt">
          <div style="color:#555;text-transform:uppercase;font-weight:bold;font-size:9pt">Disetujui oleh</div>
          <div style="height:60px"></div>
          <div style="border-top:1px solid #000;padding-top:4px">(________________)</div>
        </td>
        <td style="width:33%;text-align:center;font-size:10pt">
          <div style="color:#555;text-transform:uppercase;font-weight:bold;font-size:9pt">Menyetujui</div>
          <div style="height:60px"></div>
          <div style="border-top:1px solid #000;padding-top:4px">(________________)</div>
        </td>
      </tr>
    </table>
  `;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page WordSection1 { size: 21.0cm 29.7cm; margin: 2cm 2cm 2cm 2cm; }
  div.WordSection1 { page: WordSection1; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
  h1 { font-size: 16pt; margin: 0; letter-spacing: 0.04em; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.06em; color: #333; margin: 14px 0 6px; }
  table.doc { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.doc th, table.doc td { border: 1px solid #000; padding: 4px 6px; font-size: 10pt; }
  table.doc th { background: #0B1E3F; color: white; text-align: center; font-weight: bold; text-transform: uppercase; font-size: 9pt; }
  table.doc td.n { text-align: right; font-family: Consolas, monospace; }
  table.doc td.c { text-align: center; }
  tr.totalrow td { background: #0B1E3F; color: white; font-weight: bold; }
</style>
</head>
<body>
<div class="WordSection1">
  <div style="border-bottom:3px solid #000;padding-bottom:10px;margin-bottom:14px">
    <div style="display:inline-block">
      <h1>${escapeHtml(TYPE_TITLE[d.tx.tx_type])}</h1>
      <div style="font-size:10pt;color:#555;margin-top:2px">MBG Soe · Indonesia Food Security Review</div>
    </div>
    <div style="float:right;text-align:right;font-size:9pt;color:#555">
      Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
    </div>
    <div style="clear:both"></div>
  </div>
  ${supplierBlock}
  ${body}
  ${signBlock}
</div>
</body>
</html>`;
}

function renderPoBody(po: NonNullable<DetailResponse["po"]>): string {
  const rowsHtml = po.rows
    .map(
      (r, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${escapeHtml(r.item_code)}${r.item_name ? ` <i style="color:#666;font-size:9pt">(${escapeHtml(r.item_name)})</i>` : ""}</td>
          <td class="n">${Number(r.qty).toLocaleString("id-ID", { maximumFractionDigits: 3 })}</td>
          <td class="c">${escapeHtml(r.unit)}</td>
          <td class="n">${escapeHtml(idr(r.price ?? 0))}</td>
          <td class="n">${escapeHtml(idr(r.subtotal ?? 0))}</td>
        </tr>`
    )
    .join("");
  return `
    <h2>Ringkasan PO</h2>
    <table style="width:100%;border-collapse:collapse;font-size:10pt">
      <tr>
        <td style="padding:3px 0;width:30%;color:#555;font-weight:bold">Status</td>
        <td style="padding:3px 0">${escapeHtml(po.status.toUpperCase())}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#555;font-weight:bold">Tanggal PO</td>
        <td style="padding:3px 0">${escapeHtml(formatDate(po.po_date))}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#555;font-weight:bold">Jadwal Pengiriman</td>
        <td style="padding:3px 0">${escapeHtml(formatDate(po.delivery_date))}</td>
      </tr>
      ${po.ref_contract ? `<tr><td style="padding:3px 0;color:#555;font-weight:bold">No. Kontrak</td><td style="padding:3px 0">${escapeHtml(po.ref_contract)}</td></tr>` : ""}
      ${po.pay_method ? `<tr><td style="padding:3px 0;color:#555;font-weight:bold">Metode Bayar</td><td style="padding:3px 0">${escapeHtml(po.pay_method)}</td></tr>` : ""}
      ${po.top ? `<tr><td style="padding:3px 0;color:#555;font-weight:bold">Termin (TOP)</td><td style="padding:3px 0">${escapeHtml(po.top)}</td></tr>` : ""}
    </table>

    <h2>Rincian Barang (${po.rows.length} item)</h2>
    <table class="doc">
      <thead>
        <tr>
          <th style="width:6%">No</th>
          <th style="width:40%">Barang</th>
          <th style="width:10%">Qty</th>
          <th style="width:10%">Satuan</th>
          <th style="width:15%">Harga</th>
          <th style="width:19%">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="totalrow">
          <td colspan="5" class="c" style="text-align:right">GRAND TOTAL</td>
          <td class="n">${escapeHtml(idr(po.total))}</td>
        </tr>
      </tbody>
    </table>
    ${po.notes ? `<div style="margin-top:10px;padding:8px;background:#f5f5f5;font-size:10pt"><b>Catatan:</b> ${escapeHtml(po.notes)}</div>` : ""}
  `;
}

function renderGrnBody(grn: NonNullable<DetailResponse["grn"]>): string {
  const rowsHtml = grn.rows
    .map(
      (r, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${escapeHtml(r.item_code)}${r.item_name ? ` <i style="color:#666;font-size:9pt">(${escapeHtml(r.item_name)})</i>` : ""}</td>
          <td class="n">${Number(r.qty_ordered ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 3 })}</td>
          <td class="n">${Number(r.qty_received ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 3 })}</td>
          <td class="n">${Number(r.qty_rejected ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 3 })}</td>
          <td class="c">${escapeHtml(r.unit)}</td>
          <td>${escapeHtml(r.note)}</td>
        </tr>`
    )
    .join("");
  return `
    <h2>Ringkasan GRN</h2>
    <table style="width:100%;border-collapse:collapse;font-size:10pt">
      <tr><td style="padding:3px 0;width:30%;color:#555;font-weight:bold">Status</td><td>${escapeHtml(grn.status.toUpperCase())}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Tanggal Terima</td><td>${escapeHtml(formatDate(grn.grn_date))}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">PO Terkait</td><td>${escapeHtml(grn.po_no) || "—"}</td></tr>
    </table>
    <h2>Rincian Penerimaan (${grn.rows.length} item)</h2>
    <table class="doc">
      <thead>
        <tr>
          <th style="width:6%">No</th>
          <th style="width:32%">Barang</th>
          <th style="width:12%">Qty Pesan</th>
          <th style="width:12%">Qty Terima</th>
          <th style="width:12%">Qty Tolak</th>
          <th style="width:10%">Satuan</th>
          <th style="width:16%">Catatan</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    ${grn.qc_note ? `<div style="margin-top:10px;padding:8px;background:#f5f5f5;font-size:10pt"><b>Catatan QC:</b> ${escapeHtml(grn.qc_note)}</div>` : ""}
  `;
}

function renderInvoiceBody(inv: NonNullable<DetailResponse["invoice"]>): string {
  const rows = inv.rows ?? [];
  const rowsHtml = rows
    .map(
      (r, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${escapeHtml(r.item_code)}${r.item_name ? ` <i style="color:#666;font-size:9pt">(${escapeHtml(r.item_name)})</i>` : ""}</td>
          <td class="n">${Number(r.qty).toLocaleString("id-ID", { maximumFractionDigits: 3 })}</td>
          <td class="c">${escapeHtml(r.unit)}</td>
          <td class="n">${escapeHtml(idr(r.price ?? 0))}</td>
          <td class="n">${escapeHtml(idr(r.subtotal ?? 0))}</td>
        </tr>`
    )
    .join("");
  return `
    <h2>Ringkasan Invoice</h2>
    <table style="width:100%;border-collapse:collapse;font-size:10pt">
      <tr><td style="padding:3px 0;width:30%;color:#555;font-weight:bold">Status</td><td>${escapeHtml(inv.status.toUpperCase())}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Tanggal Terbit</td><td>${escapeHtml(formatDate(inv.inv_date))}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Jatuh Tempo</td><td>${escapeHtml(formatDate(inv.due_date))}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">PO Terkait</td><td>${escapeHtml(inv.po_no) || "—"}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Total Tagihan</td><td style="font-weight:bold;font-size:12pt">${escapeHtml(idr(inv.total))}</td></tr>
    </table>
    ${rows.length > 0 ? `
    <h2>Rincian (${rows.length} item)</h2>
    <table class="doc">
      <thead>
        <tr>
          <th style="width:6%">No</th>
          <th style="width:40%">Barang</th>
          <th style="width:10%">Qty</th>
          <th style="width:10%">Satuan</th>
          <th style="width:15%">Harga</th>
          <th style="width:19%">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="totalrow">
          <td colspan="5" class="c" style="text-align:right">TOTAL TAGIHAN</td>
          <td class="n">${escapeHtml(idr(inv.total))}</td>
        </tr>
      </tbody>
    </table>` : ""}
  `;
}

function renderPaymentBody(p: NonNullable<DetailResponse["payment"]>): string {
  return `
    <h2>Ringkasan Pembayaran</h2>
    <table style="width:100%;border-collapse:collapse;font-size:10pt">
      <tr><td style="padding:3px 0;width:30%;color:#555;font-weight:bold">Tanggal Bayar</td><td>${escapeHtml(formatDate(p.pay_date))}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Metode</td><td>${escapeHtml(p.method.toUpperCase())}</td></tr>
      ${p.reference ? `<tr><td style="padding:3px 0;color:#555;font-weight:bold">No. Bukti</td><td>${escapeHtml(p.reference)}</td></tr>` : ""}
      ${p.invoice_no ? `<tr><td style="padding:3px 0;color:#555;font-weight:bold">Invoice Terkait</td><td>${escapeHtml(p.invoice_no)}</td></tr>` : ""}
      ${p.invoice_total !== undefined ? `<tr><td style="padding:3px 0;color:#555;font-weight:bold">Total Invoice</td><td>${escapeHtml(idr(p.invoice_total))}</td></tr>` : ""}
      ${p.invoice_due_date ? `<tr><td style="padding:3px 0;color:#555;font-weight:bold">Jatuh Tempo</td><td>${escapeHtml(formatDate(p.invoice_due_date))}</td></tr>` : ""}
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Nilai Dibayar</td><td style="font-weight:bold;font-size:12pt">${escapeHtml(idr(p.amount))}</td></tr>
    </table>
    ${p.note ? `<div style="margin-top:10px;padding:8px;background:#f5f5f5;font-size:10pt"><b>Catatan:</b> ${escapeHtml(p.note)}</div>` : ""}
  `;
}

function renderReceiptBody(
  cr: NonNullable<DetailResponse["cash_receipt"]>
): string {
  return `
    <h2>Ringkasan Penerimaan Kas</h2>
    <table style="width:100%;border-collapse:collapse;font-size:10pt">
      <tr><td style="padding:3px 0;width:30%;color:#555;font-weight:bold">Tanggal Terima</td><td>${escapeHtml(formatDate(cr.receipt_date))}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Sumber</td><td>${escapeHtml(cr.source.toUpperCase())}${cr.source_name ? " · " + escapeHtml(cr.source_name) : ""}</td></tr>
      ${cr.period ? `<tr><td style="padding:3px 0;color:#555;font-weight:bold">Periode</td><td>${escapeHtml(cr.period)}</td></tr>` : ""}
      ${cr.reference ? `<tr><td style="padding:3px 0;color:#555;font-weight:bold">No. Bukti</td><td>${escapeHtml(cr.reference)}</td></tr>` : ""}
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Nilai Diterima</td><td style="font-weight:bold;font-size:12pt">${escapeHtml(idr(cr.amount))}</td></tr>
    </table>
    ${cr.note ? `<div style="margin-top:10px;padding:8px;background:#f5f5f5;font-size:10pt"><b>Catatan:</b> ${escapeHtml(cr.note)}</div>` : ""}
  `;
}

function renderAdjustmentBody(d: DetailResponse): string {
  return `
    <h2>Detail Transaksi</h2>
    <table style="width:100%;border-collapse:collapse;font-size:10pt">
      <tr><td style="padding:3px 0;width:30%;color:#555;font-weight:bold">Tipe</td><td>${escapeHtml(d.tx.tx_type.toUpperCase())}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Tanggal</td><td>${escapeHtml(formatDate(d.tx.tx_date))}</td></tr>
      <tr><td style="padding:3px 0;color:#555;font-weight:bold">Nilai</td><td>${d.tx.amount == null ? "—" : escapeHtml(idr(d.tx.amount))}</td></tr>
    </table>
    ${d.tx.description ? `<div style="margin-top:10px;padding:8px;background:#f5f5f5;font-size:10pt"><b>Keterangan:</b> ${escapeHtml(d.tx.description)}</div>` : ""}
  `;
}
