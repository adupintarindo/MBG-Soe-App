"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import {
  Badge,
  Button,
  EmptyState,
  FieldLabel,
  Input,
  Section,
  TableWrap,
  THead
} from "@/components/ui";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type Row = Pick<
  Database["public"]["Tables"]["menus"]["Row"],
  "id" | "name" | "name_en" | "cycle_day" | "active" | "notes"
>;

interface Draft {
  id: string;
  name: string;
  name_en: string;
  cycle_day: string;
  notes: string;
  active: boolean;
}

const EMPTY_DRAFT: Draft = {
  id: "",
  name: "",
  name_en: "",
  cycle_day: "",
  notes: "",
  active: true
};

function rowToDraft(r: Row): Draft {
  return {
    id: String(r.id),
    name: r.name,
    name_en: r.name_en ?? "",
    cycle_day: r.cycle_day != null ? String(r.cycle_day) : "",
    notes: r.notes ?? "",
    active: r.active
  };
}

export function MenusPanel({ initial }: { initial: Row[] }) {
  const { lang } = useLang();
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.name_en ?? "").toLowerCase().includes(q) ||
        String(r.id) === q
    );
  }, [rows, filter]);

  function startEdit(r: Row) {
    setEditId(r.id);
    setEditDraft(rowToDraft(r));
    setErr(null);
  }

  async function saveNew() {
    setErr(null);
    const id = parseInt(draft.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      setErr(t("adminMenus.errIdNumeric", lang));
      return;
    }
    if (!draft.name.trim()) {
      setErr(t("adminMenus.errNameReq", lang));
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("menus")
      .insert({
        id,
        name: draft.name.trim(),
        name_en: draft.name_en.trim() || null,
        cycle_day: draft.cycle_day ? parseInt(draft.cycle_day, 10) : null,
        notes: draft.notes.trim() || null,
        active: draft.active
      })
      .select("id, name, name_en, cycle_day, active, notes")
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((prev) => [...prev, data as Row].sort((a, b) => a.id - b.id));
    setDraft(EMPTY_DRAFT);
    setAdding(false);
    router.refresh();
  }

  async function saveEdit() {
    if (editId == null) return;
    setErr(null);
    setBusy(true);
    const { data, error } = await supabase
      .from("menus")
      .update({
        name: editDraft.name.trim(),
        name_en: editDraft.name_en.trim() || null,
        cycle_day: editDraft.cycle_day
          ? parseInt(editDraft.cycle_day, 10)
          : null,
        notes: editDraft.notes.trim() || null,
        active: editDraft.active
      })
      .eq("id", editId)
      .select("id, name, name_en, cycle_day, active, notes")
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === editId ? (data as Row) : r)));
    setEditId(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm(ti("adminMenus.confirmDel", lang, { id }))) return;
    setErr(null);
    setBusy(true);
    const { error } = await supabase.from("menus").delete().eq("id", id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <Section
      title={t("adminMenus.title", lang)}
      hint={t("adminMenus.hint", lang)}
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
          {adding ? t("adminMenus.btnCancelAdd", lang) : t("adminMenus.btnAdd", lang)}
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 rounded-xl bg-paper p-4 ring-1 ring-ink/5">
          <div className="grid gap-3 md:grid-cols-3">
            <FieldBlock label={t("adminMenus.fldId", lang)} required>
              <Input
                type="number"
                min={1}
                value={draft.id}
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                placeholder="15"
              />
            </FieldBlock>
            <FieldBlock label={t("adminMenus.fldNameID", lang)} required>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t("adminMenus.phNameID", lang)}
              />
            </FieldBlock>
            <FieldBlock label={t("adminMenus.fldNameEN", lang)}>
              <Input
                value={draft.name_en}
                onChange={(e) =>
                  setDraft({ ...draft, name_en: e.target.value })
                }
                placeholder={t("adminMenus.phNameEN", lang)}
              />
            </FieldBlock>
            <FieldBlock label={t("adminMenus.fldCycleDay", lang)}>
              <Input
                type="number"
                min={1}
                value={draft.cycle_day}
                onChange={(e) =>
                  setDraft({ ...draft, cycle_day: e.target.value })
                }
                placeholder={t("adminMenus.phCycle", lang)}
              />
            </FieldBlock>
            <FieldBlock label={t("adminMenus.fldNotes", lang)}>
              <Input
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder={t("adminMenus.phNotes", lang)}
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
              {t("adminMenus.lblActive", lang)}
            </label>
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={saveNew}
            >
              {busy ? t("adminMenus.btnSaving", lang) : t("adminMenus.btnSave", lang)}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[200px] flex-1">
          <FieldLabel>{t("adminMenus.searchLabel", lang)}</FieldLabel>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("adminMenus.searchPh", lang)}
          />
        </label>
        <Badge tone="muted">
          {ti("adminMenus.filteredOf", lang, { shown: filtered.length, total: rows.length })}
        </Badge>
      </div>

      {err && (
        <div className="mb-3 rounded-xl bg-red-50 p-3 text-[12px] text-red-800 ring-1 ring-red-200">
          {err}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="🍲" title={t("adminMenus.emptyTitle", lang)} />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 pr-3">{t("adminMenus.colId", lang)}</th>
              <th className="py-2 pr-3">{t("adminMenus.colNameID", lang)}</th>
              <th className="py-2 pr-3">{t("adminMenus.colNameEN", lang)}</th>
              <th className="py-2 pr-3">{t("adminMenus.colCycle", lang)}</th>
              <th className="py-2 pr-3">{t("adminMenus.colNotes", lang)}</th>
              <th className="py-2 pr-3">{t("adminMenus.colActive", lang)}</th>
              <th className="py-2 pr-3"></th>
            </THead>
            <tbody>
              {filtered.map((r) =>
                editId === r.id ? (
                  <tr
                    key={r.id}
                    className="border-b border-ink/5 bg-amber-50/40"
                  >
                    <td className="py-2 pr-3 font-mono text-[12px] text-ink">
                      M{r.id}
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        value={editDraft.name}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, name: e.target.value })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        value={editDraft.name_en}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            name_en: e.target.value
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        value={editDraft.cycle_day}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            cycle_day: e.target.value
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        value={editDraft.notes}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, notes: e.target.value })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
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
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy}
                          onClick={saveEdit}
                        >
                          {t("adminMenus.btnSaveEdit", lang)}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setEditId(null)}
                        >
                          {t("adminMenus.btnCancelEdit", lang)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id} className="row-hover border-b border-ink/5">
                    <td className="py-2 pr-3 font-mono text-[12px] text-ink">
                      M{r.id}
                    </td>
                    <td className="py-2 pr-3 text-ink">
                      {lang === "EN" && r.name_en ? r.name_en : r.name}
                    </td>
                    <td className="py-2 pr-3 text-ink2">{r.name_en ?? "—"}</td>
                    <td className="py-2 pr-3 text-[12px] text-ink2">
                      {r.cycle_day ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-[12px] text-ink2">
                      {r.notes ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {r.active ? (
                        <Badge tone="ok">{t("adminMenus.tagActive", lang)}</Badge>
                      ) : (
                        <Badge tone="muted">{t("adminMenus.tagInactive", lang)}</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(r)}
                        >
                          {t("adminMenus.btnEdit", lang)}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(r.id)}
                        >
                          {t("adminMenus.btnDelete", lang)}
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
      <FieldLabel hint={required ? t("adminMenus.required", lang) : undefined}>{label}</FieldLabel>
      {children}
    </label>
  );
}
