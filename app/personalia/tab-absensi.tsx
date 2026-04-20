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
  listPayrollAttendance,
  listPayrollPeriod,
  listSppgStaff,
  type AttendanceStatus,
  type PayrollAttendance,
  type PayrollPeriod,
  type SppgStaff
} from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

const STATUS_TONE: Record<
  AttendanceStatus,
  "ok" | "warn" | "bad" | "info"
> = {
  H: "ok",
  S: "warn",
  I: "info",
  A: "bad",
  OFF: "info"
};

const STATUS_LABEL_ID: Record<AttendanceStatus, string> = {
  H: "Hadir",
  S: "Sakit",
  I: "Izin",
  A: "Alpa",
  OFF: "Off"
};

const STATUS_LABEL_EN: Record<AttendanceStatus, string> = {
  H: "Present",
  S: "Sick",
  I: "Leave",
  A: "Absent",
  OFF: "Off"
};

export async function AbsensiTab({ supabase, lang, role }: Props) {
  const canWrite = role === "admin" || role === "operator";

  let periods: PayrollPeriod[] = [];
  let staff: SppgStaff[] = [];
  let attendance: PayrollAttendance[] = [];

  try {
    [periods, staff] = await Promise.all([
      listPayrollPeriod(supabase, { limit: 6 }),
      listSppgStaff(supabase, { active: true })
    ]);
    const latest = periods[0];
    if (latest) {
      attendance = await listPayrollAttendance(supabase, {
        period_id: latest.id,
        limit: 2000
      });
    }
  } catch {
    // migrasi belum di-apply
  }

  const latestPeriod = periods[0];

  // Aggregate per staff
  interface Summary {
    staff_id: string;
    H: number;
    S: number;
    I: number;
    A: number;
    OFF: number;
    lembur: number;
  }
  const perStaff: Record<string, Summary> = {};
  for (const s of staff) {
    perStaff[s.id] = {
      staff_id: s.id,
      H: 0,
      S: 0,
      I: 0,
      A: 0,
      OFF: 0,
      lembur: 0
    };
  }
  for (const a of attendance) {
    if (!a.staff_id || !perStaff[a.staff_id]) continue;
    perStaff[a.staff_id][a.status] += 1;
    perStaff[a.staff_id].lembur += Number(a.lembur_hours ?? 0);
  }

  const totalHadir = attendance.filter((a) => a.status === "H").length;
  const totalAlpa = attendance.filter((a) => a.status === "A").length;
  const totalSakit = attendance.filter((a) => a.status === "S").length;
  const totalLembur = attendance.reduce(
    (s, r) => s + Number(r.lembur_hours ?? 0),
    0
  );

  const statusLabel = (s: AttendanceStatus) =>
    lang === "EN" ? STATUS_LABEL_EN[s] : STATUS_LABEL_ID[s];

  return (
    <>
      <KpiGrid>
        <KpiTile
          icon="📅"
          label={lang === "EN" ? "Active Period" : "Periode Aktif"}
          value={latestPeriod?.period_label ?? "—"}
          size="md"
          sub={
            latestPeriod
              ? `${latestPeriod.start_date} → ${latestPeriod.end_date}`
              : lang === "EN"
                ? "No period"
                : "Belum ada"
          }
        />
        <KpiTile
          icon="✅"
          label={lang === "EN" ? "Present Days" : "Hari Hadir"}
          value={totalHadir.toString()}
          size="md"
          tone="ok"
          sub={`${staff.length} ${lang === "EN" ? "staff" : "staff"}`}
        />
        <KpiTile
          icon="❌"
          label={lang === "EN" ? "Absent + Sick" : "Alpa + Sakit"}
          value={(totalAlpa + totalSakit).toString()}
          size="md"
          tone={totalAlpa > 0 ? "bad" : "warn"}
          sub={`A:${totalAlpa} · S:${totalSakit}`}
        />
        <KpiTile
          icon="⏰"
          label={lang === "EN" ? "Overtime (h)" : "Total Lembur (jam)"}
          value={totalLembur.toFixed(1)}
          size="md"
          tone="info"
        />
      </KpiGrid>

      <Section
        title={
          lang === "EN"
            ? `Attendance Summary — ${latestPeriod?.period_label ?? "—"}`
            : `Rekap Absensi — ${latestPeriod?.period_label ?? "—"}`
        }
        actions={
          canWrite && latestPeriod ? (
            <LinkButton
              href={`/personalia/absensi/input?period=${latestPeriod.id}`}
              variant="primary"
              size="sm"
            >
              {lang === "EN" ? "Input Attendance" : "Input Absensi"}
            </LinkButton>
          ) : null
        }
      >
        {staff.length === 0 ? (
          <EmptyState
            icon="📅"
            message={
              lang === "EN"
                ? "No staff seeded. Apply seed 0050."
                : "Staff belum di-seed. Jalankan seed 0050."
            }
          />
        ) : !latestPeriod ? (
          <EmptyState
            icon="🗓️"
            message={
              lang === "EN"
                ? "No payroll period. Create one first."
                : "Belum ada periode gaji. Buat dulu di tab Gaji."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Staff" : "Staff"}
                  </th>
                  <th className="px-2 py-2 text-right text-emerald-700">H</th>
                  <th className="px-2 py-2 text-right text-amber-700">S</th>
                  <th className="px-2 py-2 text-right text-sky-700">I</th>
                  <th className="px-2 py-2 text-right text-red-700">A</th>
                  <th className="px-2 py-2 text-right text-ink2/60">OFF</th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "OT (h)" : "Lembur (j)"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const sum = perStaff[s.id];
                  const hasRecord =
                    sum &&
                    (sum.H + sum.S + sum.I + sum.A + sum.OFF > 0 ||
                      sum.lembur > 0);
                  return (
                    <tr key={s.id} className="border-b border-ink/5">
                      <td className="px-2 py-2 font-mono text-[12px] text-ink2/60">
                        {s.seq_no ?? "—"}
                      </td>
                      <td className="px-2 py-2 font-bold">{s.full_name}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-emerald-700">
                        {hasRecord ? sum.H : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-amber-700">
                        {hasRecord ? sum.S : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-sky-700">
                        {hasRecord ? sum.I : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-red-700">
                        {hasRecord ? sum.A : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-ink2/60">
                        {hasRecord ? sum.OFF : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {hasRecord ? sum.lembur.toFixed(1) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={lang === "EN" ? "Legend" : "Keterangan"}>
        <div className="flex flex-wrap gap-2">
          {(["H", "S", "I", "A", "OFF"] as AttendanceStatus[]).map((s) => (
            <Badge key={s} tone={STATUS_TONE[s]}>
              {s} · {statusLabel(s)}
            </Badge>
          ))}
        </div>
      </Section>

      <p className="text-[11.5px] text-ink2/60">
        {lang === "EN"
          ? "Daily attendance log PDF generated via /api/bgn/generate?lampiran=28c."
          : "Log absensi harian PDF dibuat via /api/bgn/generate?lampiran=28c."}
      </p>
    </>
  );
}
