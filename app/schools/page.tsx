import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";
import { SchoolAttendancePanel } from "./attendance-panel";

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

  const days = nextSevenDateISO();

  const [profile, schoolsResult, attendanceResult] = await Promise.all([
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
      .lte("att_date", days[days.length - 1])
  ]);

  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const schools = schoolsResult.data ?? [];
  const attendance = attendanceResult.data ?? [];
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
          icon="🏫"
          title="Sekolah Penerima"
          subtitle={
            <>
              {totals.schools} sekolah aktif ·{" "}
              {totals.students.toLocaleString("id-ID")} siswa ·{" "}
              {totals.guru.toLocaleString("id-ID")} guru · porsi efektif{" "}
              <b className="text-ink">{totals.eff.toLocaleString("id-ID")}</b>
            </>
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
                  {d.students.toLocaleString("id-ID")} siswa
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
          canEdit={canEdit}
        />

        <Section
          title="Roster Sekolah · Breakdown Porsi"
          hint="Porsi efektif menentukan volume BOM harian — Kecil (0.7) untuk PAUD/TK + SD kelas 1–3, Besar (1.0) untuk SD kelas 4–6 ke atas."
        >
          <TableWrap>
            <table className="w-full text-sm">
              <THead>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Jenjang</th>
                <th className="py-2 pr-3 text-right">Siswa</th>
                <th className="py-2 pr-3 text-right">Kecil (0.7)</th>
                <th className="py-2 pr-3 text-right">Besar (1.0)</th>
                <th className="py-2 pr-3 text-right">Guru</th>
                <th className="py-2 pr-3 text-right">Porsi Eff.</th>
                <th className="py-2 pr-3 text-right">Jarak (km)</th>
                <th className="py-2 pr-3">Kontak</th>
              </THead>
              <tbody>
                {schools.map((s) => {
                  const p = porsiEff(s);
                  return (
                    <tr
                      key={s.id}
                      className={`row-hover border-b border-ink/5 ${!s.active ? "opacity-50" : ""}`}
                    >
                      <td className="py-2 pr-3 font-mono text-xs">{s.id}</td>
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-ink">{s.name}</div>
                        <div className="text-[10px] text-ink2/60">
                          {s.address}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${LEVEL_COLOR[s.level] ?? LEVEL_COLOR["SD"]}`}
                        >
                          {s.level}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {s.students.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-amber-700">
                        {p.kecil.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-emerald-700">
                        {p.besar.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {p.guru}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs font-black text-ink">
                        {p.eff.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {Number(s.distance_km ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="text-[11px]">{s.pic}</div>
                        <div className="font-mono text-[10px] text-ink2/60">
                          {s.phone}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/20 bg-paper">
                  <td colSpan={3} className="py-2 pr-3 font-black text-ink">
                    TOTAL · {totals.schools} sekolah aktif
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                    {totals.students.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs font-black text-amber-700">
                    {totals.kecil.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs font-black text-emerald-700">
                    {totals.besar.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                    {totals.guru.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-sm font-black text-ink">
                    {totals.eff.toLocaleString("id-ID")}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </TableWrap>
          <p className="mt-4 text-[11px] text-ink2/70">
            <b>Porsi Efektif</b> = (Kecil × 0.7) + (Besar × 1.0) + (Guru × 1.0).
            Kecil mencakup PAUD/TK dan SD kelas 1–3. Besar mencakup SD kelas
            4–6, SMP, SMA, SMK.
          </p>
        </Section>
      </PageContainer>
    </div>
  );
}
