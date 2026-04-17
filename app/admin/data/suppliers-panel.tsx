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
      setErr("ID supplier wajib (mis. SUP-13).");
      return;
    }
    if (!draft.name.trim()) {
      setErr("Nama supplier wajib.");
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
    if (
      !confirm(
        `Hapus supplier ${id}? Tidak bisa kalau masih punya PO/invoice. Pertimbangkan set Aktif=false sebagai gantinya.`
      )
    )
      return;
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
      title="Supplier"
      hint="Master vendor. ID format SUP-NN. Status menentukan apakah bisa transact (signed)."
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
          {adding ? "× Batal Tambah" : "+ Tambah Supplier"}
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 rounded-xl bg-paper p-4 ring-1 ring-ink/5">
          <div className="grid gap-3 md:grid-cols-3">
            <FieldBlock label="ID (unik)" required>
              <Input
                value={draft.id}
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                placeholder="SUP-13"
              />
            </FieldBlock>
            <FieldBlock label="Nama" required>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="CV Pangan Soe"
              />
            </FieldBlock>
            <FieldBlock label="Tipe">
              <Select
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as SupType })
                }
              >
                {SUP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </FieldBlock>
            <FieldBlock label="Komoditas (CSV)">
              <Input
                value={draft.commodity}
                onChange={(e) =>
                  setDraft({ ...draft, commodity: e.target.value })
                }
                placeholder="Beras, Telur"
              />
            </FieldBlock>
            <FieldBlock label="PIC">
              <Input
                value={draft.pic}
                onChange={(e) => setDraft({ ...draft, pic: e.target.value })}
              />
            </FieldBlock>
            <FieldBlock label="HP">
              <Input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="+62 8xx"
              />
            </FieldBlock>
            <FieldBlock label="Alamat">
              <Input
                value={draft.address}
                onChange={(e) =>
                  setDraft({ ...draft, address: e.target.value })
                }
              />
            </FieldBlock>
            <FieldBlock label="Email">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </FieldBlock>
            <FieldBlock label="Score (0-100)">
              <Input
                type="number"
                value={draft.score}
                onChange={(e) => setDraft({ ...draft, score: e.target.value })}
              />
            </FieldBlock>
            <FieldBlock label="Status">
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
              Aktif
            </label>
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={saveNew}
            >
              {busy ? "Menyimpan…" : "Simpan Supplier"}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[200px] flex-1">
          <FieldLabel>Cari ID / nama / komoditas</FieldLabel>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="ketik untuk filter…"
          />
        </label>
        <label className="block w-full sm:w-[180px]">
          <FieldLabel>Status</FieldLabel>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as SupStatus | "ALL")
            }
          >
            <option value="ALL">Semua</option>
            {SUP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        <Badge tone="muted">
          {filtered.length} dari {rows.length}
        </Badge>
      </div>

      {err && (
        <div className="mb-3 rounded-xl bg-red-50 p-3 text-[12px] text-red-800 ring-1 ring-red-200">
          {err}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="🤝" title="Tidak ada supplier" />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 pr-3">Nama</th>
              <th className="py-2 pr-3">Tipe</th>
              <th className="py-2 pr-3">Komoditas</th>
              <th className="py-2 pr-3">PIC / HP</th>
              <th className="py-2 pr-3 text-right">Score</th>
              <th className="py-2 pr-3">Status</th>
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
                        {SUP_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
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
                          placeholder="PIC"
                        />
                        <Input
                          value={editDraft.phone}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              phone: e.target.value
                            })
                          }
                          placeholder="HP"
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
                          Aktif
                        </label>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy}
                          onClick={saveEdit}
                        >
                          Simpan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setEditId(null)}
                        >
                          Batal
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
                          nonaktif
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
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(r.id)}
                        >
                          Hapus
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
  return (
    <label className="block">
      <FieldLabel hint={required ? "wajib" : undefined}>{label}</FieldLabel>
      {children}
    </label>
  );
}
