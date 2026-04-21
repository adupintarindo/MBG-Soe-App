"use client";

import { useMemo, useState } from "react";
import { Badge, CategoryBadge, IDR } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { t, ti, formatNumber, type Lang, type LangKey } from "@/lib/i18n";
import { formatIDR } from "@/lib/engine";

const REASON_KEY: Record<string, LangKey> = {
  receipt: "stock.reasonReceipt",
  consumption: "stock.reasonConsumption",
  adjustment: "stock.reasonAdjustment",
  waste: "stock.reasonWaste",
  transfer_in: "stock.reasonTransferIn",
  transfer_out: "stock.reasonTransferOut",
  opening: "stock.reasonOpening"
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

function reasonLabel(reason: string, lang: Lang): string {
  const key = REASON_KEY[reason];
  return key ? t(key, lang) : reason;
}

export type ShortRow = {
  item_code: string;
  required: number;
  on_hand: number;
  gap: number;
  unit: string;
};

export function StockShortTable({
  rows,
  lang
}: {
  rows: ShortRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<ShortRow>[] = [
    {
      key: "item",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => <span className="font-semibold">{r.item_code}</span>
    },
    {
      key: "req",
      label: t("common.required", lang),
      sortValue: (r) => r.required,
      render: (r) => (
        <span className="font-mono text-xs">{r.required.toFixed(2)}</span>
      )
    },
    {
      key: "onhand",
      label: t("common.onHand", lang),
      sortValue: (r) => r.on_hand,
      render: (r) => (
        <span className="font-mono text-xs">{r.on_hand.toFixed(2)}</span>
      )
    },
    {
      key: "gap",
      label: t("common.gap", lang),
      sortValue: (r) => r.gap,
      render: (r) => (
        <span className="font-mono text-xs font-black text-red-700">
          {r.gap.toFixed(2)} {r.unit}
        </span>
      )
    }
  ];

  return (
    <SortableTable<ShortRow>
      tableClassName="text-sm"
      rowKey={(r) => r.item_code}
      initialSort={{ key: "gap", dir: "desc" }}
      columns={columns}
      rows={rows}
      stickyHeader
      bodyMaxHeight={440}
    />
  );
}

export type StockMasterRow = {
  code: string;
  category: string;
  qty: number;
  unit: string;
  price_idr: number;
  value: number;
  weekly: number;
  weeksCover: number;
  shortGap: number | null;
};

export type StockValueBatch = {
  id: number;
  batch_code: string | null;
  grn_no: string | null;
  supplier_id: string | null;
  qty_remaining: number;
  unit: string;
  received_date: string | null;
  expiry_date: string | null;
};

export function StockMasterTable({
  rows,
  lang,
  batchesByItem,
  supplierNames
}: {
  rows: StockMasterRow[];
  lang: Lang;
  batchesByItem?: Record<string, StockValueBatch[]>;
  supplierNames?: Record<string, string>;
}) {
  const [valueModal, setValueModal] = useState<StockMasterRow | null>(null);
  const columns: SortableColumn<StockMasterRow>[] = [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "52px",
      sortable: false,
      render: (_r, i) => <span className="text-ink2">{i + 1}</span>
    },
    {
      key: "code",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.code,
      render: (r) => <span className="font-semibold">{r.code}</span>
    },
    {
      key: "cat",
      label: t("common.category", lang),
      sortValue: (r) => r.category,
      render: (r) => (
        <div className="flex justify-center">
          <CategoryBadge category={r.category} />
        </div>
      )
    },
    {
      key: "qty",
      label: t("common.qty", lang),
      align: "right",
      sortValue: (r) => r.qty,
      render: (r) => (
        <span className="font-mono text-xs font-black">
          {formatNumber(r.qty, lang, { maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: "unit",
      label: t("common.unit", lang),
      sortValue: (r) => r.unit,
      render: (r) => <span className="text-xs">{r.unit}</span>
    },
    {
      key: "price",
      label: t("stock.colHarga", lang),
      align: "left",
      sortValue: (r) => r.price_idr,
      render: (r) => <IDR value={r.price_idr} className="text-xs" />
    },
    {
      key: "value",
      label: t("stock.colNilai", lang),
      align: "left",
      sortValue: (r) => r.value,
      exportValue: (r) => Number(r.value.toFixed(2)),
      exportNumFmt: '"Rp "#,##0',
      render: (r) => (
        <button
          type="button"
          onClick={() => setValueModal(r)}
          aria-label={t("stock.valueOpen", lang)}
          title={t("stock.valueOpen", lang)}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-white px-2 py-0.5 text-ink transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          <IDR value={r.value} className="text-xs" />
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-3 w-3 text-ink2/70"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )
    },
    {
      key: "weekly",
      label: t("stock.colVolWeekly", lang),
      align: "right",
      sortValue: (r) => r.weekly,
      render: (r) => (
        <span className="font-mono text-xs text-ink2/70">
          {r.weekly > 0 ? r.weekly.toFixed(1) : "—"}
        </span>
      )
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => {
        if (r.shortGap != null && r.shortGap > 0) return 0;
        if (r.qty <= 0) return 1;
        if (r.weeksCover < 1) return 2;
        return 3;
      },
      render: (r) => {
        if (r.shortGap != null && r.shortGap > 0)
          return (
            <Badge tone="bad">
              {ti("stock.statusShort", lang, { gap: r.shortGap.toFixed(1) })}
            </Badge>
          );
        if (r.qty <= 0)
          return <Badge tone="muted">{t("stock.statusEmpty", lang)}</Badge>;
        if (r.weeksCover < 1)
          return (
            <Badge tone="warn">
              {ti("stock.statusLow", lang, { w: r.weeksCover.toFixed(1) })}
            </Badge>
          );
        return (
          <Badge tone="ok">
            {t("stock.statusOK", lang)}
            {r.weeksCover < 99 ? ` · ${r.weeksCover.toFixed(1)}w` : ""}
          </Badge>
        );
      }
    }
  ];

  return (
    <>
      <SortableTable<StockMasterRow>
        tableClassName="text-sm"
        rowKey={(r) => r.code}
        initialSort={{ key: "value", dir: "desc" }}
        columns={columns}
        rows={rows}
        searchable
        stickyHeader
        bodyMaxHeight={520}
      />
      {valueModal && (
        <StockValueModal
          row={valueModal}
          lang={lang}
          batches={batchesByItem?.[valueModal.code] ?? []}
          supplierNames={supplierNames ?? {}}
          onClose={() => setValueModal(null)}
        />
      )}
    </>
  );
}

function StockValueModal({
  row,
  lang,
  batches,
  supplierNames,
  onClose
}: {
  row: StockMasterRow;
  lang: Lang;
  batches: StockValueBatch[];
  supplierNames: Record<string, string>;
  onClose: () => void;
}) {
  const sortedBatches = useMemo(
    () =>
      [...batches].sort((a, b) => {
        // Expiry nulls last, then by expiry ascending, then received_date
        const aExp = a.expiry_date ?? "9999-12-31";
        const bExp = b.expiry_date ?? "9999-12-31";
        if (aExp !== bExp) return aExp.localeCompare(bExp);
        return (a.received_date ?? "").localeCompare(b.received_date ?? "");
      }),
    [batches]
  );

  const batchesValue = sortedBatches.reduce(
    (s, b) => s + b.qty_remaining * row.price_idr,
    0
  );
  const totalBatchQty = sortedBatches.reduce((s, b) => s + b.qty_remaining, 0);

  const formulaText = ti("stock.valueFormula", lang, {
    qty: formatNumber(row.qty, lang, { maximumFractionDigits: 2 }),
    unit: row.unit,
    price: formatIDR(row.price_idr),
    value: formatIDR(row.value)
  });

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
            <h3 className="truncate text-base font-black">
              {ti("stock.valueModalTitle", lang, { code: row.code })}
            </h3>
            <p className="mt-0.5 text-[11.5px] text-white/85">{formulaText}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-[11px] font-bold text-white ring-1 ring-white/25 hover:bg-white/20"
          >
            {t("stock.valueClose", lang)} ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <h4 className="mb-2 text-[11px] font-black uppercase tracking-wide text-ink2/80">
            {ti("stock.valueBatchesTitle", lang, { n: sortedBatches.length })}
          </h4>

          {sortedBatches.length === 0 ? (
            <div className="rounded-lg bg-paper/60 px-4 py-6 text-center text-[11.5px] text-ink2/70 ring-1 ring-ink/5">
              {t("stock.valueBatchesEmpty", lang)}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg ring-1 ring-ink/5">
              <table className="w-full text-[11.5px]">
                <thead className="bg-paper/60 text-[10.5px] uppercase text-ink2">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">
                      {t("stock.valueColBatch", lang)}
                    </th>
                    <th className="px-3 py-2 text-left font-bold">
                      {t("stock.valueColSupplier", lang)}
                    </th>
                    <th className="px-3 py-2 text-center font-bold">
                      {t("stock.valueColReceived", lang)}
                    </th>
                    <th className="px-3 py-2 text-center font-bold">
                      {t("stock.valueColExpiry", lang)}
                    </th>
                    <th className="px-3 py-2 text-right font-bold">
                      {t("stock.valueColRemaining", lang)}
                    </th>
                    <th className="px-3 py-2 text-right font-bold">
                      {t("stock.valueColValue", lang)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {sortedBatches.map((b) => {
                    const val = b.qty_remaining * row.price_idr;
                    const supName =
                      (b.supplier_id && supplierNames[b.supplier_id]) ||
                      b.supplier_id ||
                      "—";
                    return (
                      <tr key={b.id} className="hover:bg-paper/40">
                        <td className="px-3 py-2">
                          <div className="font-mono font-bold text-ink">
                            {b.batch_code ?? t("stock.valueNoBatch", lang)}
                          </div>
                          {b.grn_no && (
                            <div className="mt-0.5 font-mono text-[10px] text-ink2/70">
                              {b.grn_no}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-ink2">{supName}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-ink2">
                          {b.received_date ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-ink2">
                          {b.expiry_date ?? t("stock.valueNoExpiry", lang)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-ink">
                          {formatNumber(b.qty_remaining, lang, {
                            maximumFractionDigits: 2
                          })}{" "}
                          <span className="text-ink2/60">{b.unit}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-ink">
                          {formatIDR(val)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-paper/40">
                  <tr className="border-t border-ink/10">
                    <td
                      colSpan={4}
                      className="px-3 py-2 text-right text-[11px] font-black uppercase text-ink2"
                    >
                      {t("stock.valueTotalLabel", lang)}
                    </td>
                    <td className="px-3 py-2 text-right font-black text-ink">
                      {formatNumber(totalBatchQty, lang, {
                        maximumFractionDigits: 2
                      })}{" "}
                      <span className="text-ink2/60">{row.unit}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-black text-ink">
                      {formatIDR(batchesValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type MoveRow = {
  id: number;
  item_code: string;
  delta: number;
  reason: string;
  ref_doc: string | null;
  ref_no: string | null;
  note: string | null;
  created_at: string;
};

export function StockMovesTable({
  rows,
  lang
}: {
  rows: MoveRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<MoveRow>[] = [
    {
      key: "time",
      label: t("common.time", lang),
      sortValue: (r) => r.created_at,
      render: (r) => (
        <span className="font-mono text-[11px]">
          {new Date(r.created_at).toLocaleString(
            lang === "EN" ? "en-US" : "id-ID",
            {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            }
          )}
        </span>
      )
    },
    {
      key: "item",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => <span className="font-semibold">{r.item_code}</span>
    },
    {
      key: "reason",
      label: t("common.reason", lang),
      sortValue: (r) => r.reason,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${REASON_COLOR[r.reason] ?? REASON_COLOR.adjustment}`}
        >
          {reasonLabel(r.reason, lang)}
        </span>
      )
    },
    {
      key: "delta",
      label: t("common.delta", lang),
      align: "right",
      sortValue: (r) => r.delta,
      render: (r) => (
        <span
          className={`font-mono text-xs font-black ${
            r.delta >= 0 ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {r.delta >= 0 ? "+" : ""}
          {r.delta.toFixed(2)}
        </span>
      )
    },
    {
      key: "ref",
      label: t("stock.colRef", lang),
      sortValue: (r) =>
        r.ref_doc && r.ref_no
          ? `${r.ref_doc.toUpperCase()} ${r.ref_no}`
          : r.ref_doc ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {r.ref_doc && r.ref_no
            ? `${r.ref_doc.toUpperCase()} ${r.ref_no}`
            : r.ref_doc || "—"}
        </span>
      )
    },
    {
      key: "note",
      label: t("common.note", lang),
      align: "left",
      sortValue: (r) => r.note ?? "",
      render: (r) => (
        <span className="text-xs text-ink2/70">{r.note || "—"}</span>
      )
    }
  ];

  return (
    <SortableTable<MoveRow>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "time", dir: "desc" }}
      columns={columns}
      rows={rows}
      stickyHeader
      bodyMaxHeight={480}
    />
  );
}
