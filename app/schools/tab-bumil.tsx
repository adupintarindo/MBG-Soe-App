import { Section } from "@/components/ui";
import { t, formatNumber } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { listBeneficiaryPregnant, listPosyandu } from "@/lib/bgn";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { BumilRosterTable, type BumilRosterRow } from "./tab-bumil-table";
import { DUMMY_BUMIL_ROWS } from "@/lib/dummy-beneficiaries";

interface Props {
  supabase: SupabaseClient<Database>;
  lang: Lang;
}

function avgOf(nums: (number | null | undefined)[]): number | null {
  const xs = nums.filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export async function TabBumil({ supabase, lang }: Props) {
  const [bumil, posyandu] = await Promise.all([
    listBeneficiaryPregnant(supabase).catch(() => []),
    listPosyandu(supabase).catch(() => [])
  ]);

  const posyMap = new Map(posyandu.map((p) => [p.id, p.name]));

  const mapped: BumilRosterRow[] = bumil.map((b) => ({
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

  // Dummy fallback hanya di dev — prod harus pakai data asli dari DB.
  const rows: BumilRosterRow[] =
    mapped.length > 0 || process.env.NODE_ENV === "production"
      ? mapped
      : DUMMY_BUMIL_ROWS;

  const active = rows.filter((r) => r.active);
  const hamilRows = active.filter((r) => r.phase === "hamil");
  const menyusuiRows = active.filter((r) => r.phase === "menyusui");

  const totals = {
    total: active.length,
    hamil: hamilRows.length,
    menyusui: menyusuiRows.length
  };

  const posyandu_n = new Set(
    active.map((r) => r.posyandu_name).filter((x): x is string => !!x)
  ).size;

  const avgUsiaAll = avgOf(active.map((r) => r.age));
  const avgMinggu = avgOf(hamilRows.map((r) => r.gestational_week));
  const avgUsiaHamil = avgOf(hamilRows.map((r) => r.age));
  const avgAnakBln = avgOf(menyusuiRows.map((r) => r.child_age_months));
  const avgUsiaMenyusui = avgOf(menyusuiRows.map((r) => r.age));

  return (
    <Section
      title={t("penerima.bumilTitle", lang)}
      hint={t("penerima.bumilHint", lang)}
    >
      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard
          label={t("penerima.bumilTotal", lang)}
          value={totals.total}
          tone="rose"
          leftIcon={<IconPregnant />}
          leftText={`${formatNumber(totals.hamil, lang)} ${lang === "EN" ? "pregnant" : "hamil"}`}
          rightIcon={<IconNursing />}
          rightText={`${formatNumber(totals.menyusui, lang)} ${lang === "EN" ? "nursing" : "menyusui"}`}
          subtitle={
            posyandu_n > 0
              ? `${posyandu_n} ${lang === "EN" ? "posyandu" : "posyandu"}`
              : null
          }
        />
        <SummaryCard
          label={t("penerima.bumilHamil", lang)}
          value={totals.hamil}
          tone="sky"
          leftIcon={<IconUser />}
          leftText={
            avgUsiaHamil !== null
              ? `${formatNumber(Math.round(avgUsiaHamil), lang)} ${lang === "EN" ? "yr avg" : "thn rata²"}`
              : "—"
          }
          rightIcon={<IconCalendar />}
          rightText={
            avgMinggu !== null
              ? `${formatNumber(Math.round(avgMinggu), lang)} ${lang === "EN" ? "wk avg" : "mgg rata²"}`
              : "—"
          }
        />
        <SummaryCard
          label={t("penerima.bumilMenyusui", lang)}
          value={totals.menyusui}
          tone="amber"
          leftIcon={<IconUser />}
          leftText={
            avgUsiaMenyusui !== null
              ? `${formatNumber(Math.round(avgUsiaMenyusui), lang)} ${lang === "EN" ? "yr avg" : "thn rata²"}`
              : "—"
          }
          rightIcon={<IconBaby />}
          rightText={
            avgAnakBln !== null
              ? `${formatNumber(Math.round(avgAnakBln), lang)} ${lang === "EN" ? "mo child" : "bln anak"}`
              : "—"
          }
        />
      </section>
      <div className="mb-2 text-[10px] font-mono text-ink2/60">
        {avgUsiaAll !== null
          ? `${lang === "EN" ? "Mean maternal age" : "Rata² usia ibu"}: ${formatNumber(Math.round(avgUsiaAll), lang)} ${lang === "EN" ? "yr" : "thn"}`
          : ""}
      </div>
      <BumilRosterTable rows={rows} lang={lang} />
    </Section>
  );
}

type Tone = "rose" | "sky" | "amber";

const TONE_HEADER: Record<Tone, string> = {
  rose: "bg-gradient-to-r from-rose-900 to-rose-800",
  sky: "bg-gradient-to-r from-sky-900 to-blue-800",
  amber: "bg-gradient-to-r from-amber-900 to-orange-800"
};

function SummaryCard({
  label,
  value,
  tone,
  leftIcon,
  leftText,
  rightIcon,
  rightText,
  subtitle
}: {
  label: string;
  value: number;
  tone: Tone;
  leftIcon: React.ReactNode;
  leftText: string;
  rightIcon: React.ReactNode;
  rightText: string;
  subtitle?: string | null;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-cardlg">
      <div
        className={`px-4 py-2.5 text-center font-display text-[12px] font-bold uppercase tracking-crisp text-white ${TONE_HEADER[tone]}`}
      >
        {label}
      </div>
      <div className="px-4 py-4 text-center">
        <div className="font-display text-[2rem] font-extrabold leading-none tabular-nums text-ink">
          {value}
        </div>
        {subtitle && (
          <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink2/60">
            {subtitle}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-ink/5 border-t border-ink/5 bg-paper/40">
        <div className="flex items-center justify-center gap-1.5 px-2 py-2">
          <span className="h-4 w-4 text-ink2/70">{leftIcon}</span>
          <span className="font-display text-[12px] font-extrabold leading-none tabular-nums text-ink">
            {leftText}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 px-2 py-2">
          <span className="h-4 w-4 text-ink2/70">{rightIcon}</span>
          <span className="font-display text-[12px] font-extrabold leading-none tabular-nums text-ink">
            {rightText}
          </span>
        </div>
      </div>
    </div>
  );
}

function IconPregnant() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M13 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-1 3c-1.5 0-2.7.8-3.4 2L7 11c-.3.6 0 1.3.6 1.5.6.3 1.3 0 1.5-.6l.4-.9V22h2v-6h1v6h2V12c1.7 0 3-1.3 3-3v-.5c0-1.9-1.6-3.5-3.5-3.5H12z" />
    </svg>
  );
}

function IconNursing() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm3 6H5a2 2 0 0 0-2 2v5h2v7h5v-7h2v-5a2 2 0 0 0-2-2zm8 3c-1.1 0-2 .9-2 2v4h4v-4c0-1.1-.9-2-2-2zm0-1a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </svg>
  );
}

function IconBaby() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M12 4a4 4 0 0 0-4 4c0 2.2 1.8 4 4 4s4-1.8 4-4-1.8-4-4-4zm-1 6.5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm2 0a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zM9.5 12c-2 0-3.5 1.5-3.5 3.5V20h12v-4.5c0-2-1.5-3.5-3.5-3.5a5 5 0 0 1-5 0z" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.4 0-8 1.8-8 4v2h16v-2c0-2.2-3.6-4-8-4z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 6v12H5V8h14z" />
    </svg>
  );
}
