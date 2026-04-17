import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { toISODate } from "@/lib/engine";
import { CalendarGrid } from "./calendar-grid";
import {
  Badge,
  LinkButton,
  PageContainer,
  PageHeader,
  Section,
  TableWrap,
  THead
} from "@/components/ui";

export const dynamic = "force-dynamic";

// Build 10-week matrix starting from current ISO week Monday
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

const WRITE_ROLES = new Set(["admin", "operator", "ahli_gizi"]);

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

interface MenuLite {
  id: number;
  name: string;
  name_en: string | null;
  cycle_day: number;
}
interface AssignRow {
  assign_date: string;
  menu_id: number;
  note: string | null;
}
interface NonOpRow {
  op_date: string;
  reason: string;
}
interface ItemLite {
  code: string;
  name_en: string | null;
  category: string;
  active: boolean;
}

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

  const [menusRes, assignRes, nonOpRes, itemsRes] = await Promise.all([
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
      .lte("op_date", end),
    supabase
      .from("items")
      .select("code, name_en, category, active")
      .eq("active", true)
      .order("code")
  ]);

  const menus = (menusRes.data ?? []) as MenuLite[];
  const assigns = (assignRes.data ?? []) as AssignRow[];
  const nonOps = (nonOpRes.data ?? []) as NonOpRow[];
  const items = (itemsRes.data ?? []) as ItemLite[];

  const menuById = new Map(menus.map((m) => [m.id, m]));
  const assignByDate = new Map(assigns.map((a) => [a.assign_date, a]));
  const nonOpByDate = new Map(nonOps.map((n) => [n.op_date, n]));

  const todayStr = toISODate(today);

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

      <PageContainer>
        <PageHeader
          icon="📅"
          title="Kalender Menu"
          subtitle={
            <>
              10 minggu ke depan · {opDays} hari operasional · {nonOpDays}{" "}
              non-op ·{" "}
              {unassigned > 0 ? (
                <span className="font-bold text-red-700">
                  {unassigned} belum di-assign
                </span>
              ) : (
                <span className="font-bold text-emerald-700">
                  semua assigned
                </span>
              )}
            </>
          }
          actions={
            <LinkButton href="/menu" variant="secondary" size="sm">
              🍽️ Lihat BOM
            </LinkButton>
          }
        />

        <Section
          title={`Legend · ${menus.length} Menu Siklus`}
          hint="Klik tanggal pada grid untuk assign/tandai non-op (khusus admin/operator/ahli gizi)."
        >
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
        </Section>

        <Section noPad className="overflow-hidden">
          <div className="p-4">
            <div className="mb-2 grid grid-cols-7 gap-1 text-[10px] font-bold uppercase tracking-wide text-ink2/70">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>
            <CalendarGrid
              matrix={matrix.map((week) => week.map((d) => toISODate(d)))}
              todayIso={todayStr}
              menus={menus}
              items={items}
              initialAssigns={assigns}
              initialNonOps={nonOps}
              canWrite={WRITE_ROLES.has(profile.role)}
            />
          </div>
        </Section>

        <Section title="14 Hari Ke Depan · Rencana Menu">
          <TableWrap>
            <table className="w-full text-sm">
              <THead>
                <th className="py-2 pr-3">Tanggal</th>
                <th className="py-2 pr-3">Hari</th>
                <th className="py-2 pr-3">Menu / Status</th>
                <th className="py-2 pr-3">Catatan</th>
              </THead>
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
                    <tr
                      key={iso}
                      className="row-hover border-b border-ink/5"
                    >
                      <td className="py-2 pr-3 font-mono text-xs">
                        {d.toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {d.toLocaleDateString("id-ID", { weekday: "long" })}
                      </td>
                      <td className="py-2 pr-3">
                        {isWknd ? (
                          <Badge tone="muted">Weekend</Badge>
                        ) : nonOp ? (
                          <Badge tone="warn">
                            🚫 Non-Op · {nonOp.reason}
                          </Badge>
                        ) : menu ? (
                          <span className="font-semibold text-ink">
                            <span className="font-mono text-[11px] text-ink2/70">
                              H{menu.cycle_day}
                            </span>{" "}
                            {menu.name}
                          </span>
                        ) : (
                          <Badge tone="bad">⚠ Belum di-assign</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-ink2/70">
                        {assign?.note || nonOp?.reason || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </Section>
      </PageContainer>
    </div>
  );
}
