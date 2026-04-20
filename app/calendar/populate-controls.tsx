"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { populateMonthFrom, clearAllAssignments } from "./actions";

interface MenuLite {
  id: number;
  name: string;
  cycle_day: number | null;
}

export function PopulateControls({
  year,
  month,
  menus
}: {
  year: number;
  month: number;
  menus: MenuLite[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"ok" | "bad">("ok");

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayISO = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const sortedMenus = useMemo(
    () => [...menus].sort((a, b) => (a.cycle_day ?? a.id) - (b.cycle_day ?? b.id)),
    [menus]
  );

  const [startDate, setStartDate] = useState(firstDay);
  const [startMenuId, setStartMenuId] = useState<number>(
    sortedMenus[0]?.id ?? 0
  );
  const [overwrite, setOverwrite] = useState(true);

  // Reset form state + status message saat user pindah bulan
  useEffect(() => {
    setStartDate(firstDay);
    setStartMenuId(sortedMenus[0]?.id ?? 0);
    setMsg(null);
  }, [year, month, firstDay, sortedMenus]);

  // Lock body scroll while any modal open + ESC closes
  useEffect(() => {
    const anyOpen = open || clearOpen;
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setClearOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, clearOpen]);

  function runPopulate() {
    if (!startDate || !startMenuId) return;
    setMsg(null);
    startTransition(async () => {
      const res = await populateMonthFrom(
        year,
        month,
        startDate,
        startMenuId,
        overwrite
      );
      if (res.error) {
        setMsgTone("bad");
        setMsg(res.error);
        return;
      }
      setMsgTone("ok");
      setMsg(
        res.inserted === 0
          ? "Tidak ada hari operasional yang cocok."
          : `✓ ${res.inserted} hari di-assign.`
      );
      setOpen(false);
      router.refresh();
    });
  }

  function runClear() {
    setMsg(null);
    startTransition(async () => {
      const res = await clearAllAssignments(year, month);
      if (res.error) {
        setMsgTone("bad");
        setMsg(res.error);
        setClearOpen(false);
        return;
      }
      setMsgTone("ok");
      setMsg(
        res.deleted === 0
          ? "Tidak ada assignment untuk dihapus."
          : `✓ ${res.deleted} assignment dihapus.`
      );
      setClearOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-black text-white shadow-card transition hover:bg-ink2 disabled:opacity-50"
          >
            <span>📋</span>
            <span>Populate Semua</span>
          </button>
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-red-700 shadow-card ring-1 ring-red-300 transition hover:bg-red-50 disabled:opacity-50"
          >
            <span>🧹</span>
            <span>Hapus Semua</span>
          </button>
        </div>
        {msg && (
          <span
            className={`text-[10px] font-bold ${msgTone === "ok" ? "text-emerald-700" : "text-red-700"}`}
          >
            {msg}
          </span>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-cardlg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                📋 Populate Semua Bulan
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-ink2 hover:bg-ink/5"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <label className="mb-3 block text-[11px] font-bold text-ink2">
              Mulai tanggal
              <input
                type="date"
                value={startDate}
                min={firstDay}
                max={lastDayISO}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-xs"
              />
            </label>

            <label className="mb-3 block text-[11px] font-bold text-ink2">
              Menu awal
              <select
                value={startMenuId}
                onChange={(e) => setStartMenuId(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-xs"
              >
                {sortedMenus.map((m) => (
                  <option key={m.id} value={m.id}>
                    M{m.cycle_day ?? m.id} · {m.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-4 flex items-center gap-2 text-[11px] font-bold text-ink2">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="h-4 w-4"
              />
              Timpa assignment yang sudah ada
            </label>

            <p className="mb-4 rounded-lg bg-paper px-3 py-2 text-[11px] leading-relaxed text-ink2/80">
              Menu dirotasi urut (M1 → M2 → …) pada hari operasional saja.
              Weekend, hari libur, dan hari non-op otomatis dilewati.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-ink2 hover:bg-ink/5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={runPopulate}
                disabled={isPending}
                className="rounded-lg bg-ink px-4 py-2 text-xs font-black text-white hover:bg-ink2 disabled:opacity-50"
              >
                {isPending ? "Memproses…" : "Populate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {clearOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setClearOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-cardlg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                🧹 Hapus Semua Assignment
              </h3>
              <button
                type="button"
                onClick={() => setClearOpen(false)}
                className="rounded-full p-1 text-ink2 hover:bg-ink/5"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-900 ring-1 ring-red-200">
              Seluruh assignment menu di bulan ini akan dihapus. Hari non-op
              & hari libur tidak terpengaruh. Aksi ini tidak bisa dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setClearOpen(false)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-ink2 hover:bg-ink/5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={runClear}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Memproses…" : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
