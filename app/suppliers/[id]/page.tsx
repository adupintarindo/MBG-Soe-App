import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  listSupplierReval,
  supplierQcGallery,
  supplierScorecardAuto
} from "@/lib/engine";
import {
  Badge,
  EmptyState,
  KpiGrid,
  KpiTile,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import {
  SupplierItemsTable,
  SupplierCertsTable,
  type SupplierItemRow,
  type SupplierCertRow
} from "@/components/supplier-detail-tables";
import { RevalPanel } from "./reval-panel";
import { t, ti } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
  searchParams: { start?: string; end?: string };
}

function isoDate(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export default async function SupplierDetailPage({
  params,
  searchParams
}: Props) {
  const supabase = createClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const { id } = params;

  const today = new Date();
  const goLive = new Date("2026-05-04");
  const defaultEnd = today < goLive ? addDays(goLive, 90) : today;
  const defaultStart = today < goLive ? goLive : addDays(today, -90);

  const start = searchParams.start ?? isoDate(defaultStart);
  const end = searchParams.end ?? isoDate(defaultEnd);

  const [supRes, itemsRes, certsRes, reval, scorecard, gallery] =
    await Promise.all([
      supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("supplier_items")
        .select("item_code, is_main, price_idr, lead_time_days")
        .eq("supplier_id", id),
      supabase
        .from("supplier_certs")
        .select("id, name, valid_until, created_at")
        .eq("supplier_id", id)
        .order("valid_until", { ascending: true }),
      listSupplierReval(supabase, id),
      supplierScorecardAuto(supabase, id, start, end),
      supplierQcGallery(supabase, id, 60)
    ]);

  if (!supRes.data) notFound();
  const sup = supRes.data;
  const supItems = itemsRes.data ?? [];
  const certs = certsRes.data ?? [];

  const canWrite = profile.role === "admin" || profile.role === "operator";

  const recoTone = (() => {
    const t = Number(scorecard.total_score);
    if (t >= 85) return "ok" as const;
    if (t >= 70) return "info" as const;
    if (t >= 55) return "warn" as const;
    return "bad" as const;
  })();

  const recoLabel =
    Number(scorecard.total_score) >= 85
      ? t("supplierDetail.recoRetain", lang)
      : Number(scorecard.total_score) >= 70
        ? t("supplierDetail.recoImprove", lang)
        : Number(scorecard.total_score) >= 55
          ? t("supplierDetail.recoWarning", lang)
          : t("supplierDetail.recoReplace", lang);

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          title={sup.name}
          subtitle={
            <>
              {sup.id} · {sup.type}{" "}
              {sup.status && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                  {sup.status}
                </span>
              )}
              {sup.pic && <span className="ml-2">{t("supplierDetail.subPic", lang)}: {sup.pic}</span>}
              {sup.phone && (
                <span className="ml-2 font-mono text-[11px]">{sup.phone}</span>
              )}
            </>
          }
          actions={
            <>
              <LinkButton href="/suppliers" variant="secondary" size="sm">
                {t("supplierDetail.btnBack", lang)}
              </LinkButton>
              <LinkButton
                href={`/supplier/forecast?supplier_id=${encodeURIComponent(id)}`}
                variant="secondary"
                size="sm"
              >
                {t("supplierDetail.btnForecast", lang)}
              </LinkButton>
              <LinkButton
                href={`/api/suppliers/${id}/lta?start=${start}&end=${end}`}
                variant="primary"
                size="sm"
              >
                {t("supplierDetail.btnLTA", lang)}
              </LinkButton>
            </>
          }
        />

        <KpiGrid>
          <KpiTile
            label={t("supplierDetail.kpiTotalScore", lang)}
            value={Number(scorecard.total_score).toFixed(1)}
            sub={recoLabel}
            tone={recoTone}
          />
          <KpiTile
            label={t("supplierDetail.kpiQuality", lang)}
            value={`${Number(scorecard.quality_score).toFixed(0)}/100`}
            sub={ti("supplierDetail.kpiQualitySub", lang, { pass: scorecard.qc_pass, fail: scorecard.qc_fail })}
          />
          <KpiTile
            label={t("supplierDetail.kpiDelivery", lang)}
            value={`${Number(scorecard.delivery_score).toFixed(0)}/100`}
            sub={ti("supplierDetail.kpiDeliverySub", lang, { n: scorecard.grn_count })}
          />
          <KpiTile
            label={t("supplierDetail.kpiCompliance", lang)}
            value={`${Number(scorecard.compliance_score).toFixed(0)}/100`}
            sub={ti("supplierDetail.kpiComplianceSub", lang, { n: scorecard.ncr_critical_open })}
            tone={scorecard.ncr_critical_open > 0 ? "bad" : "default"}
          />
        </KpiGrid>

        <Section
          title={t("supplierDetail.secScorecard", lang)}
          hint={ti("supplierDetail.secScorecardHint", lang, { start, end })}
        >
          <div className="grid gap-3 md:grid-cols-5">
            <ScoreBar label={t("supplierDetail.scoreQuality", lang)} val={scorecard.quality_score} />
            <ScoreBar label={t("supplierDetail.scoreDelivery", lang)} val={scorecard.delivery_score} />
            <ScoreBar label={t("supplierDetail.scorePrice", lang)} val={scorecard.price_score} />
            <ScoreBar label={t("supplierDetail.scoreCompliance", lang)} val={scorecard.compliance_score} />
            <ScoreBar
              label={t("supplierDetail.scoreResponsiveness", lang)}
              val={scorecard.responsiveness_score}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink2">
            <Badge tone="info">
              {ti("supplierDetail.badgeGRN", lang, { n: scorecard.grn_count })}
            </Badge>
            <Badge tone={scorecard.qc_fail > 0 ? "warn" : "ok"}>
              {ti("supplierDetail.badgeQCRate", lang, {
                pct:
                  scorecard.qc_pass + scorecard.qc_fail > 0
                    ? (
                        (scorecard.qc_pass /
                          (scorecard.qc_pass + scorecard.qc_fail)) *
                        100
                      ).toFixed(0)
                    : "—"
              })}
            </Badge>
            <Badge tone={scorecard.actions_overdue > 0 ? "warn" : "ok"}>
              {ti("supplierDetail.badgeActions", lang, { overdue: scorecard.actions_overdue, total: scorecard.actions_total })}
            </Badge>
            <Badge tone={scorecard.ncr_critical_open > 0 ? "bad" : "ok"}>
              {ti("supplierDetail.badgeNCR", lang, { n: scorecard.ncr_critical_open })}
            </Badge>
          </div>
        </Section>

        <Section
          title={t("supplierDetail.secReval", lang)}
          hint={t("supplierDetail.secRevalHint", lang)}
        >
          <RevalPanel
            supplierId={id}
            defaultStart={start}
            defaultEnd={end}
            canWrite={canWrite}
            history={reval}
          />
        </Section>

        <Section
          title={t("supplierDetail.secGallery", lang)}
          hint={ti("supplierDetail.secGalleryHint", lang, { n: gallery.length })}
        >
          {gallery.length === 0 ? (
            <EmptyState
              icon="📷"
              title={t("supplierDetail.galleryEmptyTitle", lang)}
              message={t("supplierDetail.galleryEmptyBody", lang)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {gallery.map((g, i) => (
                <a
                  key={`${g.source}-${g.ref_id}-${i}`}
                  href={g.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-xl bg-paper ring-1 ring-ink/5 transition hover:ring-ink/20"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-ink/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.photo_url}
                      alt={g.note ?? g.ref_id}
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          g.source === "ncr"
                            ? "bg-red-100 text-red-800"
                            : g.result === "pass"
                              ? "bg-emerald-100 text-emerald-800"
                              : g.result === "minor"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {g.source === "ncr"
                          ? `NCR ${g.result}`
                          : g.result.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-ink2/70">
                        {new Date(g.captured_at).toLocaleDateString(
                          lang === "EN" ? "en-US" : "id-ID"
                        )}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11px] font-mono text-ink2">
                      {g.ref_id}
                      {g.item_code && (
                        <span className="text-ink2/60"> · {g.item_code}</span>
                      )}
                    </div>
                    {g.note && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-ink2">
                        {g.note}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </Section>

        <Section
          title={t("supplierDetail.secItems", lang)}
          hint={ti("supplierDetail.secItemsHint", lang, { n: supItems.length })}
        >
          {supItems.length === 0 ? (
            <EmptyState message={t("supplierDetail.itemsEmpty", lang)} />
          ) : (
            <SupplierItemsTable
              lang={lang}
              rows={supItems.map(
                (si): SupplierItemRow => ({
                  item_code: si.item_code,
                  is_main: si.is_main,
                  price_idr:
                    si.price_idr != null ? Number(si.price_idr) : null,
                  lead_time_days:
                    si.lead_time_days != null
                      ? Number(si.lead_time_days)
                      : null
                })
              )}
            />
          )}
        </Section>

        <Section
          title={t("supplierDetail.secCerts", lang)}
          hint={ti("supplierDetail.secCertsHint", lang, { n: certs.length })}
        >
          {certs.length === 0 ? (
            <EmptyState message={t("supplierDetail.certsEmpty", lang)} />
          ) : (
            <SupplierCertsTable
              lang={lang}
              rows={certs.map((c): SupplierCertRow => {
                const vu = c.valid_until ? new Date(c.valid_until) : null;
                return {
                  id: c.id,
                  name: c.name,
                  valid_until: c.valid_until,
                  expired: vu != null && vu < new Date()
                };
              })}
            />
          )}
        </Section>
      </PageContainer>
    </div>
  );
}

function ScoreBar({ label, val }: { label: string; val: number }) {
  const v = Math.max(0, Math.min(100, Number(val)));
  const color =
    v >= 85
      ? "bg-emerald-500"
      : v >= 70
        ? "bg-blue-500"
        : v >= 55
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <div className="rounded-xl bg-paper p-3 ring-1 ring-ink/5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink2">
          {label}
        </span>
        <span className="font-mono text-sm font-black text-ink">
          {v.toFixed(0)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
