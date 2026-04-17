"use client";

/**
 * Weekly Price List · Interactive grid shell
 * ---------------------------------------------------------------------------
 * Renders pivoted weekly Rp/kg matrix (supplier × commodity × ingredient × 12
 * weeks). MVP: read-only with inline commodity filter + CSV export. Editing
 * hooks are scaffolded (`onCellBlur`) and will persist via a server action
 * once we wire `upsert_supplier_price` in 0018.
 */

import { useMemo, useState, useTransition } from "react";
import {
  COMMODITY_COLORS,
  COMMODITY_LABELS,
  commodityLabel,
  type PriceCommodity,
  type PriceListMatrixRow,
  type PricePeriod,
  type PriceWeek
} from "./types";
import { upsertSupplierPrice } from "./actions";
import { t, ti, formatNumber, numberLocale } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

interface Props {
  periods: PricePeriod[];
  weeks: PriceWeek[];
  rows: PriceListMatrixRow[];
  currentPeriodId: number | null;
  canEdit: boolean;
}

const WEEK_FIELDS = [
  "w1", "w2", "w3", "w4", "w5", "w6",
  "w7", "w8", "w9", "w10", "w11", "w12"
] as const;

type WeekField = (typeof WEEK_FIELDS)[number];

function fmtRp(n: number | null | undefined, lang: "ID" | "EN"): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  const prefix = lang === "EN" ? "IDR " : "Rp";
  return prefix + Number(n).toLocaleString(numberLocale(lang), { maximumFractionDigits: 0 });
}

function computeRowStats(row: PriceListMatrixRow) {
  const vals = WEEK_FIELDS.map((k) => row[k]).filter(
    (v): v is number => v != null && !Number.isNaN(Number(v))
  );
  if (vals.length === 0) return { min: null, max: null, avg: null };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return { min, max, avg };
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function PriceListShell({ periods, weeks, rows: rowsProp, currentPeriodId, canEdit }: Props) {
  const { lang } = useLang();
  const [commodity, setCommodity] = useState<PriceCommodity | "">("");
  const [periodId, setPeriodId] = useState<number | null>(currentPeriodId);
  const [rows, setRows] = useState<PriceListMatrixRow[]>(rowsProp);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeWeeks = useMemo(
    () => weeks.filter((w) => w.period_id === periodId).sort((a, b) => a.week_no - b.week_no),
    [weeks, periodId]
  );

  const filteredRows = useMemo(() => {
    return rows.filter(
      (r) => r.period_id === periodId && (!commodity || r.commodity === commodity)
    );
  }, [rows, commodity, periodId]);

  const summary = useMemo(() => {
    const totalCells = filteredRows.length * 12;
    const filled = filteredRows.reduce((acc, r) => {
      return acc + WEEK_FIELDS.filter((k) => r[k] != null).length;
    }, 0);
    return {
      rows: filteredRows.length,
      filled,
      totalCells,
      pct: totalCells ? Math.round((filled / totalCells) * 100) : 0
    };
  }, [filteredRows]);

  function onExportCSV() {
    const headers = [
      t("priceList.colCommodity", lang),
      t("priceList.colIngredient", lang),
      t("priceList.colSupplier", lang),
      ...activeWeeks.map((w) => w.label),
      t("priceList.colAvg", lang),
      t("priceList.colMin", lang),
      t("priceList.colMax", lang)
    ];
    const lines = [headers.map(csvEscape).join(",")];
    filteredRows.forEach((r) => {
      const stats = computeRowStats(r);
      const row = [
        commodityLabel(r.commodity, lang),
        r.ingredient_name.replace(/^Buah\s*-\s*/i, ""),
        r.supplier_name,
        ...WEEK_FIELDS.map((k) => r[k] ?? ""),
        stats.avg ?? "",
        stats.min ?? "",
        stats.max ?? ""
      ];
      lines.push(row.map(csvEscape).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const periodName = periods.find((p) => p.id === periodId)?.name ?? "period";
    a.download = `PriceList_${periodName.replace(/\s+/g, "_")}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function onCellBlur(
    row: PriceListMatrixRow,
    weekField: WeekField,
    newValue: string
  ) {
    if (!canEdit) return;
    const weekNo = Number(weekField.slice(1));
    const week = weeks.find((w) => w.period_id === row.period_id && w.week_no === weekNo);
    if (!week) return;

    const raw = newValue.trim().replace(/\./g, "").replace(/,/g, ".");
    const parsed = raw === "" ? null : Number(raw);
    if (parsed != null && Number.isNaN(parsed)) {
      setErrorMsg(ti("priceList.errInvalidNumber", lang, { v: newValue }));
      return;
    }

    // Optimistic update
    setRows((prev) =>
      prev.map((r) =>
        r.supplier_id === row.supplier_id &&
        r.commodity === row.commodity &&
        r.ingredient_name === row.ingredient_name
          ? { ...r, [weekField]: parsed }
          : r
      )
    );

    startTransition(async () => {
      const res = await upsertSupplierPrice({
        weekId: week.id,
        supplierId: row.supplier_id,
        commodity: row.commodity,
        ingredientName: row.ingredient_name,
        pricePerKg: parsed,
        itemCode: row.item_code
      });
      if (!res.ok) {
        setErrorMsg(res.error ?? t("priceList.errSave", lang));
        // Rollback on error
        setRows((prev) =>
          prev.map((r) =>
            r.supplier_id === row.supplier_id &&
            r.commodity === row.commodity &&
            r.ingredient_name === row.ingredient_name
              ? { ...r, [weekField]: row[weekField] }
              : r
          )
        );
      } else {
        setErrorMsg(null);
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <span>💹</span>
          <span>{t("priceList.shellTitle", lang)}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={periodId ?? ""}
            onChange={(e) => setPeriodId(Number(e.target.value) || null)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value as PriceCommodity | "")}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">{t("priceList.allCommodities", lang)}</option>
            {(Object.keys(COMMODITY_LABELS) as PriceCommodity[]).map((k) => (
              <option key={k} value={k}>
                {commodityLabel(k, lang)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onExportCSV}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇ CSV
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {t("priceList.hint", lang)}{" "}
        <strong>{periods.find((p) => p.id === periodId)?.name}</strong>.
        {pending && <span className="ml-2 text-blue-600">{t("priceList.saving", lang)}</span>}
      </p>
      {errorMsg && (
        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          ⚠ {errorMsg}
        </div>
      )}

      <div className="mt-3 overflow-auto" style={{ maxHeight: "70vh" }}>
        <table className="min-w-[1400px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-left">
                {t("priceList.colCommodity", lang)}
              </th>
              <th className="sticky left-[120px] z-20 bg-slate-100 px-2 py-1.5 text-left">
                {t("priceList.colIngredient", lang)}
              </th>
              <th className="sticky left-[260px] z-20 bg-slate-100 px-2 py-1.5 text-left">
                {t("priceList.colSupplier", lang)}
              </th>
              {activeWeeks.map((w) => (
                <th
                  key={w.id}
                  title={`${w.start_date} – ${w.end_date}`}
                  className="min-w-[72px] px-1 py-1.5 text-center font-medium"
                >
                  {w.label.replace(/^Wk \d+: /, "")}
                </th>
              ))}
              <th className="px-2 py-1.5 text-center">{t("priceList.colAvg", lang)}</th>
              <th className="px-2 py-1.5 text-center">{t("priceList.colMin", lang)}</th>
              <th className="px-2 py-1.5 text-center">{t("priceList.colMax", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={activeWeeks.length + 6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  {t("priceList.empty", lang)}
                </td>
              </tr>
            )}
            {filteredRows.map((r) => {
              const stats = computeRowStats(r);
              return (
                <tr key={`${r.supplier_id}-${r.commodity}-${r.ingredient_name}`} className="border-t border-slate-100">
                  <td
                    className={`sticky left-0 z-10 px-2 py-1.5 font-semibold ring-1 ${COMMODITY_COLORS[r.commodity]}`}
                  >
                    {commodityLabel(r.commodity, lang)}
                  </td>
                  <td className="sticky left-[120px] z-10 bg-white px-2 py-1.5 font-medium text-slate-800">
                    {r.ingredient_name.replace(/^Buah\s*-\s*/i, "")}
                  </td>
                  <td className="sticky left-[260px] z-10 bg-white px-2 py-1.5 text-slate-700">
                    {r.supplier_name}
                  </td>
                  {activeWeeks.map((w) => {
                    const v = r[`w${w.week_no}` as WeekField];
                    let bg = "bg-white";
                    if (v != null && stats.min != null && stats.max != null && stats.min !== stats.max) {
                      if (v === stats.min) bg = "bg-emerald-50";
                      else if (v === stats.max) bg = "bg-rose-50";
                    }
                    return (
                      <td
                        key={w.id}
                        suppressContentEditableWarning
                        contentEditable={canEdit}
                        onBlur={(e) =>
                          onCellBlur(r, `w${w.week_no}` as WeekField, e.currentTarget.textContent ?? "")
                        }
                        className={`${bg} min-w-[72px] px-1 py-1.5 text-right tabular-nums`}
                      >
                        {v != null ? formatNumber(v, lang) : ""}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-left font-semibold text-slate-800">{fmtRp(stats.avg, lang)}</td>
                  <td className="px-2 py-1.5 text-left text-emerald-700">{fmtRp(stats.min, lang)}</td>
                  <td className="px-2 py-1.5 text-left text-rose-700">{fmtRp(stats.max, lang)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>
          <strong>{summary.rows}</strong> {t("priceList.summaryRows", lang)} ·{" "}
          <strong>
            {summary.filled}/{summary.totalCells}
          </strong>{" "}
          {t("priceList.summaryFilled", lang)} (<strong>{summary.pct}%</strong>)
        </span>
        <span>{ti("priceList.weeksCount", lang, { n: activeWeeks.length })}</span>
        <span>{t("priceList.legend", lang)}</span>
        {!canEdit && (
          <span className="text-slate-400">{t("priceList.readOnly", lang)}</span>
        )}
      </div>
    </div>
  );
}
