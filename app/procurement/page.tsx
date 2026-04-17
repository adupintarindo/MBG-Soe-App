import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { formatIDR, listNcr, ncrSnapshot } from "@/lib/engine";
import Link from "next/link";
import {
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";
import { GrnQcPanel } from "./grn-qc-panel";
import { t, ti, formatNumber } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const PO_STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  closed: "bg-green-100 text-green-900",
  cancelled: "bg-red-100 text-red-800"
};

const INV_STATUS_COLOR: Record<string, string> = {
  issued: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700"
};

const QT_STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-blue-100 text-blue-800",
  responded: "bg-amber-100 text-amber-900",
  accepted: "bg-emerald-100 text-emerald-900",
  converted: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-slate-100 text-slate-500"
};

const PR_STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  allocated: "bg-amber-100 text-amber-900",
  quotations_issued: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-red-100 text-red-800"
};

interface PrRow {
  no: string;
  need_date: string;
  status: string;
  notes: string | null;
  created_at: string;
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
  notes: string | null;
}
interface QtRow {
  no: string;
  supplier_id: string;
  quote_date: string;
  valid_until: string | null;
  need_date: string | null;
  total: number | string;
  status: string;
  converted_po_no: string | null;
}
interface PoLineRow {
  po_no: string;
  line_no: number;
  item_code: string;
  qty: number | string;
  unit: string;
  price: number | string;
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
interface ReceiptRow {
  id: string;
  ref: string;
  note: string | null;
  photo_url: string | null;
  created_at: string;
}
interface SupplierLite {
  id: string;
  name: string;
}

export default async function ProcurementPage() {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  // Stage 1: fetch parent tables in parallel (pos, grns, invoices, quotations, suppliers, receipts, ncr)
  const [
    posRes,
    grnsRes,
    invoicesRes,
    receiptsRes,
    suppliersRes,
    qtsRes,
    prsRes,
    ncrs,
    ncrStats
  ] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(
        "no, po_date, supplier_id, delivery_date, total, status, pay_method, top, notes"
      )
      .order("po_date", { ascending: false })
      .limit(50),
    supabase
      .from("grns")
      .select("no, po_no, grn_date, status, qc_note")
      .order("grn_date", { ascending: false })
      .limit(50),
    supabase
      .from("invoices")
      .select("no, po_no, inv_date, supplier_id, total, due_date, status")
      .order("inv_date", { ascending: false })
      .limit(50),
    supabase
      .from("receipts")
      .select("id, ref, note, photo_url, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("suppliers").select("id, name"),
    supabase
      .from("quotations")
      .select(
        "no, supplier_id, quote_date, valid_until, need_date, total, status, converted_po_no"
      )
      .order("quote_date", { ascending: false })
      .limit(50),
    supabase
      .from("purchase_requisitions")
      .select("no, need_date, status, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    listNcr(supabase, { limit: 50 }).catch(() => []),
    ncrSnapshot(supabase).catch(() => ({
      total: 0,
      open_cnt: 0,
      in_progress_cnt: 0,
      resolved_cnt: 0,
      critical_open: 0,
      avg_resolve_days: null
    }))
  ]);

  const pos = (posRes.data ?? []) as PoRow[];
  const grns = (grnsRes.data ?? []) as GrnRow[];
  const invoices = (invoicesRes.data ?? []) as InvoiceRow[];
  const receipts = (receiptsRes.data ?? []) as ReceiptRow[];
  const suppliers = (suppliersRes.data ?? []) as SupplierLite[];
  const quotations = (qtsRes.data ?? []) as QtRow[];
  const prs = (prsRes.data ?? []) as PrRow[];

  // Stage 2: fetch child tables scoped only to the 50 displayed POs/GRNs
  const poNos = pos.map((p) => p.no);
  const grnNos = grns.map((g) => g.no);

  const [poRowsRes, qcAggRes] = await Promise.all([
    poNos.length
      ? supabase
          .from("po_rows")
          .select("po_no, line_no, item_code, qty, unit, price")
          .in("po_no", poNos)
      : Promise.resolve({ data: [] as PoLineRow[] }),
    grnNos.length
      ? supabase
          .from("grn_qc_checks")
          .select("grn_no, result")
          .in("grn_no", grnNos)
      : Promise.resolve({ data: [] as Array<{ grn_no: string; result: string }> })
  ]);

  const poRows = (poRowsRes.data ?? []) as PoLineRow[];
  const qcRows = (qcAggRes.data ?? []) as Array<{
    grn_no: string;
    result: string;
  }>;

  // Aggregate QC per GRN
  const qcMap = new Map<
    string,
    { grn_no: string; total: number; fail: number; has_critical: boolean }
  >();
  for (const r of qcRows) {
    const agg = qcMap.get(r.grn_no) ?? {
      grn_no: r.grn_no,
      total: 0,
      fail: 0,
      has_critical: false
    };
    agg.total += 1;
    if (r.result !== "pass" && r.result !== "na") agg.fail += 1;
    if (r.result === "critical") agg.has_critical = true;
    qcMap.set(r.grn_no, agg);
  }
  const qcAgg = Array.from(qcMap.values());

  const poSupplierMap: Record<string, string> = {};
  for (const p of pos) poSupplierMap[p.no] = p.supplier_id;
  const supplierNameMap: Record<string, string> = {};
  for (const s of suppliers) supplierNameMap[s.id] = s.name;

  const canWrite =
    profile.role === "admin" || profile.role === "operator";

  const supMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const rowCountByPO = new Map<string, number>();
  const qtyByPO = new Map<string, number>();
  for (const r of poRows) {
    rowCountByPO.set(r.po_no, (rowCountByPO.get(r.po_no) ?? 0) + 1);
    qtyByPO.set(r.po_no, (qtyByPO.get(r.po_no) ?? 0) + Number(r.qty));
  }

  const poCount = pos.length;
  const grnCount = grns.length;
  const invCount = invoices.length;
  const poTotal = pos.reduce((s, p) => s + Number(p.total), 0);
  const invTotal = invoices.reduce((s, i) => s + Number(i.total), 0);
  const invPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total), 0);
  const invOutstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((s, i) => s + Number(i.total), 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="🧾"
          title={t("procurement.title", lang)}
          subtitle={
            <>
              {ti("procurement.subtitle", lang, {
                prs: prs.length,
                qts: quotations.length,
                pos: poCount,
                grns: grnCount,
                invs: invCount
              })}{" "}
              <b className="text-red-700">{formatIDR(invOutstanding)}</b>
            </>
          }
          actions={
            canWrite ? (
              <div className="flex flex-wrap items-center gap-2">
                <LinkButton
                  href="/procurement/requisition/new"
                  variant="gold"
                  size="sm"
                >
                  {t("procurement.btnNewPR", lang)}
                </LinkButton>
                <LinkButton
                  href="/procurement/quotation/new"
                  variant="primary"
                  size="sm"
                >
                  {t("procurement.btnNewQuotation", lang)}
                </LinkButton>
              </div>
            ) : null
          }
        />

        <KpiGrid>
          <KpiTile
            icon="📝"
            label={t("procurement.kpiPOValue", lang)}
            value={formatIDR(poTotal)}
            size="md"
            sub={ti("procurement.kpiDocuments", lang, { n: poCount })}
          />
          <KpiTile
            icon="📦"
            label={t("procurement.kpiGRN", lang)}
            value={grnCount.toString()}
            sub={ti("procurement.kpiOK", lang, {
              n: grns.filter((g) => g.status === "ok").length
            })}
          />
          <KpiTile
            icon="💰"
            label={t("procurement.kpiInvoicePaid", lang)}
            value={formatIDR(invPaid)}
            size="md"
            tone="ok"
            sub={ti("procurement.kpiInvoicePaidSub", lang, { total: formatIDR(invTotal) })}
          />
          <KpiTile
            icon="⚠️"
            label={t("procurement.kpiOutstanding", lang)}
            value={formatIDR(invOutstanding)}
            size="md"
            tone={overdueCount > 0 ? "bad" : "warn"}
            sub={ti("procurement.kpiOverdue", lang, { n: overdueCount })}
          />
          <KpiTile
            icon="🧪"
            label={t("procurement.kpiNCR", lang)}
            value={(ncrStats.open_cnt + ncrStats.in_progress_cnt).toString()}
            tone={
              ncrStats.critical_open > 0
                ? "bad"
                : ncrStats.open_cnt > 0
                  ? "warn"
                  : "ok"
            }
            sub={ti("procurement.kpiNCRSub", lang, {
              crit: ncrStats.critical_open,
              days: ncrStats.avg_resolve_days ?? "—"
            })}
          />
        </KpiGrid>

        <Section
          title={t("procurement.secPRtitle", lang)}
          hint={t("procurement.secPRhint", lang)}
          actions={
            canWrite ? (
              <Link
                href="/procurement/requisition/new"
                className="rounded-lg bg-gold-gradient px-3 py-1.5 text-[11px] font-black text-primary-strong shadow-card hover:brightness-105"
              >
                {t("procurement.btnNewPRshort", lang)}
              </Link>
            ) : null
          }
        >
          {prs.length === 0 ? (
            <EmptyState message={t("procurement.prEmpty", lang)} />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">{t("procurement.colPRNo", lang)}</th>
                  <th className="py-2 pr-3">{t("procurement.colCreated", lang)}</th>
                  <th className="py-2 pr-3">{t("procurement.colNeeded", lang)}</th>
                  <th className="py-2 pr-3">{t("common.status", lang)}</th>
                  <th className="py-2 pr-3">{t("common.note", lang)}</th>
                  <th className="py-2 pr-3"></th>
                </THead>
                <tbody>
                  {prs.map((p) => (
                    <tr key={p.no} className="row-hover border-b border-ink/5">
                      <td className="py-2 pr-3 font-mono text-xs font-black">
                        {p.no}
                      </td>
                      <td className="py-2 pr-3 text-xs text-ink2">
                        {p.created_at.slice(0, 10)}
                      </td>
                      <td className="py-2 pr-3 text-xs">{p.need_date}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PR_STATUS_COLOR[p.status] ?? PR_STATUS_COLOR.draft}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[11px] italic text-ink2/70">
                        {p.notes ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Link
                          href={`/procurement/requisition/${encodeURIComponent(p.no)}`}
                          className="text-[11px] font-bold text-accent-strong hover:underline"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section
          title="📄 Quotations · RFQ"
          hint="Draft harga ke supplier sebelum PO · export .xlsx untuk supplier tanda tangan/edit, lalu convert ke PO."
          actions={
            canWrite ? (
              <Link
                href="/procurement/quotation/new"
                className="rounded-lg bg-ink px-3 py-1.5 text-[11px] font-black text-white shadow-card hover:bg-ink2"
              >
                + Buat Baru
              </Link>
            ) : null
          }
        >
          {quotations.length === 0 ? (
            <EmptyState message="Belum ada quotation. Klik 'Buat Baru' untuk mulai." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">No</th>
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3">Butuh</th>
                  <th className="py-2 pr-3">Berlaku s/d</th>
                  <th className="py-2 pr-3 text-right">Nilai</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">PO</th>
                  <th className="py-2 pr-3"></th>
                </THead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.no} className="row-hover border-b border-ink/5">
                      <td className="py-2 pr-3 font-mono text-xs font-black">
                        {q.no}
                      </td>
                      <td className="py-2 pr-3 text-xs">{q.quote_date}</td>
                      <td className="py-2 pr-3 text-xs">
                        {supMap.get(q.supplier_id) ?? q.supplier_id}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {q.need_date ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {q.valid_until ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                        {formatIDR(Number(q.total))}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${QT_STATUS_COLOR[q.status] ?? QT_STATUS_COLOR.draft}`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {q.converted_po_no ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Link
                          href={`/procurement/quotation/${encodeURIComponent(q.no)}`}
                          className="text-[11px] font-bold text-accent-strong hover:underline"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section title="📝 Purchase Orders" hint="50 PO terbaru">
          {pos.length === 0 ? (
            <EmptyState message="Belum ada PO." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">No</th>
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3">Delivery</th>
                  <th className="py-2 pr-3 text-right">Items</th>
                  <th className="py-2 pr-3 text-right">Total Qty</th>
                  <th className="py-2 pr-3 text-right">Nilai</th>
                  <th className="py-2 pr-3">TOP</th>
                  <th className="py-2 pr-3">Status</th>
                </THead>
                <tbody>
                  {pos.map((p) => (
                    <tr key={p.no} className="row-hover border-b border-ink/5">
                      <td className="py-2 pr-3 font-mono text-xs font-black">
                        {p.no}
                      </td>
                      <td className="py-2 pr-3 text-xs">{p.po_date}</td>
                      <td className="py-2 pr-3 text-xs">
                        {supMap.get(p.supplier_id) ?? p.supplier_id}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {p.delivery_date ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {rowCountByPO.get(p.no) ?? 0}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {(qtyByPO.get(p.no) ?? 0).toLocaleString("id-ID", {
                          maximumFractionDigits: 1
                        })}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                        {formatIDR(Number(p.total))}
                      </td>
                      <td className="py-2 pr-3 text-xs">{p.top ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PO_STATUS_COLOR[p.status] ?? PO_STATUS_COLOR.draft}`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section
          title="📦 GRN · QC Checklist · Non-Conformance"
          hint="Klik baris untuk buat pemeriksaan QC dari template · NCR dicatat per severity."
          accent={ncrStats.critical_open > 0 ? "bad" : "default"}
        >
          <GrnQcPanel
            grns={grns}
            qcAgg={qcAgg}
            ncrs={ncrs}
            canWrite={canWrite}
            supplierIds={poSupplierMap}
            supplierNames={supplierNameMap}
          />
        </Section>

        <Section title="💰 Invoice" hint="50 invoice terbaru">
          {invoices.length === 0 ? (
            <EmptyState message="Belum ada invoice." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">No Invoice</th>
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3">PO</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3">Jatuh Tempo</th>
                  <th className="py-2 pr-3">Status</th>
                </THead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.no} className="row-hover border-b border-ink/5">
                      <td className="py-2 pr-3 font-mono text-xs font-black">
                        {i.no}
                      </td>
                      <td className="py-2 pr-3 text-xs">{i.inv_date}</td>
                      <td className="py-2 pr-3 text-xs">
                        {supMap.get(i.supplier_id) ?? i.supplier_id}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {i.po_no ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                        {formatIDR(Number(i.total))}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {i.due_date ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${INV_STATUS_COLOR[i.status] ?? INV_STATUS_COLOR.issued}`}
                        >
                          {i.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section
          title="📷 Bukti Terima (Foto)"
          hint="20 terbaru · klik untuk detail di procurement system"
        >
          {receipts.length === 0 ? (
            <EmptyState message="Belum ada foto bukti." />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {receipts.map((r) => (
                <div
                  key={r.id}
                  className="group overflow-hidden rounded-xl bg-paper ring-1 ring-ink/10 transition hover:shadow-card"
                >
                  {r.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.photo_url}
                      alt={r.ref}
                      className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-ink/5 text-xs text-ink2/60">
                      (tanpa foto)
                    </div>
                  )}
                  <div className="p-2 text-[11px]">
                    <div className="font-mono font-bold text-ink">{r.ref}</div>
                    <div className="text-ink2/70">
                      {new Date(r.created_at).toLocaleDateString("id-ID")}
                    </div>
                    {r.note && (
                      <div className="mt-1 line-clamp-2 text-ink2">
                        {r.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
