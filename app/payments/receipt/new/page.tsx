import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { NewReceiptForm } from "./new-receipt-form";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const WRITE_ROLES = new Set(["admin", "operator"]);

export default async function NewReceiptPage() {
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!WRITE_ROLES.has(profile.role)) redirect("/payments");

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          title={t("pay.receiptFormTitle", lang)}
          actions={
            <LinkButton href="/payments" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        <Section noPad>
          <NewReceiptForm />
        </Section>
      </PageContainer>
    </div>
  );
}
