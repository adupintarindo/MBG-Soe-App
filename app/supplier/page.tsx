import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  supplierPoInbox,
  supplierPaymentStatus,
  type SupplierPoInboxRow,
  type SupplierPaymentStatusRow
} from "@/lib/engine";
import {
  EmptyState,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import {
  SupplierInboxTable,
  SupplierPaymentTable,
  SupplierUploadsTable,
  type InvoiceUploadRow
} from "./supplier-tables";

export const dynamic = "force-dynamic";

type SupTabId = "inbox" | "payment" | "uploads";
const VALID_TABS: readonly SupTabId[] = ["inbox", "payment", "uploads"];

interface SearchParams {
  tab?: string;
}

export default async function SupplierPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const canView =
    profile.role === "supplier" ||
    profile.role === "admin" ||
    profile.role === "operator" ||
    profile.role === "viewer";
  if (!canView) redirect("/dashboard");

  if (profile.role === "supplier" && !profile.supplier_id) {
    return (
      <div>
        <Nav
          email={profile.email}
          role={profile.role}
          fullName={profile.full_name}
        />
        <PageContainer>
          <PageHeader
            title={t("fcst.profileIncomplete", lang)}
            subtitle={t("fcst.profileHelp", lang)}
          />
        </PageContainer>
      </div>
    );
  }

  const supabase = createClient();

  const [inboxRes, paymentsRes, uploadsRes] = await Promise.all([
    supplierPoInbox(supabase, 50).catch(() => [] as SupplierPoInboxRow[]),
    supplierPaymentStatus(supabase).catch(
      () => [] as SupplierPaymentStatusRow[]
    ),
    supabase
      .from("invoice_uploads")
      .select(
        "id, po_no, grn_no, invoice_no_supplier, total, file_url, status, approved_invoice_no, rejected_reason, uploaded_at"
      )
      .order("uploaded_at", { ascending: false })
      .limit(30)
  ]);

  const inbox = inboxRes;
  const payments = paymentsRes;
  const uploads = ((uploadsRes.data ?? []) as Array<{
    id: number;
    po_no: string | null;
    grn_no: string | null;
    invoice_no_supplier: string | null;
    total: number | string;
    file_url: string;
    status: "pending" | "approved" | "rejected";
    approved_invoice_no: string | null;
    rejected_reason: string | null;
    uploaded_at: string;
  }>).map<InvoiceUploadRow>((u) => ({
    id: u.id,
    po_no: u.po_no,
    grn_no: u.grn_no,
    invoice_no_supplier: u.invoice_no_supplier,
    total: Number(u.total),
    file_url: u.file_url,
    status: u.status,
    approved_invoice_no: u.approved_invoice_no,
    rejected_reason: u.rejected_reason,
    uploaded_at: u.uploaded_at
  }));

  const isSupplier = profile.role === "supplier";

  const activeTab: SupTabId = VALID_TABS.includes(
    searchParams.tab as SupTabId
  )
    ? (searchParams.tab as SupTabId)
    : "inbox";

  const tabs: PageTab[] = [
    {
      id: "inbox",
      icon: "📬",
      label: lang === "EN" ? "PO Inbox" : "Inbox PO",
      href: "/supplier?tab=inbox"
    },
    {
      id: "payment",
      icon: "💰",
      label: lang === "EN" ? "Payment Status" : "Status Pembayaran",
      href: "/supplier?tab=payment"
    },
    {
      id: "uploads",
      icon: "📄",
      label: lang === "EN" ? "Invoice Uploads" : "Upload Invoice",
      href: "/supplier?tab=uploads"
    }
  ];

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          title={isSupplier ? "Portal Supplier" : "Monitoring Supplier"}
          subtitle={
            isSupplier
              ? t("sup.inboxTitle", lang)
              : lang === "EN"
                ? "Supplier-side view across all POs"
                : "Lihat sisi supplier untuk semua PO"
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {isSupplier && (
                <LinkButton
                  href="/supplier/invoice-upload"
                  variant="primary"
                  size="sm"
                >
                  {t("sup.uploadTitle", lang)}
                </LinkButton>
              )}
              <LinkButton
                href="/supplier/forecast"
                variant="secondary"
                size="sm"
              >
                {t("tabForecast", lang)}
              </LinkButton>
            </div>
          }
        />

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "inbox" && (
          <>
            <Section title={t("sup.inboxTitle", lang)} hint={t("sup.inboxHint", lang)}>
              {inbox.length === 0 ? (
                <EmptyState message={t("common.noData", lang)} />
              ) : (
                <SupplierInboxTable lang={lang} rows={inbox} />
              )}
            </Section>
          </>
        )}

        {activeTab === "payment" && (
          <>
            <Section title={t("sup.paymentStatusTitle", lang)} hint={t("sup.paymentStatusHint", lang)}>
              {payments.length === 0 ? (
                <EmptyState message={t("common.noData", lang)} />
              ) : (
                <SupplierPaymentTable lang={lang} rows={payments} />
              )}
            </Section>
          </>
        )}

        {activeTab === "uploads" && (
          <>
            <Section title={t("sup.uploadTitle", lang)} hint={t("sup.uploadHint", lang)}>
              {uploads.length === 0 ? (
                <EmptyState
                  icon="📭"
                  message={
                    isSupplier
                      ? lang === "EN"
                        ? "No invoice scans uploaded yet."
                        : "Belum ada scan invoice diupload."
                      : t("common.noData", lang)
                  }
                />
              ) : (
                <SupplierUploadsTable lang={lang} rows={uploads} />
              )}
            </Section>
          </>
        )}
      </PageContainer>
    </div>
  );
}
