"use client";

import {
  SortableTable,
  type SortableColumn,
  type SortableTableFilter
} from "@/components/sortable-table";
import { Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type BalitaRosterRow = {
  id: string;
  full_name: string;
  nik: string | null;
  dob: string | null;
  age_months: number | null;
  gender: "L" | "P" | null;
  mother_name: string | null;
  posyandu_name: string | null;
  address: string | null;
  phone: string | null;
  active: boolean;
};

function formatAge(m: number | null): string {
  if (m === null) return "—";
  if (m < 12) return `${m} bln`;
  const y = Math.floor(m / 12);
  const rem = m % 12;
  return rem > 0 ? `${y} thn ${rem} bln` : `${y} thn`;
}

export function BalitaRosterTable({
  rows,
  lang
}: {
  rows: BalitaRosterRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<BalitaRosterRow>[] = [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "48px",
      sortable: false,
      render: (_r, i) => (
        <span className="font-mono text-xs text-ink2">{i + 1}</span>
      )
    },
    {
      key: "name",
      label: t("penerima.colName", lang),
      align: "left",
      sortValue: (r) => r.full_name,
      searchValue: (r) => `${r.full_name} ${r.nik ?? ""}`,
      exportValue: (r) => r.full_name,
      render: (r) => (
        <div className={!r.active ? "opacity-50" : ""}>
          <div className="font-semibold text-ink">{r.full_name}</div>
          {r.nik && (
            <div className="font-mono text-[10px] text-ink2/60">{r.nik}</div>
          )}
        </div>
      )
    },
    {
      key: "gender",
      label: t("penerima.colGender", lang),
      align: "center",
      sortValue: (r) => r.gender ?? "",
      searchValue: (r) => r.gender ?? "",
      exportValue: (r) =>
        r.gender === "L" ? "Laki-laki" : r.gender === "P" ? "Perempuan" : "",
      render: (r) =>
        r.gender ? (
          <Badge tone={r.gender === "L" ? "info" : "warn"}>
            {r.gender === "L"
              ? t("penerima.genderL", lang)
              : t("penerima.genderP", lang)}
          </Badge>
        ) : (
          <span className="text-ink2/60">—</span>
        )
    },
    {
      key: "dob",
      label: t("penerima.colDob", lang),
      align: "center",
      sortValue: (r) => r.dob ?? "",
      exportValue: (r) => r.dob ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {r.dob ?? "—"}
        </span>
      )
    },
    {
      key: "age",
      label: t("penerima.colAge", lang),
      align: "center",
      sortValue: (r) => r.age_months ?? -1,
      exportValue: (r) => formatAge(r.age_months),
      render: (r) => (
        <span className="font-mono text-xs">{formatAge(r.age_months)}</span>
      )
    },
    {
      key: "mother",
      label: t("penerima.colMother", lang),
      align: "left",
      sortValue: (r) => r.mother_name ?? "",
      searchValue: (r) => r.mother_name ?? "",
      exportValue: (r) => r.mother_name ?? "",
      render: (r) => (
        <span className="text-xs text-ink2">{r.mother_name ?? "—"}</span>
      )
    },
    {
      key: "posyandu",
      label: t("penerima.colPosyandu", lang),
      align: "left",
      sortValue: (r) => r.posyandu_name ?? "",
      searchValue: (r) => r.posyandu_name ?? "",
      exportValue: (r) => r.posyandu_name ?? "",
      render: (r) => (
        <span className="text-xs text-ink2">{r.posyandu_name ?? "—"}</span>
      )
    },
    {
      key: "phone",
      label: t("penerima.colPhone", lang),
      align: "left",
      sortValue: (r) => r.phone ?? "",
      searchValue: (r) => r.phone ?? "",
      exportValue: (r) => r.phone ?? "",
      render: (r) => (
        <span className="font-mono text-[11px] text-ink2">
          {r.phone ?? "—"}
        </span>
      )
    },
    {
      key: "address",
      label: t("penerima.colAddress", lang),
      align: "left",
      sortValue: (r) => r.address ?? "",
      searchValue: (r) => r.address ?? "",
      exportValue: (r) => r.address ?? "",
      render: (r) => (
        <span className="text-[11px] text-ink2/80">{r.address ?? "—"}</span>
      )
    }
  ];

  const genderFilter: SortableTableFilter<BalitaRosterRow> = {
    key: "gender",
    label: t("penerima.colGender", lang),
    getValue: (r) =>
      r.gender === "L" ? "Laki-laki" : r.gender === "P" ? "Perempuan" : "—"
  };
  const posyFilter: SortableTableFilter<BalitaRosterRow> = {
    key: "posyandu",
    label: t("penerima.colPosyandu", lang),
    getValue: (r) => r.posyandu_name ?? "—"
  };

  return (
    <SortableTable<BalitaRosterRow>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "name", dir: "asc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="balita"
      exportSheetName="Balita"
      filters={[genderFilter, posyFilter]}
    />
  );
}
