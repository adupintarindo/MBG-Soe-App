"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { type SupplierAction } from "@/lib/engine";
import { IDR, Section } from "@/components/ui";
import {
  SortableTable,
  type SortableColumn,
  type SortableTableFilter
} from "@/components/sortable-table";
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

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.5l2.85 6.58 7.15.63-5.42 4.72 1.64 6.97L12 17.77l-6.22 3.63 1.64-6.97L2 9.71l7.15-.63z" />
    </svg>
  );
}

function StarRating({ score }: { score: number }) {
  // Map 0–100 → 0–100% across 5 stars, quantized to nearest 10% for half-star fidelity.
  const raw = Math.max(0, Math.min(100, score));
  const quantized = Math.round(raw / 10) * 10;
  return (
    <span
      className="relative inline-flex items-center"
      title={`${raw.toFixed(1)} / 100`}
      aria-label={`${raw.toFixed(1)} dari 100`}
    >
      <span className="inline-flex text-ink/20">
        <StarIcon className="h-3.5 w-3.5" />
        <StarIcon className="h-3.5 w-3.5" />
        <StarIcon className="h-3.5 w-3.5" />
        <StarIcon className="h-3.5 w-3.5" />
        <StarIcon className="h-3.5 w-3.5" />
      </span>
      <span
        className="pointer-events-none absolute inset-y-0 left-0 inline-flex overflow-hidden text-amber-400"
        style={{ width: `${quantized}%` }}
      >
        <StarIcon className="h-3.5 w-3.5 shrink-0" />
        <StarIcon className="h-3.5 w-3.5 shrink-0" />
        <StarIcon className="h-3.5 w-3.5 shrink-0" />
        <StarIcon className="h-3.5 w-3.5 shrink-0" />
        <StarIcon className="h-3.5 w-3.5 shrink-0" />
      </span>
    </span>
  );
}

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
  void canWriteActions;
  void isSupplierRole;
  const { lang } = useLang();
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

  const typeFilter: SortableTableFilter<SupplierRow> = {
    key: "type",
    label: t("suppliers.filterType", lang),
    getValue: (s) => s.type
  };
  const columns: SortableColumn<SupplierRow>[] = [
    {
      key: "id",
      label: t("suppliers.colId", lang),
      align: "center",
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
      searchValue: (s) =>
        `${s.name} ${s.pic ?? ""} ${s.email ?? ""} ${s.phone ?? ""}`,
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
      align: "center",
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
      key: "pic",
      label: t("suppliers.colPic", lang),
      align: "left",
      sortValue: (s) => s.pic ?? "",
      searchValue: (s) => s.pic ?? "",
      render: (s) => (
        <span className="text-xs text-ink2">{s.pic ?? "—"}</span>
      )
    },
    {
      key: "phone",
      label: t("suppliers.colPhone", lang),
      align: "left",
      sortValue: (s) => s.phone ?? "",
      searchValue: (s) => s.phone ?? "",
      render: (s) => (
        <span className="font-mono text-[11px] text-ink2">
          {s.phone ?? "—"}
        </span>
      )
    },
    {
      key: "email",
      label: t("suppliers.colEmail", lang),
      align: "left",
      sortValue: (s) => s.email ?? "",
      searchValue: (s) => s.email ?? "",
      render: (s) => (
        <span className="font-mono text-[11px] text-ink2/80">
          {s.email ?? "—"}
        </span>
      )
    },
    {
      key: "address",
      label: t("suppliers.colAddress", lang),
      align: "left",
      sortValue: (s) => s.address ?? "",
      searchValue: (s) => s.address ?? "",
      render: (s) => (
        <span className="text-[11px] text-ink2/80">{s.address ?? "—"}</span>
      )
    },
    {
      key: "commodity",
      label: t("suppliers.colKomoditas", lang),
      align: "left",
      sortValue: (s) => s.commodity ?? "",
      searchValue: (s) => s.commodity ?? "",
      render: (s) => (
        <span
          className="block truncate text-[11px] text-ink2"
          title={s.commodity ?? ""}
        >
          {s.commodity || "—"}
        </span>
      )
    },
    {
      key: "items",
      label: t("suppliers.colItems", lang),
      align: "center",
      width: "88px",
      sortValue: (s) => (itemsBySup.get(s.id) ?? []).length,
      render: (s) => {
        const list = itemsBySup.get(s.id) ?? [];
        const mainCount = list.filter((l) => l.is_main).length;
        return (
          <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums">
            <span>{list.length}</span>
            {mainCount > 0 && (
              <span
                className="text-amber-500"
                title={`${mainCount} main`}
              >
                ★{mainCount}
              </span>
            )}
          </span>
        );
      }
    },
    {
      key: "invoices",
      label: t("suppliers.colInvoices", lang),
      align: "center",
      width: "80px",
      sortValue: (s) => spendBySup.get(s.id)?.count ?? 0,
      render: (s) => {
        const sp = spendBySup.get(s.id);
        return (
          <span className="font-mono text-xs tabular-nums">
            {sp?.count ?? 0}
          </span>
        );
      }
    },
    {
      key: "spend",
      label: t("suppliers.colSpend", lang),
      align: "left",
      width: "160px",
      sortValue: (s) => spendBySup.get(s.id)?.total ?? 0,
      render: (s) => {
        const sp = spendBySup.get(s.id);
        return sp ? (
          <IDR
            value={sp.total}
            className="text-xs font-bold text-emerald-800"
          />
        ) : (
          <span className="text-ink2/40">—</span>
        );
      }
    },
    {
      key: "notes",
      label: t("suppliers.colNotes", lang),
      align: "left",
      sortValue: (s) => s.notes ?? "",
      searchValue: (s) => s.notes ?? "",
      render: (s) => (
        <span
          className="block truncate text-[11px] italic text-ink2/70"
          title={s.notes ?? ""}
        >
          {s.notes || "—"}
        </span>
      )
    },
    {
      key: "quickview",
      label: t("suppliers.colAction", lang),
      align: "center",
      sortable: false,
      width: "96px",
      render: (s) => (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openQuickView(s.id);
          }}
          disabled={modalLoadingId === s.id}
          className="inline-flex items-center gap-1 rounded-md bg-ink/5 px-2 py-1 text-[10px] font-bold text-ink2 ring-1 ring-ink/10 transition hover:bg-ink/10 hover:text-ink disabled:opacity-60"
        >
          {modalLoadingId === s.id
            ? t("common.loading", lang)
            : t("suppliers.cardQuickView", lang)}
        </button>
      )
    },
    {
      key: "score",
      label: t("suppliers.colScore", lang),
      align: "center",
      width: "112px",
      sortValue: (s) => Number(s.score ?? 0),
      exportValue: (s) => Number(s.score ?? 0),
      exportNumFmt: "0.0",
      render: (s) => <StarRating score={Number(s.score ?? 0)} />
    }
  ];

  return (
    <>
      <Section
        icon="📋"
        title={ti("suppliers.tableTitle", lang, { n: suppliers.length })}
        hint={t("suppliers.tableHint", lang)}
      >
        <SortableTable<SupplierRow>
          tableClassName="text-sm"
          rowKey={(s) => s.id}
          initialSort={{ key: "score", dir: "desc" }}
          columns={columns}
          rows={suppliers}
          searchable
          exportable
          exportFileName="suppliers"
          exportSheetName="Suppliers"
          filters={[typeFilter]}
          stickyHeader
          bodyMaxHeight={560}
        />
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
