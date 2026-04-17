import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { InviteForm } from "./invite-form";
import {
  Badge,
  EmptyState,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";
import { t, ti, numberLocale } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin" || !profile.active) {
    redirect("/dashboard?err=admin_only");
  }

  const [invitesRes, suppliersRes] = await Promise.all([
    supabase
      .from("invites")
      .select("id, email, role, supplier_id, created_at, expires_at, used_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("active", true)
      .order("id")
  ]);

  const invites = invitesRes.data || [];
  const now = Date.now();
  const counts = invites.reduce(
    (acc, inv) => {
      if (inv.used_at) acc.used += 1;
      else if (new Date(inv.expires_at).getTime() < now) acc.expired += 1;
      else acc.active += 1;
      return acc;
    },
    { active: 0, used: 0, expired: 0 }
  );

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="🛡️"
          title={t("adminInvite.title", lang)}
          subtitle={t("adminInvite.subtitle", lang)}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{ti("adminInvite.countActive", lang, { n: counts.active })}</Badge>
              <Badge tone="ok">{ti("adminInvite.countUsed", lang, { n: counts.used })}</Badge>
              <Badge tone="muted">{ti("adminInvite.countExpired", lang, { n: counts.expired })}</Badge>
            </div>
          }
        />

        <InviteForm suppliers={suppliersRes.data || []} />

        <Section
          title={t("adminInvite.recentTitle", lang)}
          hint={t("adminInvite.recentHint", lang)}
        >
          {invites.length === 0 ? (
            <EmptyState
              icon="📨"
              title={t("adminInvite.emptyTitle", lang)}
              message={t("adminInvite.emptyBody", lang)}
            />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">{t("adminInvite.colEmail", lang)}</th>
                  <th className="py-2 pr-3">{t("adminInvite.colRole", lang)}</th>
                  <th className="py-2 pr-3">{t("adminInvite.colSupplier", lang)}</th>
                  <th className="py-2 pr-3">{t("adminInvite.colStatus", lang)}</th>
                  <th className="py-2 pr-3">{t("adminInvite.colExpires", lang)}</th>
                </THead>
                <tbody>
                  {invites.map((inv) => {
                    const expired = new Date(inv.expires_at).getTime() < now;
                    return (
                      <tr
                        key={inv.id}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pr-3 font-mono text-[12px] text-ink">
                          {inv.email}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge tone="accent">{inv.role}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-[12px] text-ink2/80">
                          {inv.supplier_id || "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {inv.used_at ? (
                            <Badge tone="ok">{t("adminInvite.badgeUsed", lang)}</Badge>
                          ) : expired ? (
                            <Badge tone="muted">{t("adminInvite.badgeExpired", lang)}</Badge>
                          ) : (
                            <Badge tone="info">{t("adminInvite.badgeActive", lang)}</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-[12px] text-ink2/70">
                          {new Date(inv.expires_at).toLocaleDateString(
                            numberLocale(lang),
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            }
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
