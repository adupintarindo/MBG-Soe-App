"use client";

/**
 * Delivery Schedule — Hybrid view (Calendar + Table toggle).
 *
 * Calendar: month grid (Mon–Sun), each cell shows category chips + qty.
 *           Sunday/holiday greyed out. Click → modal with line-by-line detail.
 * Table:    sortable / searchable / exportable list of
 *           (delivery_date × item × qty × cooking_dates × menus).
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { t, ti, MONTHS, DAYS } from "@/lib/i18n";
import { getHoliday } from "@/lib/holidays";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import {
  DELIVERY_CATEGORIES,
  DELIVERY_CATEGORY_META,
  type DeliveryCategory,
  type DeliveryDaySummary,
  type DeliveryGroupRow
} from "@/lib/delivery-engine";

type Lang = "ID" | "EN";

interface Props {
  lang: Lang;
  year: number;
  month: number; // 1..12
  groups: DeliveryGroupRow[];
  daySummaries: DeliveryDaySummary[];
}

function fmtMonthKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function buildMatrix(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const start = new Date(first);
  const dow0 = first.getDay();
  const offsetStart = dow0 === 0 ? -6 : 1 - dow0;
  start.setDate(first.getDate() + offsetStart);
  const end = new Date(last);
  const dowL = last.getDay();
  const offsetEnd = dowL === 0 ? 0 : 7 - dowL;
  end.setDate(last.getDate() + offsetEnd);

  const rows: Date[][] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    rows.push(week);
  }
  return rows;
}

function formatNumber(n: number, lang: Lang, maxFrac = 1): string {
  return n.toLocaleString(lang === "EN" ? "en-US" : "id-ID", {
    maximumFractionDigits: maxFrac
  });
}

function formatShortDate(iso: string, lang: Lang): string {
  const d = parseIso(iso);
  const m = MONTHS.short[lang][d.getMonth()];
  return lang === "EN" ? `${m} ${d.getDate()}` : `${d.getDate()} ${m}`;
}

function formatFullDate(iso: string, lang: Lang): string {
  const d = parseIso(iso);
  const dow = DAYS.long[lang][d.getDay()];
  const m = MONTHS.long[lang][d.getMonth()];
  return lang === "EN"
    ? `${dow}, ${m} ${d.getDate()}, ${d.getFullYear()}`
    : `${dow}, ${d.getDate()} ${m} ${d.getFullYear()}`;
}

export function DeliveryScheduleView({
  lang,
  year,
  month,
  groups,
  daySummaries
}: Props) {
  const [view, setView] = useState<"calendar" | "table">("calendar");
  const [modalDate, setModalDate] = useState<string | null>(null);

  const monthLabel = `${MONTHS.long[lang][month - 1]} ${year}`;
  const matrix = useMemo(() => buildMatrix(year, month), [year, month]);

  const summaryByDate = useMemo(() => {
    const map = new Map<string, DeliveryDaySummary>();
    for (const s of daySummaries) map.set(s.delivery_date, s);
    return map;
  }, [daySummaries]);

  const groupsByDate = useMemo(() => {
    const map = new Map<string, DeliveryGroupRow[]>();
    for (const g of groups) {
      const arr = map.get(g.delivery_date) ?? [];
      arr.push(g);
      map.set(g.delivery_date, arr);
    }
    return map;
  }, [groups]);

  const totalKg = useMemo(
    () => daySummaries.reduce((s, d) => s + d.total_qty_kg, 0),
    [daySummaries]
  );
  const totalLines = useMemo(
    () => daySummaries.reduce((s, d) => s + d.total_items, 0),
    [daySummaries]
  );
  const totalDays = daySummaries.length;

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const prevHref = `/procurement?tab=jadwal&month=${fmtMonthKey(prevYear, prevMonth)}`;
  const nextHref = `/procurement?tab=jadwal&month=${fmtMonthKey(nextYear, nextMonth)}`;

  const modalGroups = modalDate ? (groupsByDate.get(modalDate) ?? []) : [];
  const modalSummary = modalDate ? summaryByDate.get(modalDate) : undefined;

  return (
    <div>
      {/* Toolbar: month nav · view toggle · stat pills */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper/60 px-4 py-3 ring-1 ring-ink/5">
        <div className="flex items-center gap-2">
          <Link
            href={prevHref}
            aria-label={t("delivery.prevMonth", lang)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink shadow-card ring-1 ring-ink/10 transition hover:bg-paper"
          >
            ◀
          </Link>
          <div className="min-w-[140px] px-2 text-center text-sm font-black text-ink">
            {monthLabel}
          </div>
          <Link
            href={nextHref}
            aria-label={t("delivery.nextMonth", lang)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink shadow-card ring-1 ring-ink/10 transition hover:bg-paper"
          >
            ▶
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold ring-1 ring-ink/10">
            <span className="font-black tabular-nums text-ink">{totalDays}</span>
            <span className="text-ink2/70">{t("delivery.statTotalDays", lang)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold ring-1 ring-ink/10">
            <span className="font-black tabular-nums text-ink">{totalLines}</span>
            <span className="text-ink2/70">{t("delivery.statTotalItems", lang)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold ring-1 ring-ink/10">
            <span className="font-black tabular-nums text-ink">
              {formatNumber(totalKg, lang, 1)}
            </span>
            <span className="text-ink2/70">{t("delivery.statTotalKg", lang)}</span>
          </span>

          <div className="flex items-center overflow-hidden rounded-lg bg-white shadow-card ring-1 ring-ink/10">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-[11px] font-bold transition ${
                view === "calendar"
                  ? "bg-primary-gradient text-white"
                  : "text-ink2 hover:bg-paper"
              }`}
            >
              📅 {t("delivery.viewCalendar", lang)}
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-[11px] font-bold transition ${
                view === "table"
                  ? "bg-primary-gradient text-white"
                  : "text-ink2 hover:bg-paper"
              }`}
            >
              📋 {t("delivery.viewTable", lang)}
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[10.5px] font-bold text-ink2">
        <span className="text-ink2/60">{t("delivery.legend", lang)}:</span>
        {DELIVERY_CATEGORIES.map((cat) => {
          const meta = DELIVERY_CATEGORY_META[cat];
          const labelKey =
            cat === "dry"
              ? "delivery.catDry"
              : cat === "veg_fruit"
                ? "delivery.catVeg"
                : cat === "fish"
                  ? "delivery.catFish"
                  : "delivery.catProtein";
          return (
            <span
              key={cat}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ${meta.chipBg} ${meta.chipFg} ${meta.ring}`}
            >
              <span>{meta.emoji}</span>
              <span>{t(labelKey, lang)}</span>
            </span>
          );
        })}
      </div>

      {view === "calendar" ? (
        <CalendarGrid
          lang={lang}
          month={month}
          matrix={matrix}
          summaryByDate={summaryByDate}
          onOpen={setModalDate}
        />
      ) : (
        <TableView lang={lang} groups={groups} />
      )}

      {modalDate && modalSummary && (
        <DayDetailModal
          lang={lang}
          date={modalDate}
          summary={modalSummary}
          groups={modalGroups}
          onClose={() => setModalDate(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Calendar Grid
// ============================================================================

function CalendarGrid({
  lang,
  month,
  matrix,
  summaryByDate,
  onOpen
}: {
  lang: Lang;
  month: number;
  matrix: Date[][];
  summaryByDate: Map<string, DeliveryDaySummary>;
  onOpen: (iso: string) => void;
}) {
  const todayIso = toIso(new Date());
  const dayHeaders = DAYS.short[lang].slice(1).concat(DAYS.short[lang][0]); // Mon..Sun

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-ink/5">
      <div className="grid grid-cols-7 border-b border-ink/10 bg-paper/50">
        {dayHeaders.map((d, i) => (
          <div
            key={i}
            className={`px-2 py-2 text-center text-[11px] font-black uppercase ${
              i === 6 ? "text-rose-700" : "text-ink2"
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {matrix.flat().map((d, i) => {
          const iso = toIso(d);
          const isOtherMonth = d.getMonth() + 1 !== month;
          const dow = d.getDay();
          const isSunday = dow === 0;
          const holiday = getHoliday(iso);
          const closed = isSunday || !!holiday;
          const summary = summaryByDate.get(iso);
          const isToday = iso === todayIso;

          return (
            <DayCell
              key={i}
              lang={lang}
              iso={iso}
              day={d.getDate()}
              isOtherMonth={isOtherMonth}
              isToday={isToday}
              isClosed={closed}
              closedLabel={isSunday ? t("delivery.closed", lang) : (holiday ?? "")}
              summary={summary}
              onOpen={onOpen}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCell({
  lang,
  iso,
  day,
  isOtherMonth,
  isToday,
  isClosed,
  closedLabel,
  summary,
  onOpen
}: {
  lang: Lang;
  iso: string;
  day: number;
  isOtherMonth: boolean;
  isToday: boolean;
  isClosed: boolean;
  closedLabel: string;
  summary: DeliveryDaySummary | undefined;
  onOpen: (iso: string) => void;
}) {
  const hasDelivery = Boolean(summary && summary.total_items > 0);

  const baseCls =
    "group relative min-h-[108px] border-b border-r border-ink/5 p-1.5 text-[11px] transition";
  const muted = isOtherMonth ? "bg-paper/40 text-ink2/40" : "bg-white text-ink2";
  const closedCls = isClosed ? "bg-rose-50/50" : "";
  const clickable = hasDelivery ? "cursor-pointer hover:bg-paper/60" : "";

  return (
    <button
      type="button"
      onClick={() => (hasDelivery ? onOpen(iso) : undefined)}
      disabled={!hasDelivery}
      className={`${baseCls} ${muted} ${closedCls} ${clickable} text-left disabled:cursor-default`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-black ${
            isToday
              ? "bg-primary text-white"
              : isClosed
                ? "text-rose-700"
                : "text-ink"
          }`}
        >
          {day}
        </span>
        {isClosed && !isOtherMonth && (
          <span className="truncate text-[9px] font-bold uppercase text-rose-700/80">
            {closedLabel || t("delivery.closed", lang)}
          </span>
        )}
      </div>

      {hasDelivery && (
        <div className="mt-1 flex flex-col gap-0.5">
          {DELIVERY_CATEGORIES.map((cat) => {
            const info = summary!.by_category[cat];
            if (!info || info.item_count === 0) return null;
            const meta = DELIVERY_CATEGORY_META[cat];
            return (
              <div
                key={cat}
                className={`flex items-center gap-1 rounded-md px-1 py-0.5 text-[10px] font-bold ring-1 ${meta.chipBg} ${meta.chipFg} ${meta.ring}`}
              >
                <span className="text-[10px]">{meta.emoji}</span>
                <span className="flex-1 truncate">
                  {info.item_count} {t("delivery.itemsLabel", lang)}
                </span>
                <span className="tabular-nums opacity-75">
                  {info.qty_kg.toFixed(0)}kg
                </span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ============================================================================
// Table View
// ============================================================================

interface TableRow {
  delivery_date: string;
  delivery_category: DeliveryCategory;
  item_code: string;
  item_name: string;
  item_unit: string;
  qty_kg: number;
  cooking_dates: string[];
  menus: string[];
  group: DeliveryGroupRow;
}

function TableView({ lang, groups }: { lang: Lang; groups: DeliveryGroupRow[] }) {
  const rows: TableRow[] = useMemo(
    () =>
      groups.map((g) => ({
        delivery_date: g.delivery_date,
        delivery_category: g.delivery_category,
        item_code: g.item_code,
        item_name: g.item_name,
        item_unit: g.item_unit,
        qty_kg: g.qty_kg,
        cooking_dates: g.servings.map((s) => s.cooking_date),
        menus: Array.from(new Set(g.servings.map((s) => s.menu_name))),
        group: g
      })),
    [groups]
  );

  const columns: SortableColumn<TableRow>[] = [
    {
      key: "delivery_date",
      label: t("delivery.colDate", lang),
      align: "left",
      width: "120px",
      sortValue: (r) => r.delivery_date,
      searchValue: (r) => r.delivery_date,
      exportValue: (r) => r.delivery_date,
      render: (r) => (
        <span className="font-bold tabular-nums text-ink">
          {formatShortDate(r.delivery_date, lang)}
        </span>
      )
    },
    {
      key: "category",
      label: t("delivery.colCategory", lang),
      align: "left",
      width: "140px",
      sortValue: (r) => r.delivery_category,
      searchValue: (r) =>
        DELIVERY_CATEGORY_META[r.delivery_category].label[lang],
      exportValue: (r) =>
        DELIVERY_CATEGORY_META[r.delivery_category].label[lang],
      render: (r) => {
        const meta = DELIVERY_CATEGORY_META[r.delivery_category];
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ${meta.chipBg} ${meta.chipFg} ${meta.ring}`}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label[lang]}</span>
          </span>
        );
      }
    },
    {
      key: "item",
      label: t("delivery.colItem", lang),
      align: "left",
      sortValue: (r) => r.item_name,
      searchValue: (r) => r.item_name,
      exportValue: (r) => r.item_name,
      render: (r) => (
        <span className="font-semibold text-ink">{r.item_name}</span>
      )
    },
    {
      key: "qty",
      label: t("delivery.colQty", lang),
      align: "right",
      width: "120px",
      sortValue: (r) => r.qty_kg,
      searchValue: (r) => r.qty_kg.toFixed(1),
      exportValue: (r) => Number(r.qty_kg.toFixed(2)),
      exportNumFmt: "#,##0.00",
      render: (r) => (
        <span className="tabular-nums font-bold text-ink">
          {formatNumber(r.qty_kg, lang, 1)}{" "}
          <span className="text-ink2/60">{r.item_unit}</span>
        </span>
      )
    },
    {
      key: "for",
      label: t("delivery.colFor", lang),
      align: "left",
      width: "180px",
      sortValue: (r) => r.cooking_dates.join(","),
      searchValue: (r) => r.cooking_dates.join(", "),
      exportValue: (r) =>
        r.cooking_dates.map((c) => formatShortDate(c, lang)).join(", "),
      render: (r) => (
        <span className="text-ink2">
          {r.cooking_dates.map((c) => formatShortDate(c, lang)).join(", ")}
        </span>
      )
    },
    {
      key: "menu",
      label: t("delivery.colMenu", lang),
      align: "left",
      sortValue: (r) => r.menus.join(","),
      searchValue: (r) => r.menus.join(" "),
      exportValue: (r) => r.menus.join(", "),
      render: (r) => (
        <span className="text-ink2">{r.menus.join(", ")}</span>
      )
    }
  ];

  const filters = [
    {
      key: "delivery_category",
      label: t("delivery.colCategory", lang),
      getValue: (r: TableRow) =>
        DELIVERY_CATEGORY_META[r.delivery_category].label[lang]
    }
  ];

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-paper/60 px-4 py-10 text-center text-sm text-ink2/70 ring-1 ring-ink/5">
        {t("delivery.empty", lang)}
      </div>
    );
  }

  return (
    <SortableTable<TableRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => `${r.delivery_date}|${r.item_code}`}
      initialSort={{ key: "delivery_date", dir: "asc" }}
      searchable
      searchPlaceholder={lang === "EN" ? "Search items…" : "Cari bahan…"}
      exportable
      exportFileName="jadwal-pengiriman"
      exportSheetName="Jadwal Kirim"
      filters={filters}
      zebra
      dense
      stickyHeader
    />
  );
}

// ============================================================================
// Day Detail Modal
// ============================================================================

function DayDetailModal({
  lang,
  date,
  summary,
  groups,
  onClose
}: {
  lang: Lang;
  date: string;
  summary: DeliveryDaySummary;
  groups: DeliveryGroupRow[];
  onClose: () => void;
}) {
  const title = ti("delivery.modalTitle", lang, { date: formatFullDate(date, lang) });
  const cookingLabel =
    summary.serves_cooking_dates.length === 0
      ? t("delivery.noCooking", lang)
      : summary.serves_cooking_dates.map((c) => formatShortDate(c, lang)).join(", ");
  const subtitle = ti("delivery.modalSubtitle", lang, {
    n: String(summary.total_items),
    kg: formatNumber(summary.total_qty_kg, lang, 1),
    dates: cookingLabel
  });

  // Group items within modal by category for readability
  const byCat = new Map<DeliveryCategory, DeliveryGroupRow[]>();
  for (const g of groups) {
    const arr = byCat.get(g.delivery_category) ?? [];
    arr.push(g);
    byCat.set(g.delivery_category, arr);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 bg-primary-gradient px-5 py-4 text-white">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black">{title}</h3>
            <p className="mt-0.5 text-[11.5px] text-white/85">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-[11px] font-bold text-white ring-1 ring-white/25 hover:bg-white/20"
          >
            {t("delivery.modalClose", lang)} ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {DELIVERY_CATEGORIES.map((cat) => {
            const rows = byCat.get(cat);
            if (!rows || rows.length === 0) return null;
            const meta = DELIVERY_CATEGORY_META[cat];
            const catTotal = rows.reduce((s, r) => s + r.qty_kg, 0);
            return (
              <div key={cat} className="mb-4 last:mb-0">
                <div
                  className={`mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black ring-1 ${meta.chipBg} ${meta.chipFg} ${meta.ring}`}
                >
                  <span>{meta.emoji}</span>
                  <span>{meta.label[lang]}</span>
                  <span className="opacity-70">· {rows.length} {t("delivery.itemsLabel", lang)}</span>
                  <span className="opacity-70">
                    · {formatNumber(catTotal, lang, 1)} kg
                  </span>
                </div>

                <div className="overflow-hidden rounded-lg ring-1 ring-ink/5">
                  <table className="w-full text-[11.5px]">
                    <thead className="bg-paper/60 text-[10.5px] uppercase text-ink2">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">
                          {t("delivery.colItem", lang)}
                        </th>
                        <th className="px-3 py-2 text-right font-bold">
                          {t("delivery.colQty", lang)}
                        </th>
                        <th className="px-3 py-2 text-left font-bold">
                          {t("delivery.colFor", lang)}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {rows.map((r) => (
                        <tr key={r.item_code} className="hover:bg-paper/40">
                          <td className="px-3 py-2 font-semibold text-ink">
                            {r.item_name}
                          </td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums text-ink">
                            {formatNumber(r.qty_kg, lang, 1)}{" "}
                            <span className="text-ink2/60">{r.item_unit}</span>
                          </td>
                          <td className="px-3 py-2 text-ink2">
                            {r.servings.map((s, i) => (
                              <span key={i} className="mr-2 inline-block">
                                <span className="font-bold tabular-nums text-ink">
                                  {formatShortDate(s.cooking_date, lang)}
                                </span>
                                <span className="ml-1 text-ink2/70">
                                  · {s.menu_name}
                                </span>
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
