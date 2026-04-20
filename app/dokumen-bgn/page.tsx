import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { PageContainer, PageHeader } from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import { getLang } from "@/lib/i18n-server";
import { SampelMakananTab } from "./tab-sampel-makanan";
import { OrganoleptikTab } from "./tab-organoleptik";
import { GeneratorLampiranTab } from "./tab-generator-lampiran";

export const dynamic = "force-dynamic";

type DokumenBgnTabId = "sampel" | "organoleptik" | "generator";

const VALID_TABS: readonly DokumenBgnTabId[] = [
  "sampel",
  "organoleptik",
  "generator"
];

interface SearchParams {
  tab?: string;
}

export default async function DokumenBgnPage({
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
    profile.role !== "viewer" &&
    profile.role !== "ahli_gizi"
  ) {
    redirect("/dashboard?err=forbidden");
  }

  const activeTab: DokumenBgnTabId = VALID_TABS.includes(
    searchParams.tab as DokumenBgnTabId
  )
    ? (searchParams.tab as DokumenBgnTabId)
    : "sampel";

  const tabs: PageTab[] = [
    {
      id: "sampel",
      icon: "🧪",
      label: lang === "EN" ? "Food Samples" : "Sampel Makanan",
      href: "/dokumen-bgn?tab=sampel"
    },
    {
      id: "organoleptik",
      icon: "👅",
      label: lang === "EN" ? "Organoleptic Test" : "Uji Organoleptik",
      href: "/dokumen-bgn?tab=organoleptik"
    },
    {
      id: "generator",
      icon: "📄",
      label: lang === "EN" ? "Form Generator" : "Generator Lampiran",
      href: "/dokumen-bgn?tab=generator"
    }
  ];

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📄"
          title={lang === "EN" ? "BGN Forms" : "Dokumen BGN"}
          subtitle={
            lang === "EN"
              ? "Food sample logs, organoleptic testing, and Lampiran form generator (SK Ka BGN 401.1/2025)."
              : "Log sampel makanan, uji organoleptik, dan generator lampiran (SK Ka BGN 401.1/2025)."
          }
        />

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "sampel" && (
          <SampelMakananTab
            supabase={supabase}
            lang={lang}
            role={profile.role}
          />
        )}
        {activeTab === "organoleptik" && (
          <OrganoleptikTab
            supabase={supabase}
            lang={lang}
            role={profile.role}
          />
        )}
        {activeTab === "generator" && (
          <GeneratorLampiranTab
            supabase={supabase}
            lang={lang}
            role={profile.role}
          />
        )}
      </PageContainer>
    </div>
  );
}
