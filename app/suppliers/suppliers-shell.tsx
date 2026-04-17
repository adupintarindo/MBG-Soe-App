"use client";

import { useMemo, useState } from "react";
import { formatIDR } from "@/lib/engine";
import type { SupplierAction } from "@/lib/engine";
import { Section, TableWrap, THead } from "@/components/ui";
import { SupplierDetailModal } from "./supplier-detail-modal";
import { ActionsPanel } from "./actions-panel";
import type {
  SupplierRow,
  SupItemLink,
  InvoiceTx,
  PoTx,
  ItemCatalog,
  SupplierCert
} from "./types";

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
  signed: "bg-emerald-100 text-emerald-800",
  awaiting: "bg-amber-100 text-amber-900",
  draft: "bg-slate-100 text-slate-800",
  rejected: "bg-red-100 text-red-800"
};

interface Props {
  suppliers: SupplierRow[];
  supItems: SupItemLink[];
  invoices: InvoiceTx[];
  pos: PoTx[];
  items: ItemCatalog[];
  certs: SupplierCert[];
  actions: SupplierAction[];
  canWriteActions: boolean;
  isSupplierRole: boolean;
  currentSupplierId: string | null;
  isAdmin: boolean;
}

export function SuppliersShell({
  suppliers,
  supItems,
  invoices,
  pos,
  items,
  certs,
  actions,
  canWriteActions,
  isSupplierRole,
  currentSupplierId,
  isAdmin
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

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

  const rejected = suppliers.filter((s) => s.status === "rejected");
  const topByScore = [...suppliers]
    .filter((s) => s.status === "signed" || s.status === "awaiting")
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));

  const openSupplier = openId
    ? (suppliers.find((s) => s.id === openId) ?? null)
    : null;

  return (
    <>
      <Section
        title="Onboarding & Follow-up Tracker"
        hint="Action items dari meeting onboarding supplier · update status untuk sync readiness."
      >
        <ActionsPanel
          actions={actions}
          canWrite={canWriteActions}
          isSupplierRole={isSupplierRole}
          supplierId={isSupplierRole ? currentSupplierId : null}
          title="Semua Action · lintas supplier"
        />
      </Section>

      <Section
        title="Vendor Cards · Signed + Awaiting"
        hint="Klik kartu untuk rincian, harga, sertifikasi & histori transaksi."
        noPad
      >
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">
          {topByScore.map((s) => {
            const spend = spendBySup.get(s.id);
            const linked = itemsBySup.get(s.id) ?? [];
            const score = Number(s.score ?? 0);
            return (
              <article
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenId(s.id);
                  }
                }}
                className={`cursor-pointer rounded-2xl bg-paper p-5 text-left ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-card focus:outline-none focus:ring-2 focus:ring-accent-strong ${s.status === "rejected" ? "opacity-60" : ""}`}
              >
                <header className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-ink2/60">
                        {s.id}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[s.type] ?? TYPE_COLOR.INFORMAL}`}
                      >
                        {s.type}
                      </span>
                    </div>
                    <h3 className="mt-1 truncate text-sm font-black text-ink">
                      {s.name}
                    </h3>
                    <div className="truncate text-[11px] text-ink2/70">
                      {s.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/60">
                      Score
                    </div>
                    <div
                      className={`text-lg font-black ${
                        score >= 80
                          ? "text-emerald-700"
                          : score >= 70
                            ? "text-amber-700"
                            : "text-red-700"
                      }`}
                    >
                      {score.toFixed(1)}
                    </div>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
                    >
                      {s.status}
                    </span>
                  </div>
                </header>

                <div className="space-y-0.5 text-[11px] text-ink">
                  <div>
                    <b>PIC:</b> {s.pic ?? "—"}
                  </div>
                  <div className="font-mono text-ink2">{s.phone ?? "—"}</div>
                  <div className="font-mono text-ink2/70">
                    {s.email ?? "—"}
                  </div>
                </div>

                {linked.length > 0 && (
                  <div className="mt-3 border-t border-ink/5 pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                      Komoditas · {linked.length} item
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {linked.slice(0, 8).map((li) => (
                        <span
                          key={li.item_code}
                          className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ink2 ring-1 ring-ink/5"
                        >
                          {li.item_code}
                          {li.is_main && (
                            <span className="ml-1 text-accent-strong">★</span>
                          )}
                        </span>
                      ))}
                      {linked.length > 8 && (
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink2/60">
                          +{linked.length - 8} lagi
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {spend && (
                  <div className="mt-3 flex items-center justify-between border-t border-ink/5 pt-2 text-[11px]">
                    <span className="text-ink2/70">{spend.count} invoice</span>
                    <span className="font-mono font-black text-emerald-800">
                      {formatIDR(spend.total)}
                    </span>
                  </div>
                )}

                {s.notes && (
                  <p className="mt-2 line-clamp-2 text-[10px] italic text-ink2/70">
                    {s.notes}
                  </p>
                )}

                <div className="mt-3 flex justify-end">
                  <span className="text-[11px] font-bold text-accent-strong">
                    Rincian →
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      {rejected.length > 0 && (
        <Section title="❌ Supplier Rejected" accent="bad">
          <div className="space-y-2">
            {rejected.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpenId(s.id)}
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
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Tabel Lengkap · ${suppliers.length} Supplier`}>
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 pr-3">Nama</th>
              <th className="py-2 pr-3">Tipe</th>
              <th className="py-2 pr-3">Komoditas</th>
              <th className="py-2 pr-3 text-right">Items</th>
              <th className="py-2 pr-3 text-right">Skor</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3 text-right">Belanja</th>
              <th className="py-2 pr-3"></th>
            </THead>
            <tbody>
              {suppliers.map((s) => {
                const spend = spendBySup.get(s.id);
                const linked = itemsBySup.get(s.id) ?? [];
                return (
                  <tr
                    key={s.id}
                    className="row-hover cursor-pointer border-b border-ink/5"
                    onClick={() => setOpenId(s.id)}
                  >
                    <td className="py-2 pr-3 font-mono text-xs">{s.id}</td>
                    <td className="py-2 pr-3 font-semibold">{s.name}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[s.type] ?? TYPE_COLOR.INFORMAL}`}
                      >
                        {s.type}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-[11px] text-ink2">
                      {s.commodity}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {linked.length}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                      {Number(s.score ?? 0).toFixed(1)}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {spend ? formatIDR(spend.total) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="text-[11px] font-bold text-accent-strong">
                        Rincian →
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      {openSupplier && (
        <SupplierDetailModal
          supplier={openSupplier}
          supItems={supItems.filter((si) => si.supplier_id === openSupplier.id)}
          invoices={invoices.filter(
            (i) => i.supplier_id === openSupplier.id
          )}
          pos={pos.filter((p) => p.supplier_id === openSupplier.id)}
          certs={certs.filter((c) => c.supplier_id === openSupplier.id)}
          actions={actions.filter(
            (a) => a.supplier_id === openSupplier.id
          )}
          canWriteActions={canWriteActions}
          isSupplierRole={isSupplierRole}
          items={items}
          isAdmin={isAdmin}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
