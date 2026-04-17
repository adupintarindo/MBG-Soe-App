import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { formatIDR } from "@/lib/engine";
import {
  KpiGrid,
  KpiTile,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";

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

interface SupplierRow {
  id: string;
  name: string;
  type: string;
  commodity: string | null;
  pic: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  score: number | string | null;
  status: string;
  active: boolean;
}
interface SupItemLink {
  supplier_id: string;
  item_code: string;
  is_main: boolean;
  price_idr: number | string | null;
  lead_time_days: number | null;
}
interface InvoiceLite {
  supplier_id: string;
  total: number | string;
  status: string;
}
interface ItemLite {
  code: string;
  category: string;
}

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

  const suppliers = (supRes.data ?? []) as SupplierRow[];
  const supItems = (supItemsRes.data ?? []) as SupItemLink[];
  const invoices = (invoicesRes.data ?? []) as InvoiceLite[];
  // itemCat currently unused but available for future per-item grouping
  void ((itemsRes.data ?? []) as ItemLite[]);

  const spendBySup = new Map<string, { total: number; count: number }>();
  for (const inv of invoices) {
    const cur = spendBySup.get(inv.supplier_id) ?? { total: 0, count: 0 };
    cur.total += Number(inv.total);
    cur.count += 1;
    spendBySup.set(inv.supplier_id, cur);
  }

  const itemsBySup = new Map<string, SupItemLink[]>();
  for (const si of supItems) {
    const list = itemsBySup.get(si.supplier_id) ?? [];
    list.push(si);
    itemsBySup.set(si.supplier_id, list);
  }

  const signed = suppliers.filter((s) => s.status === "signed").length;
  const awaiting = suppliers.filter((s) => s.status === "awaiting").length;
  const rejected = suppliers.filter((s) => s.status === "rejected").length;
  const scored = suppliers.filter((s) => Number(s.score) > 0);
  const avgScore =
    scored.reduce((sum, s) => sum + Number(s.score), 0) /
    Math.max(1, scored.length);

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
            icon="⭐"
            label="Rata-rata Skor"
            value={avgScore.toFixed(1)}
            tone="info"
            sub="Vendor Matrix"
          />
        </KpiGrid>

        <Section
          title="Vendor Cards · Signed + Awaiting"
          hint="Urut berdasarkan skor evaluasi (desc)."
          noPad
        >
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">
            {topByScore.map((s) => {
              const spend = spendBySup.get(s.id);
              const linked = itemsBySup.get(s.id) ?? [];
              const score = Number(s.score ?? 0);
              return (
                <article
                  key={s.id}
                  className={`rounded-2xl bg-paper p-5 ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-card ${s.status === "rejected" ? "opacity-60" : ""}`}
                >
                  <header className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
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
                      <h3 className="mt-1 truncate text-sm font-black text-ink">
                        {s.name}
                      </h3>
                      <div className="truncate text-[11px] text-ink2/70">
                        {s.address}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/60">
                        Score
                      </div>
                      <div
                        className={`text-lg font-black ${
                          score >= 80
                            ? "text-emerald-700"
                            : score >= 70
                              ? "text-amber-700"
                              : "text-red-700"
                        }`}
                      >
                        {score.toFixed(1)}
                      </div>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
                      >
                        {s.status}
                      </span>
                    </div>
                  </header>

                  <div className="space-y-0.5 text-[11px] text-ink">
                    <div>
                      <b>PIC:</b> {s.pic ?? "—"}
                    </div>
                    <div className="font-mono text-ink2">{s.phone ?? "—"}</div>
                    <div className="font-mono text-ink2/70">
                      {s.email ?? "—"}
                    </div>
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
                            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ink2 ring-1 ring-ink/5"
                          >
                            {li.item_code}
                            {li.is_main && (
                              <span className="ml-1 text-accent-strong">★</span>
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
          </div>
        </Section>

        {rejected > 0 && (
          <Section title="❌ Supplier Rejected" accent="bad">
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
          </Section>
        )}

        <Section title={`Tabel Lengkap · ${suppliers.length} Supplier`}>
          <TableWrap>
            <table className="w-full text-sm">
              <THead>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Tipe</th>
                <th className="py-2 pr-3">Komoditas</th>
                <th className="py-2 pr-3 text-right">Items</th>
                <th className="py-2 pr-3 text-right">Skor</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Belanja</th>
              </THead>
              <tbody>
                {suppliers.map((s) => {
                  const spend = spendBySup.get(s.id);
                  const linked = itemsBySup.get(s.id) ?? [];
                  return (
                    <tr key={s.id} className="row-hover border-b border-ink/5">
                      <td className="py-2 pr-3 font-mono text-xs">{s.id}</td>
                      <td className="py-2 pr-3 font-semibold">{s.name}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[s.type] ?? TYPE_COLOR.INFORMAL}`}
                        >
                          {s.type}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[11px] text-ink2">
                        {s.commodity}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {linked.length}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                        {Number(s.score ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {spend ? formatIDR(spend.total) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </Section>
      </PageContainer>
    </div>
  );
}
