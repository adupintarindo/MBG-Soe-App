import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import {
  Badge,
  KpiGrid,
  KpiTile,
  LinkButton,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { formatIDR } from "@/lib/engine";
import { t, type LangKey } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { AckForm } from "./ack-form";
import { MessageThread } from "./message-thread";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ no: string }> | { no: string };
};

export default async function SupplierPoDetailPage({ params }: PageProps) {
  const lang = getLang();
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const canView =
    profile.role === "supplier" ||
    profile.role === "admin" ||
    profile.role === "operator" ||
    profile.role === "viewer";
  if (!canView) redirect("/dashboard");

  const resolved = await Promise.resolve(params);
  const poNo = decodeURIComponent(resolved.no);

  const supabase = createClient();

  const [poRes, rowsRes, ackRes, grnRes, invRes, msgRes, itemsRes] =
    await Promise.all([
      supabase
        .from("purchase_orders")
        .select(
          "no, po_date, supplier_id, delivery_date, total, status, pay_method, top, notes, created_at"
        )
        .eq("no", poNo)
        .maybeSingle(),
      supabase
        .from("po_rows")
        .select("line_no, item_code, qty, unit, price, subtotal")
        .eq("po_no", poNo)
        .order("line_no"),
      supabase
        .from("po_acknowledgements")
        .select(
          "po_no, decision, decided_at, note, alt_delivery_date, supplier_id"
        )
        .eq("po_no", poNo)
        .maybeSingle(),
      supabase
        .from("grns")
        .select("no, grn_date, status, qc_note")
        .eq("po_no", poNo)
        .order("grn_date", { ascending: false }),
      supabase
        .from("invoices")
        .select("no, inv_date, total, due_date, status")
        .eq("po_no", poNo)
        .order("inv_date", { ascending: false }),
      supabase
        .from("supplier_messages")
        .select("id, body, attachment_url, sender_role, created_at, read_at")
        .eq("po_no", poNo)
        .order("created_at", { ascending: true })
        .limit(200),
      supabase.from("items").select("code, name_en")
    ]);

  const po = poRes.data as
    | {
        no: string;
        po_date: string;
        supplier_id: string;
        delivery_date: string | null;
        total: number | string;
        status: string;
        pay_method: string | null;
        top: number | null;
        notes: string | null;
        created_at: string;
      }
    | null;
  if (!po) notFound();

  if (profile.role === "supplier" && po.supplier_id !== profile.supplier_id) {
    redirect("/supplier?err=forbidden");
  }

  const rows = (rowsRes.data ?? []) as Array<{
    line_no: number;
    item_code: string;
    qty: number | string;
    unit: string;
    price: number | string;
    subtotal: number | string;
  }>;
  const ack = ackRes.data as {
    po_no: string;
    decision: "accepted" | "rejected" | "partial" | "pending";
    decided_at: string | null;
    note: string | null;
    alt_delivery_date: string | null;
    supplier_id: string | null;
  } | null;
  const grns = (grnRes.data ?? []) as Array<{
    no: string;
    grn_date: string;
    status: string;
    qc_note: string | null;
  }>;
  const invoices = (invRes.data ?? []) as Array<{
    no: string;
    inv_date: string;
    total: number | string;
    due_date: string | null;
    status: string;
  }>;
  const messages = (msgRes.data ?? []) as Array<{
    id: number;
    body: string;
    attachment_url: string | null;
    sender_role: string | null;
    created_at: string;
    read_at: string | null;
  }>;
  const items = (itemsRes.data ?? []) as Array<{
    code: string;
    name_en: string | null;
  }>;
  const itemName = new Map(items.map((i) => [i.code, i.name_en ?? i.code]));

  const { data: supRes } = await supabase
    .from("suppliers")
    .select("name, pic, phone")
    .eq("id", po.supplier_id)
    .maybeSingle();
  const sup = supRes as
    | { name: string; pic: string | null; phone: string | null }
    | null;

  const isSupplier = profile.role === "supplier";
  const canAck = isSupplier && ack?.decision !== "accepted";
  const ackDecision = ack?.decision ?? "pending";

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      <PageContainer>
        <PageHeader
          icon="📋"
          title={`PO ${po.no}`}
          subtitle={
            <span className="inline-flex flex-wrap gap-2 text-[12px]">
              <span>
                <b>{sup?.name ?? po.supplier_id}</b>
                {sup?.pic && ` · ${sup.pic}`}
              </span>
              <span className="text-ink2/60">
                {po.po_date}
                {po.delivery_date && ` → ${po.delivery_date}`}
              </span>
            </span>
          }
          actions={
            <LinkButton href="/supplier" variant="secondary" size="sm">
              {t("common.back", lang)}
            </LinkButton>
          }
        />

        <KpiGrid>
          <KpiTile
            icon="💰"
            label={t("common.total", lang)}
            value={formatIDR(Number(po.total))}
            size="md"
          />
          <KpiTile
            icon="📌"
            label={t("common.status", lang)}
            value={po.status}
            tone={
              po.status === "approved"
                ? "ok"
                : po.status === "cancelled"
                  ? "bad"
                  : "info"
            }
          />
          <KpiTile
            icon="🤝"
            label={t("sup.colDecision", lang)}
            value={t(
              (`sup.ack${ackDecision.charAt(0).toUpperCase()}${ackDecision.slice(1)}`) as LangKey,
              lang
            )}
            tone={
              ackDecision === "accepted"
                ? "ok"
                : ackDecision === "rejected"
                  ? "bad"
                  : ackDecision === "partial"
                    ? "warn"
                    : "default"
            }
            sub={ack?.decided_at?.slice(0, 10) ?? "—"}
          />
          <KpiTile
            icon="💬"
            label={t("sup.messagesTitle", lang).split("{po}")[0].trim()}
            value={messages.length.toString()}
          />
        </KpiGrid>

        <Section title={lang === "EN" ? "Line items" : "Item PO"}>
          <div className="overflow-x-auto rounded-xl ring-1 ring-ink/10">
            <table className="min-w-full text-sm">
              <thead className="bg-ink2/5 text-[11px] font-bold uppercase text-ink2">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">
                    {t("common.item", lang)}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t("common.qty", lang)}
                  </th>
                  <th className="px-3 py-2 text-left">
                    {t("common.unit", lang)}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t("common.price", lang)}
                  </th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line_no} className="border-t border-ink/10">
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {r.line_no}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs font-bold">
                        {itemName.get(r.item_code) ?? r.item_code}
                      </div>
                      <div className="font-mono text-[10px] text-ink2/60">
                        {r.item_code}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {Number(r.qty)}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-ink2">
                      {r.unit}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {formatIDR(Number(r.price))}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold">
                      {formatIDR(Number(r.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {canAck && (
          <Section
            title={t("sup.colDecision", lang)}
            accent={ackDecision === "pending" ? "warn" : "default"}
          >
            <AckForm
              poNo={po.no}
              supplierId={po.supplier_id}
              currentDecision={ackDecision}
              currentNote={ack?.note ?? ""}
              currentAltDate={ack?.alt_delivery_date ?? ""}
            />
          </Section>
        )}

        {!isSupplier && ack && (
          <Section title={t("sup.colDecision", lang)}>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div>
                <div className="text-[11px] font-bold text-ink2">
                  {t("sup.colDecision", lang)}
                </div>
                <Badge
                  tone={
                    ackDecision === "accepted"
                      ? "ok"
                      : ackDecision === "rejected"
                        ? "bad"
                        : ackDecision === "partial"
                          ? "warn"
                          : "muted"
                  }
                >
                  {ackDecision}
                </Badge>
              </div>
              <div>
                <div className="text-[11px] font-bold text-ink2">
                  {t("common.date", lang)}
                </div>
                <span className="font-mono text-xs">
                  {ack.decided_at?.slice(0, 16).replace("T", " ") ?? "—"}
                </span>
              </div>
              {ack.alt_delivery_date && (
                <div>
                  <div className="text-[11px] font-bold text-ink2">
                    {t("sup.ackAltDate", lang)}
                  </div>
                  <span className="font-mono text-xs">
                    {ack.alt_delivery_date}
                  </span>
                </div>
              )}
              {ack.note && (
                <div className="sm:col-span-3">
                  <div className="text-[11px] font-bold text-ink2">
                    {t("sup.ackNote", lang)}
                  </div>
                  <p className="text-xs text-ink2">{ack.note}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        <Section
          title={`💬 ${t("sup.messagesTitle", lang).replace("{po}", po.no)}`}
        >
          <MessageThread
            poNo={po.no}
            supplierId={po.supplier_id}
            initial={messages}
            currentRole={profile.role}
          />
        </Section>

        {(grns.length > 0 || invoices.length > 0) && (
          <Section title={lang === "EN" ? "Related documents" : "Dokumen Terkait"}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[11px] font-bold text-ink2">
                  GRN
                </div>
                {grns.length === 0 ? (
                  <div className="text-xs text-ink2/60">—</div>
                ) : (
                  <ul className="space-y-1">
                    {grns.map((g) => (
                      <li
                        key={g.no}
                        className="flex items-center justify-between rounded-lg bg-ink2/5 px-3 py-1.5 text-xs"
                      >
                        <span className="font-mono font-bold">{g.no}</span>
                        <span className="text-ink2">{g.grn_date}</span>
                        <Badge
                          tone={
                            g.status === "ok"
                              ? "ok"
                              : g.status === "rejected"
                                ? "bad"
                                : "info"
                          }
                        >
                          {g.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-2 text-[11px] font-bold text-ink2">
                  Invoice
                </div>
                {invoices.length === 0 ? (
                  <div className="text-xs text-ink2/60">—</div>
                ) : (
                  <ul className="space-y-1">
                    {invoices.map((i) => (
                      <li
                        key={i.no}
                        className="flex items-center justify-between rounded-lg bg-ink2/5 px-3 py-1.5 text-xs"
                      >
                        <span className="font-mono font-bold">{i.no}</span>
                        <span className="font-mono text-[11px] text-ink2">
                          {formatIDR(Number(i.total))}
                        </span>
                        <Badge
                          tone={
                            i.status === "paid"
                              ? "ok"
                              : i.status === "overdue"
                                ? "bad"
                                : "info"
                          }
                        >
                          {i.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Section>
        )}
      </PageContainer>
    </div>
  );
}
