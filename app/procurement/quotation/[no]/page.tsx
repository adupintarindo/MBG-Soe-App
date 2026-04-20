import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";
import {
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { QuotationActions } from "./quotation-actions";
import { QuotationRowsTable } from "../../procurement-tables";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const QT_STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-blue-100 text-blue-800",
  responded: "bg-amber-100 text-amber-900",
  accepted: "bg-emerald-100 text-emerald-900",
  converted: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-slate-100 text-slate-500"
};

export default async function QuotationDetailPage({
  params
}: {
  params: Promise<{ no: string }> | { no: string };
}) {
  const { no } = await Promise.resolve(params);
  const decoded = decodeURIComponent(no);
  const lang = getLang();
  const supabase = createClient();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const [qtRes, rowsRes, itemsRes, supRes] = await Promise.all([
    supabase.from("quotations").select("*").eq("no", decoded).maybeSingle(),
    supabase
      .from("quotation_rows")
      .select("*")
      .eq("qt_no", decoded)
      .order("line_no"),
    supabase.from("items").select("code, name_en, unit"),
    supabase.from("suppliers").select("id, name, pic, phone, email, address")
  ]);

  if (qtRes.error || !qtRes.data) notFound();

  const qt = qtRes.data as {
    no: string;
    supplier_id: string;
    quote_date: string;
    valid_until: string | null;
    need_date: string | null;
    status: string;
    total: number | string;
    notes: string | null;
    converted_po_no: string | null;
  };
  const rows = (rowsRes.data ?? []) as Array<{
    qt_no: string;
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
    unit: string;
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

  const canWrite = profile.role === "admin" || profile.role === "operator";
  const canSupplierRespond =
    profile.role === "supplier" &&
    profile.supplier_id === qt.supplier_id &&
    (qt.status === "sent" || qt.status === "responded");

  const qtRows = rows.map((r) => {
    const it = itemByCode.get(r.item_code);
    return {
      line_no: r.line_no,
      item_code: r.item_code,
      item_name: it?.name_en ?? r.item_code,
      qty: Number(r.qty),
      unit: r.unit,
      price_suggested:
        r.price_suggested != null ? Number(r.price_suggested) : null,
      qty_quoted: r.qty_quoted != null ? Number(r.qty_quoted) : null,
      price_quoted: r.price_quoted != null ? Number(r.price_quoted) : null,
      subtotal: Number(r.subtotal),
      note: r.note
    };
  });

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
          title={ti("qtDetail.title", lang, { no: qt.no })}
          subtitle={
            <span className="inline-flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${QT_STATUS_COLOR[qt.status] ?? QT_STATUS_COLOR.draft}`}
              >
                {qt.status}
              </span>
              <span>· {qt.quote_date}</span>
              {qt.need_date && (
                <span>{ti("qtDetail.subNeed", lang, { date: qt.need_date })}</span>
              )}
              {qt.converted_po_no && (
                <span className="font-mono">→ {qt.converted_po_no}</span>
              )}
            </span>
          }
          actions={
            <LinkButton href="/procurement" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        <Section title={t("qtDetail.infoTitle", lang)} hint={t("qtDetail.infoHint", lang)}>
          <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-bold text-ink2/70">{t("qtDetail.lblSupplier", lang)}</dt>
              <dd className="font-black text-ink">
                {supplier?.name ?? qt.supplier_id}
              </dd>
              <dd className="text-ink2">{supplier?.pic ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-bold text-ink2/70">{t("qtDetail.lblContact", lang)}</dt>
              <dd className="font-mono text-ink2">
                {supplier?.phone ?? "—"}
              </dd>
              <dd className="font-mono text-ink2">
                {supplier?.email ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-ink2/70">{t("qtDetail.lblDates", lang)}</dt>
              <dd>{ti("qtDetail.dateQuote", lang, { date: qt.quote_date })}</dd>
              <dd>{ti("qtDetail.dateValid", lang, { date: qt.valid_until ?? "—" })}</dd>
              <dd>{ti("qtDetail.dateNeed", lang, { date: qt.need_date ?? "—" })}</dd>
            </div>
            <div>
              <dt className="font-bold text-ink2/70">{t("qtDetail.lblTotal", lang)}</dt>
              <dd className="font-mono text-base font-black text-ink">
                {formatIDR(Number(qt.total))}
              </dd>
              {qt.notes && (
                <dd className="mt-1 text-[11px] italic text-ink2/70">
                  {qt.notes}
                </dd>
              )}
            </div>
          </dl>
        </Section>

        <Section
          title={ti("qtDetail.itemsTitle", lang, { n: rows.length })}
          hint={t("qtDetail.itemsHint", lang)}
        >
          {rows.length === 0 ? (
            <div className="text-sm text-ink2/70">{t("qtDetail.itemsEmpty", lang)}</div>
          ) : (
            <QuotationRowsTable
              rows={qtRows}
              totalLabel={t("qtDetail.total", lang)}
              total={Number(qt.total)}
            />
          )}
        </Section>

        <Section title={t("qtDetail.actionsTitle", lang)} hint={t("qtDetail.actionsHint", lang)}>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/api/quotations/${encodeURIComponent(qt.no)}/export.xlsx`}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-card hover:bg-emerald-700"
            >
              {t("qtDetail.btnXlsx", lang)}
            </a>
            <Link
              href={`/docgen/qt/${encodeURIComponent(qt.no)}`}
              target="_blank"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-ink ring-1 ring-ink/20 hover:bg-paper"
            >
              {t("qtDetail.btnPrint", lang)}
            </Link>
            <QuotationActions
              qtNo={qt.no}
              status={qt.status}
              canWrite={canWrite}
              canSupplierRespond={canSupplierRespond}
              convertedPoNo={qt.converted_po_no}
            />
          </div>
        </Section>
      </PageContainer>
    </div>
  );
}
