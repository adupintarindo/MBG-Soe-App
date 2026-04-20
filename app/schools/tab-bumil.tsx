import { Section } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { listBeneficiaryPregnant, listPosyandu } from "@/lib/bgn";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { BumilRosterTable, type BumilRosterRow } from "./tab-bumil-table";

interface Props {
  supabase: SupabaseClient<Database>;
  lang: Lang;
}

export async function TabBumil({ supabase, lang }: Props) {
  const [bumil, posyandu] = await Promise.all([
    listBeneficiaryPregnant(supabase).catch(() => []),
    listPosyandu(supabase).catch(() => [])
  ]);

  const posyMap = new Map(posyandu.map((p) => [p.id, p.name]));

  const rows: BumilRosterRow[] = bumil.map((b) => ({
    id: b.id,
    full_name: b.full_name,
    nik: b.nik,
    phase: b.phase,
    gestational_week: b.gestational_week,
    child_age_months: b.child_age_months,
    age: b.age,
    posyandu_name: b.posyandu_id ? (posyMap.get(b.posyandu_id) ?? null) : null,
    address: b.address,
    phone: b.phone,
    active: b.active
  }));

  const totals = {
    total: rows.filter((r) => r.active).length,
    hamil: rows.filter((r) => r.active && r.phase === "hamil").length,
    menyusui: rows.filter((r) => r.active && r.phase === "menyusui").length
  };

  return (
    <Section
      title={t("penerima.bumilTitle", lang)}
      hint={t("penerima.bumilHint", lang)}
    >
      <div className="mb-4 grid grid-cols-3 gap-3">
        <SummaryTile
          label={t("penerima.bumilTotal", lang)}
          value={totals.total}
          tone="pink"
        />
        <SummaryTile
          label={t("penerima.bumilHamil", lang)}
          value={totals.hamil}
          tone="sky"
        />
        <SummaryTile
          label={t("penerima.bumilMenyusui", lang)}
          value={totals.menyusui}
          tone="amber"
        />
      </div>
      <BumilRosterTable rows={rows} lang={lang} />
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
  tone: "pink" | "sky" | "amber";
}) {
  const toneCls = {
    pink: "ring-pink-200 bg-pink-50 text-pink-900",
    sky: "ring-sky-200 bg-sky-50 text-sky-900",
    amber: "ring-amber-200 bg-amber-50 text-amber-900"
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
