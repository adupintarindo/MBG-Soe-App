import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { formatIDR, formatDateShort } from "@/lib/engine";
import { PrintButton } from "./print-button";
import { t, ti, numberLocale } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type DocType = "po" | "grn" | "invoice" | "ba" | "qt";

function typeTitle(ty: DocType, lang: Lang): string {
  switch (ty) {
    case "po":
      return t("docgen.typePO", lang);
    case "grn":
      return t("docgen.typeGRN", lang);
    case "invoice":
      return t("docgen.typeInvoice", lang);
    case "ba":
      return t("docgen.typeBA", lang);
    case "qt":
      return t("docgen.typeQT", lang);
  }
}

const TYPE_ICON: Record<DocType, string> = {
  po: "📝",
  grn: "📦",
  invoice: "💰",
  ba: "📄",
  qt: "📨"
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-300",
  open: "bg-blue-100 text-blue-800 ring-blue-300",
  approved: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  closed: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  partial: "bg-amber-100 text-amber-900 ring-amber-300",
  rejected: "bg-red-100 text-red-800 ring-red-300",
  paid: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  unpaid: "bg-amber-100 text-amber-900 ring-amber-300",
  overdue: "bg-red-100 text-red-800 ring-red-300"
};

function StatusPill({ status }: { status: string }) {
  const cls =
    STATUS_TONE[status?.toLowerCase()] ??
    "bg-ink/5 text-ink2 ring-ink/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${cls}`}
    >
      {status}
    </span>
  );
}

function FieldBlock({
  label,
  value,
  align = "left"
}: {
  label: string;
  value: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-ink2/60">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-ink">{value}</div>
    </div>
  );
}

interface PoRow {
  no: string;
  po_date: string;
  supplier_id: string;
  delivery_date: string | null;
  total: number | string;
  status: string;
  pay_method: string | null;
  top: string | null;
  ref_contract: string | null;
  notes: string | null;
}
interface PoLine {
  line_no: number;
  item_code: string;
  qty: number | string;
  unit: string;
  price: number | string;
  po_no?: string | null;
}
interface SupplierFull {
  id: string;
  name: string;
  address?: string | null;
  pic?: string | null;
  phone?: string | null;
  email?: string | null;
}
interface ItemMini {
  code: string;
  name_en: string | null;
  category: string;
}
interface GrnRow {
  no: string;
  po_no: string | null;
  grn_date: string;
  status: string;
  qc_note: string | null;
}
interface InvoiceRow {
  no: string;
  po_no: string | null;
  inv_date: string;
  supplier_id: string;
  total: number | string;
  due_date: string | null;
  status: string;
}
interface QtRow {
  no: string;
  supplier_id: string;
  quote_date: string;
  valid_until: string | null;
  need_date: string | null;
  status: string;
  total: number | string;
  notes: string | null;
}
interface QtLine {
  line_no: number;
  item_code: string;
  qty: number | string;
  unit: string;
  price_suggested: number | string | null;
  price_quoted: number | string | null;
  qty_quoted: number | string | null;
  note: string | null;
  subtotal: number | string;
}

interface PageProps {
  params: { type: string; no: string };
}

export default async function DocDetailPage({ params }: PageProps) {
  const type = params.type as DocType;
  const no = decodeURIComponent(params.no);

  if (!["po", "grn", "invoice", "ba", "qt"].includes(type)) notFound();

  const supabase = createClient();
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  let content: React.ReactNode = null;
  let docStatus = "—";
  let docDate = "—";

  if (type === "po") {
    const [poRes, rowsRes, supRes, itemsRes] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select(
          "no, po_date, supplier_id, delivery_date, total, status, pay_method, top, ref_contract, notes"
        )
        .eq("no", no)
        .maybeSingle(),
      supabase
        .from("po_rows")
        .select("line_no, item_code, qty, unit, price")
        .eq("po_no", no)
        .order("line_no"),
      supabase.from("suppliers").select("*"),
      supabase.from("items").select("code, name_en, category")
    ]);

    const po = poRes.data as PoRow | null;
    if (!po) notFound();

    const rows = (rowsRes.data ?? []) as PoLine[];
    const suppliers = (supRes.data ?? []) as SupplierFull[];
    const supplier = suppliers.find((s) => s.id === po.supplier_id);
    const items = (itemsRes.data ?? []) as ItemMini[];
    const itemMap = new Map(items.map((i) => [i.code, i]));

    docStatus = po.status;
    docDate = po.po_date;

    content = (
      <>
        <section className="mb-6 grid grid-cols-1 gap-6 border-b-2 border-ink/80 pb-5 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
              {t("docgen.toSupplier", lang)}
            </div>
            <div className="mt-1 text-base font-black text-ink">
              {supplier?.name ?? "—"}
            </div>
            <div className="mt-1 text-xs text-ink2">{supplier?.address}</div>
            <div className="text-xs text-ink2">
              PIC: {supplier?.pic ?? "—"} · {supplier?.phone ?? "—"}
            </div>
            <div className="text-xs font-mono text-ink2">{supplier?.email}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:text-right">
            <FieldBlock label={t("docgen.fldDocNo", lang)} value={<span className="font-mono text-sm font-black">{po.no}</span>} />
            <FieldBlock label={t("docgen.fldPODate", lang)} value={formatDateShort(po.po_date)} />
            <FieldBlock label={t("docgen.fldDelivery", lang)} value={po.delivery_date ? formatDateShort(po.delivery_date) : "—"} />
            <FieldBlock label={t("docgen.fldStatus", lang)} value={<StatusPill status={po.status} />} />
            <FieldBlock label={t("docgen.fldTOP", lang)} value={po.top ?? "—"} />
            <FieldBlock label={t("docgen.fldPayment", lang)} value={po.pay_method ?? "—"} />
            {po.ref_contract && (
              <FieldBlock label={t("docgen.fldRefContract", lang)} value={po.ref_contract} />
            )}
          </div>
        </section>

        <div className="mb-2 text-xs font-black uppercase tracking-wide text-ink">
          {ti("docgen.itemDetailTitle", lang, { n: rows.length })}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink bg-ink/5">
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colNo", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colItem", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colCategory", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colQty", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colUnit", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colPrice", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colSubtotal", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const it = itemMap.get(r.item_code);
                const subtotal = Number(r.qty) * Number(r.price);
                return (
                  <tr key={r.line_no} className="border-b border-ink/10 even:bg-paper/40">
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs">{r.line_no}</td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs font-semibold">{r.item_code}</td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-[10px] text-ink2/80">{it?.category}</td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                      {Number(r.qty).toLocaleString(numberLocale(lang), { maximumFractionDigits: 2 })}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs">{r.unit}</td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                      {formatIDR(Number(r.price))}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs font-black">
                      {formatIDR(subtotal)}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-ink bg-ink/10">
                <td colSpan={6} className="border-x border-ink/20 px-2 py-2 text-right text-xs font-black uppercase tracking-wide">
                  {t("docgen.totalPO", lang)}
                </td>
                <td className="border-x border-ink/20 px-2 py-2 text-right font-mono text-sm font-black text-ink">
                  {formatIDR(Number(po.total))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {po.notes && (
          <div className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink2 ring-1 ring-ink/5 print:bg-white print:ring-ink/30">
            <span className="font-black uppercase tracking-wide text-ink2/70">{t("docgen.noteLabel", lang)} </span>
            {po.notes}
          </div>
        )}
      </>
    );
  } else if (type === "grn") {
    const [grnRes, poRowsRes, supRes] = await Promise.all([
      supabase
        .from("grns")
        .select("no, po_no, grn_date, status, qc_note")
        .eq("no", no)
        .maybeSingle(),
      supabase.from("po_rows").select("*"),
      supabase.from("suppliers").select("*")
    ]);

    const grn = grnRes.data as GrnRow | null;
    if (!grn) notFound();

    const allPoRows = (poRowsRes.data ?? []) as PoLine[];
    const poRows = grn.po_no
      ? allPoRows.filter((r) => r.po_no === grn.po_no)
      : [];

    const { data: poDoc } = grn.po_no
      ? await supabase
          .from("purchase_orders")
          .select("no, po_date, supplier_id")
          .eq("no", grn.po_no)
          .maybeSingle()
      : { data: null };

    const suppliers = (supRes.data ?? []) as SupplierFull[];
    const supplier = poDoc
      ? suppliers.find((s) => s.id === (poDoc as { supplier_id: string }).supplier_id)
      : null;

    docStatus = grn.status;
    docDate = grn.grn_date;

    content = (
      <>
        <section className="mb-6 grid grid-cols-1 gap-6 border-b-2 border-ink/80 pb-5 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
              {t("docgen.receivedFrom", lang)}
            </div>
            <div className="mt-1 text-base font-black text-ink">
              {supplier?.name ?? "—"}
            </div>
            <div className="mt-1 text-xs text-ink2">{supplier?.address}</div>
            {supplier?.pic && (
              <div className="text-xs text-ink2">
                PIC: {supplier.pic} · {supplier.phone}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:text-right">
            <FieldBlock label={t("docgen.fldDocNo", lang)} value={<span className="font-mono text-sm font-black">{grn.no}</span>} />
            <FieldBlock label={t("docgen.fldReceivedDate", lang)} value={formatDateShort(grn.grn_date)} />
            <FieldBlock label={t("docgen.fldRefPO", lang)} value={grn.po_no ?? "—"} />
            <FieldBlock label={t("docgen.fldQCStatus", lang)} value={<StatusPill status={grn.status} />} />
          </div>
        </section>

        <div className="mb-2 text-xs font-black uppercase tracking-wide text-ink">
          {ti("docgen.receivingChecklistTitle", lang, { n: poRows.length })}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink bg-ink/5">
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colNo", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colItem", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colPoQty", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colUnit", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colReceiveQty", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colQC", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {poRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border-x border-ink/20 px-2 py-4 text-center text-xs text-ink2/60">
                    {t("docgen.noDetailsGRN", lang)}
                  </td>
                </tr>
              ) : (
                poRows.map((r) => (
                  <tr key={r.line_no} className="border-b border-ink/10 even:bg-paper/40">
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs">{r.line_no}</td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs font-semibold">{r.item_code}</td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                      {Number(r.qty).toFixed(2)}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs">{r.unit}</td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs text-ink2/60">
                      ________
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs">{t("docgen.qcOkReject", lang)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {grn.qc_note && (
          <div className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink2 ring-1 ring-ink/5 print:bg-white print:ring-ink/30">
            <span className="font-black uppercase tracking-wide text-ink2/70">{t("docgen.qcNoteLabel", lang)} </span>
            {grn.qc_note}
          </div>
        )}
      </>
    );
  } else if (type === "invoice") {
    const [invRes, supRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("no, po_no, inv_date, supplier_id, total, due_date, status")
        .eq("no", no)
        .maybeSingle(),
      supabase.from("suppliers").select("*")
    ]);

    const inv = invRes.data as InvoiceRow | null;
    if (!inv) notFound();

    const suppliers = (supRes.data ?? []) as SupplierFull[];
    const supplier = suppliers.find((s) => s.id === inv.supplier_id);

    docStatus = inv.status;
    docDate = inv.inv_date;

    content = (
      <>
        <section className="mb-6 grid grid-cols-1 gap-6 border-b-2 border-ink/80 pb-5 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
              {t("docgen.biller", lang)}
            </div>
            <div className="mt-1 text-base font-black text-ink">
              {supplier?.name ?? "—"}
            </div>
            <div className="mt-1 text-xs text-ink2">{supplier?.address}</div>
            <div className="text-xs font-mono text-ink2">{supplier?.email}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:text-right">
            <FieldBlock label={t("docgen.fldInvNo", lang)} value={<span className="font-mono text-sm font-black">{inv.no}</span>} />
            <FieldBlock label={t("docgen.fldIssued", lang)} value={formatDateShort(inv.inv_date)} />
            <FieldBlock label={t("docgen.fldDue", lang)} value={inv.due_date ? formatDateShort(inv.due_date) : "—"} />
            <FieldBlock label={t("docgen.fldStatus", lang)} value={<StatusPill status={inv.status} />} />
            <FieldBlock label={t("docgen.fldRefPO", lang)} value={inv.po_no ?? "—"} />
          </div>
        </section>

        <div className="mb-4 rounded-2xl bg-ink/5 p-5 ring-1 ring-ink/10 print:bg-white print:ring-2 print:ring-ink">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
            {t("docgen.billAmount", lang)}
          </div>
          <div className="mt-1 font-mono text-3xl font-black text-ink sm:text-4xl">
            {formatIDR(Number(inv.total))}
          </div>
          <div className="mt-2 text-[11px] text-ink2/70">
            {t("docgen.transferHint", lang)}
          </div>
        </div>

        <div className="rounded-xl bg-paper p-3 text-xs text-ink2 ring-1 ring-ink/5 print:bg-white print:ring-ink/30">
          <span className="font-black uppercase tracking-wide text-ink2/70">{t("docgen.to", lang)} </span>
          {t("docgen.orgAddress", lang)}
        </div>
      </>
    );
  } else if (type === "qt") {
    const [qtRes, rowsRes, supRes, itemsRes] = await Promise.all([
      supabase
        .from("quotations")
        .select(
          "no, supplier_id, quote_date, valid_until, need_date, status, total, notes"
        )
        .eq("no", no)
        .maybeSingle(),
      supabase
        .from("quotation_rows")
        .select(
          "line_no, item_code, qty, unit, price_suggested, price_quoted, qty_quoted, note, subtotal"
        )
        .eq("qt_no", no)
        .order("line_no"),
      supabase.from("suppliers").select("*"),
      supabase.from("items").select("code, name_en, category")
    ]);

    const qt = qtRes.data as QtRow | null;
    if (!qt) notFound();

    const rows = (rowsRes.data ?? []) as QtLine[];
    const suppliers = (supRes.data ?? []) as SupplierFull[];
    const supplier = suppliers.find((s) => s.id === qt.supplier_id);
    const items = (itemsRes.data ?? []) as ItemMini[];
    const itemMap = new Map(items.map((i) => [i.code, i]));

    docStatus = qt.status;
    docDate = qt.quote_date;

    content = (
      <>
        <section className="mb-6 grid grid-cols-1 gap-6 border-b-2 border-ink/80 pb-5 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
              {t("docgen.toSupplier", lang)}
            </div>
            <div className="mt-1 text-base font-black text-ink">
              {supplier?.name ?? qt.supplier_id}
            </div>
            <div className="mt-1 text-xs text-ink2">{supplier?.address}</div>
            <div className="text-xs text-ink2">
              PIC: {supplier?.pic ?? "—"} · {supplier?.phone ?? "—"}
            </div>
            <div className="text-xs font-mono text-ink2">{supplier?.email}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:text-right">
            <FieldBlock label={t("docgen.fldDocNo", lang)} value={<span className="font-mono text-sm font-black">{qt.no}</span>} />
            <FieldBlock label={t("docgen.fldQuoteDate", lang)} value={formatDateShort(qt.quote_date)} />
            <FieldBlock label={t("docgen.fldValidUntil", lang)} value={qt.valid_until ? formatDateShort(qt.valid_until) : "—"} />
            <FieldBlock label={t("docgen.fldNeedDate", lang)} value={qt.need_date ? formatDateShort(qt.need_date) : "—"} />
            <FieldBlock label={t("docgen.fldStatus", lang)} value={<StatusPill status={qt.status} />} />
          </div>
        </section>

        <div className="mb-2 text-xs font-black uppercase tracking-wide text-ink">
          {ti("docgen.quotationItemTitle", lang, { n: rows.length })}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink bg-ink/5">
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colNo", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colItem", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colQty", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colUnit", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colPriceSuggested", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colPriceQuoted", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colQtyQuoted", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide">{t("docgen.colSubtotal", lang)}</th>
                <th className="border-x border-ink/20 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{t("docgen.colNote", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const it = itemMap.get(r.item_code);
                return (
                  <tr key={r.line_no} className="border-b border-ink/10 even:bg-paper/40">
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs">{r.line_no}</td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs">
                      <div className="font-semibold">{it?.name_en ?? r.item_code}</div>
                      <div className="font-mono text-[10px] text-ink2/70">{r.item_code}</div>
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                      {Number(r.qty).toLocaleString(numberLocale(lang), { maximumFractionDigits: 2 })}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-xs">{r.unit}</td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                      {r.price_suggested != null ? formatIDR(Number(r.price_suggested)) : "—"}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                      {r.price_quoted != null ? formatIDR(Number(r.price_quoted)) : "—"}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                      {r.qty_quoted != null
                        ? Number(r.qty_quoted).toLocaleString(numberLocale(lang), { maximumFractionDigits: 2 })
                        : "—"}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs font-black">
                      {formatIDR(Number(r.subtotal))}
                    </td>
                    <td className="border-x border-ink/20 px-2 py-1.5 text-[10px] text-ink2/80">{r.note ?? ""}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-ink bg-ink/10">
                <td colSpan={7} className="border-x border-ink/20 px-2 py-2 text-right text-xs font-black uppercase tracking-wide">
                  {t("docgen.totalQuotation", lang)}
                </td>
                <td className="border-x border-ink/20 px-2 py-2 text-right font-mono text-sm font-black text-ink">
                  {formatIDR(Number(qt.total))}
                </td>
                <td className="border-x border-ink/20 px-2 py-2" />
              </tr>
            </tbody>
          </table>
        </div>

        {qt.notes && (
          <div className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink2 ring-1 ring-ink/5 print:bg-white print:ring-ink/30">
            <span className="font-black uppercase tracking-wide text-ink2/70">{t("docgen.noteLabel", lang)} </span>
            {qt.notes}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-paper print:bg-white">
      {/* Top action bar — hidden on print */}
      <div className="print:hidden">
        <header className="sticky top-0 z-10 border-b border-ink/10 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <a
                href="/docgen"
                className="inline-flex items-center gap-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs font-bold text-ink shadow-sm transition hover:bg-paper"
              >
                {t("docgen.back", lang)}
              </a>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{TYPE_ICON[type]}</span>
                  <span className="truncate text-sm font-black text-ink">
                    {typeTitle(type, lang)}
                  </span>
                  <StatusPill status={docStatus} />
                </div>
                <div className="font-mono text-[11px] text-ink2/70">
                  {no} · {formatDateShort(docDate)}
                </div>
              </div>
            </div>
            <PrintButton />
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 print:max-w-none print:p-8">
        <article className="mx-auto rounded-2xl bg-white p-6 shadow-cardlg sm:p-8 print:rounded-none print:p-0 print:shadow-none">
          {/* Letterhead */}
          <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-xl text-white print:bg-ink print:text-white">
                🍱
              </span>
              <div>
                <div className="text-sm font-black uppercase tracking-wide text-ink">
                  {t("docgen.letterhead1", lang)}
                </div>
                <div className="text-[10px] text-ink2/80">
                  {t("docgen.letterhead2", lang)}
                </div>
                <div className="text-[10px] text-ink2/80">
                  {t("docgen.letterhead3", lang)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-black uppercase tracking-wider text-ink">
                {typeTitle(type, lang)}
              </div>
              <div className="font-mono text-[10px] text-ink2/70">
                {t("docgen.printedOn", lang)}{" "}
                {new Date().toLocaleDateString(numberLocale(lang), {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </div>
            </div>
          </header>

          {content}

          {/* Signatures */}
          <section className="mt-10 grid grid-cols-1 gap-6 border-t border-ink/15 pt-6 sm:grid-cols-3">
            <SignBlock title={t("docgen.signCreatedBy", lang)} role={t("docgen.roleOperator", lang)} />
            <SignBlock
              title={
                type === "po" || type === "qt"
                  ? t("docgen.signApprovedBy", lang)
                  : type === "grn"
                    ? t("docgen.signReceivedBy", lang)
                    : t("docgen.signVerifiedBy", lang)
              }
              role={t("docgen.roleHead", lang)}
            />
            <SignBlock
              title={t("docgen.signWitness", lang)}
              role={type === "invoice" ? t("docgen.roleFinance", lang) : t("docgen.roleSupplier", lang)}
            />
          </section>

          <footer className="mt-8 border-t border-ink/10 pt-3 text-[10px] text-ink2/60">
            {ti("docgen.footer", lang, {
              no,
              who: profile.full_name ?? profile.email
            })}
          </footer>
        </article>
      </main>
    </div>
  );
}

function SignBlock({ title, role }: { title: string; role: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink2/70">
        {title}
      </div>
      <div className="mt-16 border-t border-ink pt-1">
        <div className="text-xs font-bold text-ink">(________________)</div>
        <div className="text-[10px] text-ink2/70">{role}</div>
      </div>
    </div>
  );
}
