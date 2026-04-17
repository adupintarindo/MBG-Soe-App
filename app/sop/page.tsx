import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { SOPS, type SOP } from "@/lib/sops";

export const dynamic = "force-dynamic";

const CAT_COLOR: Record<SOP["category"], string> = {
  OPERASIONAL: "bg-sky-50 text-sky-900 ring-sky-200",
  HIGIENE: "bg-emerald-50 text-emerald-900 ring-emerald-200"
};

export default async function SopPage() {
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

  const grouped = new Map<SOP["category"], SOP[]>();
  for (const s of SOPS) {
    const list = grouped.get(s.category) ?? [];
    list.push(s);
    grouped.set(s.category, list);
  }

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-black text-ink">📘 Standard Operating Procedure</h1>
          <p className="text-sm text-ink2/80">
            {SOPS.length} SOP · {grouped.get("OPERASIONAL")?.length ?? 0} operasional ·{" "}
            {grouped.get("HIGIENE")?.length ?? 0} higiene · referensi WHO/CODEX/BPOM/Permenkes
          </p>
        </div>

        {/* Table of contents */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            Daftar Isi
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(["OPERASIONAL", "HIGIENE"] as const).map((cat) => (
              <div key={cat}>
                <div
                  className={`mb-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${CAT_COLOR[cat]}`}
                >
                  {cat} · {grouped.get(cat)?.length ?? 0} SOP
                </div>
                <ol className="space-y-1 text-sm">
                  {(grouped.get(cat) ?? []).map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="flex justify-between gap-2 text-ink2 hover:text-ink"
                      >
                        <span className="font-mono text-[11px] text-ink2/60">
                          {s.id}
                        </span>
                        <span className="flex-1">{s.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* SOP cards */}
        <section className="space-y-4">
          {SOPS.map((s) => (
            <article
              key={s.id}
              id={s.id}
              className="scroll-mt-20 rounded-2xl bg-white p-6 shadow-card"
            >
              <header className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-ink/5 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-ink2/60">
                      {s.id}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CAT_COLOR[s.category]}`}
                    >
                      {s.category}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-black text-ink">
                    {s.title}
                  </h3>
                </div>
                <div className="text-right text-[10px] font-semibold text-ink2/70">
                  Ref: {s.ref}
                </div>
              </header>

              <div className="mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                  Scope
                </div>
                <p className="mt-1 text-sm text-ink2">{s.scope}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                    Langkah ({s.steps.length})
                  </div>
                  <ol className="mt-2 space-y-1.5 text-sm">
                    {s.steps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-black text-white">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                    Risiko Utama
                  </div>
                  <ul className="mt-2 space-y-1 text-xs">
                    {s.risks.map((r, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-red-900 ring-1 ring-red-200"
                      >
                        ⚠ {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </section>

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          SOP Manual · SPPG Nunumeu · Disusun IFSR × FFI untuk WFP × Pemkab TTS ·
          Revisi terakhir 2026-04
        </p>
      </main>
    </div>
  );
}
