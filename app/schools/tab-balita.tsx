import { Section } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { listBeneficiaryToddler, listPosyandu } from "@/lib/bgn";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { BalitaRosterTable, type BalitaRosterRow } from "./tab-balita-table";

interface Props {
  supabase: SupabaseClient<Database>;
  lang: Lang;
}

function ageMonths(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let m =
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) m -= 1;
  return m < 0 ? 0 : m;
}

export async function TabBalita({ supabase, lang }: Props) {
  const [balita, posyandu] = await Promise.all([
    listBeneficiaryToddler(supabase).catch(() => []),
    listPosyandu(supabase).catch(() => [])
  ]);

  const posyMap = new Map(posyandu.map((p) => [p.id, p.name]));

  const rows: BalitaRosterRow[] = balita.map((b) => ({
    id: b.id,
    full_name: b.full_name,
    nik: b.nik,
    dob: b.dob,
    age_months: ageMonths(b.dob),
    gender: b.gender,
    mother_name: b.mother_name,
    posyandu_name: b.posyandu_id ? (posyMap.get(b.posyandu_id) ?? null) : null,
    address: b.address,
    phone: b.phone,
    active: b.active
  }));

  const active = rows.filter((r) => r.active);
  const totals = {
    total: active.length,
    laki: active.filter((r) => r.gender === "L").length,
    perempuan: active.filter((r) => r.gender === "P").length,
    under2: active.filter((r) => r.age_months !== null && r.age_months < 24)
      .length
  };

  return (
    <Section
      title={t("penerima.balitaTitle", lang)}
      hint={t("penerima.balitaHint", lang)}
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile
          label={t("penerima.balitaTotal", lang)}
          value={totals.total}
          tone="amber"
        />
        <SummaryTile
          label={t("penerima.balitaLaki", lang)}
          value={totals.laki}
          tone="sky"
        />
        <SummaryTile
          label={t("penerima.balitaPerempuan", lang)}
          value={totals.perempuan}
          tone="pink"
        />
        <SummaryTile
          label={t("penerima.balitaUnder2", lang)}
          value={totals.under2}
          tone="emerald"
        />
      </div>
      <BalitaRosterTable rows={rows} lang={lang} />
    </Section>
  );
}

function SummaryTile({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "pink" | "sky" | "amber" | "emerald";
}) {
  const toneCls = {
    pink: "ring-pink-200 bg-pink-50 text-pink-900",
    sky: "ring-sky-200 bg-sky-50 text-sky-900",
    amber: "ring-amber-200 bg-amber-50 text-amber-900",
    emerald: "ring-emerald-200 bg-emerald-50 text-emerald-900"
  }[tone];
  return (
    <div
      className={`rounded-2xl p-4 shadow-card ring-1 transition hover:-translate-y-0.5 hover:shadow-cardlg ${toneCls}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
