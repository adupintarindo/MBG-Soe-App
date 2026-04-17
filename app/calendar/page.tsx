import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { toISODate } from "@/lib/engine";

export const dynamic = "force-dynamic";

// Build 8-week matrix starting from current ISO week Monday
function buildMatrix(anchor: Date, weeks = 10): Date[][] {
  const monday = new Date(anchor);
  const dow = monday.getDay(); // 0 Sun .. 6 Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + offset);
  monday.setHours(0, 0, 0, 0);

  const rows: Date[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + w * 7 + d);
      week.push(date);
    }
    rows.push(week);
  }
  return rows;
}

const MENU_HUE = [
  "bg-sky-100 text-sky-900",
  "bg-emerald-100 text-emerald-900",
  "bg-amber-100 text-amber-900",
  "bg-rose-100 text-rose-900",
  "bg-indigo-100 text-indigo-900",
  "bg-teal-100 text-teal-900",
  "bg-orange-100 text-orange-900",
  "bg-violet-100 text-violet-900",
  "bg-lime-100 text-lime-900",
  "bg-pink-100 text-pink-900",
  "bg-cyan-100 text-cyan-900",
  "bg-fuchsia-100 text-fuchsia-900",
  "bg-yellow-100 text-yellow-900",
  "bg-green-100 text-green-900"
];

export default async function CalendarPage() {
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

  const today = new Date();
  const matrix = buildMatrix(today, 10);
  const start = toISODate(matrix[0][0]);
  const end = toISODate(matrix[matrix.length - 1][6]);

  const [menusRes, assignRes, nonOpRes] = await Promise.all([
    supabase
      .from("menus")
      .select("id, name, name_en, cycle_day")
      .order("id"),
    supabase
      .from("menu_assign")
      .select("assign_date, menu_id, note")
      .gte("assign_date", start)
      .lte("assign_date", end),
    supabase
      .from("non_op_days")
      .select("op_date, reason")
      .gte("op_date", start)
      .lte("op_date", end)
  ]);

  const menus = menusRes.data ?? [];
  const assigns = assignRes.data ?? [];
  const nonOps = nonOpRes.data ?? [];

  const menuById = new Map(menus.map((m) => [m.id, m]));
  const assignByDate = new Map(assigns.map((a) => [a.assign_date, a]));
  const nonOpByDate = new Map(nonOps.map((n) => [n.op_date, n]));

  const todayStr = toISODate(today);

  // Stats for current range
  let opDays = 0;
  let nonOpDays = 0;
  let unassigned = 0;
  for (const week of matrix) {
    for (const d of week) {
      const iso = toISODate(d);
      const isWknd = d.getDay() === 0 || d.getDay() === 6;
      if (isWknd) continue;
      if (nonOpByDate.has(iso)) {
        nonOpDays++;
      } else {
        opDays++;
        if (!assignByDate.has(iso)) unassigned++;
      }
    }
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
            <h1 className="text-xl font-black text-ink">📅 Kalender Menu</h1>
            <p className="text-sm text-ink2/80">
              10 minggu ke depan · {opDays} hari operasional · {nonOpDays}{" "}
              non-op · {unassigned > 0 ? `${unassigned} belum di-assign` : "semua assigned"}
            </p>
          </div>
          <a
            href="/menu"
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-ink shadow-card hover:bg-paper"
          >
            🍽️ Lihat BOM →
          </a>
        </div>

        {/* Menu legend */}
        <section className="mb-4 rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink2">
            Legend · {menus.length} Menu Siklus
          </div>
          <div className="flex flex-wrap gap-2">
            {menus.map((m, i) => (
              <span
                key={m.id}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${MENU_HUE[i % MENU_HUE.length]}`}
              >
                <span className="font-mono opacity-60">H{m.cycle_day}</span>{" "}
                {m.name}
              </span>
            ))}
          </div>
        </section>

        {/* Calendar grid */}
        <section className="rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-2 grid grid-cols-7 gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2/70">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {matrix.flat().map((d) => {
              const iso = toISODate(d);
              const isWknd = d.getDay() === 0 || d.getDay() === 6;
              const isToday = iso === todayStr;
              const assign = assignByDate.get(iso);
              const nonOp = nonOpByDate.get(iso);
              const menu = assign ? menuById.get(assign.menu_id) : null;
              const menuIndex = menu ? menus.findIndex((m) => m.id === menu.id) : -1;
              const day = d.getDate();
              const month = d.toLocaleDateString("id-ID", { month: "short" });

              return (
                <div
                  key={iso}
                  className={`min-h-[74px] rounded-lg border p-1.5 text-[10px] ${
                    isWknd
                      ? "border-ink/5 bg-paper/60 opacity-60"
                      : nonOp
                        ? "border-amber-300 bg-amber-50"
                        : menu
                          ? `border-transparent ${MENU_HUE[menuIndex % MENU_HUE.length]}`
                          : "border-ink/10 bg-white"
                  } ${isToday ? "ring-2 ring-accent" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-black ${isToday ? "text-accent" : ""}`}
                    >
                      {day}
                    </span>
                    {d.getDate() === 1 && (
                      <span className="text-[9px] font-bold uppercase opacity-70">
                        {month}
                      </span>
                    )}
                  </div>
                  {nonOp ? (
                    <div className="mt-1 line-clamp-2 font-semibold text-amber-800">
                      🚫 {nonOp.reason}
                    </div>
                  ) : menu ? (
                    <div className="mt-1">
                      <div className="font-mono text-[9px] opacity-70">
                        H{menu.cycle_day}
                      </div>
                      <div className="line-clamp-2 font-semibold">
                        {menu.name}
                      </div>
                    </div>
                  ) : !isWknd ? (
                    <div className="mt-1 text-ink2/40">—</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Upcoming list */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
            14 Hari Ke Depan · Rencana Menu
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wide text-ink2">
                  <th className="py-2">Tanggal</th>
                  <th className="py-2">Hari</th>
                  <th className="py-2">Menu / Status</th>
                  <th className="py-2">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 14 }).map((_, i) => {
                  const d = new Date(today);
                  d.setDate(today.getDate() + i);
                  const iso = toISODate(d);
                  const isWknd = d.getDay() === 0 || d.getDay() === 6;
                  const assign = assignByDate.get(iso);
                  const nonOp = nonOpByDate.get(iso);
                  const menu = assign ? menuById.get(assign.menu_id) : null;
                  return (
                    <tr key={iso} className="border-b border-ink/5">
                      <td className="py-2 font-mono text-xs">
                        {d.toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="py-2 text-xs">
                        {d.toLocaleDateString("id-ID", { weekday: "long" })}
                      </td>
                      <td className="py-2">
                        {isWknd ? (
                          <span className="text-ink2/50">Weekend</span>
                        ) : nonOp ? (
                          <span className="font-semibold text-amber-700">
                            🚫 Non-Op · {nonOp.reason}
                          </span>
                        ) : menu ? (
                          <span className="font-semibold">
                            H{menu.cycle_day} — {menu.name}
                          </span>
                        ) : (
                          <span className="font-semibold text-red-700">
                            ⚠ Belum di-assign
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-ink2/70">
                        {assign?.note || nonOp?.reason || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
