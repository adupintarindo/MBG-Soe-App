"use client";

import { Badge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatIDR } from "@/lib/engine";
import { t, ti, type Lang } from "@/lib/i18n";

export type SupplierItemRow = {
  item_code: string;
  is_main: boolean;
  price_idr: number | null;
  lead_time_days: number | null;
};

export function SupplierItemsTable({
  rows,
  lang
}: {
  rows: SupplierItemRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<SupplierItemRow>[] = [
    {
      key: "item",
      label: t("supplierDetail.colItem", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => <span className="font-semibold">{r.item_code}</span>
    },
    {
      key: "main",
      label: t("supplierDetail.colMain", lang),
      sortValue: (r) => (r.is_main ? 0 : 1),
      render: (r) =>
        r.is_main ? (
          <Badge tone="ok">{t("supplierDetail.badgeMain", lang)}</Badge>
        ) : (
          <Badge tone="muted">{t("supplierDetail.badgeAlt", lang)}</Badge>
        )
    },
    {
      key: "price",
      label: t("supplierDetail.colPrice", lang),
      align: "left",
      sortValue: (r) => r.price_idr ?? 0,
      render: (r) => (
        <span className="font-mono text-xs">
          {r.price_idr != null ? formatIDR(Number(r.price_idr)) : "—"}
        </span>
      )
    },
    {
      key: "lead",
      label: t("supplierDetail.colLead", lang),
      align: "right",
      sortValue: (r) => r.lead_time_days ?? 0,
      render: (r) => (
        <span className="font-mono text-xs">
          {r.lead_time_days != null
            ? ti("supplierDetail.leadDays", lang, { n: r.lead_time_days })
            : "—"}
        </span>
      )
    }
  ];

  return (
    <SortableTable<SupplierItemRow>
      tableClassName="text-sm"
      rowKey={(r) => r.item_code}
      initialSort={{ key: "item", dir: "asc" }}
      columns={columns}
      rows={rows}
    />
  );
}

export type SupplierCertRow = {
  id: number;
  name: string;
  valid_until: string | null;
  expired: boolean;
};

export function SupplierCertsTable({
  rows,
  lang
}: {
  rows: SupplierCertRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<SupplierCertRow>[] = [
    {
      key: "cert",
      label: t("supplierDetail.colCert", lang),
      align: "left",
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold">{r.name}</span>
    },
    {
      key: "valid",
      label: t("supplierDetail.colValidUntil", lang),
      align: "left",
      sortValue: (r) => r.valid_until ?? "",
      render: (r) => (
        <span className="font-mono text-xs">{r.valid_until ?? "—"}</span>
      )
    },
    {
      key: "status",
      label: t("supplierDetail.colStatus", lang),
      sortValue: (r) =>
        r.valid_until == null ? 1 : r.expired ? 2 : 0,
      render: (r) =>
        r.valid_until == null ? (
          <Badge tone="muted">{t("supplierDetail.certUnlimited", lang)}</Badge>
        ) : r.expired ? (
          <Badge tone="bad">{t("supplierDetail.certExpired", lang)}</Badge>
        ) : (
          <Badge tone="ok">{t("supplierDetail.certValid", lang)}</Badge>
        )
    }
  ];

  return (
    <SortableTable<SupplierCertRow>
      tableClassName="text-sm"
      rowKey={(r) => r.id}
      initialSort={{ key: "valid", dir: "asc" }}
      columns={columns}
      rows={rows}
    />
  );
}
