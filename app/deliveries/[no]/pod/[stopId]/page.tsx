import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { PODForm } from "./pod-form";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const WRITE_ROLES = new Set(["admin", "operator"]);

export default async function PODPage({
  params
}: {
  params: { no: string; stopId: string };
}) {
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!WRITE_ROLES.has(profile.role)) redirect("/deliveries");

  const deliveryNo = decodeURIComponent(params.no);
  const stopId = Number(params.stopId);
  if (!Number.isFinite(stopId)) notFound();

  const supabase = createClient();
  const [stopRes, schoolsRes] = await Promise.all([
    supabase
      .from("delivery_stops")
      .select(
        "id, delivery_no, stop_order, school_id, porsi_planned, porsi_delivered, arrival_at, temperature_c, receiver_name, signature_url, photo_url, note, status"
      )
      .eq("id", stopId)
      .eq("delivery_no", deliveryNo)
      .maybeSingle(),
    supabase.from("schools").select("id, name")
  ]);

  const stop = stopRes.data;
  if (!stop) notFound();
  const schools = (schoolsRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const schoolName =
    schools.find((s) => s.id === stop.school_id)?.name ?? stop.school_id;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📝"
          title={ti("del.podTitle", lang, { no: deliveryNo })}
          subtitle={`${schoolName} · Stop #${stop.stop_order}`}
          actions={
            <LinkButton href="/deliveries" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        <Section noPad>
          <PODForm
            stopId={stop.id}
            initial={{
              porsi_delivered: Number(stop.porsi_delivered) || 0,
              arrival_at: stop.arrival_at,
              temperature_c:
                stop.temperature_c == null ? null : Number(stop.temperature_c),
              receiver_name: stop.receiver_name,
              signature_url: stop.signature_url,
              photo_url: stop.photo_url,
              note: stop.note
            }}
          />
        </Section>
      </PageContainer>
    </div>
  );
}
