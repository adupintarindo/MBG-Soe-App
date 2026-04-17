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

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  receipt: "Terima",
  consumption: "Konsumsi",
  adjustment: "Adjust",
  waste: "Waste",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  opening: "Opening"
};

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

  // Group stock by category
  const itemsByCat = new Map<string, ItemRow[]>();
  for (const it of items) {
    const list = itemsByCat.get(it.category) ?? [];
    list.push(it);
    itemsByCat.set(it.category, list);
  }

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
          title="Stok Gudang SPPG"
          subtitle={
            <>
              {items.length} SKU · {items.length - emptyItems} ada stok ·{" "}
              {emptyItems} kosong
            </>
          }
          actions={
            <>
              <LinkButton href="/procurement" variant="secondary" size="sm">
                🧾 PO / GRN
              </LinkButton>
              <LinkButton href="/menu/variance" variant="secondary" size="sm">
                📉 BOM Variance
              </LinkButton>
              <LinkButton href="/planning" variant="primary" size="sm">
                📈 Kebutuhan →
              </LinkButton>
            </>
          }
        />

        <KpiGrid>
          <KpiTile
            icon="📦"
            label="SKU Dikelola"
            value={items.length.toString()}
            sub={`${items.length - emptyItems} ada stok`}
          />
          <KpiTile
            icon="💰"
            label="Nilai Stok"
            value={formatIDR(totalValue)}
            size="md"
            tone="ok"
            sub="harga referensi"
          />
          <KpiTile
            icon="📉"
            label="Stok Kosong"
            value={emptyItems.toString()}
            tone={emptyItems > 0 ? "warn" : "default"}
            sub={`${((emptyItems / Math.max(1, items.length)) * 100).toFixed(0)}% dari SKU`}
          />
          <KpiTile
            icon="⚠️"
            label="Kurang Hari Ini"
            value={shortCount.toString()}
            tone={shortCount > 0 ? "bad" : "ok"}
            sub="vs kebutuhan harian"
          />
        </KpiGrid>

        {shortCount > 0 && (
          <Section
            title={`⚠️ ${shortCount} Item Kurang untuk Hari Ini`}
            hint="Kekurangan dihitung dari kebutuhan BOM hari ini vs on-hand."
            accent="bad"
          >
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3 text-center">Item</th>
                  <th className="py-2 pr-3 text-center">Butuh</th>
                  <th className="py-2 pr-3 text-center">Ada</th>
                  <th className="py-2 pr-3 text-center">Kurang</th>
                </THead>
                <tbody>
                  {shortList.map((s) => (
                    <tr
                      key={s.item_code}
                      className="row-hover border-b border-ink/5"
                    >
                      <td className="py-2 pr-3 text-center font-semibold">
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

        <div className="mb-6 space-y-4">
          {[...itemsByCat.entries()].map(([cat, list]) => (
            <Section
              key={cat}
              title={`${cat} · ${list.length} item`}
              actions={
                <span className="text-[11px] font-semibold text-ink2/70">
                  Total nilai{" "}
                  <b className="text-ink">
                    {formatIDR(
                      list.reduce(
                        (s, it) =>
                          s +
                          Number(stockByCode.get(it.code)?.qty ?? 0) *
                            Number(it.price_idr),
                        0
                      )
                    )}
                  </b>
                </span>
              }
              className="mb-0"
            >
              <TableWrap>
                <table className="w-full text-sm">
                  <THead>
                    <th className="py-2 pr-3 text-center">Item</th>
                    <th className="py-2 pr-3 text-center">Qty</th>
                    <th className="py-2 pr-3 text-center">Unit</th>
                    <th className="py-2 pr-3 text-center">Harga</th>
                    <th className="py-2 pr-3 text-center">Nilai</th>
                    <th className="py-2 pr-3 text-center">Vol Mingguan</th>
                    <th className="py-2 pr-3 text-center">Status</th>
                  </THead>
                  <tbody>
                    {list.map((it) => {
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
                          <td className="py-2 pr-3 text-center font-semibold">
                            {it.code}
                          </td>
                          <td className="py-2 pr-3 text-center font-mono text-xs font-black">
                            {qty.toLocaleString("id-ID", {
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
                                Kurang {Number(short.gap).toFixed(1)}
                              </Badge>
                            ) : qty <= 0 ? (
                              <Badge tone="muted">Kosong</Badge>
                            ) : weeksCover < 1 ? (
                              <Badge tone="warn">
                                Low · {weeksCover.toFixed(1)}w
                              </Badge>
                            ) : (
                              <Badge tone="ok">
                                OK{" "}
                                {weeksCover < 99
                                  ? `· ${weeksCover.toFixed(1)}w`
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
            </Section>
          ))}
        </div>

        <Section title="📋 50 Pergerakan Stok Terakhir">
          {moves.length === 0 ? (
            <EmptyState message="Belum ada pergerakan stok." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3 text-center">Waktu</th>
                  <th className="py-2 pr-3 text-center">Item</th>
                  <th className="py-2 pr-3 text-center">Reason</th>
                  <th className="py-2 pr-3 text-center">Delta</th>
                  <th className="py-2 pr-3 text-center">Referensi</th>
                  <th className="py-2 pr-3 text-center">Catatan</th>
                </THead>
                <tbody>
                  {moves.map((m) => (
                    <tr
                      key={m.id}
                      className="row-hover border-b border-ink/5"
                    >
                      <td className="py-2 pr-3 text-center font-mono text-[11px]">
                        {new Date(m.created_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="py-2 pr-3 text-center font-semibold">
                        {m.item_code}
                      </td>
                      <td className="py-2 pr-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${REASON_COLOR[m.reason] ?? REASON_COLOR.adjustment}`}
                        >
                          {REASON_LABEL[m.reason] ?? m.reason}
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
