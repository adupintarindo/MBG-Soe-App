"use client";

import { Badge } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { t, numberLocale } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

export type InviteRow = {
  id: string;
  email: string;
  role: string;
  supplier_id: string | null;
  expires_at: string;
  used_at: string | null;
  status: "used" | "expired" | "active";
};

export function InvitesTable({ rows }: { rows: InviteRow[] }) {
  const { lang } = useLang();
  const columns: SortableColumn<InviteRow>[] = [
    {
      key: "email",
      label: t("adminInvite.colEmail", lang),
      align: "left",
      sortValue: (r) => r.email,
      render: (r) => (
        <span className="font-mono text-[12px] text-ink">{r.email}</span>
      )
    },
    {
      key: "role",
      label: t("adminInvite.colRole", lang),
      align: "left",
      sortValue: (r) => r.role,
      render: (r) => <Badge tone="accent">{r.role}</Badge>
    },
    {
      key: "supplier",
      label: t("adminInvite.colSupplier", lang),
      align: "left",
      sortValue: (r) => r.supplier_id ?? "",
      render: (r) => (
        <span className="text-[12px] text-ink2/80">{r.supplier_id || "—"}</span>
      )
    },
    {
      key: "status",
      label: t("adminInvite.colStatus", lang),
      sortValue: (r) =>
        r.status === "active" ? 0 : r.status === "used" ? 1 : 2,
      render: (r) => {
        if (r.status === "used")
          return <Badge tone="ok">{t("adminInvite.badgeUsed", lang)}</Badge>;
        if (r.status === "expired")
          return (
            <Badge tone="muted">{t("adminInvite.badgeExpired", lang)}</Badge>
          );
        return <Badge tone="info">{t("adminInvite.badgeActive", lang)}</Badge>;
      }
    },
    {
      key: "expires",
      label: t("adminInvite.colExpires", lang),
      sortValue: (r) => r.expires_at,
      render: (r) => (
        <span className="text-[12px] text-ink2/70">
          {new Date(r.expires_at).toLocaleDateString(numberLocale(lang), {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })}
        </span>
      )
    }
  ];
  return (
    <SortableTable<InviteRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      initialSort={{ key: "expires", dir: "desc" }}
      searchable
      stickyHeader
      bodyMaxHeight={480}
    />
  );
}
