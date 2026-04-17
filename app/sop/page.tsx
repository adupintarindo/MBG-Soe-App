import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { SOPS, type SOP } from "@/lib/sops";
import { sopComplianceSummary } from "@/lib/engine";
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

const WRITE_ROLES = new Set(["admin", "operator", "ahli_gizi"]);

export default async function SopPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const supabase = createClient();

  // Compliance summary untuk 90 hari terakhir.
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 90);
  const fromISO = from.toISOString().slice(0, 10);
  const toISO = today.toISOString().slice(0, 10);

  let compliance: Awaited<ReturnType<typeof sopComplianceSummary>> = [];
  try {
    compliance = await sopComplianceSummary(supabase, fromISO, toISO);
  } catch {
    compliance = [];
  }

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

  // Compliance aggregates
  const totalRuns = compliance.reduce((a, c) => a + Number(c.run_count), 0);
  const sopsWithRuns = compliance.length;
  const avgCompletion =
    compliance.length > 0
      ? Math.round(
          compliance.reduce((a, c) => a + Number(c.avg_completion), 0) /
            compliance.length
        )
      : 0;
  const totalRisksFlagged = compliance.reduce(
    (a, c) => a + Number(c.total_risks),
    0
  );

  const canWrite = WRITE_ROLES.has(profile.role);

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
          subtitle={`Manual SOP SPPG · referensi WHO / CODEX / BPOM / Permenkes · 90 hari eksekusi`}
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
            sub={`${sopsWithRuns} sudah dieksekusi · ${SOPS.length - sopsWithRuns} belum`}
          />
          <KpiTile
            icon="✅"
            label="Eksekusi 90 hari"
            value={totalRuns.toString()}
            tone={totalRuns === 0 ? "warn" : "ok"}
            sub="entry compliance log"
          />
          <KpiTile
            icon="📊"
            label="Avg Completion"
            value={`${avgCompletion}%`}
            tone={
              avgCompletion >= 80 ? "ok" : avgCompletion >= 50 ? "warn" : "bad"
            }
            sub="rata-rata centang langkah"
          />
          <KpiTile
            icon="⚠️"
            label="Risiko Teramati"
            value={totalRisksFlagged.toString()}
            tone={totalRisksFlagged > 0 ? "bad" : "default"}
            sub={`${totalSteps} langkah total · ${totalRisks} risiko master`}
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

        <SopShell sops={SOPS} compliance={compliance} canWrite={canWrite} />

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          SOP Manual · SPPG Nunumeu · Disusun IFSR × FFI untuk WFP × Pemkab TTS ·
          Revisi terakhir 2026-04
        </p>
      </PageContainer>
    </div>
  );
}
