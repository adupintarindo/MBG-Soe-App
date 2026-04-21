"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
import type { AuditEvent } from "@/lib/engine";

interface Filters {
  table: string | null;
  actor: string | null;
  action: "INSERT" | "UPDATE" | "DELETE" | null | undefined;
  from: string | null;
  to: string | null;
}

export function AuditFilters({ initial }: { initial: Filters }) {
  const { lang } = useLang();
  const router = useRouter();
  const sp = useSearchParams();

  const [table, setTable] = useState(initial.table ?? "");
  const [actor, setActor] = useState(initial.actor ?? "");
  const [action, setAction] = useState<string>(initial.action ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  function apply() {
    const params = new URLSearchParams(sp.toString());
    const setOrDelete = (key: string, val: string) => {
      if (val) params.set(key, val);
      else params.delete(key);
    };
    setOrDelete("table", table);
    setOrDelete("actor", actor);
    setOrDelete("action", action);
    setOrDelete("from", from);
    setOrDelete("to", to);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink2">
          {t("audit.filterTable", lang)}
        </span>
        <input
          type="text"
          value={table}
          onChange={(e) => setTable(e.target.value)}
          placeholder="purchase_orders"
          className="w-full rounded-lg border border-ink/20 bg-white px-2 py-1.5 text-[12px]"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink2">
          {t("audit.filterActor", lang)}
        </span>
        <input
          type="text"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="user@..."
          className="w-full rounded-lg border border-ink/20 bg-white px-2 py-1.5 text-[12px]"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink2">
          {t("audit.filterAction", lang)}
        </span>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-full rounded-lg border border-ink/20 bg-white px-2 py-1.5 text-[12px]"
        >
          <option value="">—</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink2">
          {t("audit.filterFrom", lang)}
        </span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full rounded-lg border border-ink/20 bg-white px-2 py-1.5 text-[12px]"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink2">
          {t("audit.filterTo", lang)}
        </span>
        <div className="flex gap-1">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-ink/20 bg-white px-2 py-1.5 text-[12px]"
          />
          <button
            type="button"
            onClick={apply}
            className="rounded-lg bg-ink px-3 py-1.5 text-[11px] font-black text-white hover:bg-ink2"
          >
            {t("audit.filterApply", lang)}
          </button>
        </div>
      </label>
    </div>
  );
}

function actionBadge(a: string) {
  if (a === "INSERT") return <Badge tone="ok">INSERT</Badge>;
  if (a === "DELETE") return <Badge tone="bad">DELETE</Badge>;
  return <Badge tone="info">UPDATE</Badge>;
}

export function AuditTable({ rows }: { rows: AuditEvent[] }) {
  const { lang } = useLang();

  const columns: SortableColumn<AuditEvent>[] = [
    {
      key: "ts",
      label: t("audit.colTs", lang),
      align: "left",
      sortValue: (r) => r.ts,
      render: (r) => (
        <span className="font-mono text-[11px]">
          {new Date(r.ts).toLocaleString(lang === "EN" ? "en-US" : "id-ID", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })}
        </span>
      )
    },
    {
      key: "actor",
      label: t("audit.colActor", lang),
      align: "left",
      sortValue: (r) => r.actor_email ?? "",
      render: (r) => (
        <div>
          <div className="text-xs">{r.actor_email ?? "—"}</div>
          {r.actor_role && (
            <Badge tone="muted" className="mt-0.5">
              {r.actor_role}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: "table",
      label: t("audit.colTable", lang),
      align: "left",
      sortValue: (r) => r.table_name,
      render: (r) => (
        <span className="font-mono text-[11px]">{r.table_name}</span>
      )
    },
    {
      key: "row",
      label: t("audit.colRow", lang),
      align: "left",
      sortValue: (r) => r.row_pk,
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">{r.row_pk}</span>
      )
    },
    {
      key: "action",
      label: t("audit.colAction", lang),
      sortValue: (r) => r.action,
      render: (r) => actionBadge(r.action)
    },
    {
      key: "diff",
      label: t("audit.colDiff", lang),
      align: "left",
      sortable: false,
      render: (r) => <DiffCell diff={r.diff} />
    }
  ];

  return (
    <SortableTable<AuditEvent>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "ts", dir: "desc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="audit-log"
      exportSheetName="Audit"
      stickyHeader
      bodyMaxHeight={520}
    />
  );
}

function DiffCell({ diff }: { diff: Record<string, unknown> | null }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  if (!diff) return <span className="text-ink2/60">—</span>;

  const changed = (diff as { changed?: string[] }).changed ?? [];
  const before = (diff as { before?: Record<string, unknown> }).before;
  const after = (diff as { after?: Record<string, unknown> }).after;

  return (
    <div className="max-w-[360px] text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-semibold text-accent-strong hover:underline"
      >
        {open ? "▲" : "▼"}{" "}
        {Array.isArray(changed) && changed.length > 0
          ? changed.slice(0, 3).join(", ") +
            (changed.length > 3 ? ` +${changed.length - 3}` : "")
          : "detail"}
      </button>
      {open && (
        <div className="mt-2 space-y-1 rounded-lg bg-paper p-2 text-[10px]">
          {before && (
            <div>
              <span className="font-bold text-red-700">
                {t("audit.diffBefore", lang)}:
              </span>
              <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-ink2">
                {JSON.stringify(before, null, 2)}
              </pre>
            </div>
          )}
          {after && (
            <div>
              <span className="font-bold text-emerald-700">
                {t("audit.diffAfter", lang)}:
              </span>
              <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-ink2">
                {JSON.stringify(after, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
