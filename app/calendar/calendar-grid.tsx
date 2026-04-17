"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface MenuRow {
  id: number;
  name: string;
  name_en: string | null;
  cycle_day: number | null;
}

interface AssignRow {
  assign_date: string;
  menu_id: number;
  note: string | null;
}

interface NonOpRow {
  op_date: string;
  reason: string;
}

interface ItemRow {
  code: string;
  name_en: string | null;
  category: string;
  active: boolean;
}

interface Props {
  matrix: string[][]; // ISO dates
  todayIso: string;
  menus: MenuRow[];
  items: ItemRow[];
  initialAssigns: AssignRow[];
  initialNonOps: NonOpRow[];
  canWrite: boolean;
}

const MENU_HUE = [
  "bg-sky-100 text-sky-900",
  "bg-emerald-100 text-emerald-900",
  "bg-amber-100 text-amber-900",
  "bg-rose-100 text-rose-900",
  "bg-indigo-100 text-indigo-900",
  "bg-teal-100 text-teal-900",
  "bg-orange-100 text-orange-900",
  "bg-violet-100 text-violet-900",
  "bg-lime-100 text-lime-900",
  "bg-pink-100 text-pink-900",
  "bg-cyan-100 text-cyan-900",
  "bg-fuchsia-100 text-fuchsia-900",
  "bg-yellow-100 text-yellow-900",
  "bg-green-100 text-green-900"
];

const DOW_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DOW_LONG_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];
const MONTH_SHORT_ID = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MEI",
  "JUN",
  "JUL",
  "AGU",
  "SEP",
  "OKT",
  "NOV",
  "DES"
];
const MONTH_LONG_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d, date: new Date(y, m - 1, d) };
}

function fmtLongID(iso: string) {
  const { y, m, d, date } = parseIso(iso);
  return `${DOW_LONG_ID[date.getDay()]}, ${d} ${MONTH_LONG_ID[m - 1]} ${y}`;
}

// Category → kombinasi bucket mapping
const CAT_BUCKET: Record<string, "karbo" | "protein" | "sayur" | "buah" | null> =
  {
    BERAS: "karbo",
    UMBI: "karbo",
    HEWANI: "protein",
    NABATI: "protein",
    SAYUR_HIJAU: "sayur",
    SAYUR: "sayur",
    BUAH: "buah",
    BUMBU: null,
    REMPAH: null,
    SEMBAKO: null,
    LAIN: null
  };

export function CalendarGrid({
  matrix,
  todayIso,
  menus,
  items,
  initialAssigns,
  initialNonOps,
  canWrite
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [assignByDate, setAssignByDate] = useState(
    () => new Map(initialAssigns.map((a) => [a.assign_date, a]))
  );
  const [nonOpByDate, setNonOpByDate] = useState(
    () => new Map(initialNonOps.map((n) => [n.op_date, n]))
  );
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const menuIndexById = useMemo(() => {
    const m = new Map<number, number>();
    menus.forEach((menu, i) => m.set(menu.id, i));
    return m;
  }, [menus]);

  function dayOfWeek(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
  }

  function openEditor(iso: string) {
    if (!canWrite) return;
    const dow = dayOfWeek(iso);
    if (dow === 0 || dow === 6) return;
    setError(null);
    setOpenDate(iso);
  }

  async function saveAssign(iso: string, menuId: number, note: string) {
    setError(null);
    const { error: err } = await supabase
      .from("menu_assign")
      .upsert(
        { assign_date: iso, menu_id: menuId, note: note || null } as never,
        { onConflict: "assign_date" }
      );
    if (err) {
      setError(err.message);
      return;
    }
    // Jika sebelumnya non-op, hapus
    if (nonOpByDate.has(iso)) {
      await supabase.from("non_op_days").delete().eq("op_date", iso);
      setNonOpByDate((prev) => {
        const next = new Map(prev);
        next.delete(iso);
        return next;
      });
    }
    setAssignByDate((prev) => {
      const next = new Map(prev);
      next.set(iso, { assign_date: iso, menu_id: menuId, note: note || null });
      return next;
    });
    setOpenDate(null);
    startTransition(() => router.refresh());
  }

  async function clearAssign(iso: string) {
    setError(null);
    const { error: err } = await supabase
      .from("menu_assign")
      .delete()
      .eq("assign_date", iso);
    if (err) {
      setError(err.message);
      return;
    }
    setAssignByDate((prev) => {
      const next = new Map(prev);
      next.delete(iso);
      return next;
    });
    startTransition(() => router.refresh());
  }

  async function markNonOp(iso: string, reason: string) {
    setError(null);
    const clean = reason.trim();
    if (!clean) {
      setError("Alasan non-operasional wajib diisi.");
      return;
    }
    const { error: err } = await supabase
      .from("non_op_days")
      .upsert(
        { op_date: iso, reason: clean } as never,
        { onConflict: "op_date" }
      );
    if (err) {
      setError(err.message);
      return;
    }
    if (assignByDate.has(iso)) {
      await supabase.from("menu_assign").delete().eq("assign_date", iso);
      setAssignByDate((prev) => {
        const next = new Map(prev);
        next.delete(iso);
        return next;
      });
    }
    setNonOpByDate((prev) => {
      const next = new Map(prev);
      next.set(iso, { op_date: iso, reason: clean });
      return next;
    });
    setOpenDate(null);
    startTransition(() => router.refresh());
  }

  async function clearNonOp(iso: string) {
    setError(null);
    const { error: err } = await supabase
      .from("non_op_days")
      .delete()
      .eq("op_date", iso);
    if (err) {
      setError(err.message);
      return;
    }
    setNonOpByDate((prev) => {
      const next = new Map(prev);
      next.delete(iso);
      return next;
    });
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="grid grid-cols-7 gap-1">
        {matrix.flat().map((iso) => {
          const [y, m, d] = iso.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          const dow = dt.getDay();
          const isWknd = dow === 0 || dow === 6;
          const isToday = iso === todayIso;
          const assign = assignByDate.get(iso);
          const nonOp = nonOpByDate.get(iso);
          const menuIdx = assign ? (menuIndexById.get(assign.menu_id) ?? -1) : -1;
          const menu = assign ? menus[menuIdx] : null;
          const clickable = !isWknd && canWrite;

          return (
            <button
              key={iso}
              type="button"
              disabled={!clickable}
              onClick={() => openEditor(iso)}
              className={`min-h-[74px] rounded-lg border p-1.5 text-left text-[10px] transition ${
                isWknd
                  ? "border-ink/5 bg-paper/60 opacity-60"
                  : nonOp
                    ? "border-amber-300 bg-amber-50"
                    : menu
                      ? `border-transparent ${MENU_HUE[menuIdx % MENU_HUE.length]}`
                      : "border-ink/10 bg-white"
              } ${isToday ? "ring-2 ring-accent" : ""} ${
                clickable
                  ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-card"
                  : "cursor-default"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-black ${isToday ? "text-accent" : ""}`}
                >
                  {d}
                </span>
                {d === 1 && (
                  <span className="text-[9px] font-bold uppercase opacity-70">
                    {dt.toLocaleDateString("id-ID", { month: "short" })}
                  </span>
                )}
              </div>
              {nonOp ? (
                <div className="mt-1 line-clamp-2 font-semibold text-amber-800">
                  🚫 {nonOp.reason}
                </div>
              ) : menu ? (
                <div className="mt-1">
                  <div className="font-mono text-[9px] opacity-70">
                    H{menu.cycle_day}
                  </div>
                  <div className="line-clamp-2 font-semibold">{menu.name}</div>
                </div>
              ) : !isWknd ? (
                <div className="mt-1 text-ink2/40">— klik untuk assign</div>
              ) : null}
            </button>
          );
        })}
      </div>

      {openDate && (
        <EditModal
          iso={openDate}
          menus={menus}
          items={items}
          assign={assignByDate.get(openDate) ?? null}
          nonOp={nonOpByDate.get(openDate) ?? null}
          error={error}
          busy={isPending}
          onClose={() => setOpenDate(null)}
          onSaveAssign={saveAssign}
          onClearAssign={clearAssign}
          onMarkNonOp={markNonOp}
          onClearNonOp={clearNonOp}
        />
      )}

      {!canWrite && (
        <p className="mt-3 text-xs text-ink2/70">
          Mode read-only · hanya admin, operator, dan ahli gizi yang bisa
          mengubah jadwal.
        </p>
      )}
    </>
  );
}

interface EditProps {
  iso: string;
  menus: MenuRow[];
  items: ItemRow[];
  assign: AssignRow | null;
  nonOp: NonOpRow | null;
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onSaveAssign: (iso: string, menuId: number, note: string) => Promise<void>;
  onClearAssign: (iso: string) => Promise<void>;
  onMarkNonOp: (iso: string, reason: string) => Promise<void>;
  onClearNonOp: (iso: string) => Promise<void>;
}

function EditModal({
  iso,
  menus,
  items,
  assign,
  nonOp,
  error,
  busy,
  onClose,
  onSaveAssign,
  onClearAssign,
  onMarkNonOp,
  onClearNonOp
}: EditProps) {
  const { y, m, d, date } = parseIso(iso);
  const dowLong = DOW_LONG_ID[date.getDay()];
  const monthShort = MONTH_SHORT_ID[m - 1];
  const monthLong = MONTH_LONG_ID[m - 1];

  const [mode, setMode] = useState<"op" | "nonop">(nonOp ? "nonop" : "op");
  const [selectedMenuId, setSelectedMenuId] = useState<number>(
    assign?.menu_id ?? menus[0]?.id ?? 0
  );
  const [karbo, setKarbo] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [sayur, setSayur] = useState<string>("");
  const [buah, setBuah] = useState<string>("");
  const [note, setNote] = useState<string>(assign?.note ?? "");
  const [reason, setReason] = useState<string>(nonOp?.reason ?? "");

  const currentMenu = useMemo(
    () => (assign ? menus.find((mm) => mm.id === assign.menu_id) ?? null : null),
    [assign, menus]
  );

  const itemsByBucket = useMemo(() => {
    const groups: Record<"karbo" | "protein" | "sayur" | "buah", ItemRow[]> = {
      karbo: [],
      protein: [],
      sayur: [],
      buah: []
    };
    for (const it of items) {
      const bucket = CAT_BUCKET[it.category];
      if (bucket) groups[bucket].push(it);
    }
    return groups;
  }, [items]);

  async function handleMarkOperational() {
    if (nonOp) await onClearNonOp(iso);
    setMode("op");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-6 py-4">
          <h2 className="text-base font-black text-ink sm:text-lg">
            📆 Atur Jadwal Menu · {dowLong}, {d} {monthLong} {y}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink/15 text-ink2 hover:bg-paper"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
          {/* Section 1 · Operasional */}
          <section className="rounded-2xl bg-sky-50/40 p-4 ring-1 ring-ink/5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-black text-white">
                1
              </span>
              <h3 className="text-sm font-black text-ink">
                Operasional Hari Ini?
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleMarkOperational}
                disabled={busy}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                  mode === "op"
                    ? "bg-green-700 text-white shadow-card"
                    : "border border-ink/15 bg-white text-ink2 hover:bg-paper"
                }`}
              >
                ✅ Ya, Operasional
              </button>
              <button
                type="button"
                onClick={() => setMode("nonop")}
                disabled={busy}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                  mode === "nonop"
                    ? "bg-red-600 text-white shadow-card"
                    : "border border-ink/15 bg-white text-ink2 hover:bg-paper"
                }`}
              >
                ⛔ Tidak Operasional
              </button>
            </div>
          </section>

          {/* Date card */}
          <section className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4 ring-1 ring-ink/5">
            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-white shadow-card">
              <span className="text-[10px] font-black tracking-wide text-red-600">
                {monthShort}
              </span>
              <span className="text-2xl font-black leading-none text-ink">
                {d}
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-ink2/70">
                {dowLong}, {y}
              </div>
              <div className="font-mono text-lg font-black text-ink">
                {iso}
              </div>
            </div>
          </section>

          {mode === "op" ? (
            <>
              {/* Status banner */}
              {currentMenu ? (
                <div className="rounded-xl bg-green-50 px-4 py-3 text-sm ring-1 ring-green-200">
                  <span className="font-black text-green-700">✓ Terjadwal</span>
                  <span className="mx-2 text-green-700/60">·</span>
                  <span className="font-black text-green-800">
                    M{currentMenu.id}
                  </span>
                  <span className="mx-2 text-green-700/60">·</span>
                  <span className="font-bold text-green-900">
                    {currentMenu.name}
                  </span>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
                  ⚠ Belum di-assign · pilih menu di bawah
                </div>
              )}

              {/* Section 2 · Pilih Menu ID */}
              <section className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-black text-white">
                    2
                  </span>
                  <h3 className="text-sm font-black text-ink">
                    📋 Pilih Menu ID
                  </h3>
                </div>
                <div className="flex flex-wrap items-stretch gap-2">
                  <select
                    value={selectedMenuId}
                    onChange={(e) => setSelectedMenuId(Number(e.target.value))}
                    className="min-w-0 flex-1 rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm"
                  >
                    {menus.map((mm) => (
                      <option key={mm.id} value={mm.id}>
                        M{mm.id} · {mm.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onSaveAssign(iso, selectedMenuId, note)}
                    disabled={busy || !selectedMenuId}
                    className="rounded-xl bg-ink px-5 py-3 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
                  >
                    {busy ? "…" : "Set Menu"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-ink2/60">
                  💡 Memilih Menu ID akan otomatis mengisi kombinasi di bawah.
                </p>
              </section>

              {/* Section 3 · Kombinasi Menu */}
              <section className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-black text-white">
                    3
                  </span>
                  <h3 className="text-sm font-black text-ink">
                    Kombinasi Menu
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <KombinasiSelect
                    label="🍚 Karbohidrat"
                    value={karbo}
                    onChange={setKarbo}
                    options={itemsByBucket.karbo}
                  />
                  <KombinasiSelect
                    label="🍗 Protein"
                    value={protein}
                    onChange={setProtein}
                    options={itemsByBucket.protein}
                  />
                  <KombinasiSelect
                    label="🥬 Sayur"
                    value={sayur}
                    onChange={setSayur}
                    options={itemsByBucket.sayur}
                  />
                  <KombinasiSelect
                    label="🍌 Buah"
                    value={buah}
                    onChange={setBuah}
                    options={itemsByBucket.buah}
                  />
                </div>

                <div className="mt-4">
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-ink2/70">
                    Catatan (opsional)
                  </span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="cth: menu tamu, acara khusus, uji coba menu baru"
                    className="w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm"
                  />
                </div>

                {error && (
                  <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => onSaveAssign(iso, selectedMenuId, note)}
                    disabled={busy || !selectedMenuId}
                    className="rounded-xl bg-ink px-5 py-3 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
                  >
                    💾 {busy ? "Menyimpan…" : "Simpan Kombinasi"}
                  </button>
                  {assign && (
                    <button
                      onClick={() => onClearAssign(iso)}
                      disabled={busy}
                      className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
                    >
                      Hapus Assignment
                    </button>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-2xl bg-amber-50/60 p-4 ring-1 ring-amber-200">
              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-amber-900">
                  Alasan Non-Operasional
                </span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="mis. Libur Nasional, UAS, Rapat Guru"
                  className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm"
                />
                <span className="mt-1 block text-[11px] text-amber-900/70">
                  Menandai hari ini sebagai non-op akan menghapus assignment
                  menu jika ada.
                </span>
              </label>

              {error && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
                  {error}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onMarkNonOp(iso, reason || "Tidak Operasional")}
                  disabled={busy}
                  className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white shadow-card hover:bg-amber-700 disabled:opacity-50"
                >
                  {busy
                    ? "Menyimpan…"
                    : nonOp
                      ? "Update Alasan"
                      : "Tandai Non-Op"}
                </button>
                {nonOp && (
                  <button
                    onClick={() => onClearNonOp(iso)}
                    disabled={busy}
                    className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-ink ring-1 ring-ink/20 hover:bg-paper disabled:opacity-50"
                  >
                    Jadikan Operasional Lagi
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function KombinasiSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ItemRow[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-ink">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm"
      >
        <option value="">— Tidak dipakai —</option>
        {options.map((it) => (
          <option key={it.code} value={it.code}>
            {it.name_en ?? it.code}
          </option>
        ))}
      </select>
    </label>
  );
}
