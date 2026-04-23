"use client";

import { useState } from "react";
import {
  SortableTable,
  type SortableColumn
} from "@/components/sortable-table";
import { Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export type BumilRosterRow = {
  id: string;
  full_name: string;
  nik: string | null;
  phase: "hamil" | "menyusui";
  gestational_week: number | null;
  child_age_months: number | null;
  age: number | null;
  posyandu_name: string | null;
  address: string | null;
  phone: string | null;
  active: boolean;
};

export function BumilRosterTable({
  rows,
  lang
}: {
  rows: BumilRosterRow[];
  lang: Lang;
}) {
  const [pickedDate, setPickedDate] = useState<string>(todayISO());
  const columns: SortableColumn<BumilRosterRow>[] = [
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
      key: "phase",
      label: t("penerima.colPhase", lang),
      align: "center",
      sortValue: (r) => r.phase,
      searchValue: (r) => r.phase,
      exportValue: (r) => (r.phase === "hamil" ? "Hamil" : "Menyusui"),
      render: (r) => (
        <Badge tone={r.phase === "hamil" ? "info" : "warn"}>
          {r.phase === "hamil"
            ? t("penerima.phaseHamil", lang)
            : t("penerima.phaseMenyusui", lang)}
        </Badge>
      )
    },
    {
      key: "detail",
      label: t("penerima.colDetailFase", lang),
      align: "center",
      sortable: false,
      exportValue: (r) =>
        r.phase === "hamil"
          ? r.gestational_week
            ? `${r.gestational_week} mgg`
            : "—"
          : r.child_age_months
            ? `${r.child_age_months} bln`
            : "—",
      render: (r) =>
        r.phase === "hamil" ? (
          <span className="font-mono text-xs text-ink2">
            {r.gestational_week ? `${r.gestational_week} mgg` : "—"}
          </span>
        ) : (
          <span className="font-mono text-xs text-ink2">
            {r.child_age_months ? `${r.child_age_months} bln` : "—"}
          </span>
        )
    },
    {
      key: "age",
      label: t("penerima.colAge", lang),
      align: "center",
      sortValue: (r) => r.age ?? 0,
      exportValue: (r) => r.age ?? "",
      render: (r) => (
        <span className="font-mono text-xs">{r.age ?? "—"}</span>
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

  return (
    <SortableTable<BumilRosterRow>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "name", dir: "asc" }}
      columns={columns}
      rows={rows}
      searchable
      exportable
      exportFileName="ibu-hamil-menyusui"
      exportSheetName="Ibu Hamil & Menyusui"
      stickyHeader
      bodyMaxHeight={500}
      toolbarExtra={
        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink2">
          <span>{lang === "EN" ? "Date" : "Tanggal"}</span>
          <input
            type="date"
            value={pickedDate}
            onChange={(e) => setPickedDate(e.target.value || todayISO())}
            className="rounded-md border border-ink/10 bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-ink outline-none transition focus:border-accent-strong/60 focus:ring-2 focus:ring-accent-strong/20"
          />
        </label>
      }
    />
  );
}
