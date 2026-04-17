import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  formatIDR,
  stockShortageForDate,
  toISODate,
  type Shortage
} from "@/lib/engine";
import {
  Badge,
  CategoryBadge,
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";
import { t, ti, formatNumber, type Lang, type LangKey } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const REASON_KEY: Record<string, LangKey> = {
  receipt: "stock.reasonReceipt",
  consumption: "stock.reasonConsumption",
  adjustment: "stock.reasonAdjustment",
  waste: "stock.reasonWaste",
  transfer_in: "stock.reasonTransferIn",
  transfer_out: "stock.reasonTransferOut",
  opening: "stock.reasonOpening"
};

function reasonLabel(reason: string, lang: Lang): string {
  const key = REASON_KEY[reason];
  return key ? t(key, lang) : reason;
}

const REASON_COLOR: Record<string, string> = {
  receipt: "bg-emerald-50 text-emerald-900",
  consumption: "bg-rose-50 text-rose-900",
  adjustment: "bg-amber-50 text-amber-900",
  waste: "bg-red-50 text-red-900",
  transfer_in: "bg-blue-50 text-blue-900",
  transfer_out: "bg-indigo-50 text-indigo-900",
  opening: "bg-slate-50 text-slate-900"
};

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

  const [stockRes, itemsRes, movesRes, shortages] = await Promise.all([
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
    stockShortageForDate(supabase, today).catch(() => [] as Shortage[])
  ]);

  const stock = (stockRes.data ?? []) as StockRow[];
  const items = (itemsRes.data ?? []) as ItemRow[];
  const moves = (movesRes.data ?? []) as MoveRow[];

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

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📦"
          title={t("stock.title", lang)}
          subtitle={ti("stock.subtitle", lang, {
            sku: items.length,
            inStock: items.length - emptyItems,
            empty: emptyItems
          })}
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

        {shortCount > 0 && (
          <Section
            title={ti("stock.shortTitle", lang, { n: shortCount })}
            hint={t("stock.shortHint", lang)}
            accent="bad"
          >
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3 text-center">{t("common.item", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.required", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.onHand", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.gap", lang)}</th>
                </THead>
                <tbody>
                  {shortList.map((s) => (
                    <tr
                      key={s.item_code}
                      className="row-hover border-b border-ink/5"
                    >
                      <td className="py-2 pr-3 text-left font-semibold">
                        {s.item_code}
                      </td>
                      <td className="py-2 pr-3 text-center font-mono text-xs">
                        {Number(s.required).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-center font-mono text-xs">
                        {Number(s.on_hand).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-center font-mono text-xs font-black text-red-700">
                        {Number(s.gap).toFixed(2)} {s.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Section>
        )}

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
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="w-12 py-2 pr-3 text-center">{t("dashboard.tblNo", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.item", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.category", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.qty", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.unit", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("stock.colHarga", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("stock.colNilai", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("stock.colVolWeekly", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.status", lang)}</th>
                </THead>
                <tbody>
                  {items.map((it, i) => {
                    const qty = Number(stockByCode.get(it.code)?.qty ?? 0);
                    const value = qty * Number(it.price_idr);
                    const short = shortByCode.get(it.code);
                    const weekly = Number(it.vol_weekly ?? 0);
                    const weeksCover = weekly > 0 ? qty / weekly : 999;
                    return (
                      <tr
                        key={it.code}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pr-3 text-center text-ink2">{i + 1}</td>
                        <td className="py-2 pr-3 text-left font-semibold">
                          {it.code}
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <div className="flex justify-center">
                            <CategoryBadge category={it.category} />
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-center font-mono text-xs font-black">
                          {formatNumber(qty, lang, {
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td className="py-2 pr-3 text-center text-xs">
                          {it.unit}
                        </td>
                        <td className="py-2 pr-3 text-center font-mono text-xs">
                          {formatIDR(Number(it.price_idr))}
                        </td>
                        <td className="py-2 pr-3 text-center font-mono text-xs">
                          {formatIDR(value)}
                        </td>
                        <td className="py-2 pr-3 text-center font-mono text-xs text-ink2/70">
                          {weekly > 0 ? weekly.toFixed(1) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-center">
                          {short && Number(short.gap) > 0 ? (
                            <Badge tone="bad">
                              {ti("stock.statusShort", lang, {
                                gap: Number(short.gap).toFixed(1)
                              })}
                            </Badge>
                          ) : qty <= 0 ? (
                            <Badge tone="muted">{t("stock.statusEmpty", lang)}</Badge>
                          ) : weeksCover < 1 ? (
                            <Badge tone="warn">
                              {ti("stock.statusLow", lang, {
                                w: weeksCover.toFixed(1)
                              })}
                            </Badge>
                          ) : (
                            <Badge tone="ok">
                              {t("stock.statusOK", lang)}
                              {weeksCover < 99
                                ? ` · ${weeksCover.toFixed(1)}w`
                                : ""}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section title={t("stock.movesTitle", lang)}>
          {moves.length === 0 ? (
            <EmptyState message={t("stock.movesEmpty", lang)} />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3 text-center">{t("common.time", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.item", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.reason", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.delta", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("stock.colRef", lang)}</th>
                  <th className="py-2 pr-3 text-center">{t("common.note", lang)}</th>
                </THead>
                <tbody>
                  {moves.map((m) => (
                    <tr
                      key={m.id}
                      className="row-hover border-b border-ink/5"
                    >
                      <td className="py-2 pr-3 text-center font-mono text-[11px]">
                        {new Date(m.created_at).toLocaleString(
                          lang === "EN" ? "en-US" : "id-ID",
                          {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          }
                        )}
                      </td>
                      <td className="py-2 pr-3 text-left font-semibold">
                        {m.item_code}
                      </td>
                      <td className="py-2 pr-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${REASON_COLOR[m.reason] ?? REASON_COLOR.adjustment}`}
                        >
                          {reasonLabel(m.reason, lang)}
                        </span>
                      </td>
                      <td
                        className={`py-2 pr-3 text-center font-mono text-xs font-black ${Number(m.delta) >= 0 ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {Number(m.delta) >= 0 ? "+" : ""}
                        {Number(m.delta).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-center font-mono text-[11px] text-ink2">
                        {m.ref_doc && m.ref_no
                          ? `${m.ref_doc.toUpperCase()} ${m.ref_no}`
                          : m.ref_doc || "—"}
                      </td>
                      <td className="py-2 pr-3 text-center text-xs text-ink2/70">
                        {m.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
