import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || !profile.active) {
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

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-black text-ink">
            🛡️ Admin · Undang Pengguna
          </h1>
          <p className="text-sm text-ink2/80">
            Hanya admin yang boleh membuat undangan. Undangan berlaku 7 hari;
            user mengklaim dengan magic-link pada email yang sama.
          </p>
        </header>

        <InviteForm suppliers={suppliersRes.data || []} />

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            Undangan Terkini
          </h2>
          {(invitesRes.data || []).length === 0 ? (
            <p className="text-sm text-ink2/70">Belum ada undangan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                    <th className="py-2">Email</th>
                    <th className="py-2">Peran</th>
                    <th className="py-2">Supplier</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Kadaluarsa</th>
                  </tr>
                </thead>
                <tbody>
                  {(invitesRes.data || []).map((inv) => (
                    <tr key={inv.id} className="border-b border-ink/5">
                      <td className="py-2 font-mono text-[12px]">{inv.email}</td>
                      <td className="py-2">{inv.role}</td>
                      <td className="py-2 text-ink2/80">{inv.supplier_id || "—"}</td>
                      <td className="py-2">
                        {inv.used_at ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-800">
                            DIGUNAKAN
                          </span>
                        ) : new Date(inv.expires_at) < new Date() ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-700">
                            KADALUARSA
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800">
                            AKTIF
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-ink2/70">
                        {new Date(inv.expires_at).toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
