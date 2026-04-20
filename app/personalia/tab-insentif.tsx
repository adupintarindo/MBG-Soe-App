import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import { formatIDR } from "@/lib/engine";
import {
  Badge,
  EmptyState,
  LinkButton,
  Section
} from "@/components/ui";
import {
  listKaderIncentive,
  listPicIncentive,
  listPosyandu,
  listPicSchool,
  listSppgStaff,
  type KaderIncentive,
  type PicIncentive,
  type Posyandu,
  type PicSchool,
  type SppgStaff
} from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

export async function InsentifTab({ supabase, lang, role }: Props) {
  const canWrite = role === "admin" || role === "operator";

  let kader: KaderIncentive[] = [];
  let pic: PicIncentive[] = [];
  let posyanduList: Posyandu[] = [];
  let picSchoolList: PicSchool[] = [];
  let staffList: SppgStaff[] = [];
  let schools: Array<{ id: string; name: string }> = [];

  try {
    [kader, pic, posyanduList, picSchoolList, staffList] = await Promise.all([
      listKaderIncentive(supabase, { limit: 50 }),
      listPicIncentive(supabase, { limit: 50 }),
      listPosyandu(supabase),
      listPicSchool(supabase, { active: true }),
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

  const posyanduLookup = Object.fromEntries(posyanduList.map((p) => [p.id, p]));
  const picSchoolLookup = Object.fromEntries(
    picSchoolList.map((p) => [p.id, p])
  );
  const staffLookup = Object.fromEntries(staffList.map((s) => [s.id, s]));
  const schoolLookup = Object.fromEntries(schools.map((s) => [s.id, s]));

  const totalKader = kader.reduce(
    (s, r) => s + Number(r.total_amount ?? 0),
    0
  );
  const totalPic = pic.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
  const totalPorsiKader = kader.reduce(
    (s, r) => s + r.porsi_senin + r.porsi_kamis,
    0
  );
  const totalPorsiPic = pic.reduce((s, r) => s + r.total_porsi, 0);

  return (
    <>
      <Section
        title={
          lang === "EN"
            ? "Kader Incentives (Lamp. 29a)"
            : "Insentif Kader (Lamp. 29a) · Senin + Kamis"
        }
        hint={
          lang === "EN"
            ? "Posyandu kader incentives for Monday & Thursday service days. Source for Lampiran 29a."
            : "Insentif kader posyandu hari Senin & Kamis. Sumber Lampiran 29a."
        }
        actions={
          canWrite ? (
            <LinkButton
              href="/personalia/insentif/kader/new"
              variant="primary"
              size="sm"
            >
              {lang === "EN" ? "+ New Period" : "+ Periode Baru"}
            </LinkButton>
          ) : null
        }
      >
        {kader.length === 0 ? (
          <EmptyState
            icon="🎁"
            message={
              lang === "EN"
                ? "No kader incentive records."
                : "Belum ada insentif kader."
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
                  <th className="px-2 py-2">Posyandu</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Kader" : "Kader"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Mon Portions" : "Porsi Senin"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Thu Portions" : "Porsi Kamis"}
                  </th>
                  <th className="px-2 py-2 text-right">Unit</th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Total" : "Jumlah"}
                  </th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {kader.map((r) => {
                  const py = r.posyandu_id
                    ? posyanduLookup[r.posyandu_id]
                    : undefined;
                  const kaderStaff = r.kader_staff_id
                    ? staffLookup[r.kader_staff_id]
                    : undefined;
                  return (
                    <tr key={r.id} className="border-b border-ink/5">
                      <td className="px-2 py-2 font-mono text-[12px]">
                        {r.period_start} → {r.period_end}
                      </td>
                      <td className="px-2 py-2">
                        {py ? (
                          <>
                            <span className="font-bold">{py.name}</span>
                            {py.village && (
                              <span className="ml-1 text-[11px] text-ink2/60">
                                {py.village}
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {kaderStaff?.full_name ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {r.porsi_senin.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {r.porsi_kamis.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-ink2/70">
                        {formatIDR(Number(r.unit_cost ?? 0))}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-bold">
                        {formatIDR(Number(r.total_amount ?? 0))}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={r.paid ? "ok" : "warn"}>
                          {r.paid
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
            </table>
          </div>
        )}
      </Section>

      <Section
        title={
          lang === "EN"
            ? "School PIC Incentives (Lamp. 29b)"
            : "Insentif PIC Sekolah (Lamp. 29b)"
        }
        hint={
          lang === "EN"
            ? "Per-school PIC incentive ledger. Source for Lampiran 29b."
            : "Daftar insentif PIC sekolah per lokasi. Sumber Lampiran 29b."
        }
        actions={
          canWrite ? (
            <LinkButton
              href="/personalia/insentif/pic/new"
              variant="primary"
              size="sm"
            >
              {lang === "EN" ? "+ New Period" : "+ Periode Baru"}
            </LinkButton>
          ) : null
        }
      >
        {pic.length === 0 ? (
          <EmptyState
            icon="🏫"
            message={
              lang === "EN"
                ? "No PIC incentive records."
                : "Belum ada insentif PIC."
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
                    {lang === "EN" ? "School" : "Sekolah"}
                  </th>
                  <th className="px-2 py-2">PIC</th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Portions" : "Total Porsi"}
                  </th>
                  <th className="px-2 py-2 text-right">Unit</th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Total" : "Jumlah"}
                  </th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pic.map((r) => {
                  const ps = r.pic_school_id
                    ? picSchoolLookup[r.pic_school_id]
                    : undefined;
                  const sch = ps?.school_id
                    ? schoolLookup[ps.school_id]
                    : undefined;
                  const picStaff = ps?.pic_staff_id
                    ? staffLookup[ps.pic_staff_id]
                    : undefined;
                  return (
                    <tr key={r.id} className="border-b border-ink/5">
                      <td className="px-2 py-2 font-mono text-[12px]">
                        {r.period_start} → {r.period_end}
                      </td>
                      <td className="px-2 py-2 font-bold">
                        {sch?.name ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        {picStaff?.full_name ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {r.total_porsi.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-ink2/70">
                        {formatIDR(Number(r.unit_cost ?? 0))}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-bold">
                        {formatIDR(Number(r.total_amount ?? 0))}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={r.paid ? "ok" : "warn"}>
                          {r.paid
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
            </table>
          </div>
        )}
      </Section>

      <p className="text-[11.5px] text-ink2/60">
        {lang === "EN"
          ? "Kader/PIC incentive PDFs generated via /api/bgn/generate?lampiran=29a|29b."
          : "Insentif Kader/PIC PDF lengkap dibuat via /api/bgn/generate?lampiran=29a|29b."}
      </p>
    </>
  );
}
