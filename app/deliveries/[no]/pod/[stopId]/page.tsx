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
  const stopRes = await supabase
    .from("delivery_stops")
    .select(
      "id, delivery_no, stop_order, stop_kind, school_id, posyandu_id, porsi_planned, porsi_delivered, arrival_at, temperature_c, receiver_name, signature_url, photo_url, note, status"
    )
    .eq("id", stopId)
    .eq("delivery_no", deliveryNo)
    .maybeSingle();

  const stop = stopRes.data;
  if (!stop) notFound();

  const kind: "school" | "posyandu" =
    stop.stop_kind === "posyandu" ? "posyandu" : "school";

  let recipientName: string;
  if (kind === "posyandu") {
    const posyanduId = stop.posyandu_id ?? "";
    const { data: p } = await supabase
      .from("posyandu")
      .select("name")
      .eq("id", posyanduId)
      .maybeSingle();
    recipientName = p?.name ?? posyanduId;
  } else {
    const schoolId = stop.school_id ?? "";
    const { data: s } = await supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .maybeSingle();
    recipientName = s?.name ?? schoolId;
  }

  const kindLabel =
    kind === "posyandu"
      ? t("del.kindPosyandu", lang)
      : t("del.kindSchool", lang);

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          title={ti("del.podTitle", lang, { no: deliveryNo })}
          subtitle={`${kindLabel} · ${recipientName} · Stop #${stop.stop_order}`}
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
