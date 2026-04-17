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
  Select,
  TableWrap,
  THead
} from "@/components/ui";

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
      setErr("Kode bahan wajib diisi.");
      return;
    }
    if (!draft.unit.trim()) {
      setErr("Satuan wajib diisi (mis. kg, lt, butir).");
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
    if (
      !confirm(
        `Hapus bahan "${code}"? Tidak bisa dihapus jika dipakai BOM/PO.`
      )
    )
      return;
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
      title="Bahan Makanan (items)"
      hint="Master bahan baku. Code = nama unik, dipakai sebagai FK di BOM, stock, PO."
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
          {adding ? "× Batal Tambah" : "+ Tambah Bahan"}
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 rounded-xl bg-paper p-4 ring-1 ring-ink/5">
          <div className="grid gap-3 md:grid-cols-3">
            <FieldBlock label="Kode (unik)" required>
              <Input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="mis. Beras Putih"
                autoComplete="off"
              />
            </FieldBlock>
            <FieldBlock label="Kategori">
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
            <FieldBlock label="Satuan" required>
              <Input
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                placeholder="kg, lt, butir"
              />
            </FieldBlock>
            <FieldBlock label="Harga (IDR)">
              <Input
                type="number"
                inputMode="numeric"
                value={draft.price_idr}
                onChange={(e) =>
                  setDraft({ ...draft, price_idr: e.target.value })
                }
              />
            </FieldBlock>
            <FieldBlock label="Volume / minggu">
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
              Aktif
            </label>
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={saveNew}
            >
              {busy ? "Menyimpan…" : "Simpan Bahan"}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[200px] flex-1">
          <FieldLabel>Cari kode</FieldLabel>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="ketik untuk filter…"
          />
        </label>
        <label className="block w-full sm:w-[180px]">
          <FieldLabel>Kategori</FieldLabel>
          <Select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as Cat | "ALL")}
          >
            <option value="ALL">Semua</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
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
        <EmptyState
          icon="🥕"
          title="Belum ada bahan"
          message="Tambahkan bahan pertama lewat tombol di atas."
        />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 px-3 text-center">Kode</th>
              <th className="py-2 px-3 text-center">Kategori</th>
              <th className="py-2 px-3 text-center">Satuan</th>
              <th className="py-2 px-3 text-center">Harga (IDR)</th>
              <th className="py-2 px-3 text-center">Vol/Mgg</th>
              <th className="py-2 px-3 text-center">Aktif</th>
              <th className="py-2 px-3 text-center">Aksi</th>
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
                          Simpan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={cancelEdit}
                        >
                          Batal
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
                      {Number(r.price_idr).toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[12px]">
                      {Number(r.vol_weekly ?? 0).toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.active ? (
                        <Badge tone="ok">aktif</Badge>
                      ) : (
                        <Badge tone="muted">nonaktif</Badge>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex justify-center gap-1">
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
                          onClick={() => remove(r.code)}
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
