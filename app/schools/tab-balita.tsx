import { Section } from "@/components/ui";
import { t, formatNumber } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { listBeneficiaryToddler, listPosyandu } from "@/lib/bgn";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { BalitaRosterTable, type BalitaRosterRow } from "./tab-balita-table";
import { DUMMY_BALITA_ROWS } from "@/lib/dummy-beneficiaries";

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

function avgOf(nums: (number | null | undefined)[]): number | null {
  const xs = nums.filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export async function TabBalita({ supabase, lang }: Props) {
  const [balita, posyandu] = await Promise.all([
    listBeneficiaryToddler(supabase).catch(() => []),
    listPosyandu(supabase).catch(() => [])
  ]);

  const posyMap = new Map(posyandu.map((p) => [p.id, p.name]));

  const mapped: BalitaRosterRow[] = balita.map((b) => ({
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

  // Dummy fallback hanya di dev — prod harus pakai data asli dari DB.
  const rows: BalitaRosterRow[] =
    mapped.length > 0 || process.env.NODE_ENV === "production"
      ? mapped
      : DUMMY_BALITA_ROWS;

  const active = rows.filter((r) => r.active);
  const laki = active.filter((r) => r.gender === "L");
  const perempuan = active.filter((r) => r.gender === "P");

  const totals = {
    total: active.length,
    laki: laki.length,
    perempuan: perempuan.length
  };

  const posyandu_n = new Set(
    active.map((r) => r.posyandu_name).filter((x): x is string => !!x)
  ).size;

  const avgAllBln = avgOf(active.map((r) => r.age_months));
  const under2All = active.filter(
    (r) => r.age_months !== null && r.age_months < 24
  ).length;

  const avgLakiBln = avgOf(laki.map((r) => r.age_months));
  const under2Laki = laki.filter(
    (r) => r.age_months !== null && r.age_months < 24
  ).length;

  const avgPerempuanBln = avgOf(perempuan.map((r) => r.age_months));
  const under2Perempuan = perempuan.filter(
    (r) => r.age_months !== null && r.age_months < 24
  ).length;

  const lang2yr = lang === "EN" ? "< 2 yr" : "< 2 thn";

  return (
    <Section
      title={t("penerima.balitaTitle", lang)}
      hint={t("penerima.balitaHint", lang)}
    >
      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard
          label={t("penerima.balitaTotal", lang)}
          value={totals.total}
          tone="rose"
          leftIcon={<IconMale />}
          leftText={`${formatNumber(totals.laki, lang)} ${lang === "EN" ? "male" : "laki-laki"}`}
          rightIcon={<IconFemale />}
          rightText={`${formatNumber(totals.perempuan, lang)} ${lang === "EN" ? "female" : "perempuan"}`}
          subtitle={
            posyandu_n > 0
              ? `${posyandu_n} ${lang === "EN" ? "posyandu" : "posyandu"}`
              : null
          }
        />
        <SummaryCard
          label={t("penerima.balitaLaki", lang)}
          value={totals.laki}
          tone="sky"
          leftIcon={<IconCalendar />}
          leftText={
            avgLakiBln !== null
              ? `${formatNumber(Math.round(avgLakiBln), lang)} ${lang === "EN" ? "mo avg" : "bln rata²"}`
              : "—"
          }
          rightIcon={<IconBaby />}
          rightText={`${formatNumber(under2Laki, lang)} ${lang2yr}`}
        />
        <SummaryCard
          label={t("penerima.balitaPerempuan", lang)}
          value={totals.perempuan}
          tone="amber"
          leftIcon={<IconCalendar />}
          leftText={
            avgPerempuanBln !== null
              ? `${formatNumber(Math.round(avgPerempuanBln), lang)} ${lang === "EN" ? "mo avg" : "bln rata²"}`
              : "—"
          }
          rightIcon={<IconBaby />}
          rightText={`${formatNumber(under2Perempuan, lang)} ${lang2yr}`}
        />
      </section>
      <div className="mb-2 text-[10px] font-mono text-ink2/60">
        {avgAllBln !== null
          ? `${lang === "EN" ? "Mean age" : "Rata² usia"}: ${formatNumber(Math.round(avgAllBln), lang)} ${lang === "EN" ? "mo" : "bln"} · ${formatNumber(under2All, lang)} ${lang2yr}`
          : ""}
      </div>
      <BalitaRosterTable rows={rows} lang={lang} />
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

function IconMale() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M14 4v2h3.6l-4.1 4.1A6 6 0 1 0 15 12.5L19 8.5V12h2V4h-7zm-2 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
    </svg>
  );
}

function IconFemale() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M12 2a6 6 0 0 0-1 11.9V16H9v2h2v3h2v-3h2v-2h-2v-2.1A6 6 0 0 0 12 2zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
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

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 6v12H5V8h14z" />
    </svg>
  );
}
