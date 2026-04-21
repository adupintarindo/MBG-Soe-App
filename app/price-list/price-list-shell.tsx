"use client";

/**
 * Weekly Price List · Interactive grid shell
 * ---------------------------------------------------------------------------
 * Renders pivoted weekly Rp/kg matrix (supplier × commodity × ingredient × 12
 * weeks). MVP: read-only with inline commodity filter + styled Excel export.
 * Editing hooks are scaffolded (`onCellBlur`) and will persist via a server
 * action once we wire `upsert_supplier_price` in 0018.
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
import { downloadStyledXlsx, type StyledColumn } from "@/lib/excel-export";
import { Section } from "@/components/ui";

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

  async function onExportXlsx() {
    const columns: StyledColumn[] = [
      {
        key: "commodity",
        header: t("priceList.colCommodity", lang),
        align: "left"
      },
      {
        key: "ingredient",
        header: t("priceList.colIngredient", lang),
        align: "left"
      },
      {
        key: "supplier",
        header: t("priceList.colSupplier", lang),
        align: "left"
      },
      ...activeWeeks.map<StyledColumn>((w) => ({
        key: `w${w.week_no}`,
        header: w.label.replace(/^Wk \d+: /, `W${w.week_no} `),
        align: "right",
        numFmt: '"Rp "#,##0',
        hint: "money"
      })),
      {
        key: "avg",
        header: t("priceList.colAvg", lang),
        align: "right",
        numFmt: '"Rp "#,##0',
        hint: "bold"
      },
      {
        key: "min",
        header: t("priceList.colMin", lang),
        align: "right",
        numFmt: '"Rp "#,##0',
        hint: "status-ok"
      },
      {
        key: "max",
        header: t("priceList.colMax", lang),
        align: "right",
        numFmt: '"Rp "#,##0',
        hint: "status-bad"
      }
    ];

    const rowsData = filteredRows.map((r) => {
      const stats = computeRowStats(r);
      const out: Record<string, unknown> = {
        commodity: commodityLabel(r.commodity, lang),
        ingredient: r.ingredient_name.replace(/^Buah\s*-\s*/i, ""),
        supplier: r.supplier_name,
        avg: stats.avg ?? "",
        min: stats.min ?? "",
        max: stats.max ?? ""
      };
      for (const w of activeWeeks) {
        const k = `w${w.week_no}` as WeekField;
        out[`w${w.week_no}`] = r[k] ?? "";
      }
      return out;
    });

    const periodName = periods.find((p) => p.id === periodId)?.name ?? "period";
    await downloadStyledXlsx({
      fileName: `price-list-${periodName.replace(/\s+/g, "-").toLowerCase()}`,
      sheets: [
        {
          name: "Price List",
          title: `${t("priceList.shellTitle", lang)} · ${periodName}`,
          subtitle: ti("priceList.weeksCount", lang, { n: activeWeeks.length }),
          columns,
          rows: rowsData,
          zebra: true,
          freezeHeader: true
        }
      ]
    });
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

  const activePeriodName = periods.find((p) => p.id === periodId)?.name;

  const controls = (
    <>
      <select
        value={periodId ?? ""}
        onChange={(e) => setPeriodId(Number(e.target.value) || null)}
        className="rounded-md border border-ink/10 bg-white py-1.5 pl-2.5 pr-7 text-xs text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
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
        className="rounded-md border border-ink/10 bg-white py-1.5 pl-2.5 pr-7 text-xs text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
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
        onClick={onExportXlsx}
        className="inline-flex items-center gap-1 rounded-md bg-primary-gradient px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-card transition hover:brightness-110"
      >
        ⬇ {t("common.exportExcel", lang)}
      </button>
    </>
  );

  return (
    <Section
      title={t("priceList.shellTitle", lang)}
      hint={
        activePeriodName ? (
          <>
            {t("priceList.hint", lang)} <strong>{activePeriodName}</strong>.
          </>
        ) : (
          t("priceList.hint", lang)
        )
      }
      actions={controls}
      noPad
    >
      {pending && (
        <p className="px-5 pt-3 text-xs text-accent-strong">
          {t("priceList.saving", lang)}
        </p>
      )}
      {errorMsg && (
        <div className="mx-5 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          ⚠ {errorMsg}
        </div>
      )}

      <div className="mt-3 overflow-auto" style={{ maxHeight: "70vh" }}>
        <table className="min-w-[1400px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-primary-gradient text-white/95 [&>tr]:border-b-2 [&>tr]:border-gold/70">
            <tr>
              <th className="sticky left-0 z-20 bg-primary-gradient px-3 py-2 text-left font-display text-[11px] font-bold uppercase tracking-[0.05em]">
                {t("priceList.colCommodity", lang)}
              </th>
              <th className="sticky left-[120px] z-20 bg-primary-gradient px-3 py-2 text-left font-display text-[11px] font-bold uppercase tracking-[0.05em]">
                {t("priceList.colIngredient", lang)}
              </th>
              <th className="sticky left-[260px] z-20 bg-primary-gradient px-3 py-2 text-left font-display text-[11px] font-bold uppercase tracking-[0.05em]">
                {t("priceList.colSupplier", lang)}
              </th>
              {activeWeeks.map((w) => (
                <th
                  key={w.id}
                  title={`${w.start_date} – ${w.end_date}`}
                  className="min-w-[72px] px-1 py-2 text-center font-display text-[11px] font-bold uppercase tracking-[0.05em]"
                >
                  {w.label.replace(/^Wk \d+: /, "")}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-display text-[11px] font-bold uppercase tracking-[0.05em]">
                {t("priceList.colAvg", lang)}
              </th>
              <th className="px-3 py-2 text-center font-display text-[11px] font-bold uppercase tracking-[0.05em]">
                {t("priceList.colMin", lang)}
              </th>
              <th className="px-3 py-2 text-center font-display text-[11px] font-bold uppercase tracking-[0.05em]">
                {t("priceList.colMax", lang)}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={activeWeeks.length + 6}
                  className="px-4 py-10 text-center text-sm text-ink2/60"
                >
                  {t("priceList.empty", lang)}
                </td>
              </tr>
            )}
            {filteredRows.map((r) => {
              const stats = computeRowStats(r);
              return (
                <tr
                  key={`${r.supplier_id}-${r.commodity}-${r.ingredient_name}`}
                  className="border-t border-ink/5"
                >
                  <td
                    className={`sticky left-0 z-10 px-2 py-1.5 font-semibold ring-1 ${COMMODITY_COLORS[r.commodity]}`}
                  >
                    {commodityLabel(r.commodity, lang)}
                  </td>
                  <td className="sticky left-[120px] z-10 bg-white px-2 py-1.5 font-medium text-ink">
                    {r.ingredient_name.replace(/^Buah\s*-\s*/i, "")}
                  </td>
                  <td className="sticky left-[260px] z-10 bg-white px-2 py-1.5 text-ink2">
                    {r.supplier_name}
                  </td>
                  {activeWeeks.map((w) => {
                    const v = r[`w${w.week_no}` as WeekField];
                    let bg = "bg-white";
                    if (
                      v != null &&
                      stats.min != null &&
                      stats.max != null &&
                      stats.min !== stats.max
                    ) {
                      if (v === stats.min) bg = "bg-emerald-50";
                      else if (v === stats.max) bg = "bg-rose-50";
                    }
                    return (
                      <td
                        key={w.id}
                        suppressContentEditableWarning
                        contentEditable={canEdit}
                        onBlur={(e) =>
                          onCellBlur(
                            r,
                            `w${w.week_no}` as WeekField,
                            e.currentTarget.textContent ?? ""
                          )
                        }
                        className={`${bg} min-w-[72px] px-1 py-1.5 text-right tabular-nums`}
                      >
                        {v != null ? formatNumber(v, lang) : ""}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-left font-semibold text-ink">
                    {fmtRp(stats.avg, lang)}
                  </td>
                  <td className="px-2 py-1.5 text-left text-emerald-700">
                    {fmtRp(stats.min, lang)}
                  </td>
                  <td className="px-2 py-1.5 text-left text-rose-700">
                    {fmtRp(stats.max, lang)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 border-t border-ink/10 bg-paper px-5 py-2.5 text-[11px] text-ink2/80">
        <span>
          <strong className="text-ink">{summary.rows}</strong>{" "}
          {t("priceList.summaryRows", lang)} ·{" "}
          <strong className="text-ink">
            {summary.filled}/{summary.totalCells}
          </strong>{" "}
          {t("priceList.summaryFilled", lang)} (
          <strong className="text-ink">{summary.pct}%</strong>)
        </span>
        <span>{ti("priceList.weeksCount", lang, { n: activeWeeks.length })}</span>
        <span>{t("priceList.legend", lang)}</span>
        {!canEdit && (
          <span className="text-ink2/50">{t("priceList.readOnly", lang)}</span>
        )}
      </div>
    </Section>
  );
}
