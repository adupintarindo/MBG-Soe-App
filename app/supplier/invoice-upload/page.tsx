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
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { InvoiceUploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default async function InvoiceUploadPage() {
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "supplier") redirect("/supplier");
  if (!profile.supplier_id) redirect("/supplier");

  const supabase = createClient();

  const [posRes, grnsRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("no, po_date, total")
      .eq("supplier_id", profile.supplier_id)
      .neq("status", "cancelled")
      .order("po_date", { ascending: false })
      .limit(40),
    supabase
      .from("grns")
      .select("no, po_no, grn_date, status")
      .in(
        "po_no",
        (
          await supabase
            .from("purchase_orders")
            .select("no")
            .eq("supplier_id", profile.supplier_id)
            .limit(200)
        ).data?.map((p) => p.no) ?? []
      )
      .order("grn_date", { ascending: false })
      .limit(40)
  ]);

  const pos = (posRes.data ?? []) as Array<{
    no: string;
    po_date: string;
    total: number | string;
  }>;
  const grns = (grnsRes.data ?? []) as Array<{
    no: string;
    po_no: string | null;
    grn_date: string;
    status: string;
  }>;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          title={t("sup.uploadTitle", lang)}
          subtitle={
            lang === "EN"
              ? "Upload invoice scan (PDF/JPG). Operator will review and issue an internal invoice number."
              : "Upload scan invoice (PDF/JPG). Operator akan review dan menerbitkan nomor invoice internal."
          }
          actions={
            <LinkButton href="/supplier" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        <Section noPad>
          <InvoiceUploadForm
            supplierId={profile.supplier_id}
            pos={pos.map((p) => ({
              no: p.no,
              po_date: p.po_date,
              total: Number(p.total)
            }))}
            grns={grns}
          />
        </Section>
      </PageContainer>
    </div>
  );
}
