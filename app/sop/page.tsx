import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/auth";
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
import { SopShell } from "./sop-shell";

export const dynamic = "force-dynamic";

const CAT_BADGE: Record<SOP["category"], "info" | "ok"> = {
  OPERASIONAL: "info",
  HIGIENE: "ok"
};

export default async function SopPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

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

        <Section title="📑 Daftar Isi" hint="Klik untuk buka detail SOP di popup.">
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

        <SopShell sops={SOPS} />

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          SOP Manual · SPPG Nunumeu · Disusun IFSR × FFI untuk WFP × Pemkab TTS ·
          Revisi terakhir 2026-04
        </p>
      </PageContainer>
    </div>
  );
}
