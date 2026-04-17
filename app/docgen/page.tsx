import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";
import {
  Badge,
  EmptyState,
  KpiGrid,
  KpiTile,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";

export const dynamic = "force-dynamic";

interface PoLite {
  no: string;
  po_date: string;
  supplier_id: string;
  total: number | string;
  status: string;
}
interface GrnLite {
  no: string;
  po_no: string | null;
  grn_date: string;
  status: string;
}
interface InvLite {
  no: string;
  po_no: string | null;
  inv_date: string;
  supplier_id: string;
  total: number | string;
  status: string;
}
interface SupplierLite {
  id: string;
  name: string;
}

export default async function DocGenPage() {
  const supabase = createClient();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

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

  const pos = (posRes.data ?? []) as PoLite[];
  const grns = (grnsRes.data ?? []) as GrnLite[];
  const invoices = (invRes.data ?? []) as InvLite[];
  const suppliers = (suppliersRes.data ?? []) as SupplierLite[];
  const supMap = new Map(suppliers.map((s) => [s.id, s.name]));

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📄"
          title="Document Generator"
          subtitle="Preview & print dokumen resmi SPPG · PO · GRN · Invoice · Berita Acara"
        />

        <KpiGrid>
          <KpiTile
            icon="📝"
            label="Purchase Order"
            value={pos.length.toString()}
            sub="Order ke supplier"
          />
          <KpiTile
            icon="📦"
            label="GRN"
            value={grns.length.toString()}
            sub="Berita Acara Terima"
          />
          <KpiTile
            icon="💰"
            label="Invoice"
            value={invoices.length.toString()}
            sub="Tagihan supplier"
          />
          <KpiTile
            icon="🧾"
            label="Kontrak LTA"
            value={suppliers.length.toString()}
            sub="Long-Term Agreement"
          />
        </KpiGrid>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <DocList
            title="Purchase Orders"
            icon="📝"
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
            icon="📦"
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
            icon="💰"
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
      </PageContainer>
    </div>
  );
}

function DocList({
  title,
  icon,
  docs
}: {
  title: string;
  icon: string;
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
    <Section title={`${icon} ${title}`} className="mb-0">
      {docs.length === 0 ? (
        <EmptyState message="Belum ada dokumen." />
      ) : (
        <ul className="space-y-2 text-sm">
          {docs.map((d) => (
            <li key={d.no}>
              <a
                href={d.href}
                className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-card"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black text-ink">
                      {d.no}
                    </span>
                    <Badge tone="neutral">{d.status}</Badge>
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
                  <div className="text-[11px] font-bold text-accent-strong">
                    Print →
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
