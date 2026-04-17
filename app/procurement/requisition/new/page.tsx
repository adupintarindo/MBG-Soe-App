import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { NewPrForm } from "./new-pr-form";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const WRITE_ROLES = new Set(["admin", "operator"]);

export default async function NewRequisitionPage() {
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!WRITE_ROLES.has(profile.role)) redirect("/procurement");

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📋"
          title={t("prNew.title", lang)}
          subtitle={t("prNew.subtitle", lang)}
          actions={
            <LinkButton href="/procurement" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        <Section noPad>
          <NewPrForm />
        </Section>
      </PageContainer>
    </div>
  );
}
