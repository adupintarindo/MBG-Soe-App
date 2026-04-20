import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import { formatDateLong } from "@/lib/engine";
import {
  Badge,
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

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const DUMMY_SCHOOLS: Array<{ id: string; name: string }> = [
  { id: "dm-sch-1", name: "SDN Pasir Putih 01" },
  { id: "dm-sch-2", name: "SDN Pasir Putih 02" },
  { id: "dm-sch-3", name: "MI Al-Hidayah" },
  { id: "dm-sch-4", name: "SDN Mekarsari 03" }
];

const DUMMY_STAFF: SppgStaff[] = [
  {
    id: "dm-staff-1",
    seq_no: 1,
    full_name: "Rini Kartika",
    nik: null,
    phone: null,
    email: null,
    role: "pengawas_gizi",
    role_label: "Ahli Gizi",
    bank_name: null,
    bank_account: null,
    start_date: null,
    end_date: null,
    active: true,
    gaji_pokok: 0,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "dm-staff-2",
    seq_no: 2,
    full_name: "Dewi Lestari",
    nik: null,
    phone: null,
    email: null,
    role: "jurutama_masak",
    role_label: "Juru Masak Utama",
    bank_name: null,
    bank_account: null,
    start_date: null,
    end_date: null,
    active: true,
    gaji_pokok: 0,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "dm-staff-3",
    seq_no: 3,
    full_name: "Agus Wibowo",
    nik: null,
    phone: null,
    email: null,
    role: "distribusi",
    role_label: "Petugas Distribusi",
    bank_name: null,
    bank_account: null,
    start_date: null,
    end_date: null,
    active: true,
    gaji_pokok: 0,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DUMMY_TESTS: OrganolepticTest[] = [
  {
    id: "dm-org-1",
    test_date: isoDaysAgo(0),
    test_phase: "before_dispatch",
    school_id: "dm-sch-1",
    menu_assign_date: isoDaysAgo(0),
    rasa: 4,
    warna: 5,
    aroma: 4,
    tekstur: 4,
    verdict: "aman",
    officer_id: "dm-staff-2",
    notes: null,
    created_at: new Date().toISOString(),
    created_by: null
  },
  {
    id: "dm-org-2",
    test_date: isoDaysAgo(0),
    test_phase: "on_arrival",
    school_id: "dm-sch-1",
    menu_assign_date: isoDaysAgo(0),
    rasa: 4,
    warna: 4,
    aroma: 4,
    tekstur: 4,
    verdict: "aman",
    officer_id: "dm-staff-3",
    notes: null,
    created_at: new Date().toISOString(),
    created_by: null
  },
  {
    id: "dm-org-3",
    test_date: isoDaysAgo(0),
    test_phase: "before_consumption",
    school_id: "dm-sch-2",
    menu_assign_date: isoDaysAgo(0),
    rasa: 5,
    warna: 4,
    aroma: 5,
    tekstur: 5,
    verdict: "aman",
    officer_id: "dm-staff-1",
    notes: null,
    created_at: new Date().toISOString(),
    created_by: null
  },
  {
    id: "dm-org-4",
    test_date: isoDaysAgo(1),
    test_phase: "before_dispatch",
    school_id: "dm-sch-3",
    menu_assign_date: isoDaysAgo(1),
    rasa: 3,
    warna: 3,
    aroma: 2,
    tekstur: 3,
    verdict: "tidak_aman",
    officer_id: "dm-staff-2",
    notes: "Aroma sayur tidak segar, diganti batch baru",
    created_at: new Date().toISOString(),
    created_by: null
  },
  {
    id: "dm-org-5",
    test_date: isoDaysAgo(1),
    test_phase: "on_arrival",
    school_id: "dm-sch-4",
    menu_assign_date: isoDaysAgo(1),
    rasa: 4,
    warna: 5,
    aroma: 4,
    tekstur: 4,
    verdict: "aman",
    officer_id: "dm-staff-3",
    notes: null,
    created_at: new Date().toISOString(),
    created_by: null
  },
  {
    id: "dm-org-6",
    test_date: isoDaysAgo(2),
    test_phase: "before_consumption",
    school_id: "dm-sch-1",
    menu_assign_date: isoDaysAgo(2),
    rasa: 4,
    warna: 4,
    aroma: 5,
    tekstur: 4,
    verdict: "aman",
    officer_id: "dm-staff-1",
    notes: null,
    created_at: new Date().toISOString(),
    created_by: null
  }
];

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

  const isPreview = tests.length === 0;
  const displayTests = isPreview ? DUMMY_TESTS : tests;
  const displayStaff = isPreview ? DUMMY_STAFF : staff;
  const displaySchools = isPreview ? DUMMY_SCHOOLS : schools;

  const staffLookup = Object.fromEntries(displayStaff.map((s) => [s.id, s]));
  const schoolLookup = Object.fromEntries(displaySchools.map((s) => [s.id, s]));

  // Phase counts
  const phaseCount: Record<OrganolepticPhase, number> = {
    before_dispatch: 0,
    on_arrival: 0,
    before_consumption: 0
  };
  displayTests.forEach((t) => {
    phaseCount[t.test_phase] += 1;
  });

  const phaseLabel = (p: OrganolepticPhase) =>
    lang === "EN" ? PHASE_LABEL_EN[p] : PHASE_LABEL_ID[p];

  return (
    <>
      <Section
        title={lang === "EN" ? "Phase Breakdown" : "Fase Pengujian"}
        hint={
          lang === "EN"
            ? "Organoleptic test results per phase: color, aroma, taste, and texture scores."
            : "Hasil uji organoleptik per fase: skor warna, aroma, rasa, dan tekstur."
        }
      >
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
        hint={
          lang === "EN"
            ? "Sensory QC test records (appearance, aroma, taste, texture) per cooking phase. Source for Lampiran 26."
            : "Catatan uji sensorik (rupa, aroma, rasa, tekstur) per tahap masak. Sumber Lampiran 26."
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
                    {lang === "EN" ? "Day, Date" : "Hari, Tanggal"}
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
                      <td className="px-2 py-2 text-[12px] font-semibold">
                        {formatDateLong(t.test_date, lang)}
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
