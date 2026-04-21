import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  EmptyState,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { PrAllocationPanel } from "./allocation-panel";
import { PrActions } from "./pr-actions";
import { PrQuotationsTable } from "../../procurement-tables";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const PR_STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  allocated: "bg-amber-100 text-amber-900",
  quotations_issued: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-red-100 text-red-800"
};

type PrRow = {
  pr_no: string;
  line_no: number;
  item_code: string;
  qty_total: number | string;
  unit: string;
  note: string | null;
};

type Allocation = {
  id: number;
  pr_no: string;
  line_no: number;
  supplier_id: string;
  qty_planned: number | string;
  quotation_no: string | null;
  note: string | null;
};

type Summary = {
  line_no: number;
  item_code: string;
  unit: string;
  qty_total: number | string;
  qty_planned_sum: number | string;
  qty_quoted_sum: number | string;
  qty_po_sum: number | string;
  gap: number | string;
};

export default async function PrDetailPage({
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

  const [prRes, rowsRes, allocRes, summaryRes, itemsRes, supRes, qtsRes] =
    await Promise.all([
      supabase
        .from("purchase_requisitions")
        .select("*")
        .eq("no", decoded)
        .maybeSingle(),
      supabase
        .from("pr_rows")
        .select("*")
        .eq("pr_no", decoded)
        .order("line_no"),
      supabase
        .from("pr_allocations")
        .select("*")
        .eq("pr_no", decoded)
        .order("line_no"),
      supabase.rpc("pr_allocation_summary", { p_pr_no: decoded }),
      supabase.from("items").select("code, name_en, unit, category"),
      supabase
        .from("suppliers")
        .select("id, name, status")
        .eq("active", true)
        .in("status", ["signed", "awaiting"])
        .order("name"),
      supabase
        .from("quotations")
        .select(
          "no, supplier_id, status, total, need_date, converted_po_no"
        )
        .eq("pr_no", decoded)
    ]);

  if (prRes.error || !prRes.data) notFound();

  const pr = prRes.data as {
    no: string;
    need_date: string;
    status: string;
    notes: string | null;
    created_at: string;
  };
  const rows = (rowsRes.data ?? []) as PrRow[];
  const allocations = (allocRes.data ?? []) as Allocation[];
  const summary = (summaryRes.data ?? []) as Summary[];
  const items = (itemsRes.data ?? []) as Array<{
    code: string;
    name_en: string | null;
    unit: string;
    category: string;
  }>;
  const suppliers = (supRes.data ?? []) as Array<{
    id: string;
    name: string;
    status: string;
  }>;
  const quotations = (qtsRes.data ?? []) as Array<{
    no: string;
    supplier_id: string;
    status: string;
    total: number | string;
    need_date: string | null;
    converted_po_no: string | null;
  }>;

  const canWrite = profile.role === "admin" || profile.role === "operator";
  const itemByCode = new Map(items.map((i) => [i.code, i]));
  const supplierNameMap: Record<string, string> = Object.fromEntries(
    suppliers.map((s) => [s.id, s.name])
  );

  // Count allocations that still need generation
  const pendingAllocCount = allocations.filter((a) => !a.quotation_no).length;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          title={ti("prDetail.title", lang, { no: pr.no })}
          subtitle={
            <span className="inline-flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PR_STATUS_COLOR[pr.status] ?? PR_STATUS_COLOR.draft}`}
              >
                {pr.status}
              </span>
              <span>{ti("prDetail.subNeed", lang, { date: pr.need_date })}</span>
              <span>{ti("prDetail.subItems", lang, { n: rows.length })}</span>
              <span>{ti("prDetail.subAlloc", lang, { n: allocations.length })}</span>
            </span>
          }
          actions={
            <LinkButton href="/procurement" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        {pr.notes && (
          <Section icon="📝" title={t("prDetail.notesTitle", lang)} hint={t("prDetail.notesHint", lang)}>
            <p className="text-sm italic text-ink2">{pr.notes}</p>
          </Section>
        )}

        <Section
          title={ti("prDetail.splitTitle", lang, { n: rows.length })}
          hint={t("prDetail.splitHint", lang)}
        >
          {rows.length === 0 ? (
            <EmptyState message={t("prDetail.splitEmpty", lang)} />
          ) : (
            <PrAllocationPanel
              prNo={pr.no}
              prStatus={pr.status}
              rows={rows}
              allocations={allocations}
              summary={summary}
              itemByCode={Object.fromEntries(
                Array.from(itemByCode.entries()).map(([k, v]) => [
                  k,
                  { name: v.code, unit: v.unit }
                ])
              )}
              suppliers={suppliers}
              canWrite={canWrite}
            />
          )}
        </Section>

        <Section
          title={ti("prDetail.qtTitle", lang, { n: quotations.length })}
          hint={t("prDetail.qtHint", lang)}
          actions={
            canWrite && pendingAllocCount > 0 ? (
              <PrActions prNo={pr.no} pendingCount={pendingAllocCount} />
            ) : null
          }
        >
          {quotations.length === 0 ? (
            <EmptyState
              icon="📄"
              message={
                canWrite
                  ? t("prDetail.qtEmptyWrite", lang)
                  : t("prDetail.qtEmpty", lang)
              }
            />
          ) : (
            <PrQuotationsTable
              rows={quotations.map((q) => ({
                no: q.no,
                supplier_id: q.supplier_id,
                status: q.status,
                total: Number(q.total),
                need_date: q.need_date,
                converted_po_no: q.converted_po_no
              }))}
              supplierNames={supplierNameMap}
            />
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
