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
  listBgnGenerationLog,
  type BgnGenerationLog
} from "@/lib/bgn";

type Client = SupabaseClient<Database>;

interface Props {
  supabase: Client;
  lang: Lang;
  role: UserRole;
}

interface LampiranDef {
  code: string;
  title_id: string;
  title_en: string;
  description_id: string;
  description_en: string;
  category: "qc" | "finance" | "hr" | "distribution";
  formats: Array<"pdf" | "xlsx" | "docx">;
}

const LAMPIRAN_LIST: LampiranDef[] = [
  {
    code: "20",
    title_id: "Tanda Terima Bantuan MBG",
    title_en: "MBG Delivery Receipt",
    description_id: "Tanda terima serah-terima makanan ke sekolah.",
    description_en: "Delivery receipt signed by school PIC.",
    category: "distribution",
    formats: ["pdf"]
  },
  {
    code: "26",
    title_id: "Uji Organoleptik",
    title_en: "Organoleptic Test",
    description_id: "Form uji rasa/warna/aroma/tekstur per fase kirim.",
    description_en: "Taste/color/aroma/texture test per dispatch phase.",
    category: "qc",
    formats: ["pdf", "xlsx"]
  },
  {
    code: "27",
    title_id: "Daftar Tim SPPG",
    title_en: "SPPG Team Roster",
    description_id: "Daftar staff SPPG dengan NIK + rekening.",
    description_en: "SPPG staff roster with NIK + bank accounts.",
    category: "hr",
    formats: ["pdf", "xlsx"]
  },
  {
    code: "28",
    title_id: "Slip Gaji",
    title_en: "Payroll Slips",
    description_id: "Slip gaji lengkap per periode.",
    description_en: "Complete payroll slips per period.",
    category: "hr",
    formats: ["pdf", "xlsx"]
  },
  {
    code: "28c",
    title_id: "Log Absensi Harian",
    title_en: "Daily Attendance Log",
    description_id: "Absensi harian per staff.",
    description_en: "Daily attendance per staff.",
    category: "hr",
    formats: ["pdf", "xlsx"]
  },
  {
    code: "29a",
    title_id: "Insentif Kader Posyandu",
    title_en: "Posyandu Cadre Incentive",
    description_id: "Insentif kader per porsi Senin + Kamis.",
    description_en: "Cadre incentive per Monday + Thursday portions.",
    category: "hr",
    formats: ["pdf", "xlsx"]
  },
  {
    code: "29b",
    title_id: "Insentif PIC Sekolah",
    title_en: "School PIC Incentive",
    description_id: "Insentif PIC sekolah per porsi.",
    description_en: "School PIC incentive per portion.",
    category: "hr",
    formats: ["pdf", "xlsx"]
  },
  {
    code: "30a",
    title_id: "Log Sampel Makanan",
    title_en: "Food Sample Log",
    description_id: "Catatan retensi sampel per pengiriman.",
    description_en: "Sample retention log per delivery.",
    category: "qc",
    formats: ["pdf", "xlsx"]
  },
  {
    code: "30b",
    title_id: "Kas Harian",
    title_en: "Daily Cash Log",
    description_id: "Pemasukan + pengeluaran kas harian.",
    description_en: "Daily cash inflow + outflow.",
    category: "finance",
    formats: ["pdf", "xlsx"]
  },
  {
    code: "30e",
    title_id: "Buku Besar + Neraca",
    title_en: "General Ledger + Trial Balance",
    description_id: "GL entries + trial balance bulanan.",
    description_en: "GL entries + monthly trial balance.",
    category: "finance",
    formats: ["pdf", "xlsx"]
  },
  {
    code: "30f",
    title_id: "Kas Kecil (Petty Cash)",
    title_en: "Petty Cash",
    description_id: "Transaksi kas kecil + saldo berjalan.",
    description_en: "Petty cash transactions + running balance.",
    category: "finance",
    formats: ["pdf", "xlsx"]
  }
];

const CATEGORY_LABEL: Record<
  LampiranDef["category"],
  {
    id: string;
    en: string;
    tone: "info" | "ok" | "warn" | "accent";
    hintId: string;
    hintEn: string;
  }
> = {
  qc: {
    id: "Pengendalian Mutu",
    en: "Quality Control",
    tone: "warn",
    hintId: "Lampiran terkait QC pangan: uji organoleptik, sampel, segel.",
    hintEn: "QC-related attachments: organoleptic tests, samples, seals."
  },
  finance: {
    id: "Keuangan",
    en: "Finance",
    tone: "info",
    hintId: "Lampiran keuangan: kas harian, jurnal, kas kecil, buku besar.",
    hintEn: "Finance attachments: cashbook, journals, petty cash, ledger."
  },
  hr: {
    id: "SDM",
    en: "Human Resources",
    tone: "accent",
    hintId: "Lampiran SDM: daftar tim, absensi, gaji, insentif.",
    hintEn: "HR attachments: team roster, attendance, payroll, incentives."
  },
  distribution: {
    id: "Distribusi",
    en: "Distribution",
    tone: "ok",
    hintId: "Lampiran distribusi: manifest pengiriman, serah-terima sekolah.",
    hintEn: "Distribution attachments: delivery manifest, school hand-over."
  }
};

export async function GeneratorLampiranTab({ supabase, lang, role }: Props) {
  const canGenerate = role === "admin" || role === "operator";

  let recentLogs: BgnGenerationLog[] = [];
  try {
    recentLogs = await listBgnGenerationLog(supabase, { limit: 20 });
  } catch {
    // migrasi belum di-apply
  }

  // Group by category
  const byCategory: Record<LampiranDef["category"], LampiranDef[]> = {
    qc: [],
    finance: [],
    hr: [],
    distribution: []
  };
  LAMPIRAN_LIST.forEach((l) => {
    byCategory[l.category].push(l);
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayGen = recentLogs.filter(
    (l) => l.generated_at.slice(0, 10) === todayIso
  ).length;
  const uniqueLampiran = new Set(recentLogs.map((l) => l.lampiran_code)).size;

  return (
    <>
      <KpiGrid>
        <KpiTile
          icon="📄"
          label={lang === "EN" ? "Total Forms" : "Jumlah Lampiran"}
          value={LAMPIRAN_LIST.length.toString()}
          size="md"
          tone="info"
          sub={lang === "EN" ? "SK Ka BGN 401.1/2025" : "SK Ka BGN 401.1/2025"}
        />
        <KpiTile
          icon="⬇️"
          label={lang === "EN" ? "Generated Today" : "Dibuat Hari Ini"}
          value={todayGen.toString()}
          size="md"
          tone="ok"
        />
        <KpiTile
          icon="📦"
          label={lang === "EN" ? "Recent Files" : "File Terbaru"}
          value={recentLogs.length.toString()}
          size="md"
          sub={`${uniqueLampiran} ${lang === "EN" ? "unique forms" : "lampiran unik"}`}
        />
        <KpiTile
          icon="🔐"
          label={lang === "EN" ? "Your Role" : "Role Anda"}
          value={role.toUpperCase()}
          size="md"
          tone={canGenerate ? "ok" : "warn"}
          sub={
            canGenerate
              ? lang === "EN"
                ? "Can generate"
                : "Bisa generate"
              : lang === "EN"
                ? "Read-only"
                : "Hanya baca"
          }
        />
      </KpiGrid>

      {(Object.keys(byCategory) as LampiranDef["category"][]).map((cat) => {
        const list = byCategory[cat];
        if (list.length === 0) return null;
        const meta = CATEGORY_LABEL[cat];
        return (
          <Section
            key={cat}
            title={`${lang === "EN" ? meta.en : meta.id} · ${list.length}`}
            hint={lang === "EN" ? meta.hintEn : meta.hintId}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {list.map((l) => (
                <div
                  key={l.code}
                  className="rounded-xl bg-paper p-4 ring-1 ring-ink/5"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge tone={meta.tone}>Lamp. {l.code}</Badge>
                    <div className="flex gap-1">
                      {l.formats.map((fmt) => (
                        <span
                          key={fmt}
                          className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink2/70"
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h4 className="mb-1 text-[14px] font-bold text-ink">
                    {lang === "EN" ? l.title_en : l.title_id}
                  </h4>
                  <p className="mb-3 text-[12px] text-ink2/70">
                    {lang === "EN" ? l.description_en : l.description_id}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {l.formats.map((fmt) => (
                      <LinkButton
                        key={fmt}
                        href={`/api/bgn/generate?lampiran=${l.code}&format=${fmt}`}
                        variant={fmt === "pdf" ? "primary" : "secondary"}
                        size="sm"
                      >
                        {lang === "EN"
                          ? `Generate ${fmt.toUpperCase()}`
                          : `Buat ${fmt.toUpperCase()}`}
                      </LinkButton>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        );
      })}

      <Section
        title={
          lang === "EN"
            ? "Generation History (last 20)"
            : "Riwayat Generate (20 terakhir)"
        }
        hint={
          lang === "EN"
            ? "Audit trail of lampiran files generated — who ran it, when, and which format."
            : "Audit trail file lampiran yang dibuat — siapa, kapan, format apa."
        }
      >
        {recentLogs.length === 0 ? (
          <EmptyState
            icon="📜"
            message={
              lang === "EN"
                ? "No generation history yet. Click any Generate button above."
                : "Belum ada riwayat. Klik tombol Generate di atas."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b-2 border-ink/10 font-display text-[11px] uppercase tracking-wide text-ink2/70">
                <tr>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Generated" : "Dibuat"}
                  </th>
                  <th className="px-2 py-2">Lampiran</th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Format" : "Format"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Period" : "Periode"}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {lang === "EN" ? "Size" : "Ukuran"}
                  </th>
                  <th className="px-2 py-2">
                    {lang === "EN" ? "Action" : "Aksi"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((l) => (
                  <tr key={l.id} className="border-b border-ink/5">
                    <td className="px-2 py-2 font-mono text-[12px]">
                      {new Date(l.generated_at).toLocaleString(
                        lang === "EN" ? "en-US" : "id-ID"
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone="info">Lamp. {l.lampiran_code}</Badge>
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] uppercase">
                      {l.format}
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] text-ink2/80">
                      {l.period_start && l.period_end
                        ? `${l.period_start} → ${l.period_end}`
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-ink2/70">
                      {l.file_size_bytes
                        ? `${(l.file_size_bytes / 1024).toFixed(1)} KB`
                        : "—"}
                    </td>
                    <td className="px-2 py-2">
                      {l.file_url ? (
                        <LinkButton
                          href={l.file_url}
                          variant="secondary"
                          size="sm"
                        >
                          {lang === "EN" ? "Download" : "Unduh"}
                        </LinkButton>
                      ) : (
                        <span className="text-ink2/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="text-[11.5px] text-ink2/60">
        {lang === "EN"
          ? "Compliance: all forms follow SK Ka BGN 401.1/2025 layout. Generated files are logged to bgn_generation_log."
          : "Kepatuhan: semua lampiran mengikuti SK Ka BGN 401.1/2025. File yang dibuat dicatat di bgn_generation_log."}
      </p>
    </>
  );
}
