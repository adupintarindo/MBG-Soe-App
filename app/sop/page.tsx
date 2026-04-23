import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { SOPS } from "@/lib/sops";
import {
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { SopShell } from "./sop-shell";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const WRITE_ROLES = new Set(["admin", "operator", "ahli_gizi"]);

export default async function SopPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const lang = getLang();
  const canWrite = WRITE_ROLES.has(profile.role);

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader />

        <Section icon="📚" title={t("sop.tocTitle", lang)} hint={t("sop.tocHint", lang)}>
          <SopShell sops={SOPS} canWrite={canWrite} />
        </Section>

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          {t("sop.footer", lang)}
        </p>
      </PageContainer>
    </div>
  );
}
