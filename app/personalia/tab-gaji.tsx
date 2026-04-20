import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import { formatIDR, formatDateShort, formatDateLong } from "@/lib/engine";
import {
  Badge,
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  Section
} from "@/components/ui";
import {
  listPayrollPeriod,
  listPayrollSlip,
  listSppgStaff,
  type PayrollPeriod,
  type PayrollSlip,
  type PayrollStatus,
  type SppgStaff
} from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

const STATUS_TONE: Record<PayrollStatus, "ok" | "warn" | "info"> = {
  draft: "info",
  finalized: "warn",
  paid: "ok"
};

export async function GajiTab({ supabase, lang, role }: Props) {
  const canWrite = role === "admin";

  let periods: PayrollPeriod[] = [];
  let slips: PayrollSlip[] = [];
  let staff: SppgStaff[] = [];
  try {
    [periods, staff] = await Promise.all([
      listPayrollPeriod(supabase, { limit: 12 }),
      listSppgStaff(supabase, { active: true })
    ]);
    const latest = periods[0];
    if (latest) {
      slips = await listPayrollSlip(supabase, {
        period_id: latest.id,
        limit: 200
      });
    }
  } catch {
    // migrasi 0050 belum di-apply
  }

  const latestPeriod = periods[0];
  const staffLookup = Object.fromEntries(staff.map((s) => [s.id, s]));

  const totalBruto = slips.reduce(
    (s, r) => s + Number(r.penerimaan_kotor ?? 0),
    0
  );
  const totalNetto = slips.reduce(
    (s, r) => s + Number(r.penerimaan_bersih ?? 0),
    0
  );
  const paidCount = slips.filter((s) => s.paid).length;

  return (
    <>
      <KpiGrid>
        <KpiTile
          icon="🗓️"
          label={lang === "EN" ? "Active Period" : "Periode Aktif"}
          value={latestPeriod?.period_label ?? "—"}
          size="md"
          sub={
            latestPeriod
              ? `${formatDateShort(latestPeriod.start_date)} → ${formatDateShort(latestPeriod.end_date)}`
              : lang === "EN"
                ? "No period yet"
                : "Belum ada periode"
          }
        />
        <KpiTile
          icon="🧾"
          label={lang === "EN" ? "Slips" : "Slip Gaji"}
          value={slips.length.toString()}
          size="md"
          sub={`${paidCount} ${lang === "EN" ? "paid" : "terbayar"}`}
        />
        <KpiTile
          icon="💰"
          label={lang === "EN" ? "Gross Total" : "Penerimaan Kotor"}
          value={formatIDR(totalBruto)}
          size="md"
          tone="info"
        />
        <KpiTile
          icon="💵"
          label={lang === "EN" ? "Net Total" : "Penerimaan Bersih"}
          value={formatIDR(totalNetto)}
          size="md"
          tone="ok"
        />
      </KpiGrid>

      <Section
        title={
          lang === "EN"
            ? "Payroll Periods (Lamp. 28)"
            : "Periode Gaji (Lamp. 28)"
        }
        hint={
          lang === "EN"
            ? "Draft/final/paid payroll periods. Create a period before generating slips."
            : "Periode gaji draft/final/paid. Buat periode dulu sebelum generate slip."
        }
        actions={
          canWrite ? (
            <LinkButton href="/personalia/gaji/new-period" variant="primary" size="sm">
              {lang === "EN" ? "+ New Period" : "+ Periode Baru"}
            </LinkButton>
          ) : null
        }
      >
        {periods.length === 0 ? (
          <EmptyState
            icon="🗓️"
            message={
              lang === "EN"
                ? "No payroll periods. Create one to generate slips."
                : "Belum ada periode gaji. Buat periode untuk mulai slip."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Period" : "Periode"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Range" : "Rentang"}
                  </th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Finalized" : "Finalisasi"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Paid at" : "Dibayar"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-ink/5 ${
                      p.id === latestPeriod?.id ? "bg-accent-strong/5" : ""
                    }`}
                  >
                    <td className="px-2 py-2 font-bold">{p.period_label}</td>
                    <td className="px-2 py-2 font-mono text-[12px] text-ink2/80">
                      {formatDateShort(p.start_date)} → {formatDateShort(p.end_date)}
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    </td>
                    <td className="px-2 py-2 text-[12px] text-ink2/70">
                      {p.finalized_at ? formatDateLong(p.finalized_at, lang) : "—"}
                    </td>
                    <td className="px-2 py-2 text-[12px] text-ink2/70">
                      {p.paid_at ? formatDateLong(p.paid_at, lang) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={
          latestPeriod
            ? lang === "EN"
              ? `Slips — ${latestPeriod.period_label}`
              : `Slip Gaji — ${latestPeriod.period_label}`
            : lang === "EN"
              ? "Slips"
              : "Slip Gaji"
        }
        hint={
          lang === "EN"
            ? "Per-staff payroll slips for the active period: base + overtime − deductions."
            : "Slip gaji per staf periode aktif: gaji pokok + lembur − potongan."
        }
        actions={
          canWrite && latestPeriod ? (
            <LinkButton
              href={`/personalia/gaji/generate?period=${latestPeriod.id}`}
              variant="primary"
              size="sm"
            >
              {lang === "EN" ? "Generate Slips" : "Generate Slip"}
            </LinkButton>
          ) : null
        }
      >
        {slips.length === 0 ? (
          <EmptyState
            icon="💵"
            message={
              latestPeriod
                ? lang === "EN"
                  ? "No slips yet. Click Generate Slips."
                  : "Belum ada slip. Klik Generate Slip."
                : lang === "EN"
                  ? "Create a period first."
                  : "Buat periode dulu."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Staff" : "Staff"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Base" : "Gaji Pokok"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Days" : "Hari"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Incentive" : "Insentif"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "OT" : "Lembur"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Deduct" : "Potongan"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Net" : "Bersih"}
                  </th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {slips.map((s) => {
                  const st = s.staff_id ? staffLookup[s.staff_id] : undefined;
                  const insentifTotal =
                    Number(s.insentif_kehadiran ?? 0) +
                    Number(s.insentif_kinerja ?? 0) +
                    Number(s.lain_lain ?? 0) +
                    Number(s.tunjangan ?? 0);
                  const potonganTotal =
                    Number(s.potongan_kehadiran ?? 0) +
                    Number(s.potongan_bpjs_kes ?? 0) +
                    Number(s.potongan_bpjs_tk ?? 0) +
                    Number(s.potongan_lain ?? 0);
                  return (
                    <tr key={s.id} className="border-b border-ink/5">
                      <td className="px-2 py-2">
                        <span className="font-bold">
                          {st?.full_name ?? "—"}
                        </span>
                        {st && (
                          <span className="ml-2 text-[11px] text-ink2/60">
                            #{st.seq_no ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatIDR(Number(s.gaji_pokok ?? 0))}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-ink2/80">
                        {s.hari_kerja}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-emerald-700">
                        {formatIDR(insentifTotal)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-amber-700">
                        {formatIDR(Number(s.total_lembur ?? 0))}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-red-700">
                        {formatIDR(potonganTotal)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-bold">
                        {formatIDR(Number(s.penerimaan_bersih ?? 0))}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={s.paid ? "ok" : "warn"}>
                          {s.paid
                            ? lang === "EN"
                              ? "Paid"
                              : "Terbayar"
                            : lang === "EN"
                              ? "Pending"
                              : "Pending"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/10 bg-paper/50 font-bold">
                  <td className="px-2 py-2" colSpan={6}>
                    Total
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatIDR(totalNetto)}
                  </td>
                  <td className="px-2 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      <p className="text-[11.5px] text-ink2/60">
        {lang === "EN"
          ? "Full payroll PDF generated via /api/bgn/generate?lampiran=28."
          : "Daftar gaji PDF lengkap dibuat via /api/bgn/generate?lampiran=28."}
      </p>
    </>
  );
}
