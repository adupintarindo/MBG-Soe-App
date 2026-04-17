"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input, Select } from "@/components/ui";
import type { SupplierAction, ActionStatus, ActionPriority } from "@/lib/engine";
import { t, ti, type Lang } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

function statusLabel(s: ActionStatus, lang: Lang): string {
  switch (s) {
    case "open":
      return t("actions.statusOpen", lang);
    case "in_progress":
      return t("actions.statusInProgress", lang);
    case "blocked":
      return t("actions.statusBlocked", lang);
    case "done":
      return t("actions.statusDone", lang);
    case "cancelled":
      return t("actions.statusCancelled", lang);
  }
}

const STATUS_TONE: Record<
  ActionStatus,
  "info" | "accent" | "warn" | "ok" | "muted"
> = {
  open: "info",
  in_progress: "accent",
  blocked: "warn",
  done: "ok",
  cancelled: "muted"
};

function prioLabel(p: ActionPriority, lang: Lang): string {
  switch (p) {
    case "low":
      return t("actions.prioLow", lang);
    case "medium":
      return t("actions.prioMedium", lang);
    case "high":
      return t("actions.prioHigh", lang);
    case "critical":
      return t("actions.prioCritical", lang);
  }
}

const PRIO_TONE: Record<ActionPriority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-900",
  high: "bg-amber-100 text-amber-900",
  critical: "bg-red-100 text-red-900"
};

interface Props {
  actions: SupplierAction[];
  /** Jika diisi, panel ini masuk mode "per supplier" — filter/option create di-lock ke supplier_id. */
  supplierId?: string | null;
  canWrite: boolean;
  /** true untuk role supplier — hanya boleh ubah status + notes di action miliknya. */
  isSupplierRole?: boolean;
  compact?: boolean;
  title?: string;
}

export function ActionsPanel({
  actions,
  supplierId,
  canWrite,
  isSupplierRole = false,
  compact = false,
  title
}: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const resolvedTitle = title ?? t("actions.title", lang);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    return actions.filter((a) => {
      if (filterStatus === "active") {
        if (["done", "cancelled"].includes(a.status)) return false;
      } else if (filterStatus && filterStatus !== "all") {
        if (a.status !== filterStatus) return false;
      }
      if (filterPriority && a.priority !== filterPriority) return false;
      return true;
    });
  }, [actions, filterStatus, filterPriority]);

  const counts = useMemo(() => {
    const c = {
      total: actions.length,
      open: 0,
      in_progress: 0,
      blocked: 0,
      done: 0,
      overdue: 0,
      high_open: 0
    };
    for (const a of actions) {
      if (a.status === "open") c.open++;
      if (a.status === "in_progress") c.in_progress++;
      if (a.status === "blocked") c.blocked++;
      if (a.status === "done") c.done++;
      if (a.is_overdue) c.overdue++;
      if (
        ["high", "critical"].includes(a.priority) &&
        ["open", "in_progress", "blocked"].includes(a.status)
      )
        c.high_open++;
    }
    return c;
  }, [actions]);

  async function patchStatus(
    id: number,
    next: ActionStatus,
    extra: { blocked_reason?: string; output_notes?: string } = {}
  ) {
    setErr(null);
    setBusy(id);
    const res = await fetch(`/api/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, ...extra })
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? t("actions.errUpdate", lang));
      return;
    }
    router.refresh();
  }

  async function quickNote(id: number) {
    const note = prompt(t("actions.quickNotePrompt", lang));
    if (note == null) return;
    setBusy(id);
    setErr(null);
    const res = await fetch(`/api/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ output_notes: note })
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? t("actions.errNote", lang));
      return;
    }
    router.refresh();
  }

  async function deleteAction(id: number) {
    if (!confirm(t("actions.deleteConfirm", lang))) return;
    setBusy(id);
    setErr(null);
    const res = await fetch(`/api/actions/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? t("actions.errDelete", lang));
      return;
    }
    router.refresh();
  }

  return (
    <section
      className={`rounded-2xl bg-paper p-5 ring-1 ring-ink/5 ${compact ? "" : ""}`}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-black text-ink">
          {resolvedTitle}
          <span className="text-[11px] font-semibold text-ink2/70">
            {ti("actions.totalSuffix", lang, { n: counts.total })}
          </span>
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 w-[130px] text-[12px]"
          >
            <option value="active">{t("actions.filterActive", lang)}</option>
            <option value="all">{t("actions.filterAll", lang)}</option>
            <option value="open">{t("actions.statusOpen", lang)}</option>
            <option value="in_progress">{t("actions.statusInProgress", lang)}</option>
            <option value="blocked">{t("actions.statusBlocked", lang)}</option>
            <option value="done">{t("actions.statusDone", lang)}</option>
            <option value="cancelled">{t("actions.statusCancelled", lang)}</option>
          </Select>
          <Select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-8 w-[120px] text-[12px]"
          >
            <option value="">{t("actions.filterAllPrio", lang)}</option>
            <option value="critical">{t("actions.prioCritical", lang)}</option>
            <option value="high">{t("actions.prioHigh", lang)}</option>
            <option value="medium">{t("actions.prioMedium", lang)}</option>
            <option value="low">{t("actions.prioLow", lang)}</option>
          </Select>
          {canWrite && !isSupplierRole && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowNew((v) => !v)}
            >
              {showNew ? t("actions.btnClose", lang) : t("actions.btnAdd", lang)}
            </Button>
          )}
        </div>
      </header>

      <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
        <MiniStat label={t("actions.statusOpen", lang)} value={counts.open} tone="info" />
        <MiniStat
          label={t("actions.statusInProgress", lang)}
          value={counts.in_progress}
          tone="accent"
        />
        <MiniStat label={t("actions.statusBlocked", lang)} value={counts.blocked} tone="warn" />
        <MiniStat label={t("actions.statusDone", lang)} value={counts.done} tone="ok" />
        <MiniStat
          label={t("actions.statOverdue", lang)}
          value={counts.overdue}
          tone={counts.overdue > 0 ? "bad" : "muted"}
        />
        <MiniStat
          label={t("actions.statHighCrit", lang)}
          value={counts.high_open}
          tone={counts.high_open > 0 ? "warn" : "muted"}
        />
      </div>

      {showNew && canWrite && !isSupplierRole && (
        <NewActionForm
          defaultSupplierId={supplierId ?? null}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            router.refresh();
          }}
        />
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-center text-[12px] text-ink2/70 ring-1 ring-ink/5">
          {t("actions.emptyFilter", lang)}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => {
            const canEditThis =
              canWrite &&
              (!isSupplierRole ||
                (isSupplierRole && a.supplier_id === supplierId));
            const statusDisabled = !canEditThis || busy === a.id;
            return (
              <li
                key={a.id}
                className={`rounded-xl bg-white p-3 ring-1 transition ${
                  a.is_overdue
                    ? "ring-red-300 shadow-sm"
                    : a.status === "done"
                      ? "ring-emerald-200 opacity-80"
                      : "ring-ink/5"
                }`}
              >
                <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIO_TONE[a.priority]}`}
                      >
                        {prioLabel(a.priority, lang)}
                      </span>
                      <Badge tone={STATUS_TONE[a.status]}>
                        {statusLabel(a.status, lang)}
                      </Badge>
                      {a.is_overdue && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-900">
                          {t("actions.overdueBadge", lang)}
                        </span>
                      )}
                      {a.category && (
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink2">
                          {a.category}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-ink">{a.title}</div>
                    {(a.supplier_name || a.related_scope) && (
                      <div className="text-[11px] text-ink2/80">
                        {a.supplier_name && (
                          <span className="font-mono">
                            {a.supplier_id} · {a.supplier_name}
                          </span>
                        )}
                        {!a.supplier_name && a.related_scope && (
                          <span className="italic">{a.related_scope}</span>
                        )}
                      </div>
                    )}
                    {a.description && (
                      <p className="mt-1 text-[12px] text-ink2">
                        {a.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[11px]">
                    <div className="font-mono text-ink2/80">
                      {a.target_date ?? "—"}
                    </div>
                    {a.days_to_target != null && (
                      <div
                        className={`font-bold ${
                          a.days_to_target < 0
                            ? "text-red-700"
                            : a.days_to_target <= 3
                              ? "text-amber-700"
                              : "text-ink2/60"
                        }`}
                      >
                        {a.days_to_target < 0
                          ? ti("actions.daysLate", lang, { n: -a.days_to_target })
                          : a.days_to_target === 0
                            ? t("actions.today", lang)
                            : ti("actions.daysLeft", lang, { n: a.days_to_target })}
                      </div>
                    )}
                    <div className="text-ink2/60">{ti("actions.owner", lang, { name: a.owner })}</div>
                  </div>
                </div>

                {a.blocked_reason && (
                  <div className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-900 ring-1 ring-red-200">
                    <b>{t("actions.blocked", lang)}</b> {a.blocked_reason}
                  </div>
                )}
                {a.output_notes && (
                  <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-[11px] text-emerald-900 ring-1 ring-emerald-200">
                    <b>{t("actions.note", lang)}</b> {a.output_notes}
                  </div>
                )}

                {canEditThis && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-ink/5 pt-2">
                    <Select
                      value={a.status}
                      disabled={statusDisabled}
                      onChange={(e) => {
                        const next = e.target.value as ActionStatus;
                        if (next === "blocked") {
                          const reason = prompt(t("actions.blockedReasonPrompt", lang));
                          if (reason == null) return;
                          patchStatus(a.id, next, {
                            blocked_reason: reason
                          });
                        } else {
                          patchStatus(a.id, next);
                        }
                      }}
                      className="h-7 w-[130px] text-[11px]"
                    >
                      <option value="open">{t("actions.statusOpen", lang)}</option>
                      <option value="in_progress">{t("actions.statusInProgress", lang)}</option>
                      <option value="blocked">{t("actions.statusBlocked", lang)}</option>
                      <option value="done">{t("actions.statusDone", lang)}</option>
                      <option value="cancelled">{t("actions.statusCancelled", lang)}</option>
                    </Select>
                    <button
                      type="button"
                      onClick={() => quickNote(a.id)}
                      disabled={busy === a.id}
                      className="rounded-lg bg-ink/5 px-2 py-1 text-[11px] font-bold text-ink2 hover:bg-ink/10"
                    >
                      {t("actions.quickNote", lang)}
                    </button>
                    {!isSupplierRole && (
                      <button
                        type="button"
                        onClick={() => deleteAction(a.id)}
                        disabled={busy === a.id}
                        className="rounded-lg px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50"
                      >
                        {t("actions.delete", lang)}
                      </button>
                    )}
                    {a.source_ref && (
                      <span className="ml-auto font-mono text-[10px] text-ink2/50">
                        {a.source_ref}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {err && (
        <p className="mt-2 text-[11px] font-bold text-red-700">{err}</p>
      )}
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "info" | "accent" | "warn" | "ok" | "bad" | "muted";
}) {
  const toneMap: Record<string, string> = {
    info: "bg-blue-50 text-blue-900 ring-blue-200",
    accent: "bg-indigo-50 text-indigo-900 ring-indigo-200",
    warn: "bg-amber-50 text-amber-900 ring-amber-200",
    ok: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    bad: "bg-red-50 text-red-900 ring-red-200",
    muted: "bg-ink/[0.04] text-ink2 ring-ink/10"
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-bold ring-1 ${toneMap[tone]}`}
    >
      {label}: <span className="font-mono">{value}</span>
    </span>
  );
}

function NewActionForm({
  defaultSupplierId,
  onClose,
  onCreated
}: {
  defaultSupplierId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { lang } = useLang();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? "");
  const [relatedScope, setRelatedScope] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<ActionPriority>("medium");
  const [owner, setOwner] = useState("IFSR-WFP");
  const [targetDate, setTargetDate] = useState("");
  const [source, setSource] = useState("ad_hoc");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setErr(t("actions.errTitle", lang));
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        supplier_id: supplierId || null,
        related_scope: relatedScope.trim() || null,
        category: category.trim() || null,
        priority,
        owner,
        target_date: targetDate || null,
        source
      })
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? t("actions.errSave", lang));
      return;
    }
    onCreated();
  }

  return (
    <div className="mb-3 rounded-xl bg-white p-3 ring-1 ring-accent-strong/30">
      <div className="mb-2 text-[12px] font-bold text-ink">{t("actions.newTitle", lang)}</div>
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("actions.phTitle", lang)}
          className="md:col-span-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("actions.phDesc", lang)}
          rows={2}
          className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-[12px] text-ink outline-none focus:border-accent-strong md:col-span-2"
        />
        <Input
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          placeholder={t("actions.phSupplierId", lang)}
          disabled={!!defaultSupplierId}
        />
        <Input
          value={relatedScope}
          onChange={(e) => setRelatedScope(e.target.value)}
          placeholder={t("actions.phScope", lang)}
        />
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={t("actions.phCategory", lang)}
        />
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value as ActionPriority)}
        >
          <option value="low">{t("actions.prioLow", lang)}</option>
          <option value="medium">{t("actions.prioMedium", lang)}</option>
          <option value="high">{t("actions.prioHigh", lang)}</option>
          <option value="critical">{t("actions.prioCritical", lang)}</option>
        </Select>
        <Input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder={t("actions.phOwner", lang)}
        />
        <Input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
        <Select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="ad_hoc">{t("actions.srcAdhoc", lang)}</option>
          <option value="onboarding">{t("actions.srcOnboarding", lang)}</option>
          <option value="mom">{t("actions.srcMom", lang)}</option>
          <option value="field">{t("actions.srcField", lang)}</option>
          <option value="audit">{t("actions.srcAudit", lang)}</option>
        </Select>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="primary" disabled={busy} onClick={submit}>
          {t("actions.btnSave", lang)}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>
          {t("actions.btnCancel", lang)}
        </Button>
        {err && (
          <span className="text-[11px] font-bold text-red-700">{err}</span>
        )}
      </div>
    </div>
  );
}
