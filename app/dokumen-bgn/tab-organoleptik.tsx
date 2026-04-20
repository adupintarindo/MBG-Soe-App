import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import {
  Badge,
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  Section
} from "@/components/ui";
import {
  listOrganolepticTest,
  listSppgStaff,
  type OrganolepticTest,
  type OrganolepticPhase,
  type SppgStaff
} from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

const PHASE_LABEL_ID: Record<OrganolepticPhase, string> = {
  before_dispatch: "Sebelum Kirim",
  on_arrival: "Saat Tiba",
  before_consumption: "Sebelum Konsumsi"
};

const PHASE_LABEL_EN: Record<OrganolepticPhase, string> = {
  before_dispatch: "Before Dispatch",
  on_arrival: "On Arrival",
  before_consumption: "Before Consumption"
};

const PHASE_TONE: Record<OrganolepticPhase, "info" | "warn" | "accent"> = {
  before_dispatch: "info",
  on_arrival: "warn",
  before_consumption: "accent"
};

function scoreBadgeTone(score: number | null) {
  if (score == null) return "info" as const;
  if (score >= 4) return "ok" as const;
  if (score >= 3) return "warn" as const;
  return "bad" as const;
}

export async function OrganoleptikTab({ supabase, lang, role }: Props) {
  const canWrite =
    role === "admin" || role === "operator" || role === "ahli_gizi";

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 30);
  const fromIso = fromDate.toISOString().slice(0, 10);

  let tests: OrganolepticTest[] = [];
  let staff: SppgStaff[] = [];
  let schools: Array<{ id: string; name: string }> = [];
  try {
    [tests, staff] = await Promise.all([
      listOrganolepticTest(supabase, { from: fromIso, limit: 200 }),
      listSppgStaff(supabase, { active: true })
    ]);
    const schoolsRes = await supabase
      .from("schools")
      .select("id, name")
      .order("name");
    schools = (schoolsRes.data ?? []) as Array<{ id: string; name: string }>;
  } catch {
    // migrasi belum di-apply
  }

  const staffLookup = Object.fromEntries(staff.map((s) => [s.id, s]));
  const schoolLookup = Object.fromEntries(schools.map((s) => [s.id, s]));

  const amanCount = tests.filter((t) => t.verdict === "aman").length;
  const unsafeCount = tests.filter((t) => t.verdict === "tidak_aman").length;
  const amanRate = tests.length > 0 ? (amanCount / tests.length) * 100 : 0;

  // Average scores
  const avg = (key: keyof OrganolepticTest) => {
    const nums = tests
      .map((t) => t[key])
      .filter((v): v is number => typeof v === "number");
    if (nums.length === 0) return 0;
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  };
  const avgRasa = avg("rasa");
  const avgWarna = avg("warna");
  const avgAroma = avg("aroma");
  const avgTekstur = avg("tekstur");

  // Phase counts
  const phaseCount: Record<OrganolepticPhase, number> = {
    before_dispatch: 0,
    on_arrival: 0,
    before_consumption: 0
  };
  tests.forEach((t) => {
    phaseCount[t.test_phase] += 1;
  });

  const phaseLabel = (p: OrganolepticPhase) =>
    lang === "EN" ? PHASE_LABEL_EN[p] : PHASE_LABEL_ID[p];

  return (
    <>
      <KpiGrid>
        <KpiTile
          icon="🧪"
          label={lang === "EN" ? "Tests (30d)" : "Uji 30 Hari"}
          value={tests.length.toString()}
          size="md"
          tone="info"
        />
        <KpiTile
          icon="✅"
          label={lang === "EN" ? "Safe Rate" : "Tingkat Aman"}
          value={`${amanRate.toFixed(0)}%`}
          size="md"
          tone={amanRate >= 95 ? "ok" : amanRate >= 80 ? "warn" : "bad"}
          sub={`${amanCount}/${tests.length}`}
        />
        <KpiTile
          icon="⚠️"
          label={lang === "EN" ? "Unsafe" : "Tidak Aman"}
          value={unsafeCount.toString()}
          size="md"
          tone={unsafeCount === 0 ? "ok" : "bad"}
        />
        <KpiTile
          icon="⭐"
          label={lang === "EN" ? "Avg Score (1–5)" : "Skor Rata-rata"}
          value={((avgRasa + avgWarna + avgAroma + avgTekstur) / 4).toFixed(2)}
          size="md"
          sub={`R:${avgRasa.toFixed(1)} W:${avgWarna.toFixed(1)} A:${avgAroma.toFixed(1)} T:${avgTekstur.toFixed(1)}`}
        />
      </KpiGrid>

      <Section title={lang === "EN" ? "Phase Breakdown" : "Fase Pengujian"}>
        {tests.length === 0 ? (
          <EmptyState message={lang === "EN" ? "No data." : "Belum ada data."} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(phaseCount) as OrganolepticPhase[]).map((p) => (
              <Badge key={p} tone={PHASE_TONE[p]}>
                {phaseLabel(p)} · {phaseCount[p]}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      <Section
        title={
          lang === "EN"
            ? "Organoleptic Test Log (Lamp. 26)"
            : "Log Uji Organoleptik (Lamp. 26)"
        }
        actions={
          canWrite ? (
            <LinkButton
              href="/dokumen-bgn/organoleptik/new"
              variant="primary"
              size="sm"
            >
              {lang === "EN" ? "+ New Test" : "+ Tambah Uji"}
            </LinkButton>
          ) : null
        }
      >
        {tests.length === 0 ? (
          <EmptyState
            icon="👅"
            message={
              lang === "EN"
                ? "No organoleptic tests yet."
                : "Belum ada uji organoleptik."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Date" : "Tanggal"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Phase" : "Fase"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "School" : "Sekolah"}
                  </th>
                  <th className="px-2 py-2 text-center">
                    {lang === "EN" ? "Taste" : "Rasa"}
                  </th>
                  <th className="px-2 py-2 text-center">
                    {lang === "EN" ? "Color" : "Warna"}
                  </th>
                  <th className="px-2 py-2 text-center">
                    {lang === "EN" ? "Aroma" : "Aroma"}
                  </th>
                  <th className="px-2 py-2 text-center">
                    {lang === "EN" ? "Texture" : "Tekstur"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Verdict" : "Hasil"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Officer" : "Petugas"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => {
                  const off = t.officer_id
                    ? staffLookup[t.officer_id]
                    : undefined;
                  const sch = t.school_id
                    ? schoolLookup[t.school_id]
                    : undefined;
                  return (
                    <tr key={t.id} className="border-b border-ink/5">
                      <td className="px-2 py-2 font-mono text-[12px]">
                        {t.test_date}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={PHASE_TONE[t.test_phase]}>
                          {phaseLabel(t.test_phase)}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 font-bold">
                        {sch?.name ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Badge tone={scoreBadgeTone(t.rasa)}>
                          {t.rasa ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Badge tone={scoreBadgeTone(t.warna)}>
                          {t.warna ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Badge tone={scoreBadgeTone(t.aroma)}>
                          {t.aroma ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Badge tone={scoreBadgeTone(t.tekstur)}>
                          {t.tekstur ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={t.verdict === "aman" ? "ok" : "bad"}>
                          {t.verdict === "aman"
                            ? lang === "EN"
                              ? "Safe"
                              : "Aman"
                            : lang === "EN"
                              ? "Unsafe"
                              : "Tidak Aman"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-[12px] text-ink2/80">
                        {off?.full_name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="text-[11.5px] text-ink2/60">
        {lang === "EN"
          ? "Organoleptic test PDF generated via /api/bgn/generate?lampiran=26."
          : "Uji organoleptik PDF dibuat via /api/bgn/generate?lampiran=26."}
      </p>
    </>
  );
}
