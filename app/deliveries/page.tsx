import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  toISODate,
  dailyDeliverySummary,
  type DeliverySummaryRow
} from "@/lib/engine";
import {
  EmptyState,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { GenerateManifestButton } from "./generate-manifest";
import {
  DeliveryManifestTable,
  DeliveryHistoryTable,
  type DeliveryRow,
  type StopRow
} from "./deliveries-tables";

export const dynamic = "force-dynamic";

interface DeliveryDb {
  no: string;
  delivery_date: string;
  menu_id: number | null;
  driver_name: string | null;
  vehicle: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  status: string;
  total_porsi_planned: number | string;
  total_porsi_delivered: number | string;
  note: string | null;
}

interface StopDb {
  id: number;
  delivery_no: string;
  stop_order: number;
  school_id: string;
  porsi_planned: number | string;
  porsi_delivered: number | string;
  arrival_at: string | null;
  temperature_c: number | string | null;
  receiver_name: string | null;
  signature_url: string | null;
  photo_url: string | null;
  note: string | null;
  status: string;
}

export default async function DeliveriesPage() {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const canWrite = profile.role === "admin" || profile.role === "operator";
  const today = toISODate(new Date());

  const [delsRes, stopsRes, schoolsRes, summaryRes] = await Promise.all([
    supabase
      .from("deliveries")
      .select(
        "no, delivery_date, menu_id, driver_name, vehicle, dispatched_at, completed_at, status, total_porsi_planned, total_porsi_delivered, note"
      )
      .order("delivery_date", { ascending: false })
      .order("no", { ascending: false })
      .limit(60),
    supabase
      .from("delivery_stops")
      .select(
        "id, delivery_no, stop_order, school_id, porsi_planned, porsi_delivered, arrival_at, temperature_c, receiver_name, signature_url, photo_url, note, status"
      )
      .order("delivery_no", { ascending: false })
      .order("stop_order", { ascending: true }),
    supabase.from("schools").select("id, name"),
    dailyDeliverySummary(supabase).catch(
      () => [] as DeliverySummaryRow[]
    )
  ]);

  const dels = (delsRes.data ?? []) as DeliveryDb[];
  const stops = (stopsRes.data ?? []) as StopDb[];
  const schools = (schoolsRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const summary = summaryRes;

  const schoolName = new Map(schools.map((s) => [s.id, s.name]));
  const stopsByDelivery = new Map<string, StopRow[]>();
  for (const s of stops) {
    const row: StopRow = {
      id: s.id,
      delivery_no: s.delivery_no,
      stop_order: s.stop_order,
      school_id: s.school_id,
      school_name: schoolName.get(s.school_id) ?? s.school_id,
      porsi_planned: Number(s.porsi_planned),
      porsi_delivered: Number(s.porsi_delivered),
      arrival_at: s.arrival_at,
      temperature_c: s.temperature_c == null ? null : Number(s.temperature_c),
      receiver_name: s.receiver_name,
      signature_url: s.signature_url,
      photo_url: s.photo_url,
      note: s.note,
      status: s.status
    };
    const arr = stopsByDelivery.get(s.delivery_no) ?? [];
    arr.push(row);
    stopsByDelivery.set(s.delivery_no, arr);
  }

  const deliveryRows: DeliveryRow[] = dels.map((d) => ({
    no: d.no,
    delivery_date: d.delivery_date,
    menu_id: d.menu_id,
    driver_name: d.driver_name,
    vehicle: d.vehicle,
    status: d.status,
    total_porsi_planned: Number(d.total_porsi_planned),
    total_porsi_delivered: Number(d.total_porsi_delivered),
    stops: stopsByDelivery.get(d.no) ?? []
  }));

  const todayRow = deliveryRows.find((d) => d.delivery_date === today);
  const todayStops = todayRow?.stops ?? [];
  const todayPorsiDelivered = todayStops.reduce(
    (s, x) => s + x.porsi_delivered,
    0
  );
  const todayPorsiPlanned = todayStops.reduce(
    (s, x) => s + x.porsi_planned,
    0
  );
  const todayFulfilment =
    todayPorsiPlanned > 0
      ? Math.round((todayPorsiDelivered / todayPorsiPlanned) * 100)
      : 0;
  const pendingDispatch = deliveryRows.filter(
    (d) => d.status === "planned"
  ).length;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          actions={
            canWrite ? (
              <>
                <GenerateManifestButton date={today} />
                <LinkButton href="/schools" variant="secondary" size="sm">
                  {t("tabSchools", lang)}
                </LinkButton>
              </>
            ) : (
              <LinkButton href="/dashboard" variant="secondary" size="sm">
                {t("common.back", lang)}
              </LinkButton>
            )
          }
        />

        <Section icon="🚚" title={t("del.todayTitle", lang)} hint={t("del.todayHint", lang)}>
          {!todayRow ? (
            <EmptyState
              tone="warn"
              icon="🚚"
              message={t("del.todayEmpty", lang)}
            />
          ) : (
            <DeliveryManifestTable
              lang={lang}
              delivery={todayRow}
              canWrite={canWrite}
            />
          )}
        </Section>

        <Section
          title={ti("del.historyTitle", lang, { n: deliveryRows.length })}
          hint={t("del.historyHint", lang)}
        >
          {deliveryRows.length === 0 ? (
            <EmptyState message={t("common.noData", lang)} />
          ) : (
            <DeliveryHistoryTable
              lang={lang}
              rows={deliveryRows}
              summary={summary}
            />
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
