import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { PageContainer, PageHeader } from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import { getLang } from "@/lib/i18n-server";
import { TimSppgTab } from "./tab-tim-sppg";
import { GajiTab } from "./tab-gaji";
import { InsentifTab } from "./tab-insentif";
import { AbsensiTab } from "./tab-absensi";

export const dynamic = "force-dynamic";

type PersonaliaTabId = "tim" | "gaji" | "insentif" | "absensi";

const VALID_TABS: readonly PersonaliaTabId[] = [
  "tim",
  "gaji",
  "insentif",
  "absensi"
];

interface SearchParams {
  tab?: string;
}

export default async function PersonaliaPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");
  if (
    profile.role !== "admin" &&
    profile.role !== "operator" &&
    profile.role !== "viewer"
  ) {
    redirect("/dashboard?err=forbidden");
  }

  const activeTab: PersonaliaTabId = VALID_TABS.includes(
    searchParams.tab as PersonaliaTabId
  )
    ? (searchParams.tab as PersonaliaTabId)
    : "tim";

  const tabs: PageTab[] = [
    {
      id: "tim",
      icon: "👥",
      label: lang === "EN" ? "SPPG Team" : "Tim SPPG",
      href: "/personalia?tab=tim"
    },
    {
      id: "gaji",
      icon: "💵",
      label: lang === "EN" ? "Payroll" : "Gaji Karyawan",
      href: "/personalia?tab=gaji"
    },
    {
      id: "insentif",
      icon: "🎁",
      label: lang === "EN" ? "Kader & PIC Incentives" : "Insentif Kader & PIC",
      href: "/personalia?tab=insentif"
    },
    {
      id: "absensi",
      icon: "📅",
      label: lang === "EN" ? "Attendance" : "Absensi",
      href: "/personalia?tab=absensi"
    }
  ];

  return (
    <div>
      <Nav email={profile.email} role={profile.role} fullName={profile.full_name} />

      <PageContainer>
        <PageHeader
          icon="👥"
          title={lang === "EN" ? "Personnel" : "Personalia"}
          subtitle={
            lang === "EN"
              ? "SPPG team, payroll, kader & PIC incentives, and attendance in one place."
              : "Tim SPPG, gaji karyawan, insentif kader & PIC, dan absensi dalam satu halaman."
          }
        />

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "tim" && (
          <TimSppgTab supabase={supabase} lang={lang} role={profile.role} />
        )}
        {activeTab === "gaji" && (
          <GajiTab supabase={supabase} lang={lang} role={profile.role} />
        )}
        {activeTab === "insentif" && (
          <InsentifTab supabase={supabase} lang={lang} role={profile.role} />
        )}
        {activeTab === "absensi" && (
          <AbsensiTab supabase={supabase} lang={lang} role={profile.role} />
        )}
      </PageContainer>
    </div>
  );
}
