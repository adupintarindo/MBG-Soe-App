import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import { formatIDR } from "@/lib/engine";
import {
  Badge,
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  Section
} from "@/components/ui";
import {
  listSppgStaff,
  sppgRoleLabel,
  type SppgStaff,
  type SppgRole
} from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

const ROLE_TONE: Record<SppgRole, "ok" | "warn" | "bad" | "info" | "accent"> = {
  kepala_sppg: "accent",
  pengawas_gizi: "info",
  pengawas_keuangan: "info",
  jurutama_masak: "warn",
  asisten_lapangan: "warn",
  persiapan_makanan: "ok",
  pemrosesan_makanan: "ok",
  pengemasan: "ok",
  pemorsian: "ok",
  distribusi: "ok",
  pencucian_alat: "ok",
  pencucian: "ok",
  sanitasi: "ok",
  kader_posyandu: "accent"
};

export async function TimSppgTab({ supabase, lang, role }: Props) {
  const canWrite = role === "admin";

  let staff: SppgStaff[] = [];
  try {
    staff = await listSppgStaff(supabase, { active: true });
  } catch {
    // migrasi 0050 belum di-apply
  }

  const totalStaff = staff.length;
  const totalPayroll = staff.reduce(
    (s, r) => s + Number(r.gaji_pokok ?? 0),
    0
  );

  // roll-up by role
  const roleCount: Record<string, number> = {};
  staff.forEach((s) => {
    roleCount[s.role] = (roleCount[s.role] ?? 0) + 1;
  });

  const coreRoles: SppgRole[] = [
    "kepala_sppg",
    "pengawas_gizi",
    "pengawas_keuangan",
    "jurutama_masak",
    "asisten_lapangan"
  ];
  const coreStaffCount = staff.filter((s) =>
    coreRoles.includes(s.role)
  ).length;
  const relawanCount = totalStaff - coreStaffCount;

  return (
    <>
      <KpiGrid>
        <KpiTile
          icon="👥"
          label={lang === "EN" ? "Total Staff (active)" : "Total Staff Aktif"}
          value={totalStaff.toString()}
          size="md"
          tone="info"
        />
        <KpiTile
          icon="🎖️"
          label={lang === "EN" ? "Core Team" : "Tim Inti"}
          value={coreStaffCount.toString()}
          size="md"
          sub={lang === "EN" ? "Lead + Supervisors + Cook" : "Kepala + Pengawas + Juru Masak"}
        />
        <KpiTile
          icon="🤝"
          label={lang === "EN" ? "Volunteers" : "Relawan Rakyat"}
          value={relawanCount.toString()}
          size="md"
        />
        <KpiTile
          icon="💰"
          label={lang === "EN" ? "Payroll / mo" : "Total Gaji Pokok/bln"}
          value={formatIDR(totalPayroll)}
          size="md"
          tone="warn"
        />
      </KpiGrid>

      <Section
        title={
          lang === "EN" ? "SPPG Team Roster (Lamp. 27)" : "Daftar Tim SPPG (Lamp. 27)"
        }
        hint={
          lang === "EN"
            ? "Active SPPG personnel with NIK, contact, bank account, and base salary. Source for Lampiran 27."
            : "Staf SPPG aktif beserta NIK, kontak, rekening, dan gaji pokok. Sumber Lampiran 27."
        }
        actions={
          canWrite ? (
            <LinkButton href="/personalia/tim/new" variant="primary" size="sm">
              {lang === "EN" ? "+ Add Staff" : "+ Tambah Staff"}
            </LinkButton>
          ) : null
        }
      >
        {staff.length === 0 ? (
          <EmptyState
            icon="👥"
            message={
              lang === "EN"
                ? "No SPPG staff seeded. Apply seed 0050_sppg_staff_and_coa.sql."
                : "Tim SPPG belum di-seed. Jalankan seed 0050_sppg_staff_and_coa.sql."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Full Name" : "Nama Lengkap"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Role" : "Posisi"}
                  </th>
                  <th className="px-2 py-2">NIK</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Phone" : "No. HP"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Bank Account" : "Rekening"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Base Salary" : "Gaji Pokok"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-b border-ink/5">
                    <td className="px-2 py-2 font-mono text-[12px] text-ink2/60">
                      {s.seq_no ?? "—"}
                    </td>
                    <td className="px-2 py-2 font-bold">{s.full_name}</td>
                    <td className="px-2 py-2">
                      <Badge tone={ROLE_TONE[s.role]}>
                        {sppgRoleLabel(s.role, lang)}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] text-ink2/70">
                      {s.nik ?? "—"}
                    </td>
                    <td className="px-2 py-2 font-mono text-[12px] text-ink2/80">
                      {s.phone ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-[12px] text-ink2/80">
                      {s.bank_name ? (
                        <>
                          <span className="font-bold">{s.bank_name}</span>
                          <span className="ml-1 font-mono text-ink2/60">
                            {s.bank_account ?? ""}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatIDR(Number(s.gaji_pokok ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/10 bg-paper/50 font-bold">
                  <td className="px-2 py-2" colSpan={6}>
                    {lang === "EN" ? "Total monthly payroll" : "Total Gaji Pokok/bulan"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatIDR(totalPayroll)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={lang === "EN" ? "Role Breakdown" : "Sebaran Posisi"}
        hint={
          lang === "EN"
            ? "Headcount distribution by role across the SPPG team."
            : "Distribusi jumlah staf per posisi di tim SPPG."
        }
      >
        {Object.keys(roleCount).length === 0 ? (
          <EmptyState
            message={lang === "EN" ? "No data." : "Belum ada data."}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(roleCount) as SppgRole[])
              .sort((a, b) => (roleCount[b] ?? 0) - (roleCount[a] ?? 0))
              .map((r) => (
                <Badge key={r} tone={ROLE_TONE[r] ?? "info"}>
                  {sppgRoleLabel(r, lang)} · {roleCount[r]}
                </Badge>
              ))}
          </div>
        )}
      </Section>
    </>
  );
}
