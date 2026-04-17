import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";
import {
  EmptyState,
  KpiGrid,
  KpiTile,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";

export const dynamic = "force-dynamic";

const PO_STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  closed: "bg-green-100 text-green-900",
  cancelled: "bg-red-100 text-red-800"
};

const GRN_STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  ok: "bg-emerald-100 text-emerald-800",
  partial: "bg-orange-100 text-orange-900",
  rejected: "bg-red-100 text-red-800"
};

const INV_STATUS_COLOR: Record<string, string> = {
  issued: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700"
};

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

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active, supplier_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.active) redirect("/dashboard");

  const [posRes, poRowsRes, grnsRes, invoicesRes, receiptsRes, suppliersRes] =
    await Promise.all([
      supabase
        .from("purchase_orders")
        .select(
          "no, po_date, supplier_id, delivery_date, total, status, pay_method, top, notes"
        )
        .order("po_date", { ascending: false })
        .limit(50),
      supabase
        .from("po_rows")
        .select("po_no, line_no, item_code, qty, unit, price"),
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
      supabase.from("suppliers").select("id, name")
    ]);

  const pos = (posRes.data ?? []) as PoRow[];
  const poRows = (poRowsRes.data ?? []) as PoLineRow[];
  const grns = (grnsRes.data ?? []) as GrnRow[];
  const invoices = (invoicesRes.data ?? []) as InvoiceRow[];
  const receipts = (receiptsRes.data ?? []) as ReceiptRow[];
  const suppliers = (suppliersRes.data ?? []) as SupplierLite[];

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
          title="Pengadaan · PO · GRN · Invoice"
          subtitle={
            <>
              {poCount} PO · {grnCount} GRN · {invCount} Invoice · outstanding{" "}
              <b className="text-red-700">{formatIDR(invOutstanding)}</b>
            </>
          }
        />

        <KpiGrid>
          <KpiTile
            icon="📝"
            label="Nilai PO"
            value={formatIDR(poTotal)}
            size="md"
            sub={`${poCount} dokumen`}
          />
          <KpiTile
            icon="📦"
            label="GRN"
            value={grnCount.toString()}
            sub={`${grns.filter((g) => g.status === "ok").length} OK`}
          />
          <KpiTile
            icon="💰"
            label="Invoice Dibayar"
            value={formatIDR(invPaid)}
            size="md"
            tone="ok"
            sub={`dari ${formatIDR(invTotal)}`}
          />
          <KpiTile
            icon="⚠️"
            label="Outstanding"
            value={formatIDR(invOutstanding)}
            size="md"
            tone={overdueCount > 0 ? "bad" : "warn"}
            sub={`${overdueCount} overdue`}
          />
        </KpiGrid>

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

        <Section title="📦 Goods Receipt Notes" hint="50 GRN terbaru">
          {grns.length === 0 ? (
            <EmptyState message="Belum ada GRN." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">No GRN</th>
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">PO Referensi</th>
                  <th className="py-2 pr-3">QC</th>
                  <th className="py-2 pr-3">Status</th>
                </THead>
                <tbody>
                  {grns.map((g) => (
                    <tr key={g.no} className="row-hover border-b border-ink/5">
                      <td className="py-2 pr-3 font-mono text-xs font-black">
                        {g.no}
                      </td>
                      <td className="py-2 pr-3 text-xs">{g.grn_date}</td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {g.po_no ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs text-ink2/70">
                        {g.qc_note ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${GRN_STATUS_COLOR[g.status] ?? GRN_STATUS_COLOR.pending}`}
                        >
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
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
