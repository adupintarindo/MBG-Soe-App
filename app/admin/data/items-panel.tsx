"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import {
  Badge,
  Button,
  CategoryBadge,
  EmptyState,
  FieldLabel,
  Input,
  Section,
  Select
} from "@/components/ui";
import {
  SortableTable,
  type SortableColumn
} from "@/components/sortable-table";
import { t, ti, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type Cat = Database["public"]["Enums"]["item_category"];
type Row = Pick<
  Database["public"]["Tables"]["items"]["Row"],
  "code" | "unit" | "category" | "price_idr" | "vol_weekly" | "active"
>;

const CATEGORIES: Cat[] = [
  "BERAS",
  "HEWANI",
  "NABATI",
  "SAYUR_HIJAU",
  "SAYUR",
  "UMBI",
  "BUMBU",
  "REMPAH",
  "BUAH",
  "SEMBAKO",
  "LAIN"
];

interface DraftRow {
  code: string;
  unit: string;
  category: Cat;
  price_idr: string;
  vol_weekly: string;
  active: boolean;
}

const EMPTY_DRAFT: DraftRow = {
  code: "",
  unit: "kg",
  category: "BERAS",
  price_idr: "0",
  vol_weekly: "0",
  active: true
};

function rowToDraft(r: Row): DraftRow {
  return {
    code: r.code,
    unit: r.unit,
    category: r.category,
    price_idr: String(r.price_idr ?? 0),
    vol_weekly: String(r.vol_weekly ?? 0),
    active: r.active
  };
}

export function ItemsPanel({ initial }: { initial: Row[] }) {
  const { lang } = useLang();
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState<Cat | "ALL">("ALL");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows.filter((r) => {
      if (catFilter !== "ALL" && r.category !== catFilter) return false;
      if (!q) return true;
      return r.code.toLowerCase().includes(q);
    });
  }, [rows, filter, catFilter]);

  function startEdit(r: Row) {
    setEditCode(r.code);
    setEditDraft(rowToDraft(r));
    setErr(null);
  }
  function cancelEdit() {
    setEditCode(null);
    setErr(null);
  }

  async function saveNew() {
    setErr(null);
    const code = draft.code.trim();
    if (!code) {
      setErr(t("adminItems.errCodeReq", lang));
      return;
    }
    if (!draft.unit.trim()) {
      setErr(t("adminItems.errUnitReq", lang));
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("items")
      .insert({
        code,
        unit: draft.unit.trim(),
        category: draft.category,
        price_idr: Number(draft.price_idr) || 0,
        vol_weekly: Number(draft.vol_weekly) || 0,
        active: draft.active
      })
      .select("code, unit, category, price_idr, vol_weekly, active")
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((prev) =>
      [...prev, data as Row].sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.code.localeCompare(b.code)
      )
    );
    setDraft(EMPTY_DRAFT);
    setAdding(false);
    router.refresh();
  }

  async function saveEdit() {
    if (!editCode) return;
    setErr(null);
    setBusy(true);
    const { data, error } = await supabase
      .from("items")
      .update({
        unit: editDraft.unit.trim(),
        category: editDraft.category,
        price_idr: Number(editDraft.price_idr) || 0,
        vol_weekly: Number(editDraft.vol_weekly) || 0,
        active: editDraft.active
      })
      .eq("code", editCode)
      .select("code, unit, category, price_idr, vol_weekly, active")
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.code === editCode ? (data as Row) : r))
    );
    setEditCode(null);
    router.refresh();
  }

  async function remove(code: string) {
    if (!confirm(ti("adminItems.confirmDel", lang, { code }))) return;
    setErr(null);
    setBusy(true);
    const { error } = await supabase.from("items").delete().eq("code", code);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.code !== code));
    router.refresh();
  }

  return (
    <Section
      title={t("adminItems.title", lang)}
      hint={t("adminItems.hint", lang)}
      actions={
        <Button
          variant={adding ? "secondary" : "primary"}
          size="sm"
          onClick={() => {
            setAdding((v) => !v);
            setDraft(EMPTY_DRAFT);
            setErr(null);
          }}
        >
          {adding ? t("adminItems.btnCancelAdd", lang) : t("adminItems.btnAdd", lang)}
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 rounded-xl bg-paper p-4 ring-1 ring-ink/5">
          <div className="grid gap-3 md:grid-cols-3">
            <FieldBlock label={t("adminItems.fldCode", lang)} required>
              <Input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder={t("adminItems.phCode", lang)}
                autoComplete="off"
              />
            </FieldBlock>
            <FieldBlock label={t("adminItems.fldCategory", lang)}>
              <Select
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value as Cat })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FieldBlock>
            <FieldBlock label={t("adminItems.fldUnit", lang)} required>
              <Input
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                placeholder={t("adminItems.phUnit", lang)}
              />
            </FieldBlock>
            <FieldBlock label={t("adminItems.fldPrice", lang)}>
              <Input
                type="number"
                inputMode="numeric"
                value={draft.price_idr}
                onChange={(e) =>
                  setDraft({ ...draft, price_idr: e.target.value })
                }
              />
            </FieldBlock>
            <FieldBlock label={t("adminItems.fldVolWeekly", lang)}>
              <Input
                type="number"
                inputMode="decimal"
                value={draft.vol_weekly}
                onChange={(e) =>
                  setDraft({ ...draft, vol_weekly: e.target.value })
                }
              />
            </FieldBlock>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-[12px] font-bold text-ink2">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.checked })
                }
              />
              {t("adminItems.lblActive", lang)}
            </label>
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={saveNew}
            >
              {busy ? t("adminItems.btnSaving", lang) : t("adminItems.btnSave", lang)}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[200px] flex-1">
          <FieldLabel>{t("adminItems.searchLabel", lang)}</FieldLabel>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("adminItems.searchPh", lang)}
          />
        </label>
        <label className="block w-full sm:w-[180px]">
          <FieldLabel>{t("adminItems.fldCategory", lang)}</FieldLabel>
          <Select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as Cat | "ALL")}
          >
            <option value="ALL">{t("adminItems.optAll", lang)}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </label>
        <Badge tone="muted">
          {ti("adminItems.filteredOf", lang, { shown: filtered.length, total: rows.length })}
        </Badge>
      </div>

      {err && (
        <div className="mb-3 rounded-xl bg-red-50 p-3 text-[12px] text-red-800 ring-1 ring-red-200">
          {err}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon="🥕"
          title={t("adminItems.emptyTitle", lang)}
          message={t("adminItems.emptyMsg", lang)}
        />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 px-3 text-center">{t("adminItems.colCode", lang)}</th>
              <th className="py-2 px-3 text-center">{t("adminItems.colCategory", lang)}</th>
              <th className="py-2 px-3 text-center">{t("adminItems.colUnit", lang)}</th>
              <th className="py-2 px-3 text-center">{t("adminItems.colPrice", lang)}</th>
              <th className="py-2 px-3 text-center">{t("adminItems.colVolWk", lang)}</th>
              <th className="py-2 px-3 text-center">{t("adminItems.colActive", lang)}</th>
              <th className="py-2 px-3 text-center">{t("adminItems.colAction", lang)}</th>
            </THead>
            <tbody>
              {filtered.map((r) =>
                editCode === r.code ? (
                  <tr
                    key={r.code}
                    className="border-b border-ink/5 bg-amber-50/40"
                  >
                    <td className="py-2 px-3 text-center font-mono text-[12px] text-ink">
                      {r.code}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Select
                        value={editDraft.category}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            category: e.target.value as Cat
                          })
                        }
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        value={editDraft.unit}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, unit: e.target.value })
                        }
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        value={editDraft.price_idr}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            price_idr: e.target.value
                          })
                        }
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        value={editDraft.vol_weekly}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            vol_weekly: e.target.value
                          })
                        }
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={editDraft.active}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            active: e.target.checked
                          })
                        }
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy}
                          onClick={saveEdit}
                        >
                          {t("adminItems.btnSaveEdit", lang)}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={cancelEdit}
                        >
                          {t("adminItems.btnCancelEdit", lang)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.code} className="row-hover border-b border-ink/5">
                    <td className="py-2 px-3 text-center font-mono text-[12px] text-ink">
                      {r.code}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex justify-center">
                        <CategoryBadge category={r.category} />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-[12px] text-ink2">
                      {r.unit}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[12px]">
                      {formatNumber(Number(r.price_idr), lang)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[12px]">
                      {formatNumber(Number(r.vol_weekly ?? 0), lang)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.active ? (
                        <Badge tone="ok">{t("adminItems.tagActive", lang)}</Badge>
                      ) : (
                        <Badge tone="muted">{t("adminItems.tagInactive", lang)}</Badge>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(r)}
                        >
                          {t("adminItems.btnEdit", lang)}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(r.code)}
                        >
                          {t("adminItems.btnDelete", lang)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Section>
  );
}

function FieldBlock({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const { lang } = useLang();
  return (
    <label className="block">
      <FieldLabel hint={required ? t("adminItems.required", lang) : undefined}>{label}</FieldLabel>
      {children}
    </label>
  );
}
