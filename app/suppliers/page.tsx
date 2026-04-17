import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";

export const dynamic = "force-dynamic";

const TYPE_COLOR: Record<string, string> = {
  BUMN: "bg-red-50 text-red-900 ring-red-200",
  PT: "bg-blue-50 text-blue-900 ring-blue-200",
  CV: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  UD: "bg-amber-50 text-amber-900 ring-amber-200",
  KOPERASI: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  POKTAN: "bg-lime-50 text-lime-900 ring-lime-200",
  TOKO: "bg-violet-50 text-violet-900 ring-violet-200",
  KIOS: "bg-pink-50 text-pink-900 ring-pink-200",
  INFORMAL: "bg-slate-50 text-slate-900 ring-slate-200"
};

const STATUS_COLOR: Record<string, string> = {
  signed: "bg-emerald-100 text-emerald-800",
  awaiting: "bg-amber-100 text-amber-900",
  draft: "bg-slate-100 text-slate-800",
  rejected: "bg-red-100 text-red-800"
};

export default async function SuppliersPage() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active, supplier_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.active) redirect("/dashboard");

  const [supRes, supItemsRes, invoicesRes, itemsRes] = await Promise.all([
    supabase
      .from("suppliers")
      .select(
        "id, name, type, commodity, pic, phone, address, email, notes, score, status, active"
      )
      .order("id"),
    supabase
      .from("supplier_items")
      .select("supplier_id, item_code, is_main, price_idr, lead_time_days"),
    supabase.from("invoices").select("supplier_id, total, status"),
    supabase.from("items").select("code, category")
  ]);

  const suppliers = supRes.data ?? [];
  const supItems = supItemsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const items = itemsRes.data ?? [];

  const itemCat = new Map(items.map((i) => [i.code, i.category]));

  const spendBySup = new Map<string, { total: number; count: number }>();
  for (const inv of invoices) {
    const cur = spendBySup.get(inv.supplier_id) ?? { total: 0, count: 0 };
    cur.total += Number(inv.total);
    cur.count += 1;
    spendBySup.set(inv.supplier_id, cur);
  }

  const itemsBySup = new Map<string, typeof supItems>();
  for (const si of supItems) {
    const list = itemsBySup.get(si.supplier_id) ?? [];
    list.push(si);
    itemsBySup.set(si.supplier_id, list);
  }

  const signed = suppliers.filter((s) => s.status === "signed").length;
  const awaiting = suppliers.filter((s) => s.status === "awaiting").length;
  const rejected = suppliers.filter((s) => s.status === "rejected").length;
  const avgScore =
    suppliers.filter((s) => Number(s.score) > 0).reduce((sum, s) => sum + Number(s.score), 0) /
    Math.max(1, suppliers.filter((s) => Number(s.score) > 0).length);

  const topByScore = [...suppliers]
    .filter((s) => s.status === "signed" || s.status === "awaiting")
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-black text-ink">🤝 Supplier & Vendor Matrix</h1>
          <p className="text-sm text-ink2/80">
            {suppliers.length} supplier · {signed} signed · {awaiting} awaiting ·{" "}
            {rejected} rejected · rata-rata skor {avgScore.toFixed(1)}
          </p>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI
            icon="✅"
            label="Signed LTA"
            value={signed.toString()}
            sub="siap operasional"
          />
          <KPI
            icon="⏳"
            label="Awaiting"
            value={awaiting.toString()}
            sub="menunggu teken"
          />
          <KPI
            icon="❌"
            label="Rejected"
            value={rejected.toString()}
            sub="skor < 70"
          />
          <KPI
            icon="⭐"
            label="Rata-rata Skor"
            value={avgScore.toFixed(1)}
            sub="Vendor Matrix"
          />
        </section>

        {/* Grid supplier cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topByScore.map((s) => {
            const spend = spendBySup.get(s.id);
            const linked = itemsBySup.get(s.id) ?? [];
            return (
              <article
                key={s.id}
                className={`rounded-2xl bg-white p-5 shadow-card ${s.status === "rejected" ? "opacity-60" : ""}`}
              >
                <header className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-ink2/60">
                        {s.id}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[s.type] ?? TYPE_COLOR.INFORMAL}`}
                      >
                        {s.type}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-black text-ink">
                      {s.name}
                    </h3>
                    <div className="text-[11px] text-ink2/70">{s.address}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/60">
                      Score
                    </div>
                    <div
                      className={`text-lg font-black ${
                        Number(s.score) >= 80
                          ? "text-emerald-700"
                          : Number(s.score) >= 70
                            ? "text-amber-700"
                            : "text-red-700"
                      }`}
                    >
                      {Number(s.score ?? 0).toFixed(1)}
                    </div>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
                    >
                      {s.status}
                    </span>
                  </div>
                </header>

                <div className="space-y-1 text-[11px]">
                  <div>
                    <b>PIC:</b> {s.pic ?? "—"}
                  </div>
                  <div className="font-mono">{s.phone ?? "—"}</div>
                  <div className="font-mono text-ink2/70">{s.email ?? "—"}</div>
                </div>

                {linked.length > 0 && (
                  <div className="mt-3 border-t border-ink/5 pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                      Komoditas · {linked.length} item
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {linked.slice(0, 8).map((li) => (
                        <span
                          key={li.item_code}
                          className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink2"
                        >
                          {li.item_code}
                          {li.is_main && (
                            <span className="ml-1 text-accent">★</span>
                          )}
                        </span>
                      ))}
                      {linked.length > 8 && (
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink2/60">
                          +{linked.length - 8} lagi
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {spend && (
                  <div className="mt-3 flex items-center justify-between border-t border-ink/5 pt-2 text-[11px]">
                    <span className="text-ink2/70">
                      {spend.count} invoice
                    </span>
                    <span className="font-mono font-black text-emerald-800">
                      {formatIDR(spend.total)}
                    </span>
                  </div>
                )}

                {s.notes && (
                  <p className="mt-2 line-clamp-2 text-[10px] italic text-ink2/70">
                    {s.notes}
                  </p>
                )}
              </article>
            );
          })}
        </section>

        {/* Rejected list */}
        {rejected > 0 && (
          <section className="mb-6 rounded-2xl border-l-4 border-red-500 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-red-700">
              ❌ Supplier Rejected
            </h2>
            <div className="space-y-2">
              {suppliers
                .filter((s) => s.status === "rejected")
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-2 ring-1 ring-red-200"
                  >
                    <div>
                      <div className="text-xs font-bold text-red-900">
                        {s.id} · {s.name}
                      </div>
                      <div className="text-[10px] text-red-800/80">
                        {s.notes}
                      </div>
                    </div>
                    <span className="font-mono text-sm font-black text-red-700">
                      {Number(s.score ?? 0).toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Full table */}
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            Tabel Lengkap · {suppliers.length} Supplier
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                  <th className="py-2">ID</th>
                  <th className="py-2">Nama</th>
                  <th className="py-2">Tipe</th>
                  <th className="py-2">Komoditas</th>
                  <th className="py-2 text-right">Items</th>
                  <th className="py-2 text-right">Skor</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Belanja</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => {
                  const spend = spendBySup.get(s.id);
                  const linked = itemsBySup.get(s.id) ?? [];
                  return (
                    <tr key={s.id} className="border-b border-ink/5">
                      <td className="py-2 font-mono text-xs">{s.id}</td>
                      <td className="py-2 font-semibold">{s.name}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[s.type] ?? TYPE_COLOR.INFORMAL}`}
                        >
                          {s.type}
                        </span>
                      </td>
                      <td className="py-2 text-[11px] text-ink2">
                        {s.commodity}
                      </td>
                      <td className="py-2 text-right font-mono text-xs">
                        {linked.length}
                      </td>
                      <td className="py-2 text-right font-mono text-xs font-black">
                        {Number(s.score ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-xs">
                        {spend ? formatIDR(spend.total) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  sub
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink2/80">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-2xl font-black text-ink">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-ink2/70">{sub}</div>
    </div>
  );
}
