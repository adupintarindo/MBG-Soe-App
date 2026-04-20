import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  formatIDR,
  outstandingBySupplier,
  monthlyCashflow,
  type OutstandingBySupplier,
  type CashflowRow
} from "@/lib/engine";
import {
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import {
  CashflowTable,
  OutstandingTable,
  PaymentsTable,
  ReceiptsTable
} from "./payments-tables";

export const dynamic = "force-dynamic";

type PayTabId = "outstanding" | "cashflow" | "payments" | "receipts";
const VALID_TABS: readonly PayTabId[] = [
  "outstanding",
  "cashflow",
  "payments",
  "receipts"
];

interface SearchParams {
  tab?: string;
}

interface PaymentRow {
  no: string;
  invoice_no: string | null;
  supplier_id: string | null;
  pay_date: string;
  amount: number | string;
  method: string;
  reference: string | null;
  note: string | null;
}
interface ReceiptRow {
  no: string;
  receipt_date: string;
  source: string;
  source_name: string | null;
  amount: number | string;
  period: string | null;
  reference: string | null;
  note: string | null;
}

export default async function PaymentsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const activeTab: PayTabId = VALID_TABS.includes(
    searchParams.tab as PayTabId
  )
    ? (searchParams.tab as PayTabId)
    : "outstanding";

  const tabs: PageTab[] = [
    {
      id: "outstanding",
      icon: "⚠️",
      label: lang === "EN" ? "Outstanding" : "Outstanding",
      href: "/payments?tab=outstanding"
    },
    {
      id: "cashflow",
      icon: "💹",
      label: lang === "EN" ? "Cashflow" : "Arus Kas",
      href: "/payments?tab=cashflow"
    },
    {
      id: "payments",
      icon: "📤",
      label: lang === "EN" ? "Payments" : "Pembayaran",
      href: "/payments?tab=payments"
    },
    {
      id: "receipts",
      icon: "📥",
      label: lang === "EN" ? "Receipts" : "Penerimaan",
      href: "/payments?tab=receipts"
    }
  ];

  const canWrite = profile.role === "admin" || profile.role === "operator";

  const [outRes, cashRes, paymentsRes, receiptsRes] = await Promise.all([
    outstandingBySupplier(supabase).catch(() => [] as OutstandingBySupplier[]),
    monthlyCashflow(supabase).catch(() => [] as CashflowRow[]),
    supabase
      .from("payments")
      .select(
        "no, invoice_no, supplier_id, pay_date, amount, method, reference, note"
      )
      .order("pay_date", { ascending: false })
      .order("no", { ascending: false })
      .limit(50),
    supabase
      .from("cash_receipts")
      .select(
        "no, receipt_date, source, source_name, amount, period, reference, note"
      )
      .order("receipt_date", { ascending: false })
      .order("no", { ascending: false })
      .limit(30)
  ]);

  const outstanding = outRes;
  const cashflow = cashRes;
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const receipts = (receiptsRes.data ?? []) as ReceiptRow[];

  const outstandingTotal = outstanding.reduce(
    (s, o) => s + Number(o.outstanding),
    0
  );

  const last30 = cashflow.slice(-1)[0];
  const prevRow = cashflow.slice(-2)[0];
  const cashIn30 = Number(last30?.cash_in ?? 0);
  const cashOut30 = Number(last30?.cash_out ?? 0);
  const net30 = Number(last30?.net ?? 0);
  void prevRow;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          actions={
            canWrite ? (
              <>
                <LinkButton
                  href="/payments/receipt/new"
                  variant="gold"
                  size="sm"
                >
                  {t("pay.btnNewReceipt", lang)}
                </LinkButton>
                <LinkButton href="/payments/new" variant="primary" size="sm">
                  {t("pay.btnNewPayment", lang)}
                </LinkButton>
              </>
            ) : (
              <LinkButton href="/procurement" variant="secondary" size="sm">
                {t("common.back", lang)}
              </LinkButton>
            )
          }
        />

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "outstanding" && (
          <>
            <KpiGrid>
              <KpiTile
                icon="⚠️"
                label={t("pay.kpiOutstanding", lang)}
                value={formatIDR(outstandingTotal)}
                size="md"
                tone={outstandingTotal > 0 ? "warn" : "ok"}
                sub={ti("pay.kpiOutstandingSub", lang, {})}
              />
            </KpiGrid>
            <Section
              title={t("pay.outstandingTitle", lang)}
              hint={t("pay.outstandingHint", lang)}
              accent={outstanding.length > 0 ? "warn" : "default"}
            >
              {outstanding.length === 0 ? (
                <EmptyState tone="ok" icon="✅" message={t("pay.outstandingEmpty", lang)} />
              ) : (
                <OutstandingTable lang={lang} rows={outstanding} />
              )}
            </Section>
          </>
        )}

        {activeTab === "cashflow" && (
          <>
            <KpiGrid>
              <KpiTile
                icon="📥"
                label={t("pay.kpiCashIn", lang)}
                value={formatIDR(cashIn30)}
                size="md"
                tone="ok"
                sub={t("pay.kpiCashInSub", lang)}
              />
              <KpiTile
                icon="📤"
                label={t("pay.kpiCashOut", lang)}
                value={formatIDR(cashOut30)}
                size="md"
                tone="bad"
                sub={t("pay.kpiCashOutSub", lang)}
              />
              <KpiTile
                icon="💹"
                label={t("pay.kpiNet", lang)}
                value={formatIDR(net30)}
                size="md"
                tone={net30 >= 0 ? "ok" : "bad"}
                sub={t("pay.kpiNetSub", lang)}
              />
            </KpiGrid>
            <Section title={t("pay.cashflowTitle", lang)} hint={t("pay.cashflowHint", lang)}>
              {cashflow.length === 0 ? (
                <EmptyState message={t("common.noData", lang)} />
              ) : (
                <CashflowTable lang={lang} rows={cashflow} />
              )}
            </Section>
          </>
        )}

        {activeTab === "payments" && (
          <Section title={t("pay.recentTitle", lang)} hint={t("pay.recentHint", lang)}>
            {payments.length === 0 ? (
              <EmptyState message={t("pay.recentEmpty", lang)} />
            ) : (
              <PaymentsTable
                lang={lang}
                rows={payments.map((p) => ({
                  no: p.no,
                  invoice_no: p.invoice_no,
                  supplier_id: p.supplier_id,
                  pay_date: p.pay_date,
                  amount: Number(p.amount),
                  method: p.method,
                  reference: p.reference,
                  note: p.note
                }))}
              />
            )}
          </Section>
        )}

        {activeTab === "receipts" && (
          <Section title={t("pay.receiptsTitle", lang)} hint={t("pay.receiptsHint", lang)}>
            {receipts.length === 0 ? (
              <EmptyState message={t("pay.receiptsEmpty", lang)} />
            ) : (
              <ReceiptsTable
                lang={lang}
                rows={receipts.map((r) => ({
                  no: r.no,
                  receipt_date: r.receipt_date,
                  source: r.source,
                  source_name: r.source_name,
                  amount: Number(r.amount),
                  period: r.period,
                  reference: r.reference,
                  note: r.note
                }))}
              />
            )}
          </Section>
        )}
      </PageContainer>
    </div>
  );
}
