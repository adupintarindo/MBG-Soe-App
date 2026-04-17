"use client";

import { useMemo, useState } from "react";
import { t, ti, numberLocale, type LangKey, type Lang } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type DailyRow = {
  op_date: string;
  item_code: string;
  item_name: string;
  unit: string;
  category: string;
  qty: number | string;
  source: string;
};

type MonthlyRow = {
  month: string;
  item_code: string;
  item_name: string;
  unit: string;
  category: string;
  qty_total: number | string;
  days_count: number;
};

type Tab = "daily" | "weekly" | "monthly";

const SOURCE_BADGE: Record<string, { labelKey: LangKey; cls: string }> = {
  assigned: {
    labelKey: "fcst.badgeAssigned",
    cls: "bg-emerald-100 text-emerald-800"
  },
  custom: {
    labelKey: "fcst.badgeCustom",
    cls: "bg-blue-100 text-blue-800"
  },
  cycle: {
    labelKey: "fcst.badgeCycle",
    cls: "bg-amber-100 text-amber-900"
  }
};

function fmtQty(n: number | string, lang: Lang) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(numberLocale(lang), { maximumFractionDigits: 3 });
}

function fmtDate(iso: string, lang: Lang) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(numberLocale(lang), {
    weekday: "short",
    day: "2-digit",
    month: "short"
  });
}

function isoWeek(d: Date): { year: number; week: number; label: string } {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return {
    year: tmp.getUTCFullYear(),
    week,
    label: `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
  };
}

function fmtMonth(iso: string, lang: Lang) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(numberLocale(lang), {
    month: "long",
    year: "numeric"
  });
}

export function ForecastShell({
  supplierId,
  daily,
  monthly,
  isStaffPreview
}: {
  supplierId: string;
  daily: DailyRow[];
  monthly: MonthlyRow[];
  isStaffPreview: boolean;
}) {
  const { lang } = useLang();
  const [tab, setTab] = useState<Tab>("weekly");

  const items = useMemo(() => {
    const m = new Map<
      string,
      { code: string; name: string; unit: string; category: string }
    >();
    for (const r of daily) {
      if (!m.has(r.item_code)) {
        m.set(r.item_code, {
          code: r.item_code,
          name: r.item_name,
          unit: r.unit,
          category: r.category
        });
      }
    }
    return Array.from(m.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [daily]);

  const dailyByDate = useMemo(() => {
    const m = new Map<string, DailyRow[]>();
    for (const r of daily) {
      const list = m.get(r.op_date) ?? [];
      list.push(r);
      m.set(r.op_date, list);
    }
    return m;
  }, [daily]);

  const allDates = useMemo(
    () => Array.from(dailyByDate.keys()).sort(),
    [dailyByDate]
  );

  const weeklyData = useMemo(() => {
    const weeks = new Map<string, { label: string; weekStart: string }>();
    const cell = new Map<string, number>();
    for (const r of daily) {
      const d = new Date(r.op_date + "T00:00:00");
      const w = isoWeek(d);
      const weekStartIso = (() => {
        const wd = new Date(d);
        const day = wd.getDay() || 7;
        wd.setDate(wd.getDate() - (day - 1));
        return wd.toISOString().slice(0, 10);
      })();
      if (!weeks.has(w.label))
        weeks.set(w.label, { label: w.label, weekStart: weekStartIso });
      const key = `${r.item_code}|${w.label}`;
      cell.set(key, (cell.get(key) ?? 0) + Number(r.qty));
    }
    const weekList = Array.from(weeks.values()).sort((a, b) =>
      a.weekStart.localeCompare(b.weekStart)
    );
    return { weekList, cell };
  }, [daily]);

  const monthlyByMonth = useMemo(() => {
    const m = new Map<string, MonthlyRow[]>();
    for (const r of monthly) {
      const list = m.get(r.month) ?? [];
      list.push(r);
      m.set(r.month, list);
    }
    return m;
  }, [monthly]);

  const months = useMemo(
    () => Array.from(monthlyByMonth.keys()).sort(),
    [monthlyByMonth]
  );

  const totalItems = items.length;
  const totalDays = allDates.length;

  return (
    <div className="space-y-4">
      {isStaffPreview && (
        <div className="rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          {t("fcst.staffPreview", lang)}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl bg-white p-1 shadow-card ring-1 ring-ink/10">
          <TabBtn
            label={ti("fcst.tabWeekly", lang, { n: weeklyData.weekList.length })}
            active={tab === "weekly"}
            onClick={() => setTab("weekly")}
          />
          <TabBtn
            label={ti("fcst.tabDaily", lang, { n: totalDays })}
            active={tab === "daily"}
            onClick={() => setTab("daily")}
          />
          <TabBtn
            label={ti("fcst.tabMonthly", lang, { n: months.length })}
            active={tab === "monthly"}
            onClick={() => setTab("monthly")}
          />
        </div>
        <div className="text-[11px] text-ink2/70">
          {ti("fcst.meta", lang, { items: totalItems, days: totalDays })}
        </div>
        <a
          href={`/api/supplier-forecast/export.xlsx${supplierId ? `?supplier_id=${encodeURIComponent(supplierId)}` : ""}`}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-card hover:bg-emerald-700"
        >
          {t("fcst.export", lang)}
        </a>
      </div>

      {tab === "weekly" && (
        <WeeklyView items={items} weeklyData={weeklyData} lang={lang} />
      )}
      {tab === "daily" && (
        <DailyView items={items} allDates={allDates} daily={daily} lang={lang} />
      )}
      {tab === "monthly" && (
        <MonthlyView months={months} monthlyByMonth={monthlyByMonth} lang={lang} />
      )}

      <div className="rounded-xl bg-paper/60 px-4 py-3 text-[11px] text-ink2/80 ring-1 ring-ink/5">
        <b>{t("fcst.legendTitle", lang)}</b>{" "}
        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
          {t("fcst.badgeAssigned", lang)}
        </span>{" "}
        {t("fcst.legendAssigned", lang)} ·{" "}
        <span className="rounded-full bg-blue-100 px-2 py-0.5 font-bold text-blue-800">
          {t("fcst.badgeCustom", lang)}
        </span>{" "}
        {t("fcst.legendCustom", lang)} ·{" "}
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
          cycle
        </span>{" "}
        {t("fcst.legendCycle", lang)}
      </div>
    </div>
  );
}

function TabBtn({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-[11.5px] font-bold transition ${
        active
          ? "bg-ink text-white shadow-card"
          : "text-ink2 hover:bg-paper"
      }`}
    >
      {label}
    </button>
  );
}

function DailyView({
  items,
  allDates,
  daily,
  lang
}: {
  items: Array<{ code: string; name: string; unit: string; category: string }>;
  allDates: string[];
  daily: DailyRow[];
  lang: Lang;
}) {
  const qtyMap = useMemo(() => {
    const m = new Map<string, { qty: number; source: string }>();
    for (const r of daily) {
      m.set(`${r.op_date}|${r.item_code}`, {
        qty: Number(r.qty),
        source: r.source
      });
    }
    return m;
  }, [daily]);

  if (items.length === 0 || allDates.length === 0) {
    return (
      <div className="rounded-xl bg-paper px-4 py-6 text-center text-sm text-ink2">
        {t("fcst.emptyDaily", lang)}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-ink/10">
      <table className="w-full min-w-[900px] text-xs">
        <thead className="sticky top-0 z-10 bg-paper text-left text-[10px] font-black uppercase tracking-wide text-ink2">
          <tr>
            <th className="sticky left-0 z-20 bg-paper px-3 py-2">
              {t("fcst.colDate", lang)}
            </th>
            {items.map((it) => (
              <th
                key={it.code}
                className="px-3 py-2 text-right"
                title={`${it.code} · ${it.unit}`}
              >
                <div>{it.name}</div>
                <div className="font-mono text-[9px] font-normal normal-case text-ink2/50">
                  {it.unit}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allDates.map((d) => (
            <tr key={d} className="border-t border-ink/5">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 font-mono text-[10.5px] font-bold">
                {fmtDate(d, lang)}
              </td>
              {items.map((it) => {
                const cell = qtyMap.get(`${d}|${it.code}`);
                if (!cell) {
                  return (
                    <td
                      key={it.code}
                      className="px-3 py-2 text-right text-ink2/30"
                    >
                      —
                    </td>
                  );
                }
                const badge = SOURCE_BADGE[cell.source];
                const badgeLabel = badge ? t(badge.labelKey, lang) : cell.source;
                return (
                  <td
                    key={it.code}
                    className="px-3 py-2 text-right"
                    title={badgeLabel}
                  >
                    <div className="font-mono font-bold tabular-nums">
                      {fmtQty(cell.qty, lang)}
                    </div>
                    {badge && cell.source !== "assigned" && (
                      <div
                        className={`mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] font-bold ${badge.cls}`}
                      >
                        {badgeLabel}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyView({
  items,
  weeklyData,
  lang
}: {
  items: Array<{ code: string; name: string; unit: string; category: string }>;
  weeklyData: {
    weekList: Array<{ label: string; weekStart: string }>;
    cell: Map<string, number>;
  };
  lang: Lang;
}) {
  const { weekList, cell } = weeklyData;
  if (items.length === 0 || weekList.length === 0) {
    return (
      <div className="rounded-xl bg-paper px-4 py-6 text-center text-sm text-ink2">
        {t("fcst.emptyWeekly", lang)}
      </div>
    );
  }

  const maxByItem = new Map<string, number>();
  for (const it of items) {
    let mx = 0;
    for (const w of weekList) {
      const v = cell.get(`${it.code}|${w.label}`) ?? 0;
      if (v > mx) mx = v;
    }
    maxByItem.set(it.code, mx);
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-ink/10">
      <table className="w-full min-w-[900px] text-xs">
        <thead className="sticky top-0 z-10 bg-paper text-left text-[10px] font-black uppercase tracking-wide text-ink2">
          <tr>
            <th className="sticky left-0 z-20 bg-paper px-3 py-2">{t("fcst.colItem", lang)}</th>
            {weekList.map((w) => (
              <th
                key={w.label}
                className="px-3 py-2 text-right"
                title={ti("fcst.weekStartHint", lang, { date: w.weekStart })}
              >
                <div>{w.label}</div>
                <div className="font-mono text-[9px] font-normal normal-case text-ink2/50">
                  {ti("fcst.weekFrom", lang, { date: w.weekStart.slice(5) })}
                </div>
              </th>
            ))}
            <th className="px-3 py-2 text-right">{t("fcst.colTotal90", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            let total = 0;
            const maxInRow = maxByItem.get(it.code) ?? 0;
            return (
              <tr key={it.code} className="border-t border-ink/5">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 align-top">
                  <div className="font-bold">{it.name}</div>
                  <div className="font-mono text-[10px] text-ink2/60">
                    {it.code} · {it.unit}
                  </div>
                </td>
                {weekList.map((w) => {
                  const v = cell.get(`${it.code}|${w.label}`) ?? 0;
                  total += v;
                  const pct =
                    maxInRow > 0 ? Math.round((v / maxInRow) * 100) : 0;
                  return (
                    <td key={w.label} className="px-3 py-2 text-right">
                      <div className="font-mono font-bold tabular-nums">
                        {v > 0 ? fmtQty(v, lang) : "—"}
                      </div>
                      {v > 0 && (
                        <div className="mt-1 h-1 rounded-full bg-ink/5">
                          <div
                            className="h-1 rounded-full bg-accent-strong"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-mono font-black tabular-nums text-ink">
                  {fmtQty(total, lang)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyView({
  months,
  monthlyByMonth,
  lang
}: {
  months: string[];
  monthlyByMonth: Map<string, MonthlyRow[]>;
  lang: Lang;
}) {
  if (months.length === 0) {
    return (
      <div className="rounded-xl bg-paper px-4 py-6 text-center text-sm text-ink2">
        {t("fcst.emptyMonthly", lang)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {months.map((m) => {
        const rows = monthlyByMonth.get(m) ?? [];
        const totalItems = rows.length;
        const totalDays = rows[0]?.days_count ?? 0;
        return (
          <div
            key={m}
            className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5"
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="font-display text-base font-black text-ink">
                {fmtMonth(m, lang)}
              </h3>
              <span className="text-[11px] text-ink2/70">
                {ti("fcst.monthMeta", lang, { items: totalItems, days: totalDays })}
              </span>
            </div>
            <div className="space-y-1.5">
              {rows
                .sort(
                  (a, b) => Number(b.qty_total) - Number(a.qty_total)
                )
                .map((r) => (
                  <div
                    key={r.item_code}
                    className="flex items-center justify-between gap-2 rounded-lg bg-paper/60 px-3 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold">{r.item_name}</div>
                      <div className="font-mono text-[10px] text-ink2/60">
                        {r.item_code}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono font-black tabular-nums">
                        {fmtQty(r.qty_total, lang)} {r.unit}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
