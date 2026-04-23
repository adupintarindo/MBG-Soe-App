"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, EmptyState } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import {
  DateRangeToolbar,
  useDateRangeFilter
} from "@/components/date-range-toolbar";
import type {
  GrnQcCheck,
  NcrEntry,
  QcResult,
  NcrSeverity,
  NcrStatus
} from "@/lib/engine";
import { t, ti, numberLocale, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
import { formatDateShort, formatDateLong } from "@/lib/engine";

const RESULT_TONE: Record<QcResult, string> = {
  pass: "bg-emerald-100 text-emerald-800",
  minor: "bg-amber-100 text-amber-900",
  major: "bg-orange-100 text-orange-900",
  critical: "bg-red-100 text-red-800",
  na: "bg-slate-100 text-slate-700"
};

const SEV_TONE: Record<NcrSeverity, string> = {
  minor: "bg-amber-100 text-amber-900",
  major: "bg-orange-100 text-orange-900",
  critical: "bg-red-100 text-red-800"
};

const STATUS_TONE: Record<NcrStatus, string> = {
  open: "bg-red-100 text-red-800",
  in_progress: "bg-amber-100 text-amber-900",
  resolved: "bg-emerald-100 text-emerald-800",
  waived: "bg-slate-100 text-slate-700"
};

interface GrnRow {
  no: string;
  po_no: string | null;
  grn_date: string;
  status: string;
  qc_note: string | null;
}

interface GrnQcAggregate {
  grn_no: string;
  total: number;
  fail: number;
  has_critical: boolean;
}

interface Props {
  grns: GrnRow[];
  qcAgg: GrnQcAggregate[];
  ncrs: NcrEntry[];
  canWrite: boolean;
  supplierIds: Record<string, string>; // po_no → supplier_id
  supplierNames: Record<string, string>; // supplier_id → name
}

function grnColumns({
  lang,
  aggMap,
  ncrByGrn,
  supplierIds,
  supplierNames
}: {
  lang: "ID" | "EN";
  aggMap: Map<string, GrnQcAggregate>;
  ncrByGrn: Map<string, NcrEntry[]>;
  supplierIds: Record<string, string>;
  supplierNames: Record<string, string>;
}): SortableColumn<GrnRow>[] {
  const supName = (poNo: string | null): string => {
    if (!poNo) return "—";
    const sid = supplierIds[poNo];
    if (!sid) return "—";
    return supplierNames[sid] ?? sid;
  };
  return [
    {
      key: "no",
      label: t("grnQc.colGrn", lang),
      align: "left",
      sortValue: (r) => r.no,
      render: (r) => (
        <span className="font-mono text-xs font-black">{r.no}</span>
      )
    },
    {
      key: "date",
      label: t("common.dayDate", lang),
      align: "left",
      sortValue: (r) => r.grn_date,
      render: (r) => <span className="text-xs">{formatDateLong(r.grn_date, lang)}</span>
    },
    {
      key: "po",
      label: t("grnQc.colPo", lang),
      sortValue: (r) => r.po_no ?? "",
      render: (r) => (
        <span className="font-mono text-xs">{r.po_no ?? "—"}</span>
      )
    },
    {
      key: "supplier",
      label: t("grnQc.colSupplier", lang),
      align: "left",
      sortValue: (r) => supName(r.po_no),
      render: (r) => <span className="text-xs">{supName(r.po_no)}</span>
    },
    {
      key: "qc",
      label: t("grnQc.colQc", lang),
      align: "right",
      sortValue: (r) => {
        const a = aggMap.get(r.no);
        return a ? a.total : -1;
      },
      render: (r) => {
        const a = aggMap.get(r.no);
        if (!a) return <span className="text-[11px] text-ink2/60">—</span>;
        return (
          <span className="font-mono text-xs">
            {formatNumber(a.total - a.fail, lang)}/{formatNumber(a.total, lang)}
          </span>
        );
      }
    },
    {
      key: "ncr",
      label: t("grnQc.colNcr", lang),
      align: "right",
      sortValue: (r) => ncrByGrn.get(r.no)?.length ?? 0,
      render: (r) => {
        const list = ncrByGrn.get(r.no) ?? [];
        if (list.length === 0)
          return <span className="text-[11px] text-ink2/60">—</span>;
        const hasCrit = list.some((n) => n.severity === "critical");
        return (
          <Badge tone={hasCrit ? "bad" : "warn"}>
            {formatNumber(list.length, lang)}
          </Badge>
        );
      }
    },
    {
      key: "status",
      label: t("grnQc.colStatus", lang),
      sortValue: (r) => r.status,
      render: (r) => (
        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink2">
          {r.status}
        </span>
      )
    },
    {
      key: "linkQc",
      label: "",
      align: "right",
      sortable: false,
      render: () => (
        <span className="text-[11px] font-bold text-accent-strong">
          {t("grnQc.linkQc", lang)}
        </span>
      )
    }
  ];
}

export function GrnQcPanel({
  grns,
  qcAgg,
  ncrs,
  canWrite,
  supplierIds,
  supplierNames
}: Props) {
  const { lang } = useLang();
  const [openGrn, setOpenGrn] = useState<string | null>(null);
  const [openNcr, setOpenNcr] = useState(false);

  const aggMap = useMemo(() => {
    const m = new Map<string, GrnQcAggregate>();
    for (const a of qcAgg) m.set(a.grn_no, a);
    return m;
  }, [qcAgg]);

  const ncrByGrn = useMemo(() => {
    const m = new Map<string, NcrEntry[]>();
    for (const n of ncrs) {
      if (!n.grn_no) continue;
      const list = m.get(n.grn_no) ?? [];
      list.push(n);
      m.set(n.grn_no, list);
    }
    return m;
  }, [ncrs]);

  const activeNcr = ncrs.filter((n) =>
    ["open", "in_progress"].includes(n.status)
  );

  const grnDr = useDateRangeFilter(grns, (g) => g.grn_date);

  return (
    <div className="space-y-6">
      {canWrite && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpenNcr(true)}
            className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-card hover:bg-red-700"
          >
            {t("grnQc.btnNewNcr", lang)}
          </button>
        </div>
      )}

      {grns.length === 0 ? (
        <EmptyState message={t("grnQc.emptyGrn", lang)} />
      ) : (
        <SortableTable<GrnRow>
          columns={grnColumns({
            lang,
            aggMap,
            ncrByGrn,
            supplierIds,
            supplierNames
          })}
          rows={grnDr.filtered}
          rowKey={(g) => g.no}
          onRowClick={(g) => setOpenGrn(g.no)}
          variant="dark"
          searchable
          exportable
          exportFileName="grns"
          exportSheetName="GRNs"
          initialSort={{ key: "date", dir: "desc" }}
          stickyHeader
          bodyMaxHeight={500}
          toolbarExtra={
            <DateRangeToolbar
              from={grnDr.from}
              to={grnDr.to}
              onChange={grnDr.onChange}
              onReset={grnDr.reset}
              rangeActive={grnDr.rangeActive}
            />
          }
        />
      )}

      {ncrs.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink2/70">
            {ti("grnQc.logTitle", lang, { n: ncrs.length })}
          </div>
          <SortableTable<NcrTableRow>
            columns={ncrColumns({ lang, canWrite })}
            rows={ncrs.slice(0, 20).map((n) => ({
              ...n,
              _supplierName: n.supplier_id
                ? supplierNames[n.supplier_id] ?? null
                : null
            }))}
            rowKey={(n) => n.id}
            searchable
            exportable
            exportFileName="ncr-log"
            exportSheetName="NCR"
            initialSort={{ key: "reported", dir: "desc" }}
            stickyHeader
            bodyMaxHeight={460}
          />
        </div>
      )}

      {openGrn && (
        <GrnQcDetail
          grnNo={openGrn}
          itemCode={null}
          canWrite={canWrite}
          onClose={() => setOpenGrn(null)}
        />
      )}

      {openNcr && canWrite && (
        <NewNcrDialog onClose={() => setOpenNcr(false)} grns={grns} />
      )}
    </div>
  );
}

type NcrTableRow = NcrEntry & { _supplierName: string | null };

function ncrColumns({
  lang,
  canWrite
}: {
  lang: "ID" | "EN";
  canWrite: boolean;
}): SortableColumn<NcrTableRow>[] {
  return [
    {
      key: "ncrNo",
      label: t("grnQc.colNcrNo", lang),
      align: "left",
      sortValue: (r) => r.ncr_no ?? `#${r.id}`,
      render: (r) => (
        <span className="font-mono text-[11px] font-black">
          {r.ncr_no ?? `#${r.id}`}
        </span>
      )
    },
    {
      key: "grn",
      label: t("grnQc.colGrn", lang),
      align: "left",
      sortValue: (r) => r.grn_no ?? "",
      render: (r) => (
        <span className="font-mono text-[11px]">{r.grn_no ?? "—"}</span>
      )
    },
    {
      key: "supplier",
      label: t("grnQc.colSupplier", lang),
      align: "left",
      sortValue: (r) => r._supplierName ?? r.supplier_id ?? "",
      render: (r) => (
        <span className="text-xs">
          {r._supplierName ?? r.supplier_id ?? "—"}
        </span>
      )
    },
    {
      key: "severity",
      label: t("grnQc.colSeverity", lang),
      align: "left",
      sortValue: (r) => r.severity,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_TONE[r.severity]}`}
        >
          {r.severity}
        </span>
      )
    },
    {
      key: "issue",
      label: t("grnQc.colIssue", lang),
      align: "left",
      sortValue: (r) => r.issue,
      searchValue: (r) => `${r.issue} ${r.corrective_action ?? ""}`,
      render: (r) => (
        <div className="text-xs">
          <div className="line-clamp-2">{r.issue}</div>
          {r.corrective_action && (
            <div className="text-[10px] italic text-emerald-700">
              ✓ {r.corrective_action}
            </div>
          )}
        </div>
      )
    },
    {
      key: "status",
      label: t("grnQc.colStatus", lang),
      align: "left",
      sortValue: (r) => r.status,
      render: (r) => <NcrStatusCell n={r} canWrite={canWrite} />
    },
    {
      key: "reported",
      label: t("grnQc.colReported", lang),
      align: "left",
      sortValue: (r) => r.reported_at,
      render: (r) => (
        <span className="text-[10px] text-ink2">
          {new Date(r.reported_at).toLocaleDateString(numberLocale(lang))}
        </span>
      )
    },
    {
      key: "cost",
      label: "",
      align: "right",
      sortValue: (r) => r.cost_impact_idr ?? 0,
      exportValue: (r) => r.cost_impact_idr ?? 0,
      render: (r) =>
        r.cost_impact_idr && r.cost_impact_idr > 0 ? (
          <span className="font-mono text-[10px] text-red-700">
            -{formatNumber(Number(r.cost_impact_idr), lang)}
          </span>
        ) : null
    }
  ];
}

function NcrStatusCell({
  n,
  canWrite
}: {
  n: NcrEntry;
  canWrite: boolean;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [caDialog, setCaDialog] = useState<{
    nextStatus: NcrStatus;
  } | null>(null);

  const applyStatus = (
    status: NcrStatus,
    correctiveAction?: string | null
  ) => {
    const body: Record<string, unknown> = { status };
    if (correctiveAction !== undefined) {
      body.corrective_action = correctiveAction;
    }
    start(async () => {
      await fetch(`/api/ncr/${n.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      router.refresh();
    });
  };

  const setStatus = (status: NcrStatus) => {
    if (status === n.status) return;
    if (status === "resolved" || status === "waived") {
      setCaDialog({ nextStatus: status });
      return;
    }
    applyStatus(status);
  };

  if (!canWrite) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[n.status]}`}
      >
        {n.status}
      </span>
    );
  }
  return (
    <>
      <select
        disabled={pending}
        value={n.status}
        onChange={(e) => setStatus(e.target.value as NcrStatus)}
        className="rounded-md border border-ink/10 bg-white px-2 py-0.5 text-[10px] font-bold"
      >
        <option value="open">open</option>
        <option value="in_progress">in_progress</option>
        <option value="resolved">resolved</option>
        <option value="waived">waived</option>
      </select>
      {caDialog && (
        <CorrectiveActionDialog
          ncrLabel={n.ncr_no ?? `#${n.id}`}
          nextStatus={caDialog.nextStatus}
          initial={n.corrective_action ?? ""}
          onCancel={() => setCaDialog(null)}
          onSubmit={(ca) => {
            setCaDialog(null);
            applyStatus(caDialog.nextStatus, ca.trim() || null);
          }}
        />
      )}
    </>
  );
}

function CorrectiveActionDialog({
  ncrLabel,
  nextStatus,
  initial,
  onCancel,
  onSubmit
}: {
  ncrLabel: string;
  nextStatus: NcrStatus;
  initial: string;
  onCancel: () => void;
  onSubmit: (ca: string) => void;
}) {
  const { lang } = useLang();
  const [value, setValue] = useState(initial);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 pt-[10vh] pb-[6vh]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(value);
        }}
        className="w-full max-w-lg space-y-3 rounded-2xl bg-paper p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black">
              {ti("grnQc.caDialogTitle", lang, { ncr: ncrLabel })}
            </h3>
            <p className="mt-0.5 text-[11px] text-ink2/70">
              {t("grnQc.caDialogHint", lang)}
            </p>
            <p className="mt-1 text-[11px]">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[nextStatus]}`}
              >
                {ti("grnQc.caDialogStatus", lang, { status: nextStatus })}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-ink2 hover:text-ink"
            aria-label={t("common.close", lang)}
          >
            ✕
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("grnQc.promptCa", lang)}
          </span>
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder={t("grnQc.caPlaceholder", lang)}
            className="w-full rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
          />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink"
          >
            {t("common.cancel", lang)}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            {t("grnQc.btnCaSave", lang)}
          </button>
        </div>
      </form>
    </div>
  );
}

function GrnQcDetail({
  grnNo,
  itemCode,
  canWrite,
  onClose
}: {
  grnNo: string;
  itemCode: string | null;
  canWrite: boolean;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const [checks, setChecks] = useState<GrnQcCheck[]>([]);
  const [draft, setDraft] = useState<
    Array<{
      checkpoint: string;
      is_critical: boolean;
      result: QcResult;
      note: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, start] = useTransition();

  const loadChecks = async () => {
    setLoading(true);
    const res = await fetch(`/api/grn-qc/list?grn=${encodeURIComponent(grnNo)}`);
    if (res.ok) {
      const j = (await res.json()) as { checks: GrnQcCheck[] };
      setChecks(j.checks ?? []);
    }
    setLoading(false);
  };

  const loadTemplate = async (itemForTemplate: string) => {
    const res = await fetch(
      `/api/grn-qc/template?item=${encodeURIComponent(itemForTemplate)}`
    );
    if (res.ok) {
      const j = (await res.json()) as {
        template: Array<{
          checkpoint: string;
          is_critical: boolean;
        }>;
      };
      setDraft(
        (j.template ?? []).map((tpl) => ({
          checkpoint: tpl.checkpoint,
          is_critical: tpl.is_critical,
          result: "pass" as QcResult,
          note: ""
        }))
      );
    }
  };

  // Initial load
  useMemo(() => {
    loadChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grnNo]);

  const submit = () => {
    if (draft.length === 0) return;
    start(async () => {
      await fetch("/api/grn-qc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grn_no: grnNo,
          item_code: itemCode,
          checks: draft
        })
      });
      setDraft([]);
      await loadChecks();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 pt-[5vh] pb-[5vh]">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-paper shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-ink/10 bg-paper px-5 py-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/60">
              {t("grnQc.detailHead", lang)}
            </div>
            <div className="font-mono text-sm font-black">{grnNo}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink2 hover:bg-ink/5"
            aria-label={t("grnQc.closeAria", lang)}
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {canWrite && draft.length === 0 && (
            <TemplateLoader onLoad={loadTemplate} />
          )}

          {canWrite && draft.length > 0 && (
            <div className="mb-4 space-y-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">
                  {ti("grnQc.draftTitle", lang, { n: draft.length })}
                </span>
                <button
                  type="button"
                  onClick={() => setDraft([])}
                  className="text-[10px] text-amber-900 underline"
                >
                  {t("grnQc.btnReset", lang)}
                </button>
              </div>
              {draft.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs"
                >
                  <span className="flex-1">
                    {d.checkpoint}
                    {d.is_critical && (
                      <span className="ml-1 text-red-600">★</span>
                    )}
                  </span>
                  <select
                    value={d.result}
                    onChange={(e) => {
                      const v = e.target.value as QcResult;
                      setDraft((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, result: v } : p
                        )
                      );
                    }}
                    className="rounded border border-ink/10 px-1 py-0.5 text-[10px] font-bold"
                  >
                    <option value="pass">pass</option>
                    <option value="minor">minor</option>
                    <option value="major">major</option>
                    <option value="critical">critical</option>
                    <option value="na">N/A</option>
                  </select>
                  <input
                    type="text"
                    value={d.note}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, note: v } : p
                        )
                      );
                    }}
                    placeholder={t("grnQc.phNote", lang)}
                    className="w-32 rounded border border-ink/10 px-1 py-0.5 text-[10px]"
                  />
                </div>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={submit}
                className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? t("grnQc.saving", lang) : ti("grnQc.btnSaveDraft", lang, { n: draft.length })}
              </button>
            </div>
          )}

          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink2/70">
            {ti("grnQc.resultsTitle", lang, { n: checks.length })}
          </div>
          {loading && <div className="text-xs text-ink2">{t("grnQc.loading", lang)}</div>}
          {!loading && checks.length === 0 && (
            <EmptyState message={t("grnQc.noChecks", lang)} />
          )}
          {checks.length > 0 && (
            <div className="space-y-1">
              {checks.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-xs ring-1 ring-ink/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {c.checkpoint}
                      {c.is_critical && (
                        <span className="ml-1 text-red-600">★</span>
                      )}
                    </div>
                    {c.note && (
                      <div className="text-[10px] italic text-ink2">
                        {c.note}
                      </div>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RESULT_TONE[c.result]}`}
                  >
                    {c.result}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateLoader({ onLoad }: { onLoad: (item: string) => void }) {
  const { lang } = useLang();
  const [item, setItem] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (item.trim()) onLoad(item.trim());
      }}
      className="mb-3 flex gap-2 rounded-xl bg-white p-3 ring-1 ring-ink/5"
    >
      <input
        type="text"
        value={item}
        onChange={(e) => setItem(e.target.value)}
        placeholder={t("grnQc.phItem", lang)}
        className="flex-1 rounded-lg border border-ink/10 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        className="rounded-lg bg-accent-strong px-3 py-1 text-xs font-bold text-white hover:brightness-110"
      >
        {t("grnQc.btnLoadTemplate", lang)}
      </button>
    </form>
  );
}

function NewNcrDialog({
  onClose,
  grns
}: {
  onClose: () => void;
  grns: GrnRow[];
}) {
  const { lang } = useLang();
  const router = useRouter();
  const [saving, start] = useTransition();
  const [form, setForm] = useState({
    grn_no: "",
    severity: "minor" as NcrSeverity,
    issue: "",
    qty_affected: "",
    unit: "",
    cost_impact_idr: ""
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.issue.trim()) return;
    start(async () => {
      await fetch("/api/ncr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grn_no: form.grn_no || null,
          severity: form.severity,
          issue: form.issue,
          qty_affected: form.qty_affected
            ? Number(form.qty_affected)
            : null,
          unit: form.unit || null,
          cost_impact_idr: form.cost_impact_idr
            ? Number(form.cost_impact_idr)
            : null
        })
      });
      router.refresh();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 pt-[8vh] pb-[6vh]">
      <form
        onSubmit={submit}
        className="w-full max-w-lg space-y-3 rounded-2xl bg-paper p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black">{t("grnQc.newNcrTitle", lang)}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink2 hover:text-ink"
          >
            ✕
          </button>
        </div>

        <label className="block text-xs">
          <span className="mb-1 block font-bold">{t("grnQc.fldGrnOpt", lang)}</span>
          <select
            value={form.grn_no}
            onChange={(e) => setForm({ ...form, grn_no: e.target.value })}
            className="w-full rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
          >
            <option value="">{t("grnQc.optNoLink", lang)}</option>
            {grns.map((g) => (
              <option key={g.no} value={g.no}>
                {g.no} · {formatDateShort(g.grn_date)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs">
          <span className="mb-1 block font-bold">{t("grnQc.fldSeverity", lang)}</span>
          <select
            value={form.severity}
            onChange={(e) =>
              setForm({ ...form, severity: e.target.value as NcrSeverity })
            }
            className="w-full rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
          >
            <option value="minor">minor</option>
            <option value="major">major</option>
            <option value="critical">critical</option>
          </select>
        </label>

        <label className="block text-xs">
          <span className="mb-1 block font-bold">{t("grnQc.fldIssue", lang)}</span>
          <textarea
            required
            value={form.issue}
            onChange={(e) => setForm({ ...form, issue: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
            placeholder={t("grnQc.phIssue", lang)}
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs">
            <span className="mb-1 block font-bold">{t("grnQc.fldQty", lang)}</span>
            <input
              type="number"
              step="0.01"
              value={form.qty_affected}
              onChange={(e) =>
                setForm({ ...form, qty_affected: e.target.value })
              }
              className="w-full rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold">{t("grnQc.fldUnit", lang)}</span>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="kg"
              className="w-full rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold">{t("grnQc.fldCost", lang)}</span>
            <input
              type="number"
              step="1"
              value={form.cost_impact_idr}
              onChange={(e) =>
                setForm({ ...form, cost_impact_idr: e.target.value })
              }
              className="w-full rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink"
          >
            {t("grnQc.btnCancelDialog", lang)}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? t("grnQc.saving", lang) : t("grnQc.btnSaveNcr", lang)}
          </button>
        </div>
      </form>
    </div>
  );
}
