"use client";

import { useMemo, useRef, useState, useTransition, useEffect } from "react";
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
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"ok" | "bad">("ok");
  const popRef = useRef<HTMLDivElement | null>(null);

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

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

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
    const ok = window.confirm(
      "Hapus SEMUA assignment menu di bulan ini? Non-op & libur tidak terpengaruh."
    );
    if (!ok) return;
    setMsg(null);
    startTransition(async () => {
      const res = await clearAllAssignments(year, month);
      if (res.error) {
        setMsgTone("bad");
        setMsg(res.error);
        return;
      }
      setMsgTone("ok");
      setMsg(
        res.deleted === 0
          ? "Tidak ada assignment untuk dihapus."
          : `✓ ${res.deleted} assignment dihapus.`
      );
      router.refresh();
    });
  }

  return (
    <div className="relative flex flex-col items-end gap-1" ref={popRef}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-black text-white shadow-card transition hover:bg-ink2 disabled:opacity-50"
        >
          <span>📋</span>
          <span>Populate Semua</span>
        </button>
        <button
          type="button"
          onClick={runClear}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-red-700 shadow-card ring-1 ring-red-300 transition hover:bg-red-50 disabled:opacity-50"
        >
          <span>🧹</span>
          <span>Hapus Semua</span>
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl bg-white p-4 shadow-cardlg ring-1 ring-ink/10">
          <div className="mb-3 text-[11px] font-black uppercase tracking-wider text-ink2">
            Populate dari tanggal & menu awal
          </div>

          <label className="mb-2 block text-[11px] font-bold text-ink2">
            Mulai tanggal
            <input
              type="date"
              value={startDate}
              min={firstDay}
              max={lastDayISO}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-ink/20 bg-white px-2 py-1.5 text-xs"
            />
          </label>

          <label className="mb-2 block text-[11px] font-bold text-ink2">
            Menu awal
            <select
              value={startMenuId}
              onChange={(e) => setStartMenuId(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-ink/20 bg-white px-2 py-1.5 text-xs"
            >
              {sortedMenus.map((m) => (
                <option key={m.id} value={m.id}>
                  M{m.cycle_day ?? m.id} · {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-3 flex items-center gap-2 text-[11px] font-bold text-ink2">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Timpa assignment yang sudah ada
          </label>

          <p className="mb-3 rounded-lg bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-ink2/80">
            Menu dirotasi urut (M1 → M2 → ...) pada hari operasional saja. Weekend,
            hari libur, dan hari non-op otomatis dilewati.
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-ink2 hover:bg-ink/5"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={runPopulate}
              disabled={isPending}
              className="rounded-lg bg-ink px-4 py-1.5 text-[11px] font-black text-white hover:bg-ink2 disabled:opacity-50"
            >
              {isPending ? "Memproses…" : "Populate"}
            </button>
          </div>
        </div>
      )}

      {msg && (
        <span
          className={`text-[10px] font-bold ${msgTone === "ok" ? "text-emerald-700" : "text-red-700"}`}
        >
          {msg}
        </span>
      )}
    </div>
  );
}
