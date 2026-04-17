import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";

export const dynamic = "force-dynamic";

export default async function DocGenPage() {
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

  const [posRes, grnsRes, invRes, suppliersRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("no, po_date, supplier_id, total, status")
      .order("po_date", { ascending: false })
      .limit(30),
    supabase
      .from("grns")
      .select("no, po_no, grn_date, status")
      .order("grn_date", { ascending: false })
      .limit(30),
    supabase
      .from("invoices")
      .select("no, po_no, inv_date, supplier_id, total, status")
      .order("inv_date", { ascending: false })
      .limit(30),
    supabase.from("suppliers").select("id, name")
  ]);

  const pos = posRes.data ?? [];
  const grns = grnsRes.data ?? [];
  const invoices = invRes.data ?? [];
  const suppliers = suppliersRes.data ?? [];
  const supMap = new Map(suppliers.map((s) => [s.id, s.name]));

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-black text-ink">📄 Document Generator</h1>
          <p className="text-sm text-ink2/80">
            Preview & print dokumen resmi SPPG · PO · GRN · Invoice · Berita Acara
          </p>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <TemplateCard
            icon="📝"
            label="Purchase Order"
            count={pos.length}
            hint="Order ke supplier"
          />
          <TemplateCard
            icon="📦"
            label="GRN"
            count={grns.length}
            hint="Berita Acara Terima"
          />
          <TemplateCard
            icon="💰"
            label="Invoice"
            count={invoices.length}
            hint="Tagihan supplier"
          />
          <TemplateCard
            icon="🧾"
            label="Kontrak LTA"
            count={suppliers.length}
            hint="Long-Term Agreement"
          />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <DocList
            title="Purchase Orders"
            docs={pos.map((p) => ({
              no: p.no,
              date: p.po_date,
              sub: supMap.get(p.supplier_id) ?? p.supplier_id,
              amount: Number(p.total),
              status: p.status,
              href: `/docgen/po/${encodeURIComponent(p.no)}`
            }))}
          />
          <DocList
            title="Goods Receipt Notes"
            docs={grns.map((g) => ({
              no: g.no,
              date: g.grn_date,
              sub: g.po_no ?? "—",
              amount: null,
              status: g.status,
              href: `/docgen/grn/${encodeURIComponent(g.no)}`
            }))}
          />
          <DocList
            title="Invoice"
            docs={invoices.map((i) => ({
              no: i.no,
              date: i.inv_date,
              sub: supMap.get(i.supplier_id) ?? i.supplier_id,
              amount: Number(i.total),
              status: i.status,
              href: `/docgen/invoice/${encodeURIComponent(i.no)}`
            }))}
          />
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            📋 Template Statis (PDF)
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TemplateItem
              title="Form Inspeksi Harian"
              desc="Checklist QC bahan + suhu + higiene food handler."
            />
            <TemplateItem
              title="Berita Acara Pemusnahan"
              desc="Untuk bahan rusak/expired yang di-waste."
            />
            <TemplateItem
              title="Form Vendor Matrix Scoring"
              desc="Evaluasi kuartalan supplier (skor 0-100)."
            />
          </div>
          <p className="mt-3 text-[11px] text-ink2/60">
            Template cetakan belum tersedia di sini — kontak admin untuk
            mendapatkan file master.
          </p>
        </section>
      </main>
    </div>
  );
}

function TemplateCard({
  icon,
  label,
  count,
  hint
}: {
  icon: string;
  label: string;
  count: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink2/80">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-2xl font-black text-ink">{count}</div>
      <div className="mt-1 text-[11px] font-semibold text-ink2/70">{hint}</div>
    </div>
  );
}

function TemplateItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-paper p-3 ring-1 ring-ink/5">
      <div className="text-sm font-bold text-ink">{title}</div>
      <div className="mt-1 text-[11px] text-ink2/70">{desc}</div>
    </div>
  );
}

function DocList({
  title,
  docs
}: {
  title: string;
  docs: {
    no: string;
    date: string;
    sub: string;
    amount: number | null;
    status: string;
    href: string;
  }[];
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
        {title}
      </h2>
      {docs.length === 0 ? (
        <div className="rounded-xl bg-ink/5 p-4 text-sm text-ink2">
          Belum ada dokumen.
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {docs.map((d) => (
            <li key={d.no}>
              <a
                href={d.href}
                className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 ring-1 ring-ink/5 hover:bg-ink/5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black text-ink">
                      {d.no}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-ink2 ring-1 ring-ink/10">
                      {d.status}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-ink2/70">
                    {d.date} · {d.sub}
                  </div>
                </div>
                <div className="text-right">
                  {d.amount !== null && (
                    <div className="font-mono text-xs font-black text-emerald-800">
                      {formatIDR(d.amount)}
                    </div>
                  )}
                  <div className="text-[11px] font-bold text-ink">
                    Print →
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
