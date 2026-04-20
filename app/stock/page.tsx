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
  KpiGrid,
  KpiTile,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
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

export default async function StockPage() {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const today = toISODate(new Date());

  const [stockRes, itemsRes, movesRes, shortages, batchesRes, expiring] =
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
      expiringBatches(supabase, 14).catch(() => [] as ExpiringBatch[])
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
            <>
              <LinkButton href="/procurement" variant="secondary" size="sm">
                {t("stock.btnProcurement", lang)}
              </LinkButton>
              <LinkButton href="/menu/variance" variant="secondary" size="sm">
                {t("stock.btnVariance", lang)}
              </LinkButton>
              <LinkButton href="/planning" variant="primary" size="sm">
                {t("stock.btnPlanning", lang)}
              </LinkButton>
            </>
          }
        />

        <KpiGrid>
          <KpiTile
            icon="📦"
            label={t("stock.kpiSku", lang)}
            value={items.length.toString()}
            sub={ti("stock.kpiSkuSub", lang, { n: items.length - emptyItems })}
          />
          <KpiTile
            icon="💰"
            label={t("stock.kpiValue", lang)}
            value={formatIDR(totalValue)}
            size="md"
            tone="ok"
            sub={t("stock.kpiValueSub", lang)}
          />
          <KpiTile
            icon="📉"
            label={t("stock.kpiEmpty", lang)}
            value={emptyItems.toString()}
            tone={emptyItems > 0 ? "warn" : "default"}
            sub={ti("stock.kpiEmptySub", lang, {
              pct: ((emptyItems / Math.max(1, items.length)) * 100).toFixed(0)
            })}
          />
          <KpiTile
            icon="⚠️"
            label={t("stock.kpiShort", lang)}
            value={shortCount.toString()}
            tone={shortCount > 0 ? "bad" : "ok"}
            sub={t("stock.kpiShortSub", lang)}
          />
        </KpiGrid>

        <KpiGrid>
          <KpiTile
            icon="⏰"
            label={t("batch.kpiExpiring", lang)}
            value={urgentCount.toString()}
            tone={urgentCount > 0 ? "warn" : "default"}
            sub={t("batch.kpiExpiringSub", lang)}
          />
          <KpiTile
            icon="🚫"
            label={t("batch.kpiExpired", lang)}
            value={expiredCount.toString()}
            tone={expiredCount > 0 ? "bad" : "default"}
            sub={t("batch.kpiExpiredSub", lang)}
          />
          <KpiTile
            icon="📊"
            label={t("batch.kpiBatchTotal", lang)}
            value={batchRows.length.toString()}
            sub={t("batch.kpiBatchTotalSub", lang)}
          />
          <KpiTile
            icon="⚖️"
            label={t("batch.kpiQtyAtRisk", lang)}
            value={qtyAtRisk.toFixed(1)}
            tone={qtyAtRisk > 0 ? "warn" : "default"}
            sub={t("batch.kpiQtyAtRiskSub", lang)}
          />
        </KpiGrid>

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

        <Section
          title={ti("stock.masterTitle", lang, { n: items.length })}
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
            <StockMasterTable lang={lang} rows={masterRows} />
          )}
        </Section>

        <Section title={ti("batch.allTitle", lang, { n: batchRows.length })}>
          {batchRows.length === 0 ? (
            <EmptyState message={t("batch.allEmpty", lang)} />
          ) : (
            <BatchTable lang={lang} rows={batchRows} />
          )}
        </Section>

        <Section title={t("stock.movesTitle", lang)}>
          {moves.length === 0 ? (
            <EmptyState message={t("stock.movesEmpty", lang)} />
          ) : (
            <StockMovesTable lang={lang} rows={moveRows} />
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
