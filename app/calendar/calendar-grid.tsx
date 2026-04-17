"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getHoliday } from "@/lib/holidays";
import {
  setAssignment as setAssignmentAction,
  clearAssignment as clearAssignmentAction,
  markNonOpDay as markNonOpDayAction,
  clearNonOpDay as clearNonOpDayAction,
  saveAttendanceDay as saveAttendanceDayAction,
  fetchAttendanceFor as fetchAttendanceForAction,
  fetchCalendarReference as fetchCalendarReferenceAction
} from "./actions";

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

interface SchoolRow {
  id: string;
  name: string;
  level: string;
  students: number;
  kelas13: number;
  kelas46: number;
  guru: number;
}

interface AttendanceRow {
  school_id: string;
  att_date: string;
  qty: number;
}

interface Props {
  matrix: string[][]; // ISO dates (Mon..Sun rows)
  monthYear: number;
  monthMonth: number; // 1..12
  todayIso: string;
  menus: MenuRow[];
  initialAssigns: AssignRow[];
  initialNonOps: NonOpRow[];
  recipientCount: number;
  canWrite: boolean;
}

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
  monthYear,
  monthMonth,
  todayIso,
  menus,
  initialAssigns,
  initialNonOps,
  recipientCount,
  canWrite
}: Props) {
  const router = useRouter();

  const [assignByDate, setAssignByDate] = useState(
    () => new Map(initialAssigns.map((a) => [a.assign_date, a]))
  );
  const [nonOpByDate, setNonOpByDate] = useState(
    () => new Map(initialNonOps.map((n) => [n.op_date, n]))
  );
  // Lazy-loaded reference data (fetched the first time user opens any modal)
  const [items, setItems] = useState<ItemRow[] | null>(null);
  const [schools, setSchools] = useState<SchoolRow[] | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);

  // Attendance for the currently-open date. Fetched on modal open.
  const [attForDate, setAttForDate] = useState<AttendanceRow[] | null>(null);

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

  async function ensureReference() {
    if (items && schools) return;
    setRefLoading(true);
    setRefError(null);
    try {
      const res = await fetchCalendarReferenceAction();
      if (!res.ok || !res.data) throw new Error(res.error ?? "Gagal memuat referensi.");
      if (!items) setItems(res.data.items);
      if (!schools) setSchools(res.data.schools);
    } catch (e) {
      setRefError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefLoading(false);
    }
  }

  async function fetchAttendanceFor(iso: string) {
    setAttForDate(null);
    const res = await fetchAttendanceForAction(iso);
    if (!res.ok) {
      setRefError(res.error ?? "Gagal memuat kehadiran.");
      setAttForDate([]);
      return;
    }
    setAttForDate((res.data as AttendanceRow[]) ?? []);
  }

  async function openEditor(iso: string) {
    if (!canWrite) return;
    const dow = dayOfWeek(iso);
    if (dow === 0 || dow === 6) return;
    if (getHoliday(iso)) return;
    setError(null);
    setOpenDate(iso);
    // Kick off both in parallel; modal shows skeleton until ready.
    void ensureReference();
    void fetchAttendanceFor(iso);
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

  async function saveAttendance(
    iso: string,
    entries: { school_id: string; qty: number | null }[]
  ) {
    setError(null);
    const toUpsert = entries
      .filter((e) => e.qty !== null && !Number.isNaN(e.qty))
      .map((e) => ({ school_id: e.school_id, att_date: iso, qty: e.qty! }));
    const toDelete = entries.filter((e) => e.qty === null).map((e) => e.school_id);

    if (toUpsert.length > 0) {
      const { error: err } = await supabase
        .from("school_attendance")
        .upsert(toUpsert as never, { onConflict: "school_id,att_date" });
      if (err) {
        setError(err.message);
        return;
      }
    }
    if (toDelete.length > 0) {
      const { error: err } = await supabase
        .from("school_attendance")
        .delete()
        .eq("att_date", iso)
        .in("school_id", toDelete);
      if (err) {
        setError(err.message);
        return;
      }
    }

    setAttForDate((prev) => {
      const next = new Map(
        (prev ?? []).map((r) => [r.school_id, r] as const)
      );
      for (const row of toUpsert) {
        next.set(row.school_id, {
          school_id: row.school_id,
          att_date: iso,
          qty: row.qty
        });
      }
      for (const sid of toDelete) {
        next.delete(sid);
      }
      return Array.from(next.values());
    });
    startTransition(() => router.refresh());
  }

  const recipientLabel = `${recipientCount.toLocaleString("id-ID")} penerima`;

  return (
    <>
      <div className="grid grid-cols-7 gap-1.5">
        {matrix.flat().map((iso) => {
          const [y, m, d] = iso.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          const dow = dt.getDay();
          const isWknd = dow === 0 || dow === 6;
          const isToday = iso === todayIso;
          const inMonth = m === monthMonth && y === monthYear;
          const holidayName = getHoliday(iso);
          const assign = !holidayName ? assignByDate.get(iso) : undefined;
          const nonOp = !holidayName ? nonOpByDate.get(iso) : undefined;
          const menu = assign
            ? menus[menuIndexById.get(assign.menu_id) ?? -1] ?? null
            : null;
          const clickable = !isWknd && !holidayName && canWrite;

          let toneCls =
            "border border-ink/10 bg-white text-ink hover:border-ink/20";
          if (holidayName) {
            toneCls = "border border-rose-300 bg-rose-100 text-rose-900";
          } else if (nonOp) {
            toneCls = "border border-orange-300 bg-orange-100 text-orange-900";
          } else if (menu) {
            toneCls =
              "border border-transparent bg-gradient-to-b from-blue-800 to-blue-700 text-white shadow-card";
          } else if (isWknd) {
            toneCls =
              "border border-amber-200 bg-amber-50 text-amber-900/70";
          }

          const dimCls = inMonth ? "" : "opacity-40";
          const ringCls = isToday ? "ring-2 ring-accent ring-offset-1" : "";
          const cursorCls = clickable
            ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-cardlg"
            : "cursor-default";

          return (
            <button
              key={iso}
              type="button"
              disabled={!clickable}
              onClick={() => openEditor(iso)}
              title={
                holidayName
                  ? `${holidayName} · ${iso}`
                  : nonOp
                    ? `Non-Op: ${nonOp.reason}`
                    : menu
                      ? `M${menu.id} · ${menu.name}`
                      : iso
              }
              className={`flex min-h-[92px] flex-col rounded-xl p-2 text-left text-[10px] transition ${toneCls} ${dimCls} ${ringCls} ${cursorCls}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`text-sm font-black leading-none ${
                    menu ? "text-white" : ""
                  } ${isToday && !menu ? "text-accent" : ""}`}
                >
                  {d}
                </span>
                {holidayName ? (
                  <span className="text-sm leading-none">🚫</span>
                ) : nonOp ? (
                  <span className="text-sm leading-none">🚫</span>
                ) : menu ? (
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wide text-white">
                    M{menu.id}
                  </span>
                ) : null}
              </div>

              {holidayName ? (
                <div className="mt-1 line-clamp-3 text-[10px] font-bold leading-tight">
                  {holidayName}
                </div>
              ) : nonOp ? (
                <div className="mt-1 line-clamp-3 text-[10px] font-bold leading-tight">
                  {nonOp.reason}
                </div>
              ) : menu ? (
                <div className="mt-1 flex flex-1 flex-col justify-between gap-1">
                  <div className="line-clamp-2 text-[11px] font-bold leading-tight">
                    {menu.name}
                  </div>
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-white/85">
                    {recipientLabel}
                  </div>
                </div>
              ) : isWknd ? null : inMonth ? (
                <div className="mt-1 text-[10px] font-semibold text-ink2/40">
                  klik untuk assign
                </div>
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
          schools={schools}
          refLoading={refLoading}
          refError={refError}
          attForDate={attForDate}
          assign={assignByDate.get(openDate) ?? null}
          nonOp={nonOpByDate.get(openDate) ?? null}
          error={error}
          busy={isPending}
          onClose={() => {
            setOpenDate(null);
            setAttForDate(null);
          }}
          onSaveAssign={saveAssign}
          onClearAssign={clearAssign}
          onMarkNonOp={markNonOp}
          onClearNonOp={clearNonOp}
          onSaveAttendance={saveAttendance}
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
  items: ItemRow[] | null;
  schools: SchoolRow[] | null;
  refLoading: boolean;
  refError: string | null;
  attForDate: AttendanceRow[] | null;
  assign: AssignRow | null;
  nonOp: NonOpRow | null;
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onSaveAssign: (iso: string, menuId: number, note: string) => Promise<void>;
  onClearAssign: (iso: string) => Promise<void>;
  onMarkNonOp: (iso: string, reason: string) => Promise<void>;
  onClearNonOp: (iso: string) => Promise<void>;
  onSaveAttendance: (
    iso: string,
    entries: { school_id: string; qty: number | null }[]
  ) => Promise<void>;
}

function EditModal({
  iso,
  menus,
  items,
  schools,
  refLoading,
  refError,
  attForDate,
  assign,
  nonOp,
  error,
  busy,
  onClose,
  onSaveAssign,
  onClearAssign,
  onMarkNonOp,
  onClearNonOp,
  onSaveAttendance
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

  const safeSchools = schools ?? [];
  const safeItems = items ?? [];

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
    for (const it of safeItems) {
      const bucket = CAT_BUCKET[it.category];
      if (bucket) groups[bucket].push(it);
    }
    return groups;
  }, [safeItems]);

  async function handleMarkOperational() {
    if (nonOp) await onClearNonOp(iso);
    setMode("op");
  }

  const refReady = items !== null && schools !== null;

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

          {refError && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800 ring-1 ring-red-200">
              {refError}
            </div>
          )}

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

                {!refReady ? (
                  <SkeletonGrid label="Memuat bahan…" />
                ) : (
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
                )}

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

function SkeletonGrid({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-ink/10" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-ink/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

