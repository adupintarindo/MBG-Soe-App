import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { listSupplierActions, actionReadinessSnapshot } from "@/lib/engine";
import { Nav } from "@/components/nav";
import {
  KpiGrid,
  KpiTile,
  PageContainer,
  PageHeader
} from "@/components/ui";
import { SuppliersShell } from "./suppliers-shell";
import type {
  SupplierRow,
  SupItemLink,
  InvoiceTx,
  PoTx,
  ItemCatalog,
  SupplierCert
} from "./types";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const supabase = createClient();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const emptyReadiness = {
    total: 0,
    open_cnt: 0,
    in_progress_cnt: 0,
    blocked_cnt: 0,
    done_cnt: 0,
    cancelled_cnt: 0,
    overdue_cnt: 0,
    high_priority_open: 0,
    readiness_pct: 0
  };

  const [
    supRes,
    supItemsRes,
    invoicesRes,
    posRes,
    itemsRes,
    certsRes,
    actions,
    readiness
  ] = await Promise.all([
    supabase
      .from("suppliers")
      .select(
        "id, name, type, commodity, pic, phone, address, email, notes, score, status, active"
      )
      .order("id"),
    supabase
      .from("supplier_items")
      .select("supplier_id, item_code, is_main, price_idr, lead_time_days"),
    supabase
      .from("invoices")
      .select("no, supplier_id, inv_date, total, status, po_no")
      .order("inv_date", { ascending: false }),
    supabase
      .from("purchase_orders")
      .select("no, supplier_id, po_date, total, status")
      .order("po_date", { ascending: false }),
    supabase.from("items").select("code, name_en, unit, category").order("code"),
    supabase
      .from("supplier_certs")
      .select("id, supplier_id, name, valid_until, created_at")
      .order("created_at", { ascending: false }),
    listSupplierActions(supabase).catch((e) => {
      console.error("[suppliers] listSupplierActions failed:", e);
      return [] as Awaited<ReturnType<typeof listSupplierActions>>;
    }),
    actionReadinessSnapshot(supabase).catch((e) => {
      console.error("[suppliers] actionReadinessSnapshot failed:", e);
      return emptyReadiness;
    })
  ]);

  const suppliers = (supRes.data ?? []) as SupplierRow[];
  const supItems = (supItemsRes.data ?? []) as SupItemLink[];
  const invoices = (invoicesRes.data ?? []) as InvoiceTx[];
  const pos = (posRes.data ?? []) as PoTx[];
  const itemsCatalog = (itemsRes.data ?? []) as ItemCatalog[];
  const certs = (certsRes.data ?? []) as SupplierCert[];

  const signed = suppliers.filter((s) => s.status === "signed").length;
  const awaiting = suppliers.filter((s) => s.status === "awaiting").length;
  const rejected = suppliers.filter((s) => s.status === "rejected").length;
  const scored = suppliers.filter((s) => Number(s.score) > 0);
  const avgScore =
    scored.reduce((sum, s) => sum + Number(s.score), 0) /
    Math.max(1, scored.length);

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="🤝"
          title="Supplier & Vendor Matrix"
          subtitle={
            <>
              {suppliers.length} supplier · {signed} signed · {awaiting}{" "}
              awaiting · {rejected} rejected · rata-rata skor{" "}
              <b className="text-ink">{avgScore.toFixed(1)}</b>
            </>
          }
        />

        <KpiGrid>
          <KpiTile
            icon="✅"
            label="Signed LTA"
            value={signed.toString()}
            tone="ok"
            sub="siap operasional"
          />
          <KpiTile
            icon="⏳"
            label="Awaiting"
            value={awaiting.toString()}
            tone="warn"
            sub="menunggu teken"
          />
          <KpiTile
            icon="❌"
            label="Rejected"
            value={rejected.toString()}
            tone={rejected > 0 ? "bad" : "default"}
            sub="skor < 70"
          />
          <KpiTile
            icon="📋"
            label="Onboarding Readiness"
            value={`${readiness.readiness_pct.toFixed(0)}%`}
            tone={
              readiness.overdue_cnt > 0
                ? "bad"
                : readiness.readiness_pct >= 80
                  ? "ok"
                  : "warn"
            }
            sub={`${readiness.done_cnt}/${readiness.total} done · ${readiness.overdue_cnt} overdue`}
          />
        </KpiGrid>

        <SuppliersShell
          suppliers={suppliers}
          supItems={supItems}
          invoices={invoices}
          pos={pos}
          items={itemsCatalog}
          certs={certs}
          actions={actions}
          canWriteActions={
            profile.role === "admin" || profile.role === "operator"
          }
          isSupplierRole={profile.role === "supplier"}
          isAdmin={profile.role === "admin"}
        />
      </PageContainer>
    </div>
  );
}
