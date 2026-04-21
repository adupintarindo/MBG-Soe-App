"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { type SupplierAction } from "@/lib/engine";
import { IDR, Section } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { SupplierDetailModal } from "./supplier-detail-modal";
import type {
  SupplierRow,
  SupItemLink,
  InvoiceTx,
  PoTx,
  ItemCatalog,
  SupplierCert
} from "./types";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

interface ModalData {
  supplier: SupplierRow;
  supItems: SupItemLink[];
  certs: SupplierCert[];
  pos: PoTx[];
  invoices: InvoiceTx[];
  items: ItemCatalog[];
  actions: SupplierAction[];
  isAdmin: boolean;
  canWriteActions: boolean;
  isSupplierRole: boolean;
}

const TYPE_COLOR: Record<string, string> = {
  BUMN: "bg-red-50 text-red-900 ring-red-200",
  PT: "bg-blue-50 text-blue-900 ring-blue-200",
  CV: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  UD: "bg-amber-50 text-amber-900 ring-amber-200",
  KOPERASI: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  POKTAN: "bg-lime-50 text-lime-900 ring-lime-200",
  TOKO: "bg-violet-50 text-violet-900 ring-violet-200",
  KIOS: "bg-pink-50 text-pink-900 ring-pink-200",
  INFORMAL: "bg-slate-50 text-slate-900 ring-slate-200"
};

const STATUS_COLOR: Record<string, string> = {
  signed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  awaiting: "bg-amber-100 text-amber-900 ring-amber-200",
  draft: "bg-slate-100 text-slate-800 ring-slate-200",
  rejected: "bg-red-100 text-red-800 ring-red-200"
};

const STATUS_DOT: Record<string, string> = {
  signed: "bg-emerald-500",
  awaiting: "bg-amber-500",
  draft: "bg-slate-400",
  rejected: "bg-red-500"
};

type SortKey =
  | "score-desc"
  | "score-asc"
  | "name-asc"
  | "name-desc"
  | "spend-desc"
  | "items-desc";

interface Props {
  suppliers: SupplierRow[];
  supItems: SupItemLink[];
  invoices: InvoiceTx[];
  canWriteActions: boolean;
  isSupplierRole: boolean;
}

export function SuppliersShell({
  suppliers,
  supItems,
  invoices,
  canWriteActions,
  isSupplierRole
}: Props) {
  const { lang } = useLang();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("score-desc");
  const [modal, setModal] = useState<ModalData | null>(null);
  const [modalLoadingId, setModalLoadingId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const openQuickView = useCallback(async (id: string) => {
    setModalError(null);
    setModalLoadingId(id);
    try {
      const res = await fetch(`/api/suppliers/${id}/detail`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Gagal memuat detail supplier.");
      }
      setModal({
        supplier: json.supplier,
        supItems: json.supItems ?? [],
        certs: json.certs ?? [],
        pos: json.pos ?? [],
        invoices: json.invoices ?? [],
        items: json.items ?? [],
        actions: json.actions ?? [],
        isAdmin: !!json.isAdmin,
        canWriteActions: !!json.canWriteActions,
        isSupplierRole: !!json.isSupplierRole
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat detail.";
      setModalError(msg);
    } finally {
      setModalLoadingId(null);
    }
  }, []);

  const spendBySup = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    for (const inv of invoices) {
      const cur = m.get(inv.supplier_id) ?? { total: 0, count: 0 };
      cur.total += Number(inv.total);
      cur.count += 1;
      m.set(inv.supplier_id, cur);
    }
    return m;
  }, [invoices]);

  const itemsBySup = useMemo(() => {
    const m = new Map<string, SupItemLink[]>();
    for (const si of supItems) {
      const list = m.get(si.supplier_id) ?? [];
      list.push(si);
      m.set(si.supplier_id, list);
    }
    return m;
  }, [supItems]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const s of suppliers) if (s.type) set.add(s.type);
    return Array.from(set).sort();
  }, [suppliers]);

  const rejected = suppliers.filter((s) => s.status === "rejected");

  const cardPool = useMemo(
    () =>
      suppliers.filter(
        (s) => s.status === "signed" || s.status === "awaiting"
      ),
    [suppliers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = cardPool.filter((s) => {
      if (typeFilter !== "ALL" && s.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (!q) return true;
      const linked = itemsBySup.get(s.id) ?? [];
      const haystack = [
        s.id,
        s.name,
        s.pic ?? "",
        s.email ?? "",
        s.phone ?? "",
        s.address ?? "",
        s.commodity ?? "",
        s.notes ?? "",
        ...linked.map((li) => li.item_code)
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "score-desc":
          return Number(b.score ?? 0) - Number(a.score ?? 0);
        case "score-asc":
          return Number(a.score ?? 0) - Number(b.score ?? 0);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "spend-desc":
          return (
            (spendBySup.get(b.id)?.total ?? 0) -
            (spendBySup.get(a.id)?.total ?? 0)
          );
        case "items-desc":
          return (
            (itemsBySup.get(b.id)?.length ?? 0) -
            (itemsBySup.get(a.id)?.length ?? 0)
          );
        default:
          return 0;
      }
    });
    return sorted;
  }, [
    cardPool,
    query,
    typeFilter,
    statusFilter,
    sortKey,
    itemsBySup,
    spendBySup
  ]);

  const isFiltered =
    query.trim() !== "" || typeFilter !== "ALL" || statusFilter !== "ALL";
  const resetFilters = () => {
    setQuery("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
  };

  return (
    <>
      <Section
        title={t("suppliers.cardsTitle", lang)}
        hint={t("suppliers.cardsHint", lang)}
        noPad
      >
        {/* Control bar — search, filters, sort */}
        <div className="sticky top-0 z-10 border-b border-ink/[0.06] bg-white/95 px-5 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink2/50"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("suppliers.searchPh", lang)}
                className="h-9 w-full rounded-lg border border-ink/10 bg-paper/50 pl-9 pr-3 text-[13px] text-ink outline-none transition placeholder:text-ink2/50 focus:border-accent-strong/50 focus:bg-white focus:ring-2 focus:ring-accent-strong/15"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-ink2/50 transition hover:bg-ink/5 hover:text-ink"
                >
                  ×
                </button>
              )}
            </div>

            {/* Type filter */}
            <div className="relative">
              <label
                htmlFor="sup-filter-type"
                className="sr-only"
              >
                {t("suppliers.filterType", lang)}
              </label>
              <select
                id="sup-filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-ink/10 bg-paper/50 pl-3 pr-8 text-[13px] font-semibold text-ink outline-none transition focus:border-accent-strong/50 focus:bg-white focus:ring-2 focus:ring-accent-strong/15"
              >
                <option value="ALL">
                  {t("suppliers.filterType", lang)}:{" "}
                  {t("suppliers.filterAll", lang)}
                </option>
                {availableTypes.map((tp) => (
                  <option key={tp} value={tp}>
                    {t("suppliers.filterType", lang)}: {tp}
                  </option>
                ))}
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-ink2/50"
              >
                ▼
              </span>
            </div>

            {/* Status filter */}
            <div className="relative">
              <label
                htmlFor="sup-filter-status"
                className="sr-only"
              >
                {t("suppliers.filterStatus", lang)}
              </label>
              <select
                id="sup-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-ink/10 bg-paper/50 pl-3 pr-8 text-[13px] font-semibold text-ink outline-none transition focus:border-accent-strong/50 focus:bg-white focus:ring-2 focus:ring-accent-strong/15"
              >
                <option value="ALL">
                  {t("suppliers.filterStatus", lang)}:{" "}
                  {t("suppliers.filterAll", lang)}
                </option>
                <option value="signed">
                  {t("suppliers.filterStatus", lang)}: Signed
                </option>
                <option value="awaiting">
                  {t("suppliers.filterStatus", lang)}: Awaiting
                </option>
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-ink2/50"
              >
                ▼
              </span>
            </div>

            {/* Sort */}
            <div className="relative">
              <label
                htmlFor="sup-sort"
                className="sr-only"
              >
                {t("suppliers.sortBy", lang)}
              </label>
              <select
                id="sup-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="h-9 appearance-none rounded-lg border border-ink/10 bg-paper/50 pl-3 pr-8 text-[13px] font-semibold text-ink outline-none transition focus:border-accent-strong/50 focus:bg-white focus:ring-2 focus:ring-accent-strong/15"
              >
                <option value="score-desc">
                  {t("suppliers.sortBy", lang)}:{" "}
                  {t("suppliers.sortScoreDesc", lang)}
                </option>
                <option value="score-asc">
                  {t("suppliers.sortBy", lang)}:{" "}
                  {t("suppliers.sortScoreAsc", lang)}
                </option>
                <option value="name-asc">
                  {t("suppliers.sortBy", lang)}:{" "}
                  {t("suppliers.sortNameAsc", lang)}
                </option>
                <option value="name-desc">
                  {t("suppliers.sortBy", lang)}:{" "}
                  {t("suppliers.sortNameDesc", lang)}
                </option>
                <option value="spend-desc">
                  {t("suppliers.sortBy", lang)}:{" "}
                  {t("suppliers.sortSpendDesc", lang)}
                </option>
                <option value="items-desc">
                  {t("suppliers.sortBy", lang)}:{" "}
                  {t("suppliers.sortItemsDesc", lang)}
                </option>
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-ink2/50"
              >
                ▼
              </span>
            </div>

            {/* Reset + count */}
            <div className="ml-auto flex items-center gap-3">
              {isFiltered && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-9 rounded-lg border border-ink/10 bg-white px-3 text-[12px] font-bold text-ink2 transition hover:border-ink/20 hover:bg-paper/50 hover:text-ink"
                >
                  {t("suppliers.reset", lang)}
                </button>
              )}
              <div className="whitespace-nowrap text-[11px] font-semibold text-ink2/70">
                {ti("suppliers.resultCount", lang, {
                  n: filtered.length,
                  total: cardPool.length
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
            <div className="text-3xl opacity-30">🔍</div>
            <p className="max-w-sm text-[13px] text-ink2/70">
              {t("suppliers.emptyFilter", lang)}
            </p>
            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg bg-ink px-4 py-2 text-[12px] font-bold text-white transition hover:bg-ink2"
              >
                {t("suppliers.reset", lang)}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <SupplierCard
                key={s.id}
                supplier={s}
                linked={itemsBySup.get(s.id) ?? []}
                spend={spendBySup.get(s.id)}
                lang={lang}
                onQuickView={openQuickView}
                isLoadingQuickView={modalLoadingId === s.id}
              />
            ))}
          </div>
        )}
      </Section>

      {rejected.length > 0 && (
        <Section icon="🚫" title={t("suppliers.rejectedTitle", lang)} hint={t("suppliers.rejectedHint", lang)} accent="bad">
          <div className="space-y-2">
            {rejected.map((s) => (
              <Link
                key={s.id}
                href={`/suppliers/${s.id}`}
                className="flex w-full items-center justify-between rounded-xl bg-red-50 px-4 py-2 text-left ring-1 ring-red-200 transition hover:bg-red-100"
              >
                <div>
                  <div className="text-xs font-bold text-red-900">
                    {s.id} · {s.name}
                  </div>
                  <div className="text-[10px] text-red-800/80">{s.notes}</div>
                </div>
                <span className="font-mono text-sm font-black text-red-700">
                  {Number(s.score ?? 0).toFixed(1)}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section icon="📋" title={ti("suppliers.tableTitle", lang, { n: suppliers.length })} hint={t("suppliers.tableHint", lang)}>
        {(() => {
          const columns: SortableColumn<SupplierRow>[] = [
            {
              key: "id",
              label: t("suppliers.colId", lang),
              align: "left",
              width: "88px",
              sortValue: (s) => s.id,
              render: (s) => (
                <Link
                  href={`/suppliers/${s.id}`}
                  className="block font-mono text-[11px] text-ink2 hover:text-accent-strong hover:underline"
                >
                  {s.id}
                </Link>
              )
            },
            {
              key: "name",
              label: t("suppliers.colName", lang),
              align: "left",
              sortValue: (s) => s.name,
              render: (s) => (
                <Link
                  href={`/suppliers/${s.id}`}
                  className="block font-semibold hover:text-accent-strong hover:underline"
                >
                  {s.name}
                </Link>
              )
            },
            {
              key: "type",
              label: t("suppliers.colType", lang),
              width: "88px",
              sortValue: (s) => s.type,
              render: (s) => (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[s.type] ?? TYPE_COLOR.INFORMAL}`}
                >
                  {s.type}
                </span>
              )
            },
            {
              key: "commodity",
              label: t("suppliers.colKomoditas", lang),
              align: "left",
              sortValue: (s) => s.commodity ?? "",
              render: (s) => (
                <Link
                  href={`/suppliers/${s.id}`}
                  className="block truncate text-[11px] text-ink2 hover:text-accent-strong"
                  title={s.commodity ?? ""}
                >
                  {s.commodity || "—"}
                </Link>
              )
            },
            {
              key: "items",
              label: t("suppliers.colItems", lang),
              align: "right",
              width: "64px",
              sortValue: (s) => (itemsBySup.get(s.id) ?? []).length,
              render: (s) => (
                <span className="font-mono text-xs tabular-nums">
                  {(itemsBySup.get(s.id) ?? []).length}
                </span>
              )
            },
            {
              key: "score",
              label: t("suppliers.colScore", lang),
              align: "right",
              width: "72px",
              sortValue: (s) => Number(s.score ?? 0),
              render: (s) => {
                const score = Number(s.score ?? 0);
                return (
                  <span
                    className={`font-mono text-xs font-black tabular-nums ${
                      score >= 80
                        ? "text-emerald-700"
                        : score >= 70
                          ? "text-amber-700"
                          : "text-red-700"
                    }`}
                  >
                    {score.toFixed(1)}
                  </span>
                );
              }
            },
            {
              key: "status",
              label: t("suppliers.colStatus", lang),
              width: "104px",
              sortValue: (s) => s.status,
              render: (s) => (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
                >
                  {s.status}
                </span>
              )
            },
            {
              key: "spend",
              label: t("suppliers.colSpend", lang),
              align: "left",
              width: "140px",
              sortValue: (s) => spendBySup.get(s.id)?.total ?? 0,
              render: (s) => {
                const sp = spendBySup.get(s.id);
                return sp ? (
                  <IDR value={sp.total} className="text-xs font-bold text-emerald-800" />
                ) : (
                  <span className="text-ink2/40">—</span>
                );
              }
            }
          ];
          return (
            <SortableTable<SupplierRow>
              tableClassName="text-sm"
              rowKey={(s) => s.id}
              initialSort={{ key: "score", dir: "desc" }}
              columns={columns}
              rows={suppliers}
              searchable
              stickyHeader
              bodyMaxHeight={520}
            />
          );
        })()}
      </Section>

      {modalError && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl bg-red-600 px-4 py-3 text-[12px] font-bold text-white shadow-xl"
          onClick={() => setModalError(null)}
        >
          {modalError}
        </div>
      )}

      {modal && (
        <SupplierDetailModal
          supplier={modal.supplier}
          supItems={modal.supItems}
          certs={modal.certs}
          pos={modal.pos}
          invoices={modal.invoices}
          items={modal.items}
          actions={modal.actions}
          canWriteActions={modal.canWriteActions}
          isSupplierRole={modal.isSupplierRole}
          isAdmin={modal.isAdmin}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

/* ---------- Card ---------- */

function SupplierCard({
  supplier: s,
  linked,
  spend,
  lang,
  onQuickView,
  isLoadingQuickView
}: {
  supplier: SupplierRow;
  linked: SupItemLink[];
  spend: { total: number; count: number } | undefined;
  lang: "ID" | "EN";
  onQuickView: (id: string) => void;
  isLoadingQuickView: boolean;
}) {
  const score = Number(s.score ?? 0);
  const scoreTone =
    score >= 80
      ? {
          text: "text-emerald-700",
          bg: "bg-emerald-50",
          ring: "ring-emerald-200",
          track: "stroke-emerald-100",
          bar: "stroke-emerald-500",
          accent: "from-emerald-500/0 via-emerald-500/60 to-emerald-500/0"
        }
      : score >= 70
        ? {
            text: "text-amber-700",
            bg: "bg-amber-50",
            ring: "ring-amber-200",
            track: "stroke-amber-100",
            bar: "stroke-amber-500",
            accent: "from-amber-500/0 via-amber-500/60 to-amber-500/0"
          }
        : {
            text: "text-red-700",
            bg: "bg-red-50",
            ring: "ring-red-200",
            track: "stroke-red-100",
            bar: "stroke-red-500",
            accent: "from-red-500/0 via-red-500/60 to-red-500/0"
          };

  const mainItems = linked.filter((l) => l.is_main);
  const otherItems = linked.filter((l) => !l.is_main);

  return (
    <Link
      href={`/suppliers/${s.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card ring-1 ring-ink/[0.06] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardlg hover:ring-accent-strong/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
    >
      {/* Top accent line tied to score tone */}
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${scoreTone.accent}`}
      />

      {/* Meta row: ID + type + status */}
      <div className="flex items-center justify-between gap-2 px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold tracking-wider text-ink2/50">
            {s.id}
          </span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[s.type] ?? TYPE_COLOR.INFORMAL}`}
          >
            {s.type}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s.status] ?? STATUS_DOT.draft}`}
          />
          {s.status}
        </span>
      </div>

      {/* Name + score gauge */}
      <div className="flex items-start gap-3 px-5 pt-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-black leading-tight text-ink">
            {s.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink2/70">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{s.address ?? "—"}</span>
          </div>
        </div>
        <ScoreGauge score={score} tone={scoreTone} label={t("suppliers.cardScore", lang)} />
      </div>

      {/* Contact block — icon-based tight grid */}
      <div className="mx-5 mt-4 grid gap-1.5 border-t border-ink/[0.06] pt-3 text-[11px]">
        <ContactRow
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          value={s.pic ?? "—"}
          className="truncate font-semibold text-ink"
        />
        <ContactRow
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
            </svg>
          }
          value={s.phone ?? "—"}
          className="truncate font-mono text-ink2"
        />
        <ContactRow
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6L2 7" />
            </svg>
          }
          value={s.email ?? "—"}
          className="truncate font-mono text-ink2/80"
        />
      </div>

      {/* Commodities */}
      {linked.length > 0 && (
        <div className="mx-5 mt-3 border-t border-ink/[0.06] pt-3">
          <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.14em] text-ink2/60">
            <span>{ti("suppliers.cardCommodity", lang, { n: linked.length })}</span>
            {mainItems.length > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <span>★</span>
                <span>{mainItems.length} main</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...mainItems, ...otherItems].slice(0, 8).map((li) => (
              <span
                key={li.item_code}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${li.is_main ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-paper/60 text-ink2 ring-ink/[0.06]"}`}
              >
                {li.item_code}
                {li.is_main && <span className="text-amber-500">★</span>}
              </span>
            ))}
            {linked.length > 8 && (
              <span className="inline-flex items-center rounded-md bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink2/60">
                +{linked.length - 8}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Spend summary */}
      {spend && (
        <div className="mx-5 mt-3 flex items-center justify-between rounded-lg bg-emerald-50/70 px-3 py-2 text-[11px] ring-1 ring-emerald-100">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-900/80">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
            </svg>
            {ti("suppliers.cardInvoices", lang, { n: spend.count })}
          </span>
          <IDR
            value={spend.total}
            className="w-auto flex-none gap-1.5 font-black text-emerald-800"
          />
        </div>
      )}

      {s.notes && (
        <p className="mx-5 mt-2 line-clamp-2 text-[10px] italic text-ink2/70">
          {s.notes}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink/[0.06] px-5 py-3">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickView(s.id);
          }}
          disabled={isLoadingQuickView}
          className="inline-flex items-center gap-1 rounded-lg bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink2 ring-1 ring-ink/10 transition hover:bg-ink/10 hover:text-ink disabled:opacity-60"
        >
          {isLoadingQuickView ? (
            <span>Loading…</span>
          ) : (
            <>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {t("suppliers.cardQuickView", lang)}
            </>
          )}
        </button>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-strong">
          {t("suppliers.cardDetail", lang)}
          <span className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

function ContactRow({
  icon,
  value,
  className = ""
}: {
  icon: React.ReactNode;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-ink2/45 [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </span>
      <span className={className}>{value}</span>
    </div>
  );
}

function ScoreGauge({
  score,
  tone,
  label
}: {
  score: number;
  tone: {
    text: string;
    bg: string;
    ring: string;
    track: string;
    bar: string;
    accent: string;
  };
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div
      className={`relative flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full ${tone.bg} ring-1 ${tone.ring}`}
      aria-label={`${label} ${score.toFixed(1)}`}
    >
      <svg
        viewBox="0 0 48 48"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="3"
          className={tone.track}
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={tone.bar}
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span
          className={`text-[15px] font-black leading-none tabular-nums ${tone.text}`}
        >
          {score.toFixed(1)}
        </span>
        <span className="mt-0.5 text-[7.5px] font-bold uppercase tracking-[0.12em] text-ink2/55">
          {label}
        </span>
      </div>
    </div>
  );
}
