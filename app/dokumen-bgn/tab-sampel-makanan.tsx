import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/lib/roles";
import type { Lang } from "@/lib/i18n";
import {
  Badge,
  LinkButton,
  Section
} from "@/components/ui";
import {
  listFoodSampleLog,
  listSppgStaff,
  type FoodSampleLog,
  type SppgStaff
} from "@/lib/bgn";
import { formatDateLong } from "@/lib/engine";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

export async function SampelMakananTab({ supabase, lang, role }: Props) {
  const canWrite = role === "admin" || role === "operator";

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 30);
  const fromIso = fromDate.toISOString().slice(0, 10);

  let logs: FoodSampleLog[] = [];
  let staff: SppgStaff[] = [];
  let schools: Array<{ id: string; name: string }> = [];
  try {
    [logs, staff] = await Promise.all([
      listFoodSampleLog(supabase, { from: fromIso, limit: 200 }),
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

  const staffLookup = Object.fromEntries(staff.map((s) => [s.id, s]));
  const schoolLookup = Object.fromEntries(schools.map((s) => [s.id, s]));

  return (
    <>
      <Section
        title={
          lang === "EN"
            ? "Food Sample Log (Lamp. 30a)"
            : "Log Sampel Makanan (Lamp. 30a)"
        }
        hint={
          lang === "EN"
            ? "Retained food samples (kept 24h) with seal status and signatures. Source for Lampiran 30a."
            : "Sampel makanan yang disimpan 24 jam beserta status segel dan tanda tangan. Sumber Lampiran 30a."
        }
        actions={
          <div className="flex items-center gap-2">
            {canWrite ? (
              <LinkButton
                href="/dokumen-bgn/sampel/new"
                variant="primary"
                size="sm"
              >
                {lang === "EN" ? "+ New Entry" : "+ Tambah Log"}
              </LinkButton>
            ) : null}
          </div>
        }
      >
        {(
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Delivery" : "Pengiriman"}
                  </th>
                  <th className="px-2 py-2">Seq</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "School" : "Sekolah"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Menu Date" : "Tgl Menu"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Officer" : "Petugas"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Sample Kept" : "Sampel"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Signature" : "Tanda Tangan"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const off = l.officer_id
                    ? staffLookup[l.officer_id]
                    : undefined;
                  const sch = l.school_id
                    ? schoolLookup[l.school_id]
                    : undefined;
                  return (
                    <tr key={l.id} className="border-b border-ink/5">
                      <td className="px-2 py-2 text-[12px] font-semibold">
                        {formatDateLong(l.delivery_date, lang)}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        #{l.delivery_seq}
                      </td>
                      <td className="px-2 py-2 font-bold">
                        {sch?.name ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-ink2/70">
                        {l.menu_assign_date ? formatDateLong(l.menu_assign_date, lang) : "—"}
                      </td>
                      <td className="px-2 py-2 text-[12px] text-ink2/80">
                        {off?.full_name ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={l.sample_kept ? "ok" : "bad"}>
                          {l.sample_kept
                            ? lang === "EN"
                              ? "Yes"
                              : "Ya"
                            : lang === "EN"
                              ? "No"
                              : "Tidak"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        {l.officer_signature_url ? (
                          <Badge tone="ok">✓</Badge>
                        ) : (
                          <Badge tone="warn">
                            {lang === "EN" ? "pending" : "belum"}
                          </Badge>
                        )}
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
          ? "Food sample log PDF generated via /api/bgn/generate?lampiran=30a."
          : "Log sampel makanan PDF dibuat via /api/bgn/generate?lampiran=30a."}
      </p>
    </>
  );
}
