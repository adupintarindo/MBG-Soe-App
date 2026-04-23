"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
interface SupplierItemLink {
  supplier_id: string;
  item_code: string;
  is_main: boolean;
  price_idr: number | null;
}
interface MenuLite {
  id: number;
  name: string;
  name_en: string | null;
  cycle_day: number | null;
}

interface MenuPreview {
  date: string;
  menu_id: number | null;
  menu_name: string | null;
  menu_name_en: string | null;
  is_custom: boolean;
  effective_menu_id: number | null;
  effective_source: "assigned" | "override" | "custom" | "none";
}

interface DraftRow {
  item_code: string;
  unit: string;
  qty: string;
  price_suggested: string;
  note: string;
  supplier_id: string;
}

function emptyRow(): DraftRow {
  return {
    item_code: "",
    unit: "kg",
    qty: "",
    price_suggested: "",
    note: "",
    supplier_id: ""
  };
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
  items,
  supplierItems,
  menus
}: {
  suppliers: SupplierLite[];
  items: ItemLite[];
  supplierItems: SupplierItemLink[];
  menus: MenuLite[];
}) {
  const { lang } = useLang();
  const router = useRouter();

  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [seedDate, setSeedDate] = useState(plusDays(todayIso(), 3));
  const [menuOverride, setMenuOverride] = useState<number | null>(null);
  const [preview, setPreview] = useState<MenuPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const menuById = useMemo(() => {
    const m = new Map<number, MenuLite>();
    for (const x of menus) m.set(x.id, x);
    return m;
  }, [menus]);

  const itemByCode = useMemo(() => {
    const m = new Map<string, ItemLite>();
    for (const it of items) m.set(it.code, it);
    return m;
  }, [items]);

  // Map item_code → ordered candidate supplier_ids (is_main first, then cheapest, then rest)
  const supplierOptionsByItem = useMemo(() => {
    const m = new Map<string, string[]>();
    const byItem = new Map<string, SupplierItemLink[]>();
    for (const l of supplierItems) {
      const arr = byItem.get(l.item_code) ?? [];
      arr.push(l);
      byItem.set(l.item_code, arr);
    }
    const activeIds = new Set(suppliers.map((s) => s.id));
    for (const [code, list] of byItem) {
      const sorted = list
        .filter((l) => activeIds.has(l.supplier_id))
        .slice()
        .sort((a, b) => {
          if (a.is_main !== b.is_main) return a.is_main ? -1 : 1;
          const pa = a.price_idr ?? Number.POSITIVE_INFINITY;
          const pb = b.price_idr ?? Number.POSITIVE_INFINITY;
          return pa - pb;
        })
        .map((l) => l.supplier_id);
      m.set(code, sorted);
    }
    return m;
  }, [supplierItems, suppliers]);

  function autoPickSupplier(code: string): string {
    const candidates = supplierOptionsByItem.get(code);
    if (candidates && candidates.length > 0) return candidates[0];
    return suppliers[0]?.id ?? "";
  }

  const total = rows.reduce((s, r) => {
    const q = Number(r.qty);
    const p = Number(r.price_suggested);
    if (!Number.isFinite(q) || !Number.isFinite(p)) return s;
    return s + q * p;
  }, 0);

  // Group preview: show how many suppliers will receive a file
  const supplierGroups = useMemo(() => {
    const groups = new Map<string, DraftRow[]>();
    for (const r of rows) {
      if (!r.item_code || Number(r.qty) <= 0 || !r.supplier_id) continue;
      const arr = groups.get(r.supplier_id) ?? [];
      arr.push(r);
      groups.set(r.supplier_id, arr);
    }
    return groups;
  }, [rows]);

  function updateRow(idx: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function onItemPick(idx: number, code: string) {
    const it = itemByCode.get(code);
    const sup = code ? autoPickSupplier(code) : "";
    updateRow(idx, {
      item_code: code,
      unit: it?.unit ?? "kg",
      supplier_id: sup
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  // Preview menu untuk tanggal terpilih (menu terjadwal + apakah custom)
  useEffect(() => {
    let cancelled = false;
    if (!seedDate) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    const url = `/api/quotations/seed-preview?date=${encodeURIComponent(seedDate)}`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) return null;
        const j = (await res.json()) as { ok: boolean; preview?: MenuPreview };
        return j.ok ? (j.preview ?? null) : null;
      })
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seedDate]);

  async function seedFromDate() {
    setError(null);
    setSeeding(true);
    try {
      const params = new URLSearchParams({ date: seedDate });
      if (menuOverride != null) params.set("menu", String(menuOverride));
      const res = await fetch(`/api/quotations/seed?${params.toString()}`);
      const json = (await res.json()) as {
        ok: boolean;
        rows?: Array<{
          item_code: string;
          qty: number;
          unit: string;
          price_suggested: number | null;
        }>;
        preview?: MenuPreview;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? t("qtNew.errFail", lang));
        return;
      }
      if (json.preview) setPreview(json.preview);
      const seeded = json.rows ?? [];
      if (seeded.length === 0) {
        setError(t("qtNew.errNoDemand", lang));
        return;
      }
      setRows(
        seeded.map((s) => ({
          item_code: s.item_code,
          unit: s.unit,
          qty: String(s.qty),
          price_suggested:
            s.price_suggested != null ? String(s.price_suggested) : "",
          note: "",
          supplier_id: autoPickSupplier(s.item_code)
        }))
      );
    } finally {
      setSeeding(false);
    }
  }

  async function submit() {
    setError(null);
    const cleanRows = rows.filter(
      (r) => r.item_code && Number(r.qty) > 0 && r.supplier_id
    );
    if (cleanRows.length === 0) {
      setError(t("qtNew.errMinRow", lang));
      return;
    }

    const unassigned = rows.filter(
      (r) => r.item_code && Number(r.qty) > 0 && !r.supplier_id
    );
    if (unassigned.length > 0) {
      setError(t("qtNew.errRowNoSup", lang));
      return;
    }

    // Group by supplier
    const grouped = new Map<string, DraftRow[]>();
    for (const r of cleanRows) {
      const arr = grouped.get(r.supplier_id) ?? [];
      arr.push(r);
      grouped.set(r.supplier_id, arr);
    }

    setSaving(true);
    try {
      const quoteDate = todayIso();
      const validUntil = plusDays(quoteDate, 7);
      const needDate = seedDate;

      const createdNos: string[] = [];
      for (const [supId, supRows] of grouped) {
        const payload = {
          supplier_id: supId,
          quote_date: quoteDate,
          valid_until: validUntil,
          need_date: needDate,
          notes: null,
          status: "draft" as const,
          rows: supRows.map((r) => ({
            item_code: r.item_code,
            unit: r.unit || "kg",
            qty: Number(r.qty),
            price_suggested:
              r.price_suggested === "" ? null : Number(r.price_suggested),
            note: r.note || null
          }))
        };

        const res = await fetch("/api/quotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = (await res.json()) as {
          ok: boolean;
          no?: string;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.no) {
          const msg = json.error ?? t("qtNew.errFail", lang);
          setError(
            json.no ? ti("qtNew.errRowFail", lang, { no: json.no, msg }) : msg
          );
          return;
        }
        createdNos.push(json.no);
      }

      // Trigger downloads — one XLSX per quotation
      for (const no of createdNos) {
        const a = document.createElement("a");
        a.href = `/api/quotations/${encodeURIComponent(no)}/export.xlsx`;
        a.download = `${no}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        await new Promise((r) => setTimeout(r, 250));
      }

      if (createdNos.length === 1) {
        const only = createdNos[0];
        startTransition(() => {
          router.push(`/procurement/quotation/${encodeURIComponent(only)}`);
          router.refresh();
        });
      } else {
        startTransition(() => {
          router.push("/procurement?tab=quotations");
          router.refresh();
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="divide-y divide-ink/10">
      {/* Step 1 · Seed from Menu */}
      <div className="space-y-3 p-5">
        <h3 className="text-sm font-black uppercase tracking-wide text-ink2">
          {t("qtNew.step1SeedTitle", lang)}
        </h3>
        <p className="text-[11px] text-ink2/70">{t("qtNew.step2Desc", lang)}</p>

        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-ink2">
              {t("qtNew.fldMenuDate", lang)}
            </span>
            <input
              type="date"
              value={seedDate}
              onChange={(e) => {
                setSeedDate(e.target.value);
                setMenuOverride(null);
              }}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-ink2">
              {t("qtNew.fldMenuPick", lang)}
            </span>
            <select
              value={menuOverride ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setMenuOverride(v === "" ? null : Number(v));
              }}
              className="w-72 rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t("qtNew.optMenuAuto", lang)}</option>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.cycle_day != null ? `M${m.cycle_day} · ` : ""}
                  {m.name}
                </option>
              ))}
            </select>
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

        {/* Preview menu terjadwal + info override */}
        <MenuPreviewBanner
          lang={lang}
          loading={previewLoading}
          preview={preview}
          override={
            menuOverride != null ? (menuById.get(menuOverride) ?? null) : null
          }
        />
      </div>

      {/* Step 2 · Rows */}
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-ink2">
            {t("qtNew.step2ItemsTitle", lang)}
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
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-paper">
              <tr className="text-left text-[10px] font-black uppercase tracking-wide text-ink2">
                <th className="px-3 py-2">{t("qtNew.colNo", lang)}</th>
                <th className="px-3 py-2">{t("qtNew.colItem", lang)}</th>
                <th className="px-3 py-2 text-right">{t("qtNew.colQty", lang)}</th>
                <th className="px-3 py-2">{t("qtNew.colUnit", lang)}</th>
                <th className="px-3 py-2 text-center">{t("qtNew.colPriceSug", lang)}</th>
                <th className="px-3 py-2 text-center">{t("qtNew.colSubtotal", lang)}</th>
                <th className="px-3 py-2">{t("qtNew.colSupplier", lang)}</th>
                <th className="px-3 py-2">{t("qtNew.colNote", lang)}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const q = Number(r.qty) || 0;
                const p = Number(r.price_suggested) || 0;
                const sub = q * p;
                const preferred = r.item_code
                  ? (supplierOptionsByItem.get(r.item_code) ?? [])
                  : [];
                const preferredSet = new Set(preferred);
                const others = suppliers
                  .map((s) => s.id)
                  .filter((id) => !preferredSet.has(id));
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
                            {it.code}
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
                    <td className="px-3 py-2 text-left">
                      <input
                        type="number"
                        step="1"
                        min={0}
                        value={r.price_suggested}
                        onChange={(e) =>
                          updateRow(idx, { price_suggested: e.target.value })
                        }
                        placeholder={t("qtNew.phPriceSug", lang)}
                        className="w-32 rounded-lg border border-ink/20 bg-white px-2 py-1 text-left font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-left font-mono text-xs font-black">
                      {sub > 0 ? formatIDR(sub) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={r.supplier_id}
                        onChange={(e) =>
                          updateRow(idx, { supplier_id: e.target.value })
                        }
                        className="w-56 rounded-lg border border-ink/20 bg-white px-2 py-1 text-xs"
                      >
                        <option value="">
                          {t("qtNew.optPickSup", lang)}
                        </option>
                        {preferred.length > 0 && (
                          <optgroup label={t("qtNew.optgrpMatch", lang)}>
                            {preferred.map((id) => {
                              const s = suppliers.find((x) => x.id === id);
                              if (!s) return null;
                              return (
                                <option key={id} value={id}>
                                  {s.name}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        {others.length > 0 && (
                          <optgroup label={t("qtNew.optgrpOther", lang)}>
                            {others.map((id) => {
                              const s = suppliers.find((x) => x.id === id);
                              if (!s) return null;
                              return (
                                <option key={id} value={id}>
                                  {s.name}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </select>
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
                <td className="px-3 py-2 text-left font-mono font-black text-ink">
                  {formatIDR(total)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Step 3 · Submit */}
      <div className="space-y-3 bg-paper/40 p-5">
        {supplierGroups.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {Array.from(supplierGroups.entries()).map(([supId, supRows]) => {
              const s = suppliers.find((x) => x.id === supId);
              return (
                <span
                  key={supId}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-ink ring-1 ring-ink/15"
                >
                  {s?.name ?? supId}
                  <span className="rounded-full bg-ink/10 px-1.5 py-0.5 font-mono">
                    {supRows.length}
                  </span>
                </span>
              );
            })}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={saving || supplierGroups.size === 0}
            className="rounded-xl bg-ink px-5 py-3 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
          >
            {saving
              ? t("qtNew.btnSaving", lang)
              : supplierGroups.size > 1
                ? ti("qtNew.btnSaveMulti", lang, {
                    n: String(supplierGroups.size)
                  })
                : t("qtNew.btnSave", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuPreviewBanner({
  lang,
  loading,
  preview,
  override
}: {
  lang: "ID" | "EN";
  loading: boolean;
  preview: MenuPreview | null;
  override: MenuLite | null;
}) {
  if (loading) {
    return (
      <div className="rounded-xl bg-paper px-3 py-2 text-[11px] text-ink2/70 ring-1 ring-ink/10">
        {t("qtNew.previewLoading", lang)}
      </div>
    );
  }
  if (!preview) return null;

  // Kalau user pilih override, tampilkan override + info menu terjadwal sebagai context
  if (override) {
    const assignedLabel =
      preview.is_custom
        ? t("qtNew.previewCustom", lang)
        : preview.menu_name ?? t("qtNew.previewNone", lang);
    const name = lang === "EN" ? (override.name_en ?? override.name) : override.name;
    return (
      <div className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-900 ring-1 ring-amber-200">
        <span className="font-bold">{t("qtNew.previewOverride", lang)}:</span>{" "}
        {override.cycle_day != null ? `M${override.cycle_day} · ` : ""}
        {name}
        <span className="ml-2 text-amber-900/70">
          ({t("qtNew.previewAssigned", lang)}: {assignedLabel})
        </span>
      </div>
    );
  }

  // Auto mode
  if (preview.is_custom) {
    return (
      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 ring-1 ring-emerald-200">
        <span className="font-bold">{t("qtNew.previewAssigned", lang)}:</span>{" "}
        {t("qtNew.previewCustom", lang)}
      </div>
    );
  }
  if (preview.menu_id && preview.menu_name) {
    return (
      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 ring-1 ring-emerald-200">
        <span className="font-bold">{t("qtNew.previewAssigned", lang)}:</span>{" "}
        {preview.menu_name}
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-800 ring-1 ring-red-200">
      {t("qtNew.previewNoneHint", lang)}
    </div>
  );
}
