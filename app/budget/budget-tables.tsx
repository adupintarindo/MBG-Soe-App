"use client";

import { Badge, IDR } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import {
  DateRangeToolbar,
  useDateRangeFilter
} from "@/components/date-range-toolbar";
import { t, type Lang } from "@/lib/i18n";
import type { BudgetBurnRow, CostPerPortionRow } from "@/lib/engine";
import { formatDateLong } from "@/lib/engine";

export type BudgetRow = {
  id: number;
  period: string;
  source: string;
  source_name: string | null;
  amount_idr: number;
  target_cost_per_portion: number | null;
  note: string | null;
};

export function BurnTable({
  rows,
  lang
}: {
  rows: BudgetBurnRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<BudgetBurnRow>[] = [
    {
      key: "period",
      label: t("bud.colPeriod", lang),
      align: "left",
      sortValue: (r) => r.period,
      render: (r) => <span className="font-mono text-xs font-bold">{r.period}</span>
    },
    {
      key: "budget",
      label: t("bud.colAmount", lang),
      align: "left",
      sortValue: (r) => r.budget_total,
      render: (r) => <IDR value={r.budget_total} className="text-xs" />
    },
    {
      key: "po",
      label: t("bud.colSpentPO", lang),
      align: "left",
      sortValue: (r) => r.spent_po,
      render: (r) => <IDR value={r.spent_po} className="text-xs text-ink2" />
    },
    {
      key: "inv",
      label: t("bud.colSpentInv", lang),
      align: "left",
      sortValue: (r) => r.spent_invoice,
      render: (r) => <IDR value={r.spent_invoice} className="text-xs" />
    },
    {
      key: "paid",
      label: t("bud.colSpentPaid", lang),
      align: "left",
      sortValue: (r) => r.spent_paid,
      render: (r) => <IDR value={r.spent_paid} className="text-xs text-red-700" />
    },
    {
      key: "burn",
      label: t("bud.kpiBurnPct", lang),
      align: "right",
      sortValue: (r) => r.burn_pct ?? 0,
      render: (r) => {
        const pct = Number(r.burn_pct ?? 0);
        return (
          <span
            className={`font-mono text-xs font-black ${
              pct > 90
                ? "text-red-700"
                : pct > 70
                  ? "text-amber-700"
                  : "text-emerald-700"
            }`}
          >
            {r.burn_pct != null ? `${pct.toFixed(1)}%` : "—"}
          </span>
        );
      }
    },
    {
      key: "remaining",
      label: t("bud.colRemaining", lang),
      align: "left",
      sortValue: (r) => r.remaining,
      render: (r) => (
        <IDR
          value={r.remaining}
          className={`text-xs ${
            r.remaining < 0 ? "text-red-700" : "text-ink"
          }`}
        />
      )
    }
  ];

  return (
    <SortableTable<BudgetBurnRow>
      tableClassName="text-sm"
      rowKey={(r) => r.period}
      initialSort={{ key: "period", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="budget-burn"
      exportSheetName="Burn"
      stickyHeader
      bodyMaxHeight={440}
    />
  );
}

export function CPPTable({
  rows,
  lang
}: {
  rows: CostPerPortionRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<CostPerPortionRow>[] = [
    {
      key: "date",
      label: t("common.dayDate", lang),
      align: "left",
      sortValue: (r) => r.op_date,
      render: (r) => (
        <span className="text-[11px] font-semibold">{formatDateLong(r.op_date, lang)}</span>
      )
    },
    {
      key: "porsi",
      label: t("bud.colPorsi", lang),
      align: "right",
      sortValue: (r) => r.total_porsi,
      render: (r) => (
        <span className="font-mono text-xs">{r.total_porsi}</span>
      )
    },
    {
      key: "po",
      label: t("bud.colSpentPO", lang),
      align: "left",
      sortValue: (r) => r.spent_po,
      render: (r) => <IDR value={r.spent_po} className="text-xs" />
    },
    {
      key: "cpp",
      label: t("bud.colCPP", lang),
      align: "left",
      sortValue: (r) => r.cost_per_portion ?? 0,
      render: (r) => {
        const cpp = Number(r.cost_per_portion ?? 0);
        const target = Number(r.target ?? 0);
        return (
          r.cost_per_portion == null ? (
            <span className="font-mono text-xs text-ink2/60">—</span>
          ) : (
            <IDR
              value={cpp}
              className={`text-xs font-black ${
                target > 0 && cpp > target ? "text-red-700" : "text-emerald-700"
              }`}
            />
          )
        );
      }
    },
    {
      key: "target",
      label: "Target",
      align: "left",
      sortValue: (r) => r.target ?? 0,
      render: (r) =>
        r.target != null ? (
          <IDR value={Number(r.target)} className="text-[11px] text-ink2" />
        ) : (
          <span className="text-ink2/40 text-[11px]">—</span>
        )
    },
    {
      key: "status",
      label: t("common.status", lang),
      sortValue: (r) => {
        const cpp = Number(r.cost_per_portion ?? 0);
        const target = Number(r.target ?? 0);
        if (!cpp || !target) return 99;
        return cpp > target ? 1 : 0;
      },
      render: (r) => {
        const cpp = Number(r.cost_per_portion ?? 0);
        const target = Number(r.target ?? 0);
        if (!cpp || !target) return <span className="text-ink2/60">—</span>;
        return cpp > target ? (
          <Badge tone="bad">{t("bud.cppOverTarget", lang)}</Badge>
        ) : (
          <Badge tone="ok">{t("bud.cppUnderTarget", lang)}</Badge>
        );
      }
    }
  ];

  const dr = useDateRangeFilter(rows, (r) => r.op_date);
  return (
    <SortableTable<CostPerPortionRow>
      tableClassName="text-sm"
      rowKey={(r) => r.op_date}
      initialSort={{ key: "date", dir: "desc" }}
      columns={columns}
      rows={dr.filtered}
      searchable
      exportable
      exportFileName="cost-per-portion"
      exportSheetName="CPP"
      stickyHeader
      bodyMaxHeight={460}
      toolbarExtra={
        <DateRangeToolbar
          from={dr.from}
          to={dr.to}
          onChange={dr.onChange}
          onReset={dr.reset}
          rangeActive={dr.rangeActive}
        />
      }
    />
  );
}

const SOURCE_LABEL: Record<string, string> = {
  dinas: "Dinas",
  wfp: "WFP",
  ifsr: "IFSR",
  ffi: "FFI",
  donor_swasta: "Donor Swasta",
  lainnya: "Lainnya"
};

export function BudgetsTable({
  rows,
  lang
}: {
  rows: BudgetRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<BudgetRow>[] = [
    {
      key: "period",
      label: t("bud.colPeriod", lang),
      align: "left",
      sortValue: (r) => r.period,
      render: (r) => <span className="font-mono text-xs">{r.period}</span>
    },
    {
      key: "source",
      label: t("bud.colSource", lang),
      sortValue: (r) => r.source,
      render: (r) => (
        <div>
          <Badge tone="accent">{SOURCE_LABEL[r.source] ?? r.source}</Badge>
          {r.source_name && (
            <div className="mt-0.5 text-[10px] text-ink2/70">
              {r.source_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: "amount",
      label: t("bud.colAmount", lang),
      align: "left",
      sortValue: (r) => r.amount_idr,
      render: (r) => <IDR value={r.amount_idr} className="text-xs font-black" />
    },
    {
      key: "target",
      label: t("bud.colTarget", lang),
      align: "left",
      sortValue: (r) => r.target_cost_per_portion ?? 0,
      render: (r) =>
        r.target_cost_per_portion != null ? (
          <IDR value={r.target_cost_per_portion} className="text-[11px]" />
        ) : (
          <span className="text-ink2/40 text-[11px]">—</span>
        )
    },
    {
      key: "note",
      label: t("common.note", lang),
      align: "left",
      sortValue: (r) => r.note ?? "",
      render: (r) => (
        <span className="text-xs text-ink2/70">{r.note ?? "—"}</span>
      )
    }
  ];

  return (
    <SortableTable<BudgetRow>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "period", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="budgets"
      exportSheetName="Budgets"
      stickyHeader
      bodyMaxHeight={460}
    />
  );
}
