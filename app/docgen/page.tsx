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
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

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
  const lang = getLang();

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
          title={t("docgen.title", lang)}
          subtitle={t("docgen.subtitle", lang)}
        />

        <KpiGrid>
          <KpiTile
            icon="📝"
            label={t("docgen.kpiPO", lang)}
            value={pos.length.toString()}
            sub={t("docgen.kpiPOSub", lang)}
          />
          <KpiTile
            icon="📦"
            label={t("docgen.kpiGRN", lang)}
            value={grns.length.toString()}
            sub={t("docgen.kpiGRNSub", lang)}
          />
          <KpiTile
            icon="💰"
            label={t("docgen.kpiInvoice", lang)}
            value={invoices.length.toString()}
            sub={t("docgen.kpiInvoiceSub", lang)}
          />
          <KpiTile
            icon="🧾"
            label={t("docgen.kpiLTA", lang)}
            value={suppliers.length.toString()}
            sub={t("docgen.kpiLTASub", lang)}
          />
        </KpiGrid>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <DocList
            lang={lang}
            title={t("docgen.listPO", lang)}
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
            lang={lang}
            title={t("docgen.listGRN", lang)}
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
            lang={lang}
            title={t("docgen.listInvoice", lang)}
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
  docs,
  lang
}: {
  title: string;
  icon: string;
  lang: Lang;
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
        <EmptyState message={t("docgen.empty", lang)} />
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
                    {t("docgen.print", lang)}
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
