import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { InviteForm } from "./invite-form";
import {
  Badge,
  EmptyState,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const supabase = createClient();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin" || !profile.active) {
    redirect("/dashboard?err=admin_only");
  }

  const [invitesRes, suppliersRes] = await Promise.all([
    supabase
      .from("invites")
      .select("id, email, role, supplier_id, created_at, expires_at, used_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("active", true)
      .order("id")
  ]);

  const invites = invitesRes.data || [];
  const now = Date.now();
  const counts = invites.reduce(
    (acc, inv) => {
      if (inv.used_at) acc.used += 1;
      else if (new Date(inv.expires_at).getTime() < now) acc.expired += 1;
      else acc.active += 1;
      return acc;
    },
    { active: 0, used: 0, expired: 0 }
  );

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="🛡️"
          title="Admin · Undang Pengguna"
          subtitle="Buat undangan peran (Admin/Operator/Ahli Gizi/Supplier/Observer). Undangan berlaku 7 hari dan diklaim lewat magic-link pada email yang sama."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{counts.active} aktif</Badge>
              <Badge tone="ok">{counts.used} digunakan</Badge>
              <Badge tone="muted">{counts.expired} kadaluarsa</Badge>
            </div>
          }
        />

        <InviteForm suppliers={suppliersRes.data || []} />

        <Section
          title="Undangan Terkini"
          hint="20 undangan terbaru · urut dari paling baru"
        >
          {invites.length === 0 ? (
            <EmptyState
              icon="📨"
              title="Belum ada undangan"
              message="Buat undangan pertama Anda lewat form di atas."
            />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Peran</th>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Kadaluarsa</th>
                </THead>
                <tbody>
                  {invites.map((inv) => {
                    const expired = new Date(inv.expires_at).getTime() < now;
                    return (
                      <tr
                        key={inv.id}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pr-3 font-mono text-[12px] text-ink">
                          {inv.email}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge tone="accent">{inv.role}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-[12px] text-ink2/80">
                          {inv.supplier_id || "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {inv.used_at ? (
                            <Badge tone="ok">DIGUNAKAN</Badge>
                          ) : expired ? (
                            <Badge tone="muted">KADALUARSA</Badge>
                          ) : (
                            <Badge tone="info">AKTIF</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-[12px] text-ink2/70">
                          {new Date(inv.expires_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            }
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
