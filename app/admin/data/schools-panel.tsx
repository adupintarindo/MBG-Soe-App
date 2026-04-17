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

type Level = Database["public"]["Enums"]["school_level"];
type Row = Pick<
  Database["public"]["Tables"]["schools"]["Row"],
  | "id"
  | "name"
  | "level"
  | "students"
  | "kelas13"
  | "kelas46"
  | "guru"
  | "distance_km"
  | "pic"
  | "phone"
  | "address"
  | "active"
>;

const LEVELS: Level[] = ["PAUD/TK", "SD", "SMP", "SMA", "SMK"];

interface Draft {
  id: string;
  name: string;
  level: Level;
  students: string;
  kelas13: string;
  kelas46: string;
  guru: string;
  distance_km: string;
  pic: string;
  phone: string;
  address: string;
  active: boolean;
}

const EMPTY_DRAFT: Draft = {
  id: "",
  name: "",
  level: "SD",
  students: "0",
  kelas13: "0",
  kelas46: "0",
  guru: "0",
  distance_km: "",
  pic: "",
  phone: "",
  address: "",
  active: true
};

function rowToDraft(r: Row): Draft {
  return {
    id: r.id,
    name: r.name,
    level: r.level,
    students: String(r.students),
    kelas13: String(r.kelas13),
    kelas46: String(r.kelas46),
    guru: String(r.guru),
    distance_km: r.distance_km != null ? String(r.distance_km) : "",
    pic: r.pic ?? "",
    phone: r.phone ?? "",
    address: r.address ?? "",
    active: r.active
  };
}

export function SchoolsPanel({ initial }: { initial: Row[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.address ?? "").toLowerCase().includes(q)
    );
  }, [rows, filter]);

  function startEdit(r: Row) {
    setEditId(r.id);
    setEditDraft(rowToDraft(r));
    setErr(null);
  }

  async function saveNew() {
    setErr(null);
    if (!draft.id.trim()) {
      setErr("ID sekolah wajib (mis. SCH-10).");
      return;
    }
    if (!draft.name.trim()) {
      setErr("Nama sekolah wajib.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("schools")
      .insert({
        id: draft.id.trim(),
        name: draft.name.trim(),
        level: draft.level,
        students: parseInt(draft.students, 10) || 0,
        kelas13: parseInt(draft.kelas13, 10) || 0,
        kelas46: parseInt(draft.kelas46, 10) || 0,
        guru: parseInt(draft.guru, 10) || 0,
        distance_km: draft.distance_km ? Number(draft.distance_km) : null,
        pic: draft.pic.trim() || null,
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
        active: draft.active
      })
      .select(
        "id, name, level, students, kelas13, kelas46, guru, distance_km, pic, phone, address, active"
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
      .from("schools")
      .update({
        name: editDraft.name.trim(),
        level: editDraft.level,
        students: parseInt(editDraft.students, 10) || 0,
        kelas13: parseInt(editDraft.kelas13, 10) || 0,
        kelas46: parseInt(editDraft.kelas46, 10) || 0,
        guru: parseInt(editDraft.guru, 10) || 0,
        distance_km: editDraft.distance_km
          ? Number(editDraft.distance_km)
          : null,
        pic: editDraft.pic.trim() || null,
        phone: editDraft.phone.trim() || null,
        address: editDraft.address.trim() || null,
        active: editDraft.active
      })
      .eq("id", editId)
      .select(
        "id, name, level, students, kelas13, kelas46, guru, distance_km, pic, phone, address, active"
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
    if (!confirm(`Hapus sekolah ${id}?`)) return;
    setErr(null);
    setBusy(true);
    const { error } = await supabase.from("schools").delete().eq("id", id);
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
      title="Sekolah"
      hint="Master cluster sekolah. Untuk SD: isi kelas13 (porsi kecil) + kelas46 (porsi besar). Selain SD pakai students."
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
          {adding ? "× Batal Tambah" : "+ Tambah Sekolah"}
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
                placeholder="SCH-10"
              />
            </FieldBlock>
            <FieldBlock label="Nama" required>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="SD Inpres Kobelete"
              />
            </FieldBlock>
            <FieldBlock label="Jenjang">
              <Select
                value={draft.level}
                onChange={(e) =>
                  setDraft({ ...draft, level: e.target.value as Level })
                }
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </FieldBlock>
            <FieldBlock label="Total siswa">
              <Input
                type="number"
                value={draft.students}
                onChange={(e) =>
                  setDraft({ ...draft, students: e.target.value })
                }
              />
            </FieldBlock>
            <FieldBlock label="SD kelas 1-3 (porsi kecil)">
              <Input
                type="number"
                value={draft.kelas13}
                onChange={(e) =>
                  setDraft({ ...draft, kelas13: e.target.value })
                }
              />
            </FieldBlock>
            <FieldBlock label="SD kelas 4-6 (porsi besar)">
              <Input
                type="number"
                value={draft.kelas46}
                onChange={(e) =>
                  setDraft({ ...draft, kelas46: e.target.value })
                }
              />
            </FieldBlock>
            <FieldBlock label="Guru">
              <Input
                type="number"
                value={draft.guru}
                onChange={(e) => setDraft({ ...draft, guru: e.target.value })}
              />
            </FieldBlock>
            <FieldBlock label="Jarak (km)">
              <Input
                type="number"
                step="0.1"
                value={draft.distance_km}
                onChange={(e) =>
                  setDraft({ ...draft, distance_km: e.target.value })
                }
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
              {busy ? "Menyimpan…" : "Simpan Sekolah"}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[200px] flex-1">
          <FieldLabel>Cari ID / nama / alamat</FieldLabel>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="ketik untuk filter…"
          />
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
        <EmptyState icon="🏫" title="Belum ada sekolah" />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 pr-3">Nama</th>
              <th className="py-2 pr-3">Jenjang</th>
              <th className="py-2 pr-3 text-right">Siswa / K1-3 / K4-6</th>
              <th className="py-2 pr-3 text-right">Guru</th>
              <th className="py-2 pr-3 text-right">Jarak</th>
              <th className="py-2 pr-3">PIC</th>
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
                        value={editDraft.level}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            level: e.target.value as Level
                          })
                        }
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="grid grid-cols-3 gap-1">
                        <Input
                          type="number"
                          value={editDraft.students}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              students: e.target.value
                            })
                          }
                        />
                        <Input
                          type="number"
                          value={editDraft.kelas13}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              kelas13: e.target.value
                            })
                          }
                        />
                        <Input
                          type="number"
                          value={editDraft.kelas46}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              kelas46: e.target.value
                            })
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        value={editDraft.guru}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            guru: e.target.value
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        step="0.1"
                        value={editDraft.distance_km}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            distance_km: e.target.value
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
                        <Input
                          value={editDraft.address}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              address: e.target.value
                            })
                          }
                          placeholder="Alamat"
                        />
                      </div>
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
                      <Badge tone="accent">{r.level}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-[12px]">
                      {r.students} · {r.kelas13} · {r.kelas46}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-[12px]">
                      {r.guru}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-[12px]">
                      {r.distance_km != null ? `${r.distance_km} km` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-[12px] text-ink2">
                      <div>{r.pic ?? "—"}</div>
                      <div className="font-mono text-[11px]">
                        {r.phone ?? "—"}
                      </div>
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
