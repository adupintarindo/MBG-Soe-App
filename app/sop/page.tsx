import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { SOPS, type SOP } from "@/lib/sops";
import {
  Badge,
  KpiGrid,
  KpiTile,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";

export const dynamic = "force-dynamic";

const CAT_BADGE: Record<SOP["category"], "info" | "ok"> = {
  OPERASIONAL: "info",
  HIGIENE: "ok"
};

const CAT_RING: Record<SOP["category"], string> = {
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

  const opCount = grouped.get("OPERASIONAL")?.length ?? 0;
  const hyCount = grouped.get("HIGIENE")?.length ?? 0;
  const totalSteps = SOPS.reduce((s, sop) => s + sop.steps.length, 0);
  const totalRisks = SOPS.reduce((s, sop) => s + sop.risks.length, 0);

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📘"
          title="Standard Operating Procedure"
          subtitle={`Manual SOP SPPG · referensi WHO / CODEX / BPOM / Permenkes`}
          actions={
            <>
              <Badge tone="info">{opCount} Operasional</Badge>
              <Badge tone="ok">{hyCount} Higiene</Badge>
            </>
          }
        />

        <KpiGrid>
          <KpiTile
            icon="📘"
            label="Total SOP"
            value={SOPS.length.toString()}
            sub="dokumen aktif"
          />
          <KpiTile
            icon="🛠️"
            label="Operasional"
            value={opCount.toString()}
            tone="info"
            sub="alur kerja produksi"
          />
          <KpiTile
            icon="🧼"
            label="Higiene"
            value={hyCount.toString()}
            tone="ok"
            sub="food safety"
          />
          <KpiTile
            icon="📋"
            label="Total Langkah"
            value={totalSteps.toString()}
            sub={`${totalRisks} risiko terdokumentasi`}
          />
        </KpiGrid>

        <Section title="📑 Daftar Isi" hint="Klik untuk loncat ke SOP terkait.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(["OPERASIONAL", "HIGIENE"] as const).map((cat) => (
              <div key={cat}>
                <div className="mb-2">
                  <Badge tone={CAT_BADGE[cat]}>
                    {cat} · {grouped.get(cat)?.length ?? 0} SOP
                  </Badge>
                </div>
                <ol className="space-y-1 text-sm">
                  {(grouped.get(cat) ?? []).map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="flex gap-2 rounded-lg px-2 py-1 text-ink2 transition hover:bg-paper hover:text-ink"
                      >
                        <span className="font-mono text-[11px] font-bold text-ink2/60">
                          {s.id}
                        </span>
                        <span className="flex-1">{s.title}</span>
                        <span className="text-[10px] font-bold text-ink2/40">
                          {s.steps.length}↓
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>

        <div className="mb-6 space-y-3">
          {SOPS.map((s) => (
            <details
              key={s.id}
              id={s.id}
              className="group scroll-mt-20 rounded-2xl bg-white shadow-card transition open:shadow-cardlg"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 hover:bg-paper/60">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/5 text-xs font-black text-ink2 transition group-open:rotate-90">
                    ›
                  </span>
                  <span className="font-mono text-[11px] font-bold text-ink2/60">
                    {s.id}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CAT_RING[s.category]}`}
                  >
                    {s.category}
                  </span>
                  <h3 className="truncate text-base font-black text-ink">
                    {s.title}
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[10px] font-semibold text-ink2/70">
                  <Badge tone="neutral">{s.steps.length} langkah</Badge>
                  <Badge tone="bad">{s.risks.length} risiko</Badge>
                  <span className="hidden md:inline text-ink2/60">
                    {s.ref}
                  </span>
                </div>
              </summary>

              <div className="border-t border-ink/5 px-5 py-5">
                <div className="mb-3 md:hidden">
                  <div className="text-[10px] font-semibold text-ink2/70">
                    Ref: {s.ref}
                  </div>
                </div>

                <div className="mb-4 rounded-xl bg-paper px-4 py-3 ring-1 ring-ink/5">
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
                          <span className="text-ink2">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
                      Risiko Utama ({s.risks.length})
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
              </div>
            </details>
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          SOP Manual · SPPG Nunumeu · Disusun IFSR × FFI untuk WFP × Pemkab TTS ·
          Revisi terakhir 2026-04
        </p>
      </PageContainer>
    </div>
  );
}
