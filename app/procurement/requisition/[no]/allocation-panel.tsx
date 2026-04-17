"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PrRow = {
  pr_no: string;
  line_no: number;
  item_code: string;
  qty_total: number | string;
  unit: string;
  note: string | null;
};

type Allocation = {
  id: number;
  pr_no: string;
  line_no: number;
  supplier_id: string;
  qty_planned: number | string;
  quotation_no: string | null;
  note: string | null;
};

type Summary = {
  line_no: number;
  item_code: string;
  unit: string;
  qty_total: number | string;
  qty_planned_sum: number | string;
  qty_quoted_sum: number | string;
  qty_po_sum: number | string;
  gap: number | string;
};

interface Props {
  prNo: string;
  prStatus: string;
  rows: PrRow[];
  allocations: Allocation[];
  summary: Summary[];
  itemByCode: Record<string, { name: string; unit: string }>;
  suppliers: Array<{ id: string; name: string; status: string }>;
  canWrite: boolean;
}

function fmtQty(n: number | string) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("id-ID", { maximumFractionDigits: 3 });
}

export function PrAllocationPanel({
  prNo,
  prStatus,
  rows,
  allocations,
  summary,
  itemByCode,
  suppliers,
  canWrite
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [openLine, setOpenLine] = useState<number | null>(null);
  const [draftSupplier, setDraftSupplier] = useState("");
  const [draftQty, setDraftQty] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const summaryByLine = useMemo(() => {
    const m = new Map<number, Summary>();
    for (const s of summary) m.set(s.line_no, s);
    return m;
  }, [summary]);

  const allocByLine = useMemo(() => {
    const m = new Map<number, Allocation[]>();
    for (const a of allocations) {
      const list = m.get(a.line_no) ?? [];
      list.push(a);
      m.set(a.line_no, list);
    }
    return m;
  }, [allocations]);

  function startAdd(lineNo: number, gap: number) {
    setOpenLine(lineNo);
    setDraftSupplier(suppliers[0]?.id ?? "");
    setDraftQty(gap > 0 ? String(gap) : "");
    setDraftNote("");
    setError(null);
  }

  async function saveAllocation(lineNo: number) {
    if (!draftSupplier) {
      setError("Pilih supplier.");
      return;
    }
    const qty = Number(draftQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Qty harus > 0.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await supabase.from("pr_allocations").insert({
        pr_no: prNo,
        line_no: lineNo,
        supplier_id: draftSupplier,
        qty_planned: qty,
        note: draftNote || null
      } as never);
      if (err) {
        setError(err.message);
        return;
      }
      setOpenLine(null);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  async function removeAllocation(id: number) {
    if (!confirm("Hapus alokasi ini?")) return;
    setBusy(true);
    try {
      const { error: err } = await supabase
        .from("pr_allocations")
        .delete()
        .eq("id", id);
      if (err) {
        alert(err.message);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  async function updateQty(id: number, next: number) {
    if (!Number.isFinite(next) || next <= 0) return;
    setBusy(true);
    try {
      const { error: err } = await supabase
        .from("pr_allocations")
        .update({ qty_planned: next } as never)
        .eq("id", id);
      if (err) {
        alert(err.message);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-ink/10">
      <table className="w-full min-w-[960px] text-xs">
        <thead className="bg-paper text-left text-[10px] font-black uppercase tracking-wide text-ink2">
          <tr>
            <th className="px-3 py-2">No.</th>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2 text-right">Qty Total</th>
            <th className="px-3 py-2 text-right">Planned</th>
            <th className="px-3 py-2 text-right">Quoted</th>
            <th className="px-3 py-2 text-right">PO</th>
            <th className="px-3 py-2 text-right">Gap</th>
            <th className="px-3 py-2">Alokasi Supplier</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = summaryByLine.get(r.line_no);
            const gap = Number(s?.gap ?? Number(r.qty_total));
            const plannedSum = Number(s?.qty_planned_sum ?? 0);
            const quotedSum = Number(s?.qty_quoted_sum ?? 0);
            const poSum = Number(s?.qty_po_sum ?? 0);
            const allocs = allocByLine.get(r.line_no) ?? [];
            const gapTone =
              gap > 0.001
                ? "text-amber-700"
                : gap < -0.001
                  ? "text-red-700"
                  : "text-emerald-700";
            return (
              <tr
                key={r.line_no}
                className="border-t border-ink/5 align-top"
              >
                <td className="px-3 py-3 font-mono text-[10px] text-ink2">
                  {r.line_no}
                </td>
                <td className="px-3 py-3">
                  <div className="font-bold">
                    {itemByCode[r.item_code]?.name ?? r.item_code}
                  </div>
                  <div className="font-mono text-[10px] text-ink2/60">
                    {r.item_code} · {r.unit}
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs font-black">
                  {fmtQty(r.qty_total)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs">
                  {fmtQty(plannedSum)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-blue-700">
                  {quotedSum > 0 ? fmtQty(quotedSum) : "—"}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-emerald-800">
                  {poSum > 0 ? fmtQty(poSum) : "—"}
                </td>
                <td
                  className={`px-3 py-3 text-right font-mono text-xs font-black ${gapTone}`}
                >
                  {fmtQty(gap)}
                </td>
                <td className="px-3 py-3">
                  <div className="space-y-1.5">
                    {allocs.map((a) => (
                      <AllocationRow
                        key={a.id}
                        alloc={a}
                        supplierName={
                          suppliers.find((s) => s.id === a.supplier_id)?.name ??
                          a.supplier_id
                        }
                        canWrite={canWrite && !a.quotation_no}
                        onRemove={() => removeAllocation(a.id)}
                        onUpdateQty={(n) => updateQty(a.id, n)}
                      />
                    ))}
                    {canWrite && openLine === r.line_no && (
                      <div className="rounded-lg bg-paper/80 p-2 ring-1 ring-ink/10">
                        <div className="mb-1.5 grid grid-cols-[1fr_80px_1fr] gap-1.5">
                          <select
                            value={draftSupplier}
                            onChange={(e) =>
                              setDraftSupplier(e.target.value)
                            }
                            className="rounded border border-ink/20 bg-white px-2 py-1 text-[11px]"
                          >
                            <option value="">— Supplier —</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.001"
                            min={0}
                            value={draftQty}
                            onChange={(e) => setDraftQty(e.target.value)}
                            placeholder="Qty"
                            className="rounded border border-ink/20 bg-white px-2 py-1 text-right font-mono text-[11px]"
                          />
                          <input
                            type="text"
                            value={draftNote}
                            onChange={(e) => setDraftNote(e.target.value)}
                            placeholder="Catatan (opsional)"
                            className="rounded border border-ink/20 bg-white px-2 py-1 text-[11px]"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => saveAllocation(r.line_no)}
                            disabled={busy}
                            className="rounded bg-ink px-2 py-1 text-[10.5px] font-black text-white hover:bg-ink2 disabled:opacity-50"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenLine(null)}
                            className="rounded bg-white px-2 py-1 text-[10.5px] font-bold text-ink2 ring-1 ring-ink/15 hover:bg-paper"
                          >
                            Batal
                          </button>
                          {error && (
                            <span className="text-[10.5px] font-bold text-red-700">
                              {error}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {canWrite && openLine !== r.line_no && (
                      <button
                        type="button"
                        onClick={() => startAdd(r.line_no, gap)}
                        className="rounded-lg bg-white px-2 py-1 text-[10.5px] font-bold text-ink ring-1 ring-ink/15 hover:bg-paper"
                      >
                        + Alokasi supplier
                        {gap > 0.001 && (
                          <span className="ml-1 text-amber-700">
                            (gap {fmtQty(gap)} {r.unit})
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AllocationRow({
  alloc,
  supplierName,
  canWrite,
  onRemove,
  onUpdateQty
}: {
  alloc: Allocation;
  supplierName: string;
  canWrite: boolean;
  onRemove: () => void;
  onUpdateQty: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(alloc.qty_planned));

  const locked = !!alloc.quotation_no;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg px-2 py-1 text-[11px] ${
        locked
          ? "bg-blue-50 ring-1 ring-blue-100"
          : "bg-white ring-1 ring-ink/10"
      }`}
    >
      <span className="font-bold text-ink">{supplierName}</span>
      {editing && canWrite ? (
        <>
          <input
            type="number"
            step="0.001"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-20 rounded border border-ink/20 bg-white px-1 py-0.5 text-right font-mono text-[11px]"
          />
          <button
            type="button"
            onClick={() => {
              onUpdateQty(Number(draft));
              setEditing(false);
            }}
            className="text-[10px] font-black text-emerald-700 hover:underline"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(String(alloc.qty_planned));
              setEditing(false);
            }}
            className="text-[10px] font-bold text-ink2 hover:underline"
          >
            batal
          </button>
        </>
      ) : (
        <span className="font-mono font-black">
          {Number(alloc.qty_planned).toLocaleString("id-ID", {
            maximumFractionDigits: 3
          })}
        </span>
      )}
      {alloc.quotation_no && (
        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-blue-800">
          → {alloc.quotation_no}
        </span>
      )}
      {alloc.note && (
        <span className="italic text-ink2/70">· {alloc.note}</span>
      )}
      {canWrite && !editing && (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[10px] font-bold text-ink2 hover:underline"
          >
            ubah
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] font-bold text-red-700 hover:underline"
          >
            hapus
          </button>
        </>
      )}
      {locked && (
        <span className="text-[9.5px] font-bold text-blue-700/70">
          (terkunci · quotation sudah dispawn)
        </span>
      )}
    </div>
  );
}
