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

export const dynamic = "force-dynamic";

const WRITE_ROLES = new Set(["admin", "operator"]);

export default async function NewRequisitionPage() {
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
          title="Buat Purchase Requisition"
          subtitle="Agregasi kebutuhan tanggal tertentu → split ke multiple supplier (qty absolut) → auto-generate quotation per supplier."
          actions={
            <LinkButton href="/procurement" variant="secondary" size="sm">
              ← Kembali
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
