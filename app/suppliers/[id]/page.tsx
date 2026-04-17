import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  formatIDR,
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
  Section,
  TableWrap,
  THead
} from "@/components/ui";
import { RevalPanel } from "./reval-panel";

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
      ? "RETAIN — performa baik"
      : Number(scorecard.total_score) >= 70
        ? "IMPROVE — butuh pembinaan"
        : Number(scorecard.total_score) >= 55
          ? "WARNING — resiko tinggi"
          : "REPLACE — exit plan";

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="🏪"
          title={sup.name}
          subtitle={
            <>
              {sup.id} · {sup.type}{" "}
              {sup.status && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                  {sup.status}
                </span>
              )}
              {sup.pic && <span className="ml-2">PIC: {sup.pic}</span>}
              {sup.phone && (
                <span className="ml-2 font-mono text-[11px]">{sup.phone}</span>
              )}
            </>
          }
          actions={
            <>
              <LinkButton href="/suppliers" variant="secondary" size="sm">
                ← Semua Supplier
              </LinkButton>
              <LinkButton
                href={`/supplier/forecast?supplier_id=${encodeURIComponent(id)}`}
                variant="secondary"
                size="sm"
              >
                📅 Forecast 90h
              </LinkButton>
              <LinkButton
                href={`/api/suppliers/${id}/lta?start=${start}&end=${end}`}
                variant="primary"
                size="sm"
              >
                📄 Generate LTA
              </LinkButton>
            </>
          }
        />

        <KpiGrid>
          <KpiTile
            label="Total Score"
            value={Number(scorecard.total_score).toFixed(1)}
            sub={recoLabel}
            tone={recoTone}
          />
          <KpiTile
            label="Quality"
            value={`${Number(scorecard.quality_score).toFixed(0)}/100`}
            sub={`${scorecard.qc_pass} pass · ${scorecard.qc_fail} fail`}
          />
          <KpiTile
            label="Delivery"
            value={`${Number(scorecard.delivery_score).toFixed(0)}/100`}
            sub={`${scorecard.grn_count} GRN diterima`}
          />
          <KpiTile
            label="Compliance"
            value={`${Number(scorecard.compliance_score).toFixed(0)}/100`}
            sub={`${scorecard.ncr_critical_open} NCR kritikal aktif`}
            tone={scorecard.ncr_critical_open > 0 ? "bad" : "default"}
          />
        </KpiGrid>

        <Section
          title="📊 Scorecard Otomatis"
          hint={`Dihitung dari data operasional ${start} → ${end}. Bobot default: Q 30% · D 25% · P 20% · C 15% · R 10%.`}
        >
          <div className="grid gap-3 md:grid-cols-5">
            <ScoreBar label="Quality" val={scorecard.quality_score} />
            <ScoreBar label="Delivery" val={scorecard.delivery_score} />
            <ScoreBar label="Price" val={scorecard.price_score} />
            <ScoreBar label="Compliance" val={scorecard.compliance_score} />
            <ScoreBar
              label="Responsiveness"
              val={scorecard.responsiveness_score}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink2">
            <Badge tone="info">
              GRN: {scorecard.grn_count}
            </Badge>
            <Badge tone={scorecard.qc_fail > 0 ? "warn" : "ok"}>
              QC Pass Rate:{" "}
              {scorecard.qc_pass + scorecard.qc_fail > 0
                ? (
                    (scorecard.qc_pass /
                      (scorecard.qc_pass + scorecard.qc_fail)) *
                    100
                  ).toFixed(0)
                : "—"}
              %
            </Badge>
            <Badge tone={scorecard.actions_overdue > 0 ? "warn" : "ok"}>
              Actions: {scorecard.actions_overdue}/{scorecard.actions_total}{" "}
              overdue
            </Badge>
            <Badge tone={scorecard.ncr_critical_open > 0 ? "bad" : "ok"}>
              NCR Kritikal Open: {scorecard.ncr_critical_open}
            </Badge>
          </div>
        </Section>

        <Section
          title="🔁 Re-Evaluasi Periodik"
          hint="Simpan snapshot skor per periode. Klik 'Hitung & Simpan' untuk merekam evaluasi baru."
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
          title="🖼️ Visual QC Gallery"
          hint={`${gallery.length} foto dari GRN QC + NCR · 60 terbaru.`}
        >
          {gallery.length === 0 ? (
            <EmptyState
              icon="📷"
              title="Belum ada foto QC"
              message="Foto akan muncul di sini ketika operator upload photo_url ke QC Check atau NCR."
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
                        {new Date(g.captured_at).toLocaleDateString("id-ID")}
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
          title="📦 Komoditas yang Dipasok"
          hint={`${supItems.length} item di-map ke supplier ini.`}
        >
          {supItems.length === 0 ? (
            <EmptyState message="Belum ada mapping item." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Main?</th>
                  <th className="py-2 pr-3 text-right">Harga (IDR)</th>
                  <th className="py-2 pr-3 text-right">Lead Time</th>
                </THead>
                <tbody>
                  {supItems.map((si) => (
                    <tr
                      key={si.item_code}
                      className="row-hover border-b border-ink/5"
                    >
                      <td className="py-2 pr-3 font-semibold">
                        {si.item_code}
                      </td>
                      <td className="py-2 pr-3">
                        {si.is_main ? (
                          <Badge tone="ok">utama</Badge>
                        ) : (
                          <Badge tone="muted">alternatif</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {si.price_idr != null
                          ? formatIDR(Number(si.price_idr))
                          : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {si.lead_time_days != null
                          ? `${si.lead_time_days} hari`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section
          title="📜 Sertifikasi"
          hint={`${certs.length} sertifikat terdaftar.`}
        >
          {certs.length === 0 ? (
            <EmptyState message="Belum ada sertifikat." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">Sertifikat</th>
                  <th className="py-2 pr-3">Berlaku Sampai</th>
                  <th className="py-2 pr-3">Status</th>
                </THead>
                <tbody>
                  {certs.map((c) => {
                    const vu = c.valid_until ? new Date(c.valid_until) : null;
                    const expired = vu != null && vu < new Date();
                    return (
                      <tr
                        key={c.id}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pr-3 font-semibold">{c.name}</td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          {c.valid_until ?? "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {c.valid_until == null ? (
                            <Badge tone="muted">tak terbatas</Badge>
                          ) : expired ? (
                            <Badge tone="bad">kedaluwarsa</Badge>
                          ) : (
                            <Badge tone="ok">valid</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
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
