import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { PageContainer, PageHeader } from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import { getLang } from "@/lib/i18n-server";
import { AnggaranTab } from "./tab-anggaran";
import { KasHarianTab } from "./tab-kas-harian";
import { BukuBesarTab } from "./tab-buku-besar";
import { PettyCashTab } from "./tab-petty-cash";
import { NeracaTab } from "./tab-neraca";

export const dynamic = "force-dynamic";

type KeuanganTabId =
  | "anggaran"
  | "kas-harian"
  | "buku-besar"
  | "petty-cash"
  | "neraca";

const VALID_TABS: readonly KeuanganTabId[] = [
  "anggaran",
  "kas-harian",
  "buku-besar",
  "petty-cash",
  "neraca"
];

interface SearchParams {
  tab?: string;
}

export default async function KeuanganPage({
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

  const activeTab: KeuanganTabId = VALID_TABS.includes(
    searchParams.tab as KeuanganTabId
  )
    ? (searchParams.tab as KeuanganTabId)
    : "anggaran";

  const tabs: PageTab[] = [
    {
      id: "anggaran",
      icon: "💼",
      label: lang === "EN" ? "Budget" : "Anggaran",
      href: "/keuangan?tab=anggaran"
    },
    {
      id: "kas-harian",
      icon: "📒",
      label: lang === "EN" ? "Daily Cash" : "Kas Harian",
      href: "/keuangan?tab=kas-harian"
    },
    {
      id: "buku-besar",
      icon: "📚",
      label: lang === "EN" ? "General Ledger" : "Buku Besar",
      href: "/keuangan?tab=buku-besar"
    },
    {
      id: "petty-cash",
      icon: "💴",
      label: lang === "EN" ? "Petty Cash" : "Kas Kecil",
      href: "/keuangan?tab=petty-cash"
    },
    {
      id: "neraca",
      icon: "⚖️",
      label: lang === "EN" ? "Trial Balance" : "Neraca",
      href: "/keuangan?tab=neraca"
    }
  ];

  return (
    <div>
      <Nav email={profile.email} role={profile.role} fullName={profile.full_name} />

      <PageContainer>
        <PageHeader
          icon="💰"
          title={lang === "EN" ? "Finance" : "Keuangan"}
          subtitle={
            lang === "EN"
              ? "Budget, daily cash, general ledger, petty cash, and trial balance in one place."
              : "Anggaran, kas harian, buku besar, kas kecil, dan neraca dalam satu halaman."
          }
        />

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "anggaran" && (
          <AnggaranTab supabase={supabase} lang={lang} role={profile.role} />
        )}
        {activeTab === "kas-harian" && (
          <KasHarianTab supabase={supabase} lang={lang} role={profile.role} />
        )}
        {activeTab === "buku-besar" && (
          <BukuBesarTab supabase={supabase} lang={lang} role={profile.role} />
        )}
        {activeTab === "petty-cash" && (
          <PettyCashTab supabase={supabase} lang={lang} role={profile.role} />
        )}
        {activeTab === "neraca" && (
          <NeracaTab supabase={supabase} lang={lang} role={profile.role} />
        )}
      </PageContainer>
    </div>
  );
}
