"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RevalPeriod, SupplierRevalRow } from "@/lib/engine";
import { saveSupplierReval } from "@/lib/engine";
import {
  Badge,
  Button,
  FieldLabel,
  Input
} from "@/components/ui";
import {
  SortableTable,
  type SortableColumn
} from "@/components/sortable-table";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

interface Props {
  supplierId: string;
  defaultStart: string;
  defaultEnd: string;
  canWrite: boolean;
  history: SupplierRevalRow[];
}

const PERIOD_OPTIONS: RevalPeriod[] = [
  "quarterly",
  "semester",
  "annual",
  "ad_hoc"
];

export function RevalPanel({
  supplierId,
  defaultStart,
  defaultEnd,
  canWrite,
  history
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const { lang } = useLang();
  const RECO_OPTIONS = [
    { v: "RETAIN", label: t("reval.recoRetain", lang) },
    { v: "IMPROVE", label: t("reval.recoImprove", lang) },
    { v: "REPLACE", label: t("reval.recoReplace", lang) },
    { v: "EXIT", label: t("reval.recoExit", lang) }
  ];
  const [period, setPeriod] = useState<RevalPeriod>("quarterly");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [reco, setReco] = useState("RETAIN");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSave() {
    setErr(null);
    setOk(null);
    if (!start || !end || start > end) {
      setErr(t("reval.invalidDateRange", lang));
      return;
    }
    try {
      const id = await saveSupplierReval(supabase, {
        supplierId,
        period,
        start,
        end,
        recommendation: reco,
        notes: notes.trim() || null
      });
      setOk(ti("reval.saved", lang, { id }));
      setNotes("");
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    }
  }

  return (
    <div>
      {canWrite && (
        <div className="mb-5 rounded-2xl bg-paper p-4 ring-1 ring-ink/5">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="block">
              <FieldLabel>{t("reval.lblPeriod", lang)}</FieldLabel>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as RevalPeriod)}
                className="w-full rounded-lg bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-ink/10"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <FieldLabel>{t("reval.lblFrom", lang)}</FieldLabel>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="block">
              <FieldLabel>{t("reval.lblTo", lang)}</FieldLabel>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <label className="block">
              <FieldLabel>{t("reval.lblReco", lang)}</FieldLabel>
              <select
                value={reco}
                onChange={(e) => setReco(e.target.value)}
                className="w-full rounded-lg bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-ink/10"
              >
                {RECO_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 block">
            <FieldLabel>{t("reval.lblNotes", lang)}</FieldLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-white px-3 py-2 text-sm text-ink ring-1 ring-ink/10"
              placeholder={t("reval.notesPh", lang)}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={pending}
              onClick={onSave}
            >
              {pending ? t("reval.btnSaving", lang) : t("reval.btnSave", lang)}
            </Button>
            {err && (
              <span className="text-[12px] font-semibold text-red-700">
                {err}
              </span>
            )}
            {ok && (
              <span className="text-[12px] font-semibold text-emerald-700">
                {ok}
              </span>
            )}
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="rounded-xl bg-paper px-4 py-3 text-[12px] text-ink2">
          {t("reval.emptyHistory", lang)}
        </p>
      ) : (
        (() => {
          const cols: SortableColumn<SupplierRevalRow>[] = [
            {
              key: "period",
              label: t("reval.colPeriod", lang),
              align: "left",
              sortValue: (r) => r.period,
              render: (r) => <Badge tone="info">{r.period}</Badge>
            },
            {
              key: "range",
              label: t("reval.colRange", lang),
              align: "left",
              sortValue: (r) => r.period_start,
              render: (r) => (
                <span className="font-mono text-[11px] text-ink2">
                  {r.period_start} → {r.period_end}
                </span>
              )
            },
            {
              key: "q",
              label: "Q",
              align: "right",
              sortValue: (r) => Number(r.quality_score),
              render: (r) => (
                <span className="font-mono text-xs">
                  {Number(r.quality_score).toFixed(0)}
                </span>
              )
            },
            {
              key: "d",
              label: "D",
              align: "right",
              sortValue: (r) => Number(r.delivery_score),
              render: (r) => (
                <span className="font-mono text-xs">
                  {Number(r.delivery_score).toFixed(0)}
                </span>
              )
            },
            {
              key: "p",
              label: "P",
              align: "right",
              sortValue: (r) => Number(r.price_score),
              render: (r) => (
                <span className="font-mono text-xs">
                  {Number(r.price_score).toFixed(0)}
                </span>
              )
            },
            {
              key: "c",
              label: "C",
              align: "right",
              sortValue: (r) => Number(r.compliance_score),
              render: (r) => (
                <span className="font-mono text-xs">
                  {Number(r.compliance_score).toFixed(0)}
                </span>
              )
            },
            {
              key: "r",
              label: "R",
              align: "right",
              sortValue: (r) => Number(r.responsiveness_score),
              render: (r) => (
                <span className="font-mono text-xs">
                  {Number(r.responsiveness_score).toFixed(0)}
                </span>
              )
            },
            {
              key: "total",
              label: "Total",
              align: "right",
              sortValue: (r) => Number(r.total_score),
              render: (r) => (
                <span className="font-mono text-sm font-black">
                  {Number(r.total_score).toFixed(1)}
                </span>
              )
            },
            {
              key: "reco",
              label: t("reval.colReco", lang),
              align: "left",
              sortValue: (r) => r.recommendation ?? "",
              render: (r) =>
                r.recommendation ? (
                  <Badge
                    tone={
                      r.recommendation === "RETAIN"
                        ? "ok"
                        : r.recommendation === "IMPROVE"
                          ? "info"
                          : r.recommendation === "REPLACE"
                            ? "warn"
                            : "bad"
                    }
                  >
                    {r.recommendation}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-ink2/60">—</span>
                )
            },
            {
              key: "eval",
              label: t("reval.colEval", lang),
              align: "left",
              sortValue: (r) => r.evaluated_at,
              render: (r) => (
                <span className="font-mono text-[10px] text-ink2/70">
                  {new Date(r.evaluated_at).toLocaleDateString(
                    lang === "EN" ? "en-US" : "id-ID"
                  )}
                </span>
              )
            }
          ];
          return (
            <SortableTable<SupplierRevalRow>
              tableClassName="text-sm"
              rowKey={(r) => r.id}
              initialSort={{ key: "eval", dir: "desc" }}
              columns={cols}
              rows={history}
              stickyHeader
              bodyMaxHeight={440}
            />
          );
        })()
      )}
    </div>
  );
}
