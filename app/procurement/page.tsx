import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";

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
      supabase.from("po_rows").select("po_no, line_no, item_code, qty, unit, price"),
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

  const pos = posRes.data ?? [];
  const poRows = poRowsRes.data ?? [];
  const grns = grnsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const receipts = receiptsRes.data ?? [];
  const suppliers = suppliersRes.data ?? [];

  const supMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const rowCountByPO = new Map<string, number>();
  const qtyByPO = new Map<string, number>();
  for (const r of poRows) {
    rowCountByPO.set(r.po_no, (rowCountByPO.get(r.po_no) ?? 0) + 1);
    qtyByPO.set(
      r.po_no,
      (qtyByPO.get(r.po_no) ?? 0) + Number(r.qty)
    );
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

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-black text-ink">
            🧾 Pengadaan · PO · GRN · Invoice
          </h1>
          <p className="text-sm text-ink2/80">
            {poCount} PO · {grnCount} GRN · {invCount} Invoice · outstanding{" "}
            {formatIDR(invOutstanding)}
          </p>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI
            icon="📝"
            label="Nilai PO"
            value={formatIDR(poTotal)}
            sub={`${poCount} dokumen`}
          />
          <KPI
            icon="📦"
            label="GRN"
            value={grnCount.toString()}
            sub={`${grns.filter((g) => g.status === "ok").length} OK`}
          />
          <KPI
            icon="💰"
            label="Invoice Dibayar"
            value={formatIDR(invPaid)}
            sub={`dari ${formatIDR(invTotal)}`}
          />
          <KPI
            icon="⚠️"
            label="Outstanding"
            value={formatIDR(invOutstanding)}
            sub={`${invoices.filter((i) => i.status === "overdue").length} overdue`}
          />
        </section>

        {/* Purchase Orders */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            📝 Purchase Orders
          </h2>
          {pos.length === 0 ? (
            <div className="rounded-xl bg-ink/5 p-4 text-sm text-ink2">
              Belum ada PO.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                    <th className="py-2">No</th>
                    <th className="py-2">Tanggal</th>
                    <th className="py-2">Supplier</th>
                    <th className="py-2">Delivery</th>
                    <th className="py-2 text-right">Items</th>
                    <th className="py-2 text-right">Total Qty</th>
                    <th className="py-2 text-right">Nilai</th>
                    <th className="py-2">TOP</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((p) => (
                    <tr key={p.no} className="border-b border-ink/5">
                      <td className="py-2 font-mono text-xs font-black">
                        {p.no}
                      </td>
                      <td className="py-2 text-xs">{p.po_date}</td>
                      <td className="py-2 text-xs">
                        {supMap.get(p.supplier_id) ?? p.supplier_id}
                      </td>
                      <td className="py-2 text-xs">{p.delivery_date ?? "—"}</td>
                      <td className="py-2 text-right font-mono text-xs">
                        {rowCountByPO.get(p.no) ?? 0}
                      </td>
                      <td className="py-2 text-right font-mono text-xs">
                        {(qtyByPO.get(p.no) ?? 0).toLocaleString("id-ID", {
                          maximumFractionDigits: 1
                        })}
                      </td>
                      <td className="py-2 text-right font-mono text-xs font-black">
                        {formatIDR(Number(p.total))}
                      </td>
                      <td className="py-2 text-xs">{p.top ?? "—"}</td>
                      <td className="py-2">
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
            </div>
          )}
        </section>

        {/* GRN */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            📦 Goods Receipt Notes
          </h2>
          {grns.length === 0 ? (
            <div className="rounded-xl bg-ink/5 p-4 text-sm text-ink2">
              Belum ada GRN.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                    <th className="py-2">No GRN</th>
                    <th className="py-2">Tanggal</th>
                    <th className="py-2">PO Referensi</th>
                    <th className="py-2">QC</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map((g) => (
                    <tr key={g.no} className="border-b border-ink/5">
                      <td className="py-2 font-mono text-xs font-black">
                        {g.no}
                      </td>
                      <td className="py-2 text-xs">{g.grn_date}</td>
                      <td className="py-2 font-mono text-xs">
                        {g.po_no ?? "—"}
                      </td>
                      <td className="py-2 text-xs text-ink2/70">
                        {g.qc_note ?? "—"}
                      </td>
                      <td className="py-2">
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
            </div>
          )}
        </section>

        {/* Invoices */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            💰 Invoice
          </h2>
          {invoices.length === 0 ? (
            <div className="rounded-xl bg-ink/5 p-4 text-sm text-ink2">
              Belum ada invoice.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                    <th className="py-2">No Invoice</th>
                    <th className="py-2">Tanggal</th>
                    <th className="py-2">Supplier</th>
                    <th className="py-2">PO</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2">Jatuh Tempo</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.no} className="border-b border-ink/5">
                      <td className="py-2 font-mono text-xs font-black">
                        {i.no}
                      </td>
                      <td className="py-2 text-xs">{i.inv_date}</td>
                      <td className="py-2 text-xs">
                        {supMap.get(i.supplier_id) ?? i.supplier_id}
                      </td>
                      <td className="py-2 font-mono text-xs">
                        {i.po_no ?? "—"}
                      </td>
                      <td className="py-2 text-right font-mono text-xs font-black">
                        {formatIDR(Number(i.total))}
                      </td>
                      <td className="py-2 text-xs">{i.due_date ?? "—"}</td>
                      <td className="py-2">
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
            </div>
          )}
        </section>

        {/* Receipts photos */}
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            📷 Bukti Terima (Foto) · 20 terbaru
          </h2>
          {receipts.length === 0 ? (
            <div className="rounded-xl bg-ink/5 p-4 text-sm text-ink2">
              Belum ada foto bukti.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {receipts.map((r) => (
                <div
                  key={r.id}
                  className="overflow-hidden rounded-xl ring-1 ring-ink/10"
                >
                  {r.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.photo_url}
                      alt={r.ref}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-ink/5 text-xs text-ink2/60">
                      (tanpa foto)
                    </div>
                  )}
                  <div className="p-2 text-[11px]">
                    <div className="font-mono font-bold">{r.ref}</div>
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
        </section>
      </main>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  sub
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink2/80">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-lg font-black leading-tight text-ink">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-ink2/70">{sub}</div>
    </div>
  );
}
