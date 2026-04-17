import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

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

  const { data: schoolsData } = await supabase
    .from("schools")
    .select(
      "id, name, level, students, kelas13, kelas46, guru, distance_km, pic, phone, address, active"
    )
    .order("id");

  const schools = schoolsData ?? [];

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

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-ink">🏫 Sekolah Penerima</h1>
            <p className="text-sm text-ink2/80">
              {totals.schools} sekolah aktif · {totals.students.toLocaleString("id-ID")} siswa ·{" "}
              {totals.guru.toLocaleString("id-ID")} guru · porsi efektif{" "}
              {totals.eff.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Summary by level */}
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {["PAUD/TK", "SD", "SMP", "SMA", "SMK"].map((lvl) => {
            const d = byLevel.get(lvl) ?? { count: 0, students: 0 };
            return (
              <div key={lvl} className="rounded-2xl bg-white p-4 shadow-card">
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

        {/* Main table */}
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            Roster Sekolah · Breakdown Porsi
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                  <th className="py-2">ID</th>
                  <th className="py-2">Nama</th>
                  <th className="py-2">Jenjang</th>
                  <th className="py-2 text-right">Siswa</th>
                  <th className="py-2 text-right">Kecil (0.7)</th>
                  <th className="py-2 text-right">Besar (1.0)</th>
                  <th className="py-2 text-right">Guru</th>
                  <th className="py-2 text-right">Porsi Eff.</th>
                  <th className="py-2 text-right">Jarak (km)</th>
                  <th className="py-2">Kontak</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => {
                  const p = porsiEff(s);
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-ink/5 ${!s.active ? "opacity-50" : ""}`}
                    >
                      <td className="py-2 font-mono text-xs">{s.id}</td>
                      <td className="py-2">
                        <div className="font-semibold text-ink">{s.name}</div>
                        <div className="text-[10px] text-ink2/60">
                          {s.address}
                        </div>
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${LEVEL_COLOR[s.level] ?? LEVEL_COLOR["SD"]}`}
                        >
                          {s.level}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-xs">
                        {s.students.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-amber-700">
                        {p.kecil.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-emerald-700">
                        {p.besar.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 text-right font-mono text-xs">
                        {p.guru}
                      </td>
                      <td className="py-2 text-right font-mono text-xs font-black text-ink">
                        {p.eff.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 text-right font-mono text-xs">
                        {Number(s.distance_km ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2">
                        <div className="text-[11px]">{s.pic}</div>
                        <div className="text-[10px] font-mono text-ink2/60">
                          {s.phone}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/20 bg-paper">
                  <td colSpan={3} className="py-2 font-black text-ink">
                    TOTAL · {totals.schools} sekolah aktif
                  </td>
                  <td className="py-2 text-right font-mono text-xs font-black">
                    {totals.students.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 text-right font-mono text-xs font-black text-amber-700">
                    {totals.kecil.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 text-right font-mono text-xs font-black text-emerald-700">
                    {totals.besar.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 text-right font-mono text-xs font-black">
                    {totals.guru.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 text-right font-mono text-sm font-black text-ink">
                    {totals.eff.toLocaleString("id-ID")}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-4 text-[11px] text-ink2/70">
            <b>Porsi Efektif</b> = (Kecil × 0.7) + (Besar × 1.0) + (Guru × 1.0).
            Kecil mencakup PAUD/TK dan SD kelas 1–3. Besar mencakup SD kelas 4–6,
            SMP, SMA, SMK.
          </p>
        </section>
      </main>
    </div>
  );
}
