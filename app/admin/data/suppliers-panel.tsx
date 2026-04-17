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
  Select,
  TableWrap,
  THead
} from "@/components/ui";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type SupType = Database["public"]["Enums"]["supplier_type"];
type SupStatus = Database["public"]["Enums"]["supplier_status"];
type Row = Pick<
  Database["public"]["Tables"]["suppliers"]["Row"],
  | "id"
  | "name"
  | "type"
  | "commodity"
  | "pic"
  | "phone"
  | "address"
  | "email"
  | "score"
  | "status"
  | "active"
>;

const SUP_TYPES: SupType[] = [
  "BUMN",
  "PT",
  "CV",
  "UD",
  "KOPERASI",
  "POKTAN",
  "TOKO",
  "KIOS",
  "INFORMAL"
];
const SUP_STATUSES: SupStatus[] = ["draft", "awaiting", "signed", "rejected"];

interface Draft {
  id: string;
  name: string;
  type: SupType;
  commodity: string;
  pic: string;
  phone: string;
  address: string;
  email: string;
  score: string;
  status: SupStatus;
  active: boolean;
}

const EMPTY_DRAFT: Draft = {
  id: "",
  name: "",
  type: "CV",
  commodity: "",
  pic: "",
  phone: "",
  address: "",
  email: "",
  score: "",
  status: "draft",
  active: true
};

function rowToDraft(r: Row): Draft {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    commodity: r.commodity ?? "",
    pic: r.pic ?? "",
    phone: r.phone ?? "",
    address: r.address ?? "",
    email: r.email ?? "",
    score: r.score != null ? String(r.score) : "",
    status: r.status,
    active: r.active
  };
}

export function SuppliersPanel({ initial }: { initial: Row[] }) {
  const { lang } = useLang();
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupStatus | "ALL">("ALL");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.commodity ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, statusFilter]);

  function startEdit(r: Row) {
    setEditId(r.id);
    setEditDraft(rowToDraft(r));
    setErr(null);
  }

  async function saveNew() {
    setErr(null);
    if (!draft.id.trim()) {
      setErr(t("adminSup.errIdReq", lang));
      return;
    }
    if (!draft.name.trim()) {
      setErr(t("adminSup.errNameReq", lang));
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        id: draft.id.trim(),
        name: draft.name.trim(),
        type: draft.type,
        commodity: draft.commodity.trim() || null,
        pic: draft.pic.trim() || null,
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
        email: draft.email.trim() || null,
        score: draft.score ? Number(draft.score) : null,
        status: draft.status,
        active: draft.active
      })
      .select(
        "id, name, type, commodity, pic, phone, address, email, score, status, active"
      )
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((prev) =>
      [...prev, data as Row].sort((a, b) => a.id.localeCompare(b.id))
    );
    setDraft(EMPTY_DRAFT);
    setAdding(false);
    router.refresh();
  }

  async function saveEdit() {
    if (!editId) return;
    setErr(null);
    setBusy(true);
    const { data, error } = await supabase
      .from("suppliers")
      .update({
        name: editDraft.name.trim(),
        type: editDraft.type,
        commodity: editDraft.commodity.trim() || null,
        pic: editDraft.pic.trim() || null,
        phone: editDraft.phone.trim() || null,
        address: editDraft.address.trim() || null,
        email: editDraft.email.trim() || null,
        score: editDraft.score ? Number(editDraft.score) : null,
        status: editDraft.status,
        active: editDraft.active
      })
      .eq("id", editId)
      .select(
        "id, name, type, commodity, pic, phone, address, email, score, status, active"
      )
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

  async function remove(id: string) {
    if (!confirm(ti("adminSup.confirmDel", lang, { id }))) return;
    setErr(null);
    setBusy(true);
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
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
      title={t("adminSup.title", lang)}
      hint={t("adminSup.hint", lang)}
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
          {adding ? t("adminSup.btnCancelAdd", lang) : t("adminSup.btnAdd", lang)}
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 rounded-xl bg-paper p-4 ring-1 ring-ink/5">
          <div className="grid gap-3 md:grid-cols-3">
            <FieldBlock label={t("adminSup.fldId", lang)} required>
              <Input
                value={draft.id}
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                placeholder="SUP-13"
              />
            </FieldBlock>
            <FieldBlock label={t("adminSup.fldName", lang)} required>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t("adminSup.phName", lang)}
              />
            </FieldBlock>
            <FieldBlock label={t("adminSup.fldType", lang)}>
              <Select
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as SupType })
                }
              >
                {SUP_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </Select>
            </FieldBlock>
            <FieldBlock label={t("adminSup.fldCommodity", lang)}>
              <Input
                value={draft.commodity}
                onChange={(e) =>
                  setDraft({ ...draft, commodity: e.target.value })
                }
                placeholder={t("adminSup.phCommodity", lang)}
              />
            </FieldBlock>
            <FieldBlock label={t("adminSup.fldPic", lang)}>
              <Input
                value={draft.pic}
                onChange={(e) => setDraft({ ...draft, pic: e.target.value })}
              />
            </FieldBlock>
            <FieldBlock label={t("adminSup.fldPhone", lang)}>
              <Input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder={t("adminSup.phPhone", lang)}
              />
            </FieldBlock>
            <FieldBlock label={t("adminSup.fldAddress", lang)}>
              <Input
                value={draft.address}
                onChange={(e) =>
                  setDraft({ ...draft, address: e.target.value })
                }
              />
            </FieldBlock>
            <FieldBlock label={t("adminSup.fldEmail", lang)}>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </FieldBlock>
            <FieldBlock label={t("adminSup.fldScore", lang)}>
              <Input
                type="number"
                value={draft.score}
                onChange={(e) => setDraft({ ...draft, score: e.target.value })}
              />
            </FieldBlock>
            <FieldBlock label={t("adminSup.fldStatus", lang)}>
              <Select
                value={draft.status}
                onChange={(e) =>
                  setDraft({ ...draft, status: e.target.value as SupStatus })
                }
              >
                {SUP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
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
              {t("adminSup.lblActive", lang)}
            </label>
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={saveNew}
            >
              {busy ? t("adminSup.btnSaving", lang) : t("adminSup.btnSave", lang)}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[200px] flex-1">
          <FieldLabel>{t("adminSup.searchLabel", lang)}</FieldLabel>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("adminSup.searchPh", lang)}
          />
        </label>
        <label className="block w-full sm:w-[180px]">
          <FieldLabel>{t("adminSup.fldStatus", lang)}</FieldLabel>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as SupStatus | "ALL")
            }
          >
            <option value="ALL">{t("adminSup.optAll", lang)}</option>
            {SUP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        <Badge tone="muted">
          {ti("adminSup.filteredOf", lang, { shown: filtered.length, total: rows.length })}
        </Badge>
      </div>

      {err && (
        <div className="mb-3 rounded-xl bg-red-50 p-3 text-[12px] text-red-800 ring-1 ring-red-200">
          {err}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="🤝" title={t("adminSup.emptyTitle", lang)} />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 pr-3">{t("adminSup.colId", lang)}</th>
              <th className="py-2 pr-3">{t("adminSup.colName", lang)}</th>
              <th className="py-2 pr-3">{t("adminSup.colType", lang)}</th>
              <th className="py-2 pr-3">{t("adminSup.colCommodity", lang)}</th>
              <th className="py-2 pr-3">{t("adminSup.colPicPhone", lang)}</th>
              <th className="py-2 pr-3 text-right">{t("adminSup.colScore", lang)}</th>
              <th className="py-2 pr-3">{t("adminSup.colStatus", lang)}</th>
              <th className="py-2 pr-3"></th>
            </THead>
            <tbody>
              {filtered.map((r) =>
                editId === r.id ? (
                  <tr
                    key={r.id}
                    className="border-b border-ink/5 bg-amber-50/40"
                  >
                    <td className="py-2 pr-3 font-mono text-[12px]">{r.id}</td>
                    <td className="py-2 pr-3">
                      <Input
                        value={editDraft.name}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, name: e.target.value })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Select
                        value={editDraft.type}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            type: e.target.value as SupType
                          })
                        }
                      >
                        {SUP_TYPES.map((tp) => (
                          <option key={tp} value={tp}>
                            {tp}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        value={editDraft.commodity}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            commodity: e.target.value
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="space-y-1">
                        <Input
                          value={editDraft.pic}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, pic: e.target.value })
                          }
                          placeholder={t("adminSup.lblPic", lang)}
                        />
                        <Input
                          value={editDraft.phone}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              phone: e.target.value
                            })
                          }
                          placeholder={t("adminSup.lblPhone", lang)}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        value={editDraft.score}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            score: e.target.value
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Select
                        value={editDraft.status}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            status: e.target.value as SupStatus
                          })
                        }
                      >
                        {SUP_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-col gap-1">
                        <label className="inline-flex items-center gap-1 text-[10px] font-bold text-ink2">
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
                          {t("adminSup.lblActive", lang)}
                        </label>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy}
                          onClick={saveEdit}
                        >
                          {t("adminSup.btnSaveEdit", lang)}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setEditId(null)}
                        >
                          {t("adminSup.btnCancelEdit", lang)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id} className="row-hover border-b border-ink/5">
                    <td className="py-2 pr-3 font-mono text-[12px]">{r.id}</td>
                    <td className="py-2 pr-3 text-ink">{r.name}</td>
                    <td className="py-2 pr-3">
                      <Badge tone="accent">{r.type}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-[12px] text-ink2">
                      {r.commodity ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-[12px] text-ink2">
                      <div>{r.pic ?? "—"}</div>
                      <div className="font-mono text-[11px]">
                        {r.phone ?? "—"}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-[12px]">
                      {r.score != null ? r.score : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge
                        tone={
                          r.status === "signed"
                            ? "ok"
                            : r.status === "awaiting"
                              ? "warn"
                              : r.status === "rejected"
                                ? "bad"
                                : "muted"
                        }
                      >
                        {r.status}
                      </Badge>
                      {!r.active && (
                        <Badge tone="muted" className="ml-1">
                          {t("adminSup.tagInactive", lang)}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(r)}
                        >
                          {t("adminSup.btnEdit", lang)}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(r.id)}
                        >
                          {t("adminSup.btnDelete", lang)}
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
      <FieldLabel hint={required ? t("adminSup.required", lang) : undefined}>{label}</FieldLabel>
      {children}
    </label>
  );
}
