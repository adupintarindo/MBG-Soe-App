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
import { NewPaymentForm } from "./new-payment-form";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const WRITE_ROLES = new Set(["admin", "operator"]);

interface OpenInvoice {
  no: string;
  supplier_id: string;
  supplier_name: string | null;
  inv_date: string;
  due_date: string | null;
  total: number;
  paid: number;
  outstanding: number;
}

export default async function NewPaymentPage() {
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!WRITE_ROLES.has(profile.role)) redirect("/payments");

  const supabase = createClient();

  const [invRes, payRes, suppliersRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("no, supplier_id, inv_date, due_date, total, status")
      .neq("status", "paid")
      .neq("status", "cancelled")
      .order("inv_date", { ascending: false })
      .limit(100),
    supabase.from("payments").select("invoice_no, amount"),
    supabase.from("suppliers").select("id, name")
  ]);

  const paidByInv = new Map<string, number>();
  for (const p of (payRes.data ?? []) as Array<{
    invoice_no: string | null;
    amount: number | string;
  }>) {
    if (!p.invoice_no) continue;
    paidByInv.set(
      p.invoice_no,
      (paidByInv.get(p.invoice_no) ?? 0) + Number(p.amount)
    );
  }
  const supMap = new Map<string, string>();
  for (const s of (suppliersRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>) {
    supMap.set(s.id, s.name);
  }

  const invoices: OpenInvoice[] = ((invRes.data ?? []) as Array<{
    no: string;
    supplier_id: string;
    inv_date: string;
    due_date: string | null;
    total: number | string;
  }>).map((i) => {
    const total = Number(i.total);
    const paid = paidByInv.get(i.no) ?? 0;
    return {
      no: i.no,
      supplier_id: i.supplier_id,
      supplier_name: supMap.get(i.supplier_id) ?? null,
      inv_date: i.inv_date,
      due_date: i.due_date,
      total,
      paid,
      outstanding: total - paid
    };
  });

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          title={t("pay.formTitle", lang)}
          actions={
            <LinkButton href="/payments" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        <Section noPad>
          <NewPaymentForm invoices={invoices} />
        </Section>
      </PageContainer>
    </div>
  );
}
