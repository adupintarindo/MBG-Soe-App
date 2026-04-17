import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { Badge, PageContainer, PageHeader } from "@/components/ui";
import { DataShell } from "./data-shell";

export const dynamic = "force-dynamic";

export default async function AdminDataPage() {
  const supabase = createClient();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin" || !profile.active) {
    redirect("/dashboard?err=admin_only");
  }

  const [itemsRes, menusRes, suppliersRes, schoolsRes, countsRes] =
    await Promise.all([
      supabase
        .from("items")
        .select("code, name_en, unit, category, price_idr, vol_weekly, active")
        .order("category")
        .order("code"),
      supabase
        .from("menus")
        .select("id, name, name_en, cycle_day, active, notes")
        .order("id"),
      supabase
        .from("suppliers")
        .select(
          "id, name, type, commodity, pic, phone, address, email, score, status, active"
        )
        .order("id"),
      supabase
        .from("schools")
        .select(
          "id, name, level, students, kelas13, kelas46, guru, distance_km, pic, phone, address, active"
        )
        .order("id"),
      Promise.all([
        supabase
          .from("purchase_orders")
          .select("no", { count: "exact", head: true }),
        supabase.from("grns").select("no", { count: "exact", head: true }),
        supabase.from("invoices").select("no", { count: "exact", head: true }),
        supabase
          .from("stock_moves")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true }),
        supabase.from("stock").select("item_code", { count: "exact", head: true })
      ])
    ]);

  const [poRes, grnRes, invRes, movesRes, txRes, stockRes] = countsRes;

  const counts = {
    items: itemsRes.data?.length ?? 0,
    menus: menusRes.data?.length ?? 0,
    suppliers: suppliersRes.data?.length ?? 0,
    schools: schoolsRes.data?.length ?? 0,
    purchase_orders: poRes.count ?? 0,
    grns: grnRes.count ?? 0,
    invoices: invRes.count ?? 0,
    stock_moves: movesRes.count ?? 0,
    transactions: txRes.count ?? 0,
    stock_rows: stockRes.count ?? 0
  };

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="🗃️"
          title="Admin · Data Master"
          subtitle="Tambah, edit, atau reset data master & transaksi. Hanya admin yang punya akses ke modul ini."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{counts.items} item</Badge>
              <Badge tone="info">{counts.menus} menu</Badge>
              <Badge tone="info">{counts.suppliers} supplier</Badge>
              <Badge tone="info">{counts.schools} sekolah</Badge>
            </div>
          }
        />

        <DataShell
          items={itemsRes.data ?? []}
          menus={menusRes.data ?? []}
          suppliers={suppliersRes.data ?? []}
          schools={schoolsRes.data ?? []}
          counts={counts}
        />
      </PageContainer>
    </div>
  );
}
