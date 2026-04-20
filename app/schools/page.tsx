import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { SchoolAttendancePanel } from "./attendance-panel";
import {
  SchoolsRosterTable,
  type SchoolRosterRow
} from "./schools-roster-table";
import { GenerateManifestButton } from "@/app/deliveries/generate-manifest";
import { toISODate } from "@/lib/engine";
import { t, formatNumber } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

function nextSevenDateISO(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arr: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    arr.push(`${y}-${m}-${day}`);
  }
  return arr;
}

const LEVEL_COLOR: Record<string, string> = {
  "PAUD/TK": "bg-pink-50 text-pink-900 ring-pink-200",
  SD: "bg-amber-50 text-amber-900 ring-amber-200",
  SMP: "bg-sky-50 text-sky-900 ring-sky-200",
  SMA: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  SMK: "bg-indigo-50 text-indigo-900 ring-indigo-200"
};

// Porsi weight: SD kelas1-3 = 0.7 (kecil), SD kelas4-6 = 1.0 (besar)
// PAUD = 0.7, SMP/SMA/SMK = 1.0, guru = 1.0
function porsiEff(s: {
  level: string;
  students: number;
  kelas13: number;
  kelas46: number;
  guru: number;
}): { kecil: number; besar: number; guru: number; total: number; eff: number } {
  let kecil = 0;
  let besar = 0;
  if (s.level === "PAUD/TK") {
    kecil = s.students;
  } else if (s.level === "SD") {
    kecil = s.kelas13;
    besar = s.kelas46 > 0 ? s.kelas46 : s.students - s.kelas13;
  } else {
    besar = s.students;
  }
  const guru = s.guru;
  const total = kecil + besar + guru;
  const eff = kecil * 0.7 + besar * 1.0 + guru * 1.0;
  return { kecil, besar, guru, total, eff: Math.round(eff * 10) / 10 };
}

export default async function SchoolsPage() {
  const supabase = createClient();
  const lang = getLang();

  const days = nextSevenDateISO();

  // Range untuk non_op_days: dari hari ini sampai 18 bulan ke depan.
  const todayISO = new Date().toISOString().slice(0, 10);
  const farFuture = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 18);
    return d.toISOString().slice(0, 10);
  })();

  const [profile, schoolsResult, attendanceResult, nonOpResult] = await Promise.all([
    getSessionProfile(),
    supabase
      .from("schools")
      .select(
        "id, name, level, students, kelas13, kelas46, guru, distance_km, pic, phone, address, active"
      )
      .order("id"),
    supabase
      .from("school_attendance")
      .select("school_id, att_date, qty")
      .gte("att_date", days[0])
      .lte("att_date", days[days.length - 1]),
    supabase
      .from("non_op_days")
      .select("op_date, reason")
      .gte("op_date", todayISO)
      .lte("op_date", farFuture)
      .order("op_date")
  ]);

  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const schools = schoolsResult.data ?? [];
  const attendance = attendanceResult.data ?? [];
  const nonOpDays = nonOpResult.data ?? [];
  const canEdit = profile.role === "admin" || profile.role === "operator";

  const totals = schools.reduce(
    (acc, s) => {
      const p = porsiEff(s);
      acc.students += Number(s.students);
      acc.guru += Number(s.guru);
      acc.kecil += p.kecil;
      acc.besar += p.besar;
      acc.eff += p.eff;
      acc.schools += s.active ? 1 : 0;
      return acc;
    },
    { schools: 0, students: 0, guru: 0, kecil: 0, besar: 0, eff: 0 }
  );

  const byLevel = new Map<string, { count: number; students: number }>();
  for (const s of schools) {
    const cur = byLevel.get(s.level) ?? { count: 0, students: 0 };
    cur.count += 1;
    cur.students += Number(s.students);
    byLevel.set(s.level, cur);
  }

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          actions={
            canEdit ? <GenerateManifestButton date={toISODate(new Date())} /> : null
          }
        />
        {/* Summary by level */}
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {["PAUD/TK", "SD", "SMP", "SMA", "SMK"].map((lvl) => {
            const d = byLevel.get(lvl) ?? { count: 0, students: 0 };
            return (
              <div
                key={lvl}
                className="rounded-2xl bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-cardlg"
              >
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${LEVEL_COLOR[lvl]}`}
                >
                  {lvl}
                </span>
                <div className="mt-2 text-2xl font-black text-ink">
                  {d.count}
                </div>
                <div className="text-[11px] font-semibold text-ink2/70">
                  {formatNumber(d.students, lang)} {t("schools.studentsSuffix", lang)}
                </div>
              </div>
            );
          })}
        </section>

        <SchoolAttendancePanel
          schools={schools
            .filter((s) => s.active)
            .map((s) => ({
              id: s.id,
              name: s.name,
              level: s.level,
              students: Number(s.students),
              kelas13: Number(s.kelas13 ?? 0),
              kelas46: Number(s.kelas46 ?? 0)
            }))}
          attendance={attendance.map((a) => ({
            school_id: a.school_id,
            att_date: a.att_date,
            qty: Number(a.qty)
          }))}
          nonOpDays={nonOpDays.map((r) => ({
            op_date: r.op_date,
            reason: r.reason
          }))}
          canEdit={canEdit}
        />

        <Section
          title={t("schools.rosterTitle", lang)}
          hint={t("schools.rosterHint", lang)}
        >
          <SchoolsRosterTable
            rows={schools.map<SchoolRosterRow>((s) => {
              const p = porsiEff(s);
              return {
                id: s.id,
                name: s.name,
                address: s.address,
                level: s.level,
                students: Number(s.students),
                kecil: p.kecil,
                besar: p.besar,
                guru: p.guru,
                eff: p.eff,
                distance_km: Number(s.distance_km ?? 0),
                pic: s.pic,
                phone: s.phone,
                active: !!s.active
              };
            })}
            totals={totals}
          />
          <p className="mt-4 text-[11px] text-ink2/70">
            {t("schools.footnote", lang)}
          </p>
        </Section>
      </PageContainer>
    </div>
  );
}
