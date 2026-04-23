"use client";

import { useMemo, useState } from "react";
import {
  SortableTable,
  type SortableColumn,
  type SortableTableHeaderGroup
} from "@/components/sortable-table";
import { t, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

const LEVEL_COLOR: Record<string, string> = {
  "PAUD/TK": "bg-pink-50 text-pink-900 ring-pink-200",
  SD: "bg-amber-50 text-amber-900 ring-amber-200",
  SMP: "bg-sky-50 text-sky-900 ring-sky-200",
  SMA: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  SMK: "bg-indigo-50 text-indigo-900 ring-indigo-200"
};

export type SchoolRosterRow = {
  id: string;
  name: string;
  address: string | null;
  level: string;
  students: number;
  kecil: number;
  besar: number;
  guru: number;
  eff: number;
  distance_km: number;
  pic: string | null;
  phone: string | null;
  active: boolean;
};

export type SchoolRosterTotals = {
  schools: number;
  students: number;
  guru: number;
  kecil: number;
  besar: number;
  eff: number;
};

export type AttendanceInput = {
  school_id: string;
  att_date: string;
  qty: number;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function waLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const intl = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.768.966-.941 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function SchoolsRosterTable({
  rows,
  totals,
  attendance,
  defaultDate
}: {
  rows: SchoolRosterRow[];
  totals: SchoolRosterTotals;
  attendance?: AttendanceInput[];
  defaultDate?: string;
}) {
  const { lang } = useLang();

  const initialDate = defaultDate ?? todayISO();
  const [pickedDate, setPickedDate] = useState<string>(initialDate);

  const portionsBySchool = useMemo(() => {
    const m = new Map<string, number>();
    if (!attendance || attendance.length === 0) return m;
    for (const a of attendance) {
      const iso = (a.att_date ?? "").slice(0, 10);
      if (iso !== pickedDate) continue;
      m.set(a.school_id, (m.get(a.school_id) ?? 0) + Number(a.qty ?? 0));
    }
    return m;
  }, [attendance, pickedDate]);

  const displayRows = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        eff: portionsBySchool.get(r.id) ?? 0
      })),
    [rows, portionsBySchool]
  );

  const displayTotals = useMemo(() => {
    const effSum = displayRows.reduce((acc, r) => acc + r.eff, 0);
    return { ...totals, eff: effSum };
  }, [displayRows, totals]);

  const columns: SortableColumn<SchoolRosterRow>[] = [
    {
      key: "id",
      label: t("schools.colId", lang),
      align: "center",
      sortValue: (r) => r.id,
      render: (r) => (
        <span
          className={`font-mono text-xs ${!r.active ? "opacity-50" : ""}`}
        >
          {r.id}
        </span>
      )
    },
    {
      key: "name",
      label: t("schools.colName", lang),
      align: "center",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className={!r.active ? "opacity-50" : ""}>
          <div className="font-semibold text-ink">{r.name}</div>
        </div>
      )
    },
    {
      key: "level",
      label: t("schools.colLevel", lang),
      align: "center",
      sortValue: (r) => r.level,
      render: (r) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${LEVEL_COLOR[r.level] ?? LEVEL_COLOR.SD}`}
        >
          {r.level}
        </span>
      )
    },
    {
      key: "kecil",
      label: t("schools.colSmall", lang),
      align: "center",
      sortValue: (r) => r.kecil,
      exportValue: (r) => r.kecil,
      render: (r) => (
        <span className="font-mono text-xs text-amber-700">
          {formatNumber(r.kecil, lang)}
        </span>
      )
    },
    {
      key: "besar",
      label: t("schools.colLarge", lang),
      align: "center",
      sortValue: (r) => r.besar,
      exportValue: (r) => r.besar,
      render: (r) => (
        <span className="font-mono text-xs text-emerald-700">
          {formatNumber(r.besar, lang)}
        </span>
      )
    },
    {
      key: "teachers",
      label: t("schools.colTeachers", lang),
      align: "center",
      sortValue: (r) => r.guru,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.guru, lang)}
        </span>
      )
    },
    {
      key: "eff",
      label: t("schools.colEff", lang),
      align: "center",
      sortValue: (r) => r.eff,
      render: (r) => (
        <span className="font-mono text-xs font-black text-ink">
          {formatNumber(r.eff, lang)}
        </span>
      )
    },
    {
      key: "distance",
      label: t("schools.colDistance", lang),
      align: "center",
      sortValue: (r) => r.distance_km,
      render: (r) => (
        <span className="font-mono text-xs">{r.distance_km.toFixed(1)}</span>
      )
    },
    {
      key: "contact",
      label: t("schools.colContact", lang),
      align: "left",
      sortValue: (r) => r.pic ?? "",
      render: (r) => {
        const wa = waLink(r.phone);
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-[11px]">{r.pic ?? "—"}</div>
              <div className="font-mono text-[10px] text-ink2/60">
                {r.phone ?? ""}
              </div>
            </div>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                title={lang === "EN" ? "Chat on WhatsApp" : "Chat via WhatsApp"}
                className="inline-flex shrink-0 items-center justify-center text-ink2/50 transition hover:text-[#25D366]"
                onClick={(e) => e.stopPropagation()}
              >
                <WhatsAppIcon />
              </a>
            )}
          </div>
        );
      }
    }
  ];

  const headerGroups: SortableTableHeaderGroup[] = [
    { label: "", colSpan: 3 },
    { label: t("schools.colStudents", lang), colSpan: 2 },
    { label: "", colSpan: 4 }
  ];

  return (
    <SortableTable<SchoolRosterRow>
      columns={columns}
      rows={displayRows}
      rowKey={(r) => r.id}
      initialSort={{ key: "id", dir: "asc" }}
      searchable
      exportable
      exportFileName="schools"
      exportSheetName="Schools"
      stickyHeader
      bodyMaxHeight={520}
      headerGroups={headerGroups}
      toolbarExtra={
        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink2">
          <span>{lang === "EN" ? "Date" : "Tanggal"}</span>
          <input
            type="date"
            value={pickedDate}
            onChange={(e) => setPickedDate(e.target.value || initialDate)}
            className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
          />
        </label>
      }
      footer={
        <tr className="border-t-2 border-ink bg-ink">
          <td
            colSpan={3}
            className="py-2 px-3 text-center text-[11px] font-black uppercase tracking-wide text-white"
          >
            {t("common.grandTotal", lang)}
          </td>
          <td className="py-2 px-3 text-center font-mono text-xs font-black text-amber-300">
            {formatNumber(displayTotals.kecil, lang)}
          </td>
          <td className="py-2 px-3 text-center font-mono text-xs font-black text-emerald-300">
            {formatNumber(displayTotals.besar, lang)}
          </td>
          <td className="py-2 px-3 text-center font-mono text-xs font-black text-white">
            {formatNumber(displayTotals.guru, lang)}
          </td>
          <td className="py-2 px-3 text-center font-mono text-sm font-black text-white">
            {formatNumber(displayTotals.eff, lang)}
          </td>
          <td colSpan={2}></td>
        </tr>
      }
    />
  );
}
