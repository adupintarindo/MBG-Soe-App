import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { QuotationForm } from "./quotation-form";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const WRITE_ROLES = new Set(["admin", "operator"]);

interface SupplierLite {
  id: string;
  name: string;
  status: string;
}
interface ItemLite {
  code: string;
  name_en: string | null;
  unit: string;
  category: string;
  active: boolean;
}

export default async function NewQuotationPage() {
  const lang = getLang();
  const supabase = createClient();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!WRITE_ROLES.has(profile.role)) redirect("/procurement");

  const [supRes, itemsRes] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, name, status")
      .in("status", ["signed", "awaiting"])
      .order("name"),
    supabase
      .from("items")
      .select("code, name_en, unit, category, active")
      .eq("active", true)
      .order("code")
  ]);

  const suppliers = (supRes.data ?? []) as SupplierLite[];
  const items = (itemsRes.data ?? []) as ItemLite[];

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          title={t("qtNew.title", lang)}
          subtitle={t("qtNew.subtitle", lang)}
          actions={
            <LinkButton href="/procurement" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        <Section noPad>
          <QuotationForm suppliers={suppliers} items={items} />
        </Section>
      </PageContainer>
    </div>
  );
}
