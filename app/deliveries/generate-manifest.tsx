"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { deliveryGenerateForDate, toISODate } from "@/lib/engine";
import { t, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
import { useToast } from "@/components/toast";
import { downloadStyledXlsx, type StyledColumn } from "@/lib/excel-export";

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODate(d);
}

type ManifestStop = {
  stop_order: number;
  school_id: string;
  school_name: string;
  porsi_planned: number;
  status: string | null;
};

type ManifestResult = {
  date: string;
  delivery_no: string | null;
  stops: ManifestStop[];
  total: number;
};

export function GenerateManifestButton({
  date,
  variant = "inline"
}: {
  /** Optional seed date. Defaults to tomorrow if omitted. */
  date?: string;
  /** "inline" = date input + button side-by-side (default). "toolbar" = full-width card style. */
  variant?: "inline" | "toolbar";
}) {
  const { lang } = useLang();
  const router = useRouter();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [selectedDate, setSelectedDate] = useState<string>(date ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ManifestResult | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!selectedDate) setSelectedDate(tomorrowISO());
  }, [selectedDate]);

  async function fetchManifestForDate(iso: string): Promise<ManifestResult> {
    const { data: dels } = await supabase
      .from("deliveries")
      .select("no")
      .eq("delivery_date", iso);

    const nos = (dels ?? []).map((d) => d.no as string);
    if (nos.length === 0) {
      return { date: iso, delivery_no: null, stops: [], total: 0 };
    }

    const [{ data: stopsData }, { data: schoolsData }] = await Promise.all([
      supabase
        .from("delivery_stops")
        .select(
          "delivery_no, stop_order, school_id, porsi_planned, status"
        )
        .in("delivery_no", nos)
        .order("delivery_no", { ascending: true })
        .order("stop_order", { ascending: true }),
      supabase.from("schools").select("id, name")
    ]);

    const nameById = new Map<string, string>();
    for (const s of schoolsData ?? []) {
      nameById.set(s.id as string, s.name as string);
    }

    const stops: ManifestStop[] = (stopsData ?? []).map((s) => ({
      stop_order: Number(s.stop_order),
      school_id: s.school_id as string,
      school_name: nameById.get(s.school_id as string) ?? (s.school_id as string),
      porsi_planned: Number(s.porsi_planned ?? 0),
      status: (s.status as string) ?? null
    }));
    const total = stops.reduce((acc, s) => acc + s.porsi_planned, 0);
    return {
      date: iso,
      delivery_no: nos.join(", "),
      stops,
      total
    };
  }

  async function run() {
    if (!selectedDate) return;
    setBusy(true);
    try {
      await deliveryGenerateForDate(supabase, selectedDate);
      const detail = await fetchManifestForDate(selectedDate);
      setResult(detail);
      toast.success(
        lang === "EN" ? "Manifest generated" : "Manifest berhasil dibuat",
        lang === "EN"
          ? `${detail.stops.length} stops, ${detail.total.toLocaleString()} portions.`
          : `${detail.stops.length} sekolah, ${detail.total.toLocaleString("id-ID")} porsi.`
      );
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        lang === "EN" ? "Failed to generate manifest" : "Gagal membuat manifest",
        msg
      );
    } finally {
      setBusy(false);
    }
  }

  function formatDateLong(iso: string): string {
    if (!iso) return "";
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(lang === "EN" ? "en-GB" : "id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  const dateInput = (
    <label className="inline-flex items-center gap-2 rounded-xl bg-paper px-3 py-1.5 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-primary/40">
      <span aria-hidden className="text-[13px]">
        📅
      </span>
      <span className="sr-only">{t("del.pickDate", lang)}</span>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="bg-transparent text-[12px] font-semibold text-ink outline-none"
      />
    </label>
  );

  const button = (
    <button
      type="button"
      onClick={run}
      disabled={busy || !selectedDate}
      className="rounded-xl bg-gold-gradient px-4 py-2 text-[12px] font-black text-primary-strong shadow-card transition hover:brightness-105 disabled:opacity-50"
    >
      {busy ? t("common.loading", lang) : t("del.btnGenerate", lang)}
    </button>
  );

  const resultModal =
    result && mounted
      ? createPortal(
          <ManifestResultModal
            result={result}
            lang={lang}
            formatDateLong={formatDateLong}
            onClose={() => setResult(null)}
          />,
          document.body
        )
      : null;

  if (variant === "toolbar") {
    return (
      <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-card ring-1 ring-ink/5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wide text-ink2">
              {t("del.pickDate", lang)}
            </span>
            {dateInput}
          </div>
          {button}
        </div>
        {resultModal}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {dateInput}
        {button}
      </div>
      {resultModal}
    </>
  );
}

function ManifestResultModal({
  result,
  lang,
  formatDateLong,
  onClose
}: {
  result: ManifestResult;
  lang: "ID" | "EN";
  formatDateLong: (iso: string) => string;
  onClose: () => void;
}) {
  async function onExportExcel() {
    const columns: StyledColumn[] = [
      { key: "no", header: "No", align: "center" },
      {
        key: "school_id",
        header: lang === "EN" ? "School ID" : "ID Sekolah",
        align: "left"
      },
      {
        key: "school_name",
        header: lang === "EN" ? "School" : "Sekolah",
        align: "left"
      },
      {
        key: "porsi",
        header: lang === "EN" ? "Portions" : "Porsi",
        align: "right",
        numFmt: "#,##0",
        hint: "bold"
      },
      {
        key: "status",
        header: "Status",
        align: "center"
      }
    ];
    const rows = result.stops.map((s) => ({
      no: s.stop_order,
      school_id: s.school_id,
      school_name: s.school_name,
      porsi: s.porsi_planned,
      status: s.status ?? "—"
    }));
    await downloadStyledXlsx({
      fileName: `manifest-${result.date}`,
      sheets: [
        {
          name: "Manifest",
          title: `${lang === "EN" ? "Delivery Manifest" : "Manifest Pengiriman"} · ${formatDateLong(result.date)}`,
          subtitle: result.delivery_no ?? undefined,
          columns,
          rows,
          zebra: true,
          freezeHeader: true
        }
      ]
    });
  }

  function onExportPdf() {
    window.print();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-cardlg ring-1 ring-ink/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-ink/5 bg-paper px-6 py-4 print:bg-white">
          <div>
            <h3 className="font-display text-lg font-black text-ink">
              {lang === "EN" ? "Delivery Manifest" : "Manifest Pengiriman"}
            </h3>
            <p className="mt-1 text-sm font-semibold text-ink2">
              {formatDateLong(result.date)}
            </p>
            {result.delivery_no && (
              <p className="mt-0.5 font-mono text-[11px] text-ink2/70">
                {result.delivery_no}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink2 transition hover:bg-ink/5 hover:text-ink print:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {result.stops.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink2/70">
              {lang === "EN"
                ? "No stops in this manifest."
                : "Tidak ada pengiriman di manifest ini."}
            </p>
          ) : (
            <div className="overflow-auto rounded-xl ring-1 ring-ink/10">
              <table className="w-full text-sm">
                <thead className="bg-ink text-white/95">
                  <tr>
                    <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide">
                      No
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide">
                      {lang === "EN" ? "School ID" : "ID Sekolah"}
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide">
                      {lang === "EN" ? "School" : "Sekolah"}
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide">
                      {lang === "EN" ? "Portions" : "Porsi"}
                    </th>
                    <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.stops.map((s) => (
                    <tr
                      key={`${s.school_id}-${s.stop_order}`}
                      className="border-t border-ink/5"
                    >
                      <td className="px-3 py-2 text-center font-mono text-xs tabular-nums">
                        {s.stop_order}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-ink2">
                        {s.school_id}
                      </td>
                      <td className="px-3 py-2 font-semibold text-ink">
                        {s.school_name}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-bold tabular-nums">
                        {formatNumber(s.porsi_planned, lang)}
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] text-ink2">
                        {s.status ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink/20 bg-paper">
                    <td
                      colSpan={3}
                      className="px-3 py-2 text-right text-[11px] font-black uppercase tracking-wide text-ink"
                    >
                      Total
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-black tabular-nums text-ink">
                      {formatNumber(result.total, lang)}
                    </td>
                    <td className="px-3 py-2 text-center text-[11px] text-ink2">
                      {result.stops.length}{" "}
                      {lang === "EN" ? "stops" : "sekolah"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/5 bg-paper px-6 py-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-[12px] font-bold text-ink2 transition hover:bg-ink/[0.04]"
          >
            {t("common.close", lang)}
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={result.stops.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-4 py-2 text-[12px] font-bold text-ink transition hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 9V3h12v6" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
            PDF
          </button>
          <button
            type="button"
            onClick={onExportExcel}
            disabled={result.stops.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-4 py-2 text-[12px] font-black text-primary-strong shadow-card transition hover:brightness-105 disabled:opacity-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Excel
          </button>
        </div>
      </div>
    </div>
  );
}
