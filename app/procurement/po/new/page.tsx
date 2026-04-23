import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { NewPOForm } from "./po-form";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const WRITE_ROLES = new Set(["admin", "operator"]);

export interface QtLite {
  no: string;
  supplier_id: string;
  supplier_name: string | null;
  quote_date: string;
  valid_until: string | null;
  need_date: string | null;
  status: string;
  total: number;
  rows: Array<{
    line_no: number;
    item_code: string;
    qty: number;
    qty_quoted: number | null;
    unit: string;
    price_suggested: number | null;
    price_quoted: number | null;
    note: string | null;
  }>;
}

export default async function NewPOPage() {
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!WRITE_ROLES.has(profile.role)) redirect("/procurement");

  // Use admin client to guarantee visibility even under dev-admin session
  // where the regular-client RLS may hide rows created via admin writes.
  const sb = createAdminClient();

  const [qtRes, qtRowsRes, supRes] = await Promise.all([
    sb
      .from("quotations")
      .select(
        "no, supplier_id, quote_date, valid_until, need_date, status, total, converted_po_no"
      )
      .is("converted_po_no", null)
      .order("quote_date", { ascending: false })
      .limit(100),
    sb
      .from("quotation_rows")
      .select(
        "qt_no, line_no, item_code, qty, qty_quoted, unit, price_suggested, price_quoted, note"
      ),
    sb.from("suppliers").select("id, name")
  ]);

  const qtRaw = qtRes.data ?? [];
  const qtRows = qtRowsRes.data ?? [];
  const suppliers = (supRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));

  const rowsByQt = new Map<string, QtLite["rows"]>();
  for (const r of qtRows) {
    const list = rowsByQt.get(r.qt_no) ?? [];
    list.push({
      line_no: r.line_no,
      item_code: r.item_code,
      qty: Number(r.qty ?? 0),
      qty_quoted: r.qty_quoted == null ? null : Number(r.qty_quoted),
      unit: r.unit,
      price_suggested:
        r.price_suggested == null ? null : Number(r.price_suggested),
      price_quoted:
        r.price_quoted == null ? null : Number(r.price_quoted),
      note: r.note
    });
    rowsByQt.set(r.qt_no, list);
  }

  const quotations: QtLite[] = qtRaw.map((q) => ({
    no: q.no,
    supplier_id: q.supplier_id,
    supplier_name: supplierName.get(q.supplier_id) ?? null,
    quote_date: q.quote_date,
    valid_until: q.valid_until,
    need_date: q.need_date,
    status: q.status as string,
    total: Number(q.total ?? 0),
    rows: (rowsByQt.get(q.no) ?? []).sort((a, b) => a.line_no - b.line_no)
  }));

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />
      <PageContainer>
        <PageHeader
          actions={
            <LinkButton href="/procurement?tab=po" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        <Section noPad>
          <NewPOForm quotations={quotations} />
        </Section>
      </PageContainer>
    </div>
  );
}
