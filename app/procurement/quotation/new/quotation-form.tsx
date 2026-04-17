"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatIDR } from "@/lib/engine";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

interface SupplierLite {
  id: string;
  name: string;
  status: string;
}
interface ItemLite {
  code: string;
  name_en: string | null;
  unit: string;
  category: string;
  active: boolean;
}

interface DraftRow {
  item_code: string;
  unit: string;
  qty: string;
  price_suggested: string;
  note: string;
}

function emptyRow(): DraftRow {
  return { item_code: "", unit: "kg", qty: "", price_suggested: "", note: "" };
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function QuotationForm({
  suppliers,
  items
}: {
  suppliers: SupplierLite[];
  items: ItemLite[];
}) {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [quoteDate, setQuoteDate] = useState(todayIso());
  const [validUntil, setValidUntil] = useState(plusDays(todayIso(), 7));
  const [needDate, setNeedDate] = useState(plusDays(todayIso(), 3));
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [seedDate, setSeedDate] = useState(plusDays(todayIso(), 3));
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const itemByCode = useMemo(() => {
    const m = new Map<string, ItemLite>();
    for (const it of items) m.set(it.code, it);
    return m;
  }, [items]);

  const total = rows.reduce((s, r) => {
    const q = Number(r.qty);
    const p = Number(r.price_suggested);
    if (!Number.isFinite(q) || !Number.isFinite(p)) return s;
    return s + q * p;
  }, 0);

  function updateRow(idx: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function onItemPick(idx: number, code: string) {
    const it = itemByCode.get(code);
    updateRow(idx, {
      item_code: code,
      unit: it?.unit ?? "kg"
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function seedFromDate() {
    setError(null);
    setSeeding(true);
    try {
      const { data, error: err } = await supabase.rpc(
        "quotation_seed_from_date",
        { p_date: seedDate }
      );
      if (err) {
        setError(err.message);
        return;
      }
      const seeded = (data ?? []) as Array<{
        item_code: string;
        qty: number;
        unit: string;
        price_suggested: number | null;
      }>;
      if (seeded.length === 0) {
        setError(t("qtNew.errNoDemand", lang));
        return;
      }
      setNeedDate(seedDate);
      setRows(
        seeded.map((s) => ({
          item_code: s.item_code,
          unit: s.unit,
          qty: String(s.qty),
          price_suggested:
            s.price_suggested != null ? String(s.price_suggested) : "",
          note: ""
        }))
      );
    } finally {
      setSeeding(false);
    }
  }

  async function submit() {
    setError(null);
    if (!supplierId) {
      setError(t("qtNew.errPickSup", lang));
      return;
    }
    const cleanRows = rows.filter((r) => r.item_code && Number(r.qty) > 0);
    if (cleanRows.length === 0) {
      setError(t("qtNew.errMinRow", lang));
      return;
    }
    setSaving(true);
    try {
      const insertQ = {
        supplier_id: supplierId,
        quote_date: quoteDate,
        valid_until: validUntil || null,
        need_date: needDate || null,
        notes: notes || null,
        status: "draft" as const
      };
      const { data: qtData, error: qtErr } = await supabase
        .from("quotations")
        .insert(insertQ as never)
        .select("no")
        .single();
      if (qtErr || !qtData) {
        setError(qtErr?.message ?? t("qtNew.errFail", lang));
        return;
      }
      const qtNo = (qtData as { no: string }).no;

      const rowInserts = cleanRows.map((r, i) => ({
        qt_no: qtNo,
        line_no: i + 1,
        item_code: r.item_code,
        qty: Number(r.qty),
        unit: r.unit || "kg",
        price_suggested:
          r.price_suggested === "" ? null : Number(r.price_suggested),
        note: r.note || null
      }));
      const { error: rowErr } = await supabase
        .from("quotation_rows")
        .insert(rowInserts as never);
      if (rowErr) {
        setError(
          ti("qtNew.errRowFail", lang, { no: qtNo, msg: rowErr.message })
        );
        return;
      }

      startTransition(() => {
        router.push(`/procurement/quotation/${encodeURIComponent(qtNo)}`);
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="divide-y divide-ink/10">
      {/* Step 1 · Header */}
      <div className="space-y-3 p-5">
        <h3 className="text-sm font-black uppercase tracking-wide text-ink2">
          {t("qtNew.step1Title", lang)}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-ink2">
              {t("qtNew.fldSupplier", lang)}
            </span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t("qtNew.optPickSup", lang)}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-ink2">
              {t("qtNew.fldQuoteDate", lang)}
            </span>
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-ink2">
              {t("qtNew.fldValidUntil", lang)}
            </span>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-ink2">
              {t("qtNew.fldNeedDate", lang)}
            </span>
            <input
              type="date"
              value={needDate}
              onChange={(e) => setNeedDate(e.target.value)}
              className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("qtNew.fldNotes", lang)}
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("qtNew.phNotes", lang)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      {/* Step 2 · Seed helper */}
      <div className="space-y-3 bg-paper/40 p-5">
        <h3 className="text-sm font-black uppercase tracking-wide text-ink2">
          {t("qtNew.step2Title", lang)}
        </h3>
        <p className="text-[11px] text-ink2/70">
          {t("qtNew.step2Desc", lang)}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-ink2">
              {t("qtNew.fldMenuDate", lang)}
            </span>
            <input
              type="date"
              value={seedDate}
              onChange={(e) => setSeedDate(e.target.value)}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={seedFromDate}
            disabled={seeding}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-ink ring-1 ring-ink/20 hover:bg-paper disabled:opacity-50"
          >
            {seeding ? t("qtNew.btnSeeding", lang) : t("qtNew.btnSeed", lang)}
          </button>
          <button
            type="button"
            onClick={() => setRows([emptyRow()])}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            {t("qtNew.btnResetRows", lang)}
          </button>
        </div>
      </div>

      {/* Step 3 · Rows */}
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-ink2">
            {t("qtNew.step3Title", lang)}
          </h3>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg bg-ink px-3 py-1.5 text-[11px] font-black text-white hover:bg-ink2"
          >
            {t("qtNew.btnAddRow", lang)}
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl ring-1 ring-ink/10">
          <table className="w-full min-w-[800px] text-xs">
            <thead className="bg-paper">
              <tr className="text-left text-[10px] font-black uppercase tracking-wide text-ink2">
                <th className="px-3 py-2">{t("qtNew.colNo", lang)}</th>
                <th className="px-3 py-2">{t("qtNew.colItem", lang)}</th>
                <th className="px-3 py-2 text-right">{t("qtNew.colQty", lang)}</th>
                <th className="px-3 py-2">{t("qtNew.colUnit", lang)}</th>
                <th className="px-3 py-2 text-right">{t("qtNew.colPriceSug", lang)}</th>
                <th className="px-3 py-2 text-right">{t("qtNew.colSubtotal", lang)}</th>
                <th className="px-3 py-2">{t("qtNew.colNote", lang)}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const q = Number(r.qty) || 0;
                const p = Number(r.price_suggested) || 0;
                const sub = q * p;
                return (
                  <tr key={idx} className="border-t border-ink/5">
                    <td className="px-3 py-2 font-mono text-ink2">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <select
                        value={r.item_code}
                        onChange={(e) => onItemPick(idx, e.target.value)}
                        className="w-64 rounded-lg border border-ink/20 bg-white px-2 py-1 text-xs"
                      >
                        <option value="">{t("qtNew.optPickItem", lang)}</option>
                        {items.map((it) => (
                          <option key={it.code} value={it.code}>
                            {it.code} · {it.name_en ?? it.code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.001"
                        min={0}
                        value={r.qty}
                        onChange={(e) =>
                          updateRow(idx, { qty: e.target.value })
                        }
                        className="w-24 rounded-lg border border-ink/20 bg-white px-2 py-1 text-right font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={r.unit}
                        onChange={(e) =>
                          updateRow(idx, { unit: e.target.value })
                        }
                        className="w-16 rounded-lg border border-ink/20 bg-white px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="1"
                        min={0}
                        value={r.price_suggested}
                        onChange={(e) =>
                          updateRow(idx, { price_suggested: e.target.value })
                        }
                        placeholder={t("qtNew.phPriceSug", lang)}
                        className="w-32 rounded-lg border border-ink/20 bg-white px-2 py-1 text-right font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-black">
                      {sub > 0 ? formatIDR(sub) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={r.note}
                        onChange={(e) =>
                          updateRow(idx, { note: e.target.value })
                        }
                        className="w-32 rounded-lg border border-ink/20 bg-white px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-[11px] font-bold text-red-700 hover:underline"
                      >
                        {t("qtNew.btnDelete", lang)}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-paper">
              <tr>
                <td colSpan={5} className="px-3 py-2 text-right font-black text-ink">
                  {t("qtNew.totalSug", lang)}
                </td>
                <td className="px-3 py-2 text-right font-mono font-black text-ink">
                  {formatIDR(total)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Step 4 · Submit */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-paper/40 p-5">
        <div className="text-[11px] text-ink2/70">
          {t("qtNew.helperSubmit", lang)}
        </div>
        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-xl bg-ink px-5 py-3 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
        >
          {saving ? t("qtNew.btnSaving", lang) : t("qtNew.btnSave", lang)}
        </button>
      </div>
    </div>
  );
}
