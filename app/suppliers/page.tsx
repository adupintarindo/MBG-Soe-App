import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { actionReadinessSnapshot } from "@/lib/engine";
import { Nav } from "@/components/nav";
import {
  KpiGrid,
  KpiTile,
  PageContainer
} from "@/components/ui";
import { SuppliersShell } from "./suppliers-shell";
import type {
  SupplierRow,
  SupItemLink,
  InvoiceTx
} from "./types";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const supabase = createClient();
  const lang = getLang();

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

  const [supRes, supItemsRes, invoicesRes, readiness] = await Promise.all([
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
    actionReadinessSnapshot(supabase).catch((e) => {
      console.error("[suppliers] actionReadinessSnapshot failed:", e);
      return emptyReadiness;
    })
  ]);

  const suppliers = (supRes.data ?? []) as SupplierRow[];
  const supItems = (supItemsRes.data ?? []) as SupItemLink[];
  const invoices = (invoicesRes.data ?? []) as InvoiceTx[];

  const canWriteActions =
    profile.role === "admin" || profile.role === "operator";
  const isSupplierRole = profile.role === "supplier";

  const signed = suppliers.filter((s) => s.status === "signed").length;
  const awaiting = suppliers.filter((s) => s.status === "awaiting").length;
  const rejected = suppliers.filter((s) => s.status === "rejected").length;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <KpiGrid>
          <KpiTile
            icon="✅"
            label={t("suppliers.kpiSigned", lang)}
            value={signed.toString()}
            tone="ok"
            sub={t("suppliers.kpiSignedSub", lang)}
          />
          <KpiTile
            icon="⏳"
            label={t("suppliers.kpiAwaiting", lang)}
            value={awaiting.toString()}
            tone="warn"
            sub={t("suppliers.kpiAwaitingSub", lang)}
          />
          <KpiTile
            icon="❌"
            label={t("suppliers.kpiRejected", lang)}
            value={rejected.toString()}
            tone={rejected > 0 ? "bad" : "default"}
            sub={t("suppliers.kpiRejectedSub", lang)}
          />
          <KpiTile
            icon="📋"
            label={t("suppliers.kpiReadiness", lang)}
            value={`${readiness.readiness_pct.toFixed(0)}%`}
            tone={
              readiness.overdue_cnt > 0
                ? "bad"
                : readiness.readiness_pct >= 80
                  ? "ok"
                  : "warn"
            }
            sub={ti("suppliers.kpiReadinessSub", lang, {
              done: readiness.done_cnt,
              total: readiness.total,
              overdue: readiness.overdue_cnt
            })}
          />
        </KpiGrid>

        <SuppliersShell
          suppliers={suppliers}
          supItems={supItems}
          invoices={invoices}
          canWriteActions={canWriteActions}
          isSupplierRole={isSupplierRole}
        />
      </PageContainer>
    </div>
  );
}
