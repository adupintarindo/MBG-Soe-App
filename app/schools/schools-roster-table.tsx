"use client";

import {
  SortableTable,
  type SortableColumn
} from "@/components/sortable-table";
import { t, ti, formatNumber } from "@/lib/i18n";
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

export function SchoolsRosterTable({
  rows,
  totals
}: {
  rows: SchoolRosterRow[];
  totals: SchoolRosterTotals;
}) {
  const { lang } = useLang();
  const columns: SortableColumn<SchoolRosterRow>[] = [
    {
      key: "id",
      label: t("schools.colId", lang),
      align: "left",
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
      align: "left",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className={!r.active ? "opacity-50" : ""}>
          <div className="font-semibold text-ink">{r.name}</div>
          <div className="text-[10px] text-ink2/60">{r.address ?? ""}</div>
        </div>
      )
    },
    {
      key: "level",
      label: t("schools.colLevel", lang),
      align: "left",
      sortValue: (r) => r.level,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${LEVEL_COLOR[r.level] ?? LEVEL_COLOR.SD}`}
        >
          {r.level}
        </span>
      )
    },
    {
      key: "students",
      label: t("schools.colStudents", lang),
      align: "right",
      sortValue: (r) => r.students,
      exportValue: (r) => r.students,
      render: (r) => (
        <span className="font-mono text-xs">
          {formatNumber(r.students, lang)}
        </span>
      )
    },
    {
      key: "small",
      label: t("schools.colSmall", lang),
      align: "right",
      sortValue: (r) => r.kecil,
      render: (r) => (
        <span className="font-mono text-xs text-amber-700">
          {formatNumber(r.kecil, lang)}
        </span>
      )
    },
    {
      key: "large",
      label: t("schools.colLarge", lang),
      align: "right",
      sortValue: (r) => r.besar,
      render: (r) => (
        <span className="font-mono text-xs text-emerald-700">
          {formatNumber(r.besar, lang)}
        </span>
      )
    },
    {
      key: "teachers",
      label: t("schools.colTeachers", lang),
      align: "right",
      sortValue: (r) => r.guru,
      render: (r) => <span className="font-mono text-xs">{r.guru}</span>
    },
    {
      key: "eff",
      label: t("schools.colEff", lang),
      align: "right",
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
      align: "right",
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
      render: (r) => (
        <div>
          <div className="text-[11px]">{r.pic ?? "—"}</div>
          <div className="font-mono text-[10px] text-ink2/60">
            {r.phone ?? ""}
          </div>
        </div>
      )
    }
  ];
  return (
    <SortableTable<SchoolRosterRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      initialSort={{ key: "id", dir: "asc" }}
      searchable
      exportable
      exportFileName="schools"
      exportSheetName="Schools"
      footer={
        <tr className="border-t-2 border-ink/20 bg-paper">
          <td colSpan={3} className="py-2 pr-3 font-black text-ink">
            {ti("schools.totalLabel", lang, { n: totals.schools })}
          </td>
          <td className="py-2 pr-3 text-right font-mono text-xs font-black">
            {formatNumber(totals.students, lang)}
          </td>
          <td className="py-2 pr-3 text-right font-mono text-xs font-black text-amber-700">
            {formatNumber(totals.kecil, lang)}
          </td>
          <td className="py-2 pr-3 text-right font-mono text-xs font-black text-emerald-700">
            {formatNumber(totals.besar, lang)}
          </td>
          <td className="py-2 pr-3 text-right font-mono text-xs font-black">
            {formatNumber(totals.guru, lang)}
          </td>
          <td className="py-2 pr-3 text-right font-mono text-sm font-black text-ink">
            {formatNumber(totals.eff, lang)}
          </td>
          <td colSpan={2}></td>
        </tr>
      }
    />
  );
}
