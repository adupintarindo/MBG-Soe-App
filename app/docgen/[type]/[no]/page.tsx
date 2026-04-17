import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/engine";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

type DocType = "po" | "grn" | "invoice" | "ba";

const TITLE_MAP: Record<DocType, string> = {
  po: "Purchase Order",
  grn: "Goods Receipt Note",
  invoice: "Invoice",
  ba: "Berita Acara Terima Barang"
};

interface PageProps {
  params: { type: string; no: string };
}

export default async function DocDetailPage({ params }: PageProps) {
  const type = params.type as DocType;
  const no = decodeURIComponent(params.no);

  if (!["po", "grn", "invoice", "ba"].includes(type)) notFound();

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.active) redirect("/dashboard");

  // Fetch based on type
  let content: React.ReactNode = null;

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

    const po = poRes.data;
    if (!po) notFound();

    const rows = rowsRes.data ?? [];
    const supplier = (supRes.data ?? []).find((s) => s.id === po.supplier_id);
    const itemMap = new Map((itemsRes.data ?? []).map((i) => [i.code, i]));

    content = (
      <>
        <section className="mb-6 grid grid-cols-2 gap-6 border-b border-ink pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
              Kepada (Supplier)
            </div>
            <div className="mt-1 font-black">{supplier?.name}</div>
            <div className="text-xs">{supplier?.address}</div>
            <div className="text-xs">
              PIC: {supplier?.pic} · {supplier?.phone}
            </div>
            <div className="text-xs font-mono">{supplier?.email}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
              Dokumen PO
            </div>
            <div className="mt-1 font-mono text-lg font-black">{po.no}</div>
            <div className="text-xs">
              <b>Tanggal:</b> {po.po_date}
            </div>
            <div className="text-xs">
              <b>Delivery:</b> {po.delivery_date ?? "—"}
            </div>
            <div className="text-xs">
              <b>TOP:</b> {po.top ?? "—"} · <b>Bayar:</b> {po.pay_method ?? "—"}
            </div>
            <div className="text-xs">
              <b>Status:</b> {po.status}
            </div>
          </div>
        </section>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink bg-ink/5">
              <th className="border-x border-ink/20 px-2 py-2 text-left text-xs">
                #
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-left text-xs">
                Item
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-left text-xs">
                Kategori
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-xs">
                Qty
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-left text-xs">
                Unit
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-xs">
                Harga Satuan
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-xs">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const it = itemMap.get(r.item_code);
              const subtotal = Number(r.qty) * Number(r.price);
              return (
                <tr key={r.line_no} className="border-b border-ink/10">
                  <td className="border-x border-ink/20 px-2 py-1.5 text-xs">
                    {r.line_no}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-xs font-semibold">
                    {r.item_code}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-[10px]">
                    {it?.category}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                    {Number(r.qty).toLocaleString("id-ID", {
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-xs">
                    {r.unit}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                    {formatIDR(Number(r.price))}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs font-black">
                    {formatIDR(subtotal)}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-ink bg-ink/5">
              <td
                colSpan={6}
                className="border-x border-ink/20 px-2 py-2 text-right font-bold"
              >
                TOTAL
              </td>
              <td className="border-x border-ink/20 px-2 py-2 text-right font-mono font-black">
                {formatIDR(Number(po.total))}
              </td>
            </tr>
          </tbody>
        </table>

        {po.notes && (
          <div className="mt-4 text-xs">
            <b>Catatan:</b> {po.notes}
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

    const grn = grnRes.data;
    if (!grn) notFound();

    const poRows = grn.po_no
      ? (poRowsRes.data ?? []).filter((r) => r.po_no === grn.po_no)
      : [];

    const { data: poDoc } = grn.po_no
      ? await supabase
          .from("purchase_orders")
          .select("no, po_date, supplier_id")
          .eq("no", grn.po_no)
          .maybeSingle()
      : { data: null };

    const supplier = poDoc
      ? (supRes.data ?? []).find((s) => s.id === poDoc.supplier_id)
      : null;

    content = (
      <>
        <section className="mb-6 grid grid-cols-2 gap-6 border-b border-ink pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
              Diterima Dari
            </div>
            <div className="mt-1 font-black">{supplier?.name ?? "—"}</div>
            <div className="text-xs">{supplier?.address}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
              Dokumen GRN
            </div>
            <div className="mt-1 font-mono text-lg font-black">{grn.no}</div>
            <div className="text-xs">
              <b>Tanggal:</b> {grn.grn_date}
            </div>
            <div className="text-xs">
              <b>Ref PO:</b> {grn.po_no ?? "—"}
            </div>
            <div className="text-xs">
              <b>Status QC:</b> {grn.status}
            </div>
          </div>
        </section>

        <h3 className="mb-2 text-sm font-black">Detail Barang Diterima</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink bg-ink/5">
              <th className="border-x border-ink/20 px-2 py-2 text-left text-xs">
                #
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-left text-xs">
                Item
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-xs">
                Qty PO
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-left text-xs">
                Unit
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-right text-xs">
                Qty Terima
              </th>
              <th className="border-x border-ink/20 px-2 py-2 text-left text-xs">
                QC
              </th>
            </tr>
          </thead>
          <tbody>
            {poRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border-x border-ink/20 px-2 py-3 text-center text-xs text-ink2/60"
                >
                  Tidak ada detail (GRN tanpa PO referensi).
                </td>
              </tr>
            ) : (
              poRows.map((r) => (
                <tr key={r.line_no} className="border-b border-ink/10">
                  <td className="border-x border-ink/20 px-2 py-1.5 text-xs">
                    {r.line_no}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-xs font-semibold">
                    {r.item_code}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                    {Number(r.qty).toFixed(2)}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-xs">
                    {r.unit}
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-right font-mono text-xs">
                    ________
                  </td>
                  <td className="border-x border-ink/20 px-2 py-1.5 text-xs">
                    ☐ OK ☐ Reject
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {grn.qc_note && (
          <div className="mt-4 rounded-xl bg-paper p-3 text-xs">
            <b>Catatan QC:</b> {grn.qc_note}
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

    const inv = invRes.data;
    if (!inv) notFound();

    const supplier = (supRes.data ?? []).find((s) => s.id === inv.supplier_id);

    content = (
      <>
        <section className="mb-6 grid grid-cols-2 gap-6 border-b border-ink pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
              Penagih (Supplier)
            </div>
            <div className="mt-1 font-black">{supplier?.name}</div>
            <div className="text-xs">{supplier?.address}</div>
            <div className="text-xs font-mono">{supplier?.email}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
              Dokumen Invoice
            </div>
            <div className="mt-1 font-mono text-lg font-black">{inv.no}</div>
            <div className="text-xs">
              <b>Tanggal:</b> {inv.inv_date}
            </div>
            <div className="text-xs">
              <b>Jatuh Tempo:</b> {inv.due_date ?? "—"}
            </div>
            <div className="text-xs">
              <b>Ref PO:</b> {inv.po_no ?? "—"}
            </div>
            <div className="text-xs">
              <b>Status:</b> {inv.status}
            </div>
          </div>
        </section>

        <div className="mb-4 rounded-xl bg-ink/5 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
            Jumlah Tagihan
          </div>
          <div className="mt-1 font-mono text-3xl font-black text-ink">
            {formatIDR(Number(inv.total))}
          </div>
          <div className="mt-1 text-[11px] text-ink2/70">
            Harap transfer ke rekening supplier sesuai kontrak LTA.
          </div>
        </div>

        <div className="text-xs">
          <b>Kepada:</b> SPPG Nunumeu · Jl. Nunumeu, Kota Soe, Kabupaten Timor
          Tengah Selatan, NTT
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-paper print:bg-white">
      <div className="print:hidden">
        <header className="sticky top-0 border-b border-ink/10 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-center gap-3">
              <a
                href="/docgen"
                className="rounded-lg border border-ink/20 px-3 py-2 text-xs font-bold text-ink hover:bg-paper"
              >
                ← Kembali
              </a>
              <div className="text-sm font-black text-ink">
                {TITLE_MAP[type]} · {no}
              </div>
            </div>
            <PrintButton />
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8 print:max-w-none print:p-8">
        <article className="mx-auto rounded-2xl bg-white p-8 shadow-card print:rounded-none print:shadow-none">
          {/* Letterhead */}
          <header className="mb-6 flex items-start justify-between border-b-2 border-ink pb-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-xl text-white">
                🍱
              </span>
              <div>
                <div className="text-sm font-black text-ink">
                  SPPG NUNUMEU — MBG SOE
                </div>
                <div className="text-[10px] text-ink2/80">
                  Jl. Nunumeu, Kota Soe, Kabupaten TTS, Nusa Tenggara Timur
                </div>
                <div className="text-[10px] text-ink2/80">
                  WFP × IFSR × FFI · 9 sekolah · 2.055 siswa + 105 guru
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-black uppercase tracking-wide text-ink">
                {TITLE_MAP[type]}
              </div>
              <div className="text-[10px] text-ink2/70">
                {new Date().toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </div>
            </div>
          </header>

          {content}

          {/* Signatures */}
          <section className="mt-8 grid grid-cols-3 gap-4 border-t border-ink/10 pt-6">
            <SignBlock title="Disusun oleh" role="Operator SPPG" />
            <SignBlock
              title={
                type === "po"
                  ? "Disetujui oleh"
                  : type === "grn"
                    ? "Diterima oleh"
                    : "Diverifikasi oleh"
              }
              role="Kepala SPPG"
            />
            <SignBlock title="Saksi" role={type === "invoice" ? "Finance" : "Supplier"} />
          </section>

          <footer className="mt-6 border-t border-ink/10 pt-3 text-[10px] text-ink2/60">
            Dokumen terbit otomatis dari sistem MBG Soe Supply Chain · Auditable
            via ref #{no}
          </footer>
        </article>
      </main>
    </div>
  );
}

function SignBlock({ title, role }: { title: string; role: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
        {title}
      </div>
      <div className="mt-14 border-t border-ink pt-1">
        <div className="text-xs font-bold">(________________)</div>
        <div className="text-[10px] text-ink2/70">{role}</div>
      </div>
    </div>
  );
}
