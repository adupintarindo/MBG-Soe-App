import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { InviteForm } from "./invite-form";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { InvitesTable, type InviteRow } from "./invites-table";
import { t } from "@/lib/i18n";
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

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader />

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
            <InvitesTable
              rows={invites.map<InviteRow>((inv) => ({
                id: inv.id,
                email: inv.email,
                role: inv.role,
                supplier_id: inv.supplier_id,
                expires_at: inv.expires_at,
                used_at: inv.used_at,
                status: inv.used_at
                  ? "used"
                  : new Date(inv.expires_at).getTime() < now
                    ? "expired"
                    : "active"
              }))}
            />
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
