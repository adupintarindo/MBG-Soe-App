import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  PageContainer,
  Section
} from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import { SchoolAttendancePanel } from "./attendance-panel";
import {
  SchoolsRosterTable,
  type SchoolRosterRow
} from "./schools-roster-table";
import { TabBumil } from "./tab-bumil";
import { TabBalita } from "./tab-balita";
import { GenerateManifestButton } from "@/app/deliveries/generate-manifest";
import { t, formatNumber } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type PenerimaTabId = "sekolah" | "bumil" | "balita";

const VALID_TABS: readonly PenerimaTabId[] = ["sekolah", "bumil", "balita"];

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

const LEVEL_HEADER: Record<string, string> = {
  "PAUD/TK": "bg-gradient-to-r from-rose-900 to-rose-800",
  SD: "bg-gradient-to-r from-amber-900 to-orange-800",
  SMP: "bg-gradient-to-r from-sky-900 to-blue-800",
  SMA: "bg-gradient-to-r from-emerald-900 to-emerald-800",
  SMK: "bg-gradient-to-r from-indigo-900 to-indigo-800"
};

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

interface SearchParams {
  tab?: string;
}

export default async function SchoolsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const activeTab: PenerimaTabId = VALID_TABS.includes(
    searchParams.tab as PenerimaTabId
  )
    ? (searchParams.tab as PenerimaTabId)
    : "sekolah";

  const tabs: PageTab[] = [
    {
      id: "sekolah",
      icon: "🏫",
      label: t("penerima.tabSekolah", lang),
      href: "/schools?tab=sekolah"
    },
    {
      id: "bumil",
      icon: "🤰",
      label: t("penerima.tabBumil", lang),
      href: "/schools?tab=bumil"
    },
    {
      id: "balita",
      icon: "🍼",
      label: t("penerima.tabBalita", lang),
      href: "/schools?tab=balita"
    }
  ];

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        {(profile.role === "admin" || profile.role === "operator") && (
          <GenerateManifestButton variant="toolbar" />
        )}

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "sekolah" && (
          <SekolahTab supabase={supabase} lang={lang} role={profile.role} />
        )}
        {activeTab === "bumil" && (
          <TabBumil supabase={supabase} lang={lang} />
        )}
        {activeTab === "balita" && (
          <TabBalita supabase={supabase} lang={lang} />
        )}
      </PageContainer>
    </div>
  );
}

async function SekolahTab({
  supabase,
  lang,
  role
}: {
  supabase: ReturnType<typeof createClient>;
  lang: ReturnType<typeof getLang>;
  role: string;
}) {
  const days = nextSevenDateISO();
  const todayISO = new Date().toISOString().slice(0, 10);
  const attendancePastStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const attendanceFutureEnd = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  })();
  const farFuture = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 18);
    return d.toISOString().slice(0, 10);
  })();

  const [schoolsResult, attendanceResult, nonOpResult] = await Promise.all([
    supabase
      .from("schools")
      .select(
        "id, name, level, students, kelas13, kelas46, guru, distance_km, pic, phone, address, active"
      )
      .order("id"),
    supabase
      .from("school_attendance")
      .select("school_id, att_date, qty")
      .gte("att_date", attendancePastStart)
      .lte("att_date", attendanceFutureEnd),
    supabase
      .from("non_op_days")
      .select("op_date, reason")
      .gte("op_date", todayISO)
      .lte("op_date", farFuture)
      .order("op_date")
  ]);

  const schools = schoolsResult.data ?? [];
  const attendance = attendanceResult.data ?? [];
  const nonOpDays = nonOpResult.data ?? [];
  const canEdit = role === "admin" || role === "operator";

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

  // ---- today's operational status + attendance → byLevel tiles ----
  const todayDate = new Date(todayISO + "T00:00:00");
  const todayDow = todayDate.getDay();
  const todayIsWeekend = todayDow === 0 || todayDow === 6;
  const todayNonOpRow = nonOpDays.find((r) => r.op_date === todayISO);
  const todayIsOp = !todayIsWeekend && !todayNonOpRow;

  const qtyToday = new Map<string, number>();
  for (const r of attendance) {
    if (r.att_date === todayISO) {
      qtyToday.set(r.school_id, Number(r.qty ?? 0));
    }
  }

  const byLevel = new Map<
    string,
    { count: number; students: number; guru: number }
  >();
  if (todayIsOp) {
    for (const s of schools) {
      if (!s.active) continue;
      // Use recorded attendance if present (including saved 0), else fall back to roster capacity.
      const saved = qtyToday.get(s.id);
      const qty = saved != null ? saved : Number(s.students);
      if (qty <= 0) continue;
      const cur =
        byLevel.get(s.level) ?? { count: 0, students: 0, guru: 0 };
      cur.count += 1;
      cur.students += qty;
      cur.guru += Number(s.guru ?? 0);
      byLevel.set(s.level, cur);
    }
  }

  return (
    <>
      <section className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        {["PAUD/TK", "SD", "SMP", "SMA", "SMK"].map((lvl) => {
          const d = byLevel.get(lvl) ?? { count: 0, students: 0, guru: 0 };
          const hasData = todayIsOp && d.count > 0;
          return (
            <div
              key={lvl}
              className="group overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-cardlg"
            >
              <div
                className={`px-4 py-2.5 text-center font-display text-[12px] font-bold tracking-crisp text-white ${LEVEL_HEADER[lvl]}`}
              >
                {lvl}
              </div>
              <div className="px-4 py-4 text-center">
                <div
                  className={`font-display text-[2rem] font-extrabold leading-none tabular-nums ${
                    hasData ? "text-ink" : "text-ink2/40"
                  }`}
                >
                  {hasData ? d.count : "—"}
                </div>
                {!todayIsOp && (
                  <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink2/60">
                    {t("schools.tileNonOp", lang)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 divide-x divide-ink/5 border-t border-ink/5 bg-paper/40">
                <div className="flex items-center justify-center gap-1.5 px-2 py-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-label={lang === "EN" ? "Students" : "Siswa"}
                    role="img"
                    className={`h-4 w-4 ${hasData ? "text-ink2/70" : "text-ink2/30"}`}
                  >
                    <path d="M12 3 1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                  </svg>
                  <span
                    className={`font-display text-[14px] font-extrabold leading-none tabular-nums ${
                      hasData ? "text-ink" : "text-ink2/40"
                    }`}
                  >
                    {hasData ? formatNumber(d.students, lang) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1.5 px-2 py-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-label={lang === "EN" ? "Teachers" : "Guru"}
                    role="img"
                    className={`h-4 w-4 ${hasData ? "text-ink2/70" : "text-ink2/30"}`}
                  >
                    <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 10c-4.41 0-8 1.79-8 4v4h16v-4c0-2.21-3.59-4-8-4zm7-1.5v2l2-.67V16h1v-5l-3-1.5z" />
                  </svg>
                  <span
                    className={`font-display text-[14px] font-extrabold leading-none tabular-nums ${
                      hasData ? "text-ink" : "text-ink2/40"
                    }`}
                  >
                    {hasData ? formatNumber(d.guru, lang) : "—"}
                  </span>
                </div>
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
            kelas46: Number(s.kelas46 ?? 0),
            guru: Number(s.guru ?? 0)
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

      <Section title={t("schools.rosterTitle", lang)}>
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
          attendance={attendance.map((a) => ({
            school_id: a.school_id,
            att_date: a.att_date,
            qty: Number(a.qty)
          }))}
          defaultDate={days[0]}
        />
      </Section>
    </>
  );
}
