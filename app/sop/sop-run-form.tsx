"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logSopRun, listSopRuns, type SopRunRow } from "@/lib/engine";
import { Badge, Button, FieldLabel } from "@/components/ui";
import type { SOP } from "@/lib/sops";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

interface Props {
  sop: SOP;
  canWrite: boolean;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function SopRunForm({ sop, canWrite }: Props) {
  const { lang } = useLang();
  const supabase = createClient();
  const router = useRouter();
  const [runDate, setRunDate] = useState(todayISO());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [flaggedRisks, setFlaggedRisks] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<SopRunRow[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let active = true;
    listSopRuns(supabase, sop.id, 10)
      .then((rows) => {
        if (active) setHistory(rows);
      })
      .catch(() => {
        if (active) setHistory([]);
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, sop.id]);

  const completion = useMemo(
    () =>
      sop.steps.length === 0
        ? 0
        : Math.round((checkedSteps.size / sop.steps.length) * 100),
    [checkedSteps.size, sop.steps.length]
  );

  function toggleStep(i: number) {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }
  function toggleRisk(i: number) {
    setFlaggedRisks((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }
  function checkAll() {
    setCheckedSteps(new Set(sop.steps.map((_, i) => i)));
  }
  function reset() {
    setCheckedSteps(new Set());
    setFlaggedRisks(new Set());
    setNotes("");
    setRunDate(todayISO());
    setErr(null);
    setOk(null);
  }

  async function onSave() {
    setErr(null);
    setOk(null);
    if (!runDate) {
      setErr(t("sopRun.errDate", lang));
      return;
    }
    setSaving(true);
    try {
      const id = await logSopRun(supabase, {
        sopId: sop.id,
        sopTitle: sop.title,
        sopCategory: sop.category,
        stepsChecked: checkedSteps.size,
        stepsTotal: sop.steps.length,
        risksFlagged: Array.from(flaggedRisks)
          .sort((a, b) => a - b)
          .map((i) => sop.risks[i])
          .filter((s): s is string => Boolean(s)),
        notes: notes.trim() || null,
        runDate
      });
      setOk(ti("sopRun.okSaved", lang, { id, pct: completion }));

      // Refresh history row-set in-panel.
      try {
        const rows = await listSopRuns(supabase, sop.id, 10);
        setHistory(rows);
      } catch {
        /* no-op */
      }

      // Clear form values but keep last tanggal default to today next time
      setCheckedSteps(new Set());
      setFlaggedRisks(new Set());
      setNotes("");
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-paper/60 p-4 ring-1 ring-ink/5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
            {t("sopRun.secLabel", lang)}
          </div>
          <h4 className="text-sm font-black text-ink">
            {t("sopRun.secHeading", lang)}
          </h4>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            completion >= 80
              ? "bg-emerald-100 text-emerald-800"
              : completion >= 50
                ? "bg-amber-100 text-amber-900"
                : "bg-red-100 text-red-800"
          }`}
        >
          {checkedSteps.size}/{sop.steps.length} · {completion}%
        </span>
      </div>

      {canWrite ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[180px_1fr]">
            <label className="block">
              <FieldLabel>{t("sopRun.dateLabel", lang)}</FieldLabel>
              <input
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                className="w-full rounded-lg bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-ink/10"
              />
            </label>
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="sm" onClick={checkAll}>
                {t("sopRun.btnCheckAll", lang)}
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                {t("sopRun.btnReset", lang)}
              </Button>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
              {t("sopRun.stepsDone", lang)}
            </div>
            <ul className="mt-1.5 space-y-1.5 text-[12px]">
              {sop.steps.map((step, i) => {
                const checked = checkedSteps.has(i);
                return (
                  <li key={i}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStep(i)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-accent-strong"
                      />
                      <span
                        className={`${
                          checked
                            ? "text-ink line-through decoration-emerald-600/40"
                            : "text-ink2"
                        }`}
                      >
                        <span className="mr-1.5 font-mono text-[10px] font-black text-ink2/60">
                          {i + 1}.
                        </span>
                        {step}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {sop.risks.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                {t("sopRun.risksObs", lang)}
              </div>
              <ul className="mt-1.5 space-y-1 text-[12px]">
                {sop.risks.map((risk, i) => {
                  const flagged = flaggedRisks.has(i);
                  return (
                    <li key={i}>
                      <label
                        className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition ${
                          flagged
                            ? "bg-red-50 ring-1 ring-red-200"
                            : "hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={flagged}
                          onChange={() => toggleRisk(i)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
                        />
                        <span
                          className={flagged ? "text-red-900" : "text-ink2"}
                        >
                          ⚠ {risk}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <label className="block">
            <FieldLabel>{t("sopRun.notesLabel", lang)}</FieldLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t("sopRun.notesPh", lang)}
              className="w-full rounded-lg bg-white px-3 py-2 text-sm text-ink ring-1 ring-ink/10"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={saving || pending}
            >
              {saving ? t("sopRun.btnSaving", lang) : t("sopRun.btnSave", lang)}
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
      ) : (
        <p className="rounded-xl bg-white px-4 py-3 text-[12px] text-ink2">
          {t("sopRun.noWrite", lang)}
        </p>
      )}

      {/* History */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
            {t("sopRun.historyLabel", lang)}
          </div>
          <span className="text-[10px] text-ink2/60">
            {history
              ? ti("sopRun.historyCount", lang, { n: history.length })
              : t("sopRun.historyLoading", lang)}
          </span>
        </div>
        {loadingHistory ? (
          <p className="rounded-xl bg-white px-4 py-3 text-[12px] text-ink2/70">
            {t("sopRun.historyLoadingText", lang)}
          </p>
        ) : !history || history.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-3 text-[12px] text-ink2">
            {t("sopRun.historyEmpty", lang)}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {history.map((h) => {
              const pct =
                h.steps_total > 0
                  ? Math.round((h.steps_checked / h.steps_total) * 100)
                  : 0;
              const tone: "ok" | "warn" | "bad" =
                pct >= 80 ? "ok" : pct >= 50 ? "warn" : "bad";
              return (
                <li
                  key={h.id}
                  className="rounded-xl bg-white px-3 py-2 text-[11px] text-ink2 ring-1 ring-ink/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-ink2/60">
                        {h.run_date}
                      </span>
                      <Badge tone={tone}>
                        {h.steps_checked}/{h.steps_total} · {pct}%
                      </Badge>
                      {h.risks_flagged.length > 0 && (
                        <Badge tone="bad">
                          {ti("sopRun.badgeRiskCount", lang, { n: h.risks_flagged.length })}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-ink2/60">
                      {h.evaluator ?? "—"}
                    </span>
                  </div>
                  {h.notes && (
                    <p className="mt-1 text-[11px] italic text-ink2/80">
                      “{h.notes}”
                    </p>
                  )}
                  {h.risks_flagged.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-3 text-[10px] text-red-900/90">
                      {h.risks_flagged.map((r, idx) => (
                        <li key={idx}>• {r}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
