import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  formatIDR,
  stockShortageForDate,
  toISODate,
  expiringBatches,
  type Shortage,
  type ExpiringBatch
} from "@/lib/engine";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import {
  StockShortTable,
  StockMasterTable,
  StockMovesTable,
  type ShortRow,
  type StockMasterRow,
  type MoveRow as StockMoveRow
} from "@/components/stock-tables";
import {
  ExpiringBatchTable,
  BatchTable,
  type ExpiringBatchRow,
  type BatchRow
} from "@/components/batch-tables";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type StockTabId = "position" | "expiry" | "ledger" | "moves";
const VALID_TABS: readonly StockTabId[] = ["position", "expiry", "ledger", "moves"];

interface SearchParams {
  tab?: string;
}

interface StockRow {
  item_code: string;
  qty: number | string;
  updated_at: string;
}
interface ItemRow {
  code: string;
  name_en: string | null;
  unit: string;
  category: string;
  price_idr: number | string;
  vol_weekly: number | string;
}
interface MoveRow {
  id: number;
  item_code: string;
  delta: number | string;
  reason: string;
  ref_doc: string | null;
  ref_no: string | null;
  note: string | null;
  created_at: string;
}

export default async function StockPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const activeTab: StockTabId = VALID_TABS.includes(
    searchParams.tab as StockTabId
  )
    ? (searchParams.tab as StockTabId)
    : "position";

  const tabs: PageTab[] = [
    {
      id: "position",
      icon: "📦",
      label: lang === "EN" ? "Stock Position" : "Posisi Stok",
      href: "/stock?tab=position"
    },
    {
      id: "expiry",
      icon: "⏰",
      label: lang === "EN" ? "Batch Expiry" : "Batch Expiry",
      href: "/stock?tab=expiry"
    },
    {
      id: "ledger",
      icon: "📚",
      label: lang === "EN" ? "Batch Ledger" : "Batch Ledger",
      href: "/stock?tab=ledger"
    },
    {
      id: "moves",
      icon: "🔄",
      label: lang === "EN" ? "Movements" : "Mutasi",
      href: "/stock?tab=moves"
    }
  ];

  const today = toISODate(new Date());

  const [stockRes, itemsRes, movesRes, shortages, batchesRes, expiring, suppliersRes] =
    await Promise.all([
      supabase.from("stock").select("item_code, qty, updated_at"),
      supabase
        .from("items")
        .select("code, name_en, unit, category, price_idr, vol_weekly")
        .order("category")
        .order("code"),
      supabase
        .from("stock_moves")
        .select("id, item_code, delta, reason, ref_doc, ref_no, note, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(50),
      stockShortageForDate(supabase, today).catch(() => [] as Shortage[]),
      supabase
        .from("stock_batches")
        .select(
          "id, item_code, batch_code, grn_no, supplier_id, qty_received, qty_remaining, unit, received_date, expiry_date"
        )
        .gt("qty_remaining", 0)
        .order("expiry_date", { ascending: true, nullsFirst: false })
        .limit(300),
      expiringBatches(supabase, 14).catch(() => [] as ExpiringBatch[]),
      supabase.from("suppliers").select("id, name")
    ]);

  const stock = (stockRes.data ?? []) as StockRow[];
  const items = (itemsRes.data ?? []) as ItemRow[];
  const moves = (movesRes.data ?? []) as MoveRow[];
  const batches = (batchesRes.data ?? []) as BatchRow[];
  const expiringRows: ExpiringBatchRow[] = expiring.map((b) => ({
    id: b.id,
    item_code: b.item_code,
    item_name: b.item_name,
    grn_no: b.grn_no,
    supplier_id: b.supplier_id,
    supplier_name: b.supplier_name,
    qty_remaining: Number(b.qty_remaining),
    unit: b.unit,
    expiry_date: b.expiry_date,
    days_left: Number(b.days_left),
    status: b.status
  }));
  const batchRows: BatchRow[] = batches.map((b) => ({
    id: b.id,
    item_code: b.item_code,
    batch_code: b.batch_code,
    grn_no: b.grn_no,
    supplier_id: b.supplier_id,
    qty_received: Number(b.qty_received),
    qty_remaining: Number(b.qty_remaining),
    unit: b.unit,
    received_date: b.received_date,
    expiry_date: b.expiry_date
  }));
  const expiredCount = expiringRows.filter((r) => r.status === "expired").length;
  const urgentCount = expiringRows.filter(
    (r) => r.status === "urgent" || r.status === "soon"
  ).length;
  const qtyAtRisk = expiringRows.reduce(
    (s, r) => s + (r.status !== "expired" ? r.qty_remaining : 0),
    0
  );

  const stockByCode = new Map(stock.map((s) => [s.item_code, s]));
  const shortByCode = new Map(shortages.map((s) => [s.item_code, s]));

  const totalValue = items.reduce((s, it) => {
    const qty = Number(stockByCode.get(it.code)?.qty ?? 0);
    return s + qty * Number(it.price_idr);
  }, 0);
  const emptyItems = items.filter(
    (it) => Number(stockByCode.get(it.code)?.qty ?? 0) <= 0
  ).length;
  const shortList = shortages.filter((s) => Number(s.gap) > 0);
  const shortCount = shortList.length;

  const shortRows: ShortRow[] = shortList.map((s) => ({
    item_code: s.item_code,
    required: Number(s.required),
    on_hand: Number(s.on_hand),
    gap: Number(s.gap),
    unit: s.unit
  }));

  const masterRows: StockMasterRow[] = items.map((it) => {
    const qty = Number(stockByCode.get(it.code)?.qty ?? 0);
    const weekly = Number(it.vol_weekly ?? 0);
    const short = shortByCode.get(it.code);
    return {
      code: it.code,
      category: it.category,
      qty,
      unit: it.unit,
      price_idr: Number(it.price_idr),
      value: qty * Number(it.price_idr),
      weekly,
      weeksCover: weekly > 0 ? qty / weekly : 999,
      shortGap: short ? Number(short.gap) : null
    };
  });

  const moveRows: StockMoveRow[] = moves.map((m) => ({
    id: m.id,
    item_code: m.item_code,
    delta: Number(m.delta),
    reason: m.reason,
    ref_doc: m.ref_doc,
    ref_no: m.ref_no,
    note: m.note,
    created_at: m.created_at
  }));

  // Build lookups for the StockMasterTable value-breakdown modal.
  const batchesByItem: Record<string, typeof batchRows> = {};
  for (const b of batchRows) {
    const arr = batchesByItem[b.item_code] ?? [];
    arr.push(b);
    batchesByItem[b.item_code] = arr;
  }
  const supplierNames: Record<string, string> = {};
  for (const s of (suppliersRes.data ?? []) as Array<{ id: string; name: string }>) {
    supplierNames[s.id] = s.name;
  }

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader />

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "position" && (
          <>
            {shortCount > 0 && (
              <Section
                title={ti("stock.shortTitle", lang, { n: shortCount })}
                hint={t("stock.shortHint", lang)}
                accent="bad"
              >
                <StockShortTable lang={lang} rows={shortRows} />
              </Section>
            )}

            <Section
              title={ti("stock.masterTitle", lang, { n: items.length })}
              hint={t("stock.masterHint", lang)}
              actions={
                <span className="text-[11px] font-semibold text-ink2/70">
                  {t("stock.catTotalValue", lang)}{" "}
                  <b className="text-ink">{formatIDR(totalValue)}</b>
                </span>
              }
            >
              {items.length === 0 ? (
                <EmptyState message={t("stock.movesEmpty", lang)} />
              ) : (
                <StockMasterTable
                  lang={lang}
                  rows={masterRows}
                  batchesByItem={batchesByItem}
                  supplierNames={supplierNames}
                />
              )}
            </Section>
          </>
        )}

        {activeTab === "expiry" && (
          <>
            <Section
              title={ti("batch.expiringTitle", lang, { days: 14 })}
              hint={t("batch.expiringHint", lang)}
              accent={expiredCount > 0 ? "bad" : urgentCount > 0 ? "warn" : "default"}
            >
              {expiringRows.length === 0 ? (
                <EmptyState
                  tone="ok"
                  icon="✅"
                  message={t("batch.expiringEmpty", lang)}
                />
              ) : (
                <ExpiringBatchTable lang={lang} rows={expiringRows} />
              )}
            </Section>
          </>
        )}

        {activeTab === "ledger" && (
          <>
            <Section banner icon="🗃️" title={ti("batch.allTitle", lang, { n: batchRows.length })} hint={t("batch.allHint", lang)}>
              {batchRows.length === 0 ? (
                <EmptyState message={t("batch.allEmpty", lang)} />
              ) : (
                <BatchTable lang={lang} rows={batchRows} />
              )}
            </Section>
          </>
        )}

        {activeTab === "moves" && (
          <Section banner icon="🔄" title={t("stock.movesTitle", lang)} hint={t("stock.movesHint", lang)}>
            {moves.length === 0 ? (
              <EmptyState message={t("stock.movesEmpty", lang)} />
            ) : (
              <StockMovesTable lang={lang} rows={moveRows} />
            )}
          </Section>
        )}
      </PageContainer>
    </div>
  );
}
