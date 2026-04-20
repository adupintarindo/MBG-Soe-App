import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { listAudit, type AuditEvent } from "@/lib/engine";
import {
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { AuditFilters, AuditTable } from "./audit-client";

export const dynamic = "force-dynamic";

interface SearchParams {
  table?: string;
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
}

export default async function AuditPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin" && profile.role !== "viewer") {
    redirect("/dashboard?err=admin_only");
  }

  const filters = {
    table: searchParams.table ?? null,
    actor: searchParams.actor ?? null,
    action: (searchParams.action as
      | "INSERT"
      | "UPDATE"
      | "DELETE"
      | null
      | undefined) ?? null,
    from: searchParams.from ?? null,
    to: searchParams.to ?? null
  };

  const events = await listAudit(supabase, {
    table: filters.table ?? undefined,
    actor: filters.actor ?? undefined,
    action: filters.action ?? undefined,
    from: filters.from ?? undefined,
    to: filters.to ?? undefined,
    limit: 300
  }).catch(() => [] as AuditEvent[]);

  const actors = new Set(events.map((e) => e.actor_email ?? "—"));
  const tables = new Set(events.map((e) => e.table_name));
  const deletes = events.filter((e) => e.action === "DELETE").length;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          title={t("audit.title", lang)}
          subtitle={t("audit.subtitle", lang)}
          actions={
            <LinkButton href="/admin/data" variant="secondary" size="sm">
              {t("tabData", lang)}
            </LinkButton>
          }
        />

        <KpiGrid>
          <KpiTile
            icon="📜"
            label={t("audit.kpiTotal", lang)}
            value={events.length.toString()}
            sub={t("common.noData", lang)}
          />
          <KpiTile
            icon="👥"
            label={t("audit.kpiActors", lang)}
            value={actors.size.toString()}
          />
          <KpiTile
            icon="🗃️"
            label={t("audit.kpiTables", lang)}
            value={tables.size.toString()}
          />
          <KpiTile
            icon="🗑️"
            label={t("audit.kpiDeletes", lang)}
            value={deletes.toString()}
            tone={deletes > 0 ? "warn" : "default"}
          />
        </KpiGrid>

        <Section title={t("audit.listTitle", lang)}>
          <AuditFilters initial={filters} />
          {events.length === 0 ? (
            <EmptyState message={t("audit.empty", lang)} />
          ) : (
            <AuditTable rows={events} />
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
