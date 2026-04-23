import { redirect } from "next/navigation";
import { createServerReadClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { listNcr, ncrSnapshot } from "@/lib/engine";
import Link from "next/link";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  Section
} from "@/components/ui";
import { PageTabs, type PageTab } from "@/components/page-tabs";
import { GrnQcPanel } from "./grn-qc-panel";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import {
  InvoiceTable,
  PoTable,
  QtTable
} from "./procurement-tables";
import {
  buildDeliveryLines,
  groupLinesByDelivery,
  summarizeByDay,
  type ItemLite,
  type MenuLite,
  type MenuBomRow,
  type MenuAssignRow,
  type PorsiByDate
} from "@/lib/delivery-engine";
import { getHoliday } from "@/lib/holidays";
import { DeliveryScheduleView } from "./delivery-schedule-view";
import { ProcurementDocsModal } from "./procurement-docs-modal";

export const dynamic = "force-dynamic";

type ProcTabId =
  | "req-qt"
  | "po"
  | "grn"
  | "invoice"
  | "jadwal";
const VALID_TABS: readonly ProcTabId[] = [
  "req-qt",
  "po",
  "grn",
  "invoice",
  "jadwal"
];

interface SearchParams {
  tab?: string;
  month?: string;
}

interface PoRow {
  no: string;
  po_date: string;
  supplier_id: string;
  delivery_date: string | null;
  total: number | string;
  status: string;
  pay_method: string | null;
  top: string | null;
  notes: string | null;
}
interface QtRow {
  no: string;
  supplier_id: string;
  quote_date: string;
  valid_until: string | null;
  need_date: string | null;
  total: number | string;
  status: string;
  converted_po_no: string | null;
}
interface PoLineRow {
  po_no: string;
  line_no: number;
  item_code: string;
  qty: number | string;
  unit: string;
  price: number | string;
}
interface GrnRow {
  no: string;
  po_no: string | null;
  grn_date: string;
  status: string;
  qc_note: string | null;
}
interface InvoiceRow {
  no: string;
  po_no: string | null;
  inv_date: string;
  supplier_id: string;
  total: number | string;
  due_date: string | null;
  status: string;
}
interface ReceiptRow {
  id: string;
  ref: string;
  note: string | null;
  photo_url: string | null;
  created_at: string;
}
interface SupplierLite {
  id: string;
  name: string;
}

export default async function ProcurementPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServerReadClient();
  const lang = getLang();

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/dashboard");

  const activeTab: ProcTabId = VALID_TABS.includes(
    searchParams.tab as ProcTabId
  )
    ? (searchParams.tab as ProcTabId)
    : "req-qt";

  const tabs: PageTab[] = [
    {
      id: "req-qt",
      icon: "📝",
      label: lang === "EN" ? "Requisition & Quotation" : "PR & Penawaran",
      href: "/procurement?tab=req-qt"
    },
    {
      id: "po",
      icon: "📦",
      label: lang === "EN" ? "Purchase Orders" : "Purchase Order",
      href: "/procurement?tab=po"
    },
    {
      id: "grn",
      icon: "🚚",
      label: lang === "EN" ? "Goods Receipt" : "Penerimaan",
      href: "/procurement?tab=grn"
    },
    {
      id: "invoice",
      icon: "💳",
      label: lang === "EN" ? "Invoices & Receipts" : "Invoice & Kwitansi",
      href: "/procurement?tab=invoice"
    },
    {
      id: "jadwal",
      icon: "🗓️",
      label: t("procurement.tabJadwal", lang),
      href: "/procurement?tab=jadwal"
    },
    {
      id: "pembayaran",
      icon: "💳",
      label: lang === "EN" ? "Payments" : "Pembayaran",
      href: "/payments"
    }
  ];

  // Stage 1: fetch parent tables in parallel (pos, grns, invoices, quotations, suppliers, receipts, ncr)
  const [
    posRes,
    grnsRes,
    invoicesRes,
    receiptsRes,
    suppliersRes,
    qtsRes,
    ncrs,
    ncrStats
  ] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(
        "no, po_date, supplier_id, delivery_date, total, status, pay_method, top, notes"
      )
      .order("po_date", { ascending: false })
      .limit(50),
    supabase
      .from("grns")
      .select("no, po_no, grn_date, status, qc_note")
      .order("grn_date", { ascending: false })
      .limit(50),
    supabase
      .from("invoices")
      .select("no, po_no, inv_date, supplier_id, total, due_date, status")
      .order("inv_date", { ascending: false })
      .limit(50),
    supabase
      .from("receipts")
      .select("id, ref, note, photo_url, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("suppliers").select("id, name"),
    supabase
      .from("quotations")
      .select(
        "no, supplier_id, quote_date, valid_until, need_date, total, status, converted_po_no"
      )
      .order("quote_date", { ascending: false })
      .limit(50),
    listNcr(supabase, { limit: 50 }).catch(() => []),
    ncrSnapshot(supabase).catch(() => ({
      total: 0,
      open_cnt: 0,
      in_progress_cnt: 0,
      resolved_cnt: 0,
      critical_open: 0,
      avg_resolve_days: null
    }))
  ]);

  const pos = (posRes.data ?? []) as PoRow[];
  const grns = (grnsRes.data ?? []) as GrnRow[];
  const invoices = (invoicesRes.data ?? []) as InvoiceRow[];
  const receipts = (receiptsRes.data ?? []) as ReceiptRow[];
  const suppliers = (suppliersRes.data ?? []) as SupplierLite[];
  const quotations = (qtsRes.data ?? []) as QtRow[];

  // Stage 2: fetch child tables scoped only to the 50 displayed POs/GRNs
  const poNos = pos.map((p) => p.no);
  const grnNos = grns.map((g) => g.no);

  const [poRowsRes, qcAggRes] = await Promise.all([
    poNos.length
      ? supabase
          .from("po_rows")
          .select("po_no, line_no, item_code, qty, unit, price")
          .in("po_no", poNos)
      : Promise.resolve({ data: [] as PoLineRow[] }),
    grnNos.length
      ? supabase
          .from("grn_qc_checks")
          .select("grn_no, result")
          .in("grn_no", grnNos)
      : Promise.resolve({ data: [] as Array<{ grn_no: string; result: string }> })
  ]);

  const poRows = (poRowsRes.data ?? []) as PoLineRow[];
  const qcRows = (qcAggRes.data ?? []) as Array<{
    grn_no: string;
    result: string;
  }>;

  // Aggregate QC per GRN
  const qcMap = new Map<
    string,
    { grn_no: string; total: number; fail: number; has_critical: boolean }
  >();
  for (const r of qcRows) {
    const agg = qcMap.get(r.grn_no) ?? {
      grn_no: r.grn_no,
      total: 0,
      fail: 0,
      has_critical: false
    };
    agg.total += 1;
    if (r.result !== "pass" && r.result !== "na") agg.fail += 1;
    if (r.result === "critical") agg.has_critical = true;
    qcMap.set(r.grn_no, agg);
  }
  const qcAgg = Array.from(qcMap.values());

  const poSupplierMap: Record<string, string> = {};
  for (const p of pos) poSupplierMap[p.no] = p.supplier_id;
  const supplierNameMap: Record<string, string> = {};
  for (const s of suppliers) supplierNameMap[s.id] = s.name;

  const canWrite =
    profile.role === "admin" || profile.role === "operator";

  const rowCountByPORecord: Record<string, number> = {};
  for (const r of poRows) {
    rowCountByPORecord[r.po_no] = (rowCountByPORecord[r.po_no] ?? 0) + 1;
  }

  // --------------------------------------------------------------------------
  // Jadwal Pengiriman — build delivery schedule for the target month.
  // Heavy-ish: fetch only when the tab is active to keep other tabs snappy.
  // --------------------------------------------------------------------------
  let jadwalPayload: {
    year: number;
    month: number;
    groups: ReturnType<typeof groupLinesByDelivery>;
    daySummaries: Array<ReturnType<typeof summarizeByDay> extends Map<string, infer V> ? V : never>;
  } | null = null;

  if (activeTab === "jadwal") {
    const now = new Date();
    const parseMonth = (
      raw: string | undefined
    ): { year: number; month: number } => {
      if (raw) {
        const m = /^(\d{4})-(\d{1,2})$/.exec(raw);
        if (m) {
          const y = Number(m[1]);
          const mo = Number(m[2]);
          if (mo >= 1 && mo <= 12) return { year: y, month: mo };
        }
      }
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    };
    const { year, month } = parseMonth(searchParams.month);

    // Fetch range = cooking dates covering the whole grid (6 weeks ≈ -6..+6 days
    // buffer beyond month bounds, since delivery_date may fall earlier than cooking).
    const gridStart = new Date(year, month - 1, 1);
    gridStart.setDate(gridStart.getDate() - 10);
    const gridEnd = new Date(year, month, 0);
    gridEnd.setDate(gridEnd.getDate() + 10);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const [menusRes, bomRes, itemsRes, assignsRes, schoolsRes, nonOpRes] =
      await Promise.all([
        supabase
          .from("menus")
          .select("id, name, name_en")
          .eq("active", true)
          .order("id"),
        supabase
          .from("menu_bom")
          .select("menu_id, item_code, grams_per_porsi"),
        supabase
          .from("items")
          .select("code, name_en, unit, category")
          .eq("active", true),
        supabase
          .from("menu_assign")
          .select("assign_date, menu_id")
          .gte("assign_date", fmt(gridStart))
          .lte("assign_date", fmt(gridEnd)),
        supabase
          .from("schools")
          .select("students, guru")
          .eq("active", true),
        supabase
          .from("non_op_days")
          .select("op_date")
          .gte("op_date", fmt(gridStart))
          .lte("op_date", fmt(gridEnd))
      ]);

    const menus = (menusRes.data ?? []) as MenuLite[];
    const menuBom = (bomRes.data ?? []).map(
      (b): MenuBomRow => ({
        menu_id: b.menu_id as number,
        item_code: b.item_code as string,
        grams_per_porsi: Number(b.grams_per_porsi)
      })
    );
    const items = (itemsRes.data ?? []).map(
      (i): ItemLite => ({
        code: i.code as string,
        name_en: (i.name_en as string | null) ?? null,
        unit: i.unit as string,
        category: i.category as string
      })
    );
    const assigns = (assignsRes.data ?? []) as MenuAssignRow[];
    const schoolsLite = (schoolsRes.data ?? []) as Array<{
      students: number;
      guru: number;
    }>;
    const nonOpSet = new Set(
      (nonOpRes.data ?? []).map((r) => r.op_date as string)
    );

    // Planned porsi per op-day = Σ(students + guru) across active schools.
    // Skip weekends, holidays, non_op_days (no cooking).
    const porsiPerOpDay = schoolsLite.reduce(
      (sum, s) => sum + (Number(s.students) || 0) + (Number(s.guru) || 0),
      0
    );
    const porsiByDate: PorsiByDate = {};
    for (const a of assigns) {
      if (nonOpSet.has(a.assign_date)) continue;
      const d = new Date(a.assign_date + "T00:00:00");
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      if (getHoliday(a.assign_date)) continue;
      porsiByDate[a.assign_date] = porsiPerOpDay;
    }

    const lines = buildDeliveryLines({
      assigns,
      menus,
      menuBom,
      items,
      porsiByDate
    });
    const groups = groupLinesByDelivery(lines);

    // Trim to current month's delivery_date window (visible grid).
    const monthGridFirst = new Date(year, month - 1, 1);
    const dow0 = monthGridFirst.getDay();
    const leadOffset = dow0 === 0 ? -6 : 1 - dow0;
    const gridFirst = new Date(monthGridFirst);
    gridFirst.setDate(monthGridFirst.getDate() + leadOffset);
    const monthGridLast = new Date(year, month, 0);
    const dowL = monthGridLast.getDay();
    const tailOffset = dowL === 0 ? 0 : 7 - dowL;
    const gridLast = new Date(monthGridLast);
    gridLast.setDate(monthGridLast.getDate() + tailOffset);
    const gridFirstIso = fmt(gridFirst);
    const gridLastIso = fmt(gridLast);

    const visibleGroups = groups.filter(
      (g) =>
        g.delivery_date >= gridFirstIso && g.delivery_date <= gridLastIso
    );
    const summaryMap = summarizeByDay(visibleGroups);
    const daySummaries = Array.from(summaryMap.values()).sort((a, b) =>
      a.delivery_date.localeCompare(b.delivery_date)
    );

    jadwalPayload = {
      year,
      month,
      groups: visibleGroups,
      daySummaries
    };
  }

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
            <ProcurementDocsModal
              lang={lang}
              pos={pos}
              grns={grns}
              invoices={invoices}
              supplierNames={supplierNameMap}
            />
          }
        />

        <PageTabs tabs={tabs} activeId={activeTab} />

        {activeTab === "req-qt" && (
          <Section
            title={t("procurement.secQTtitle", lang)}
            hint={t("procurement.secQThint", lang)}
            actions={
              canWrite ? (
                <Link
                  href="/procurement/quotation/new"
                  className="rounded-lg bg-ink px-3 py-1.5 text-[11px] font-black text-white shadow-card hover:bg-ink2"
                >
                  {t("procurement.btnNewSimple", lang)}
                </Link>
              ) : null
            }
          >
            {quotations.length === 0 ? (
              <EmptyState message={t("procurement.qtEmpty", lang)} />
            ) : (
              <QtTable rows={quotations} supplierNames={supplierNameMap} />
            )}
          </Section>
        )}

        {activeTab === "po" && (
          <>
            <Section
              icon="📄"
              title={t("procurement.secPOtitle", lang)}
              hint={t("procurement.secPOhint", lang)}
              actions={
                canWrite ? (
                  <Link
                    href="/procurement/po/new"
                    className="rounded-lg bg-ink px-3 py-1.5 text-[11px] font-black text-white shadow-card hover:bg-ink2"
                  >
                    {t("procurement.btnNewSimple", lang)}
                  </Link>
                ) : null
              }
            >
              {pos.length === 0 ? (
                <EmptyState message={t("procurement.poEmpty", lang)} />
              ) : (
                <PoTable
                  rows={pos}
                  supplierNames={supplierNameMap}
                  rowCountByPO={rowCountByPORecord}
                />
              )}
            </Section>
          </>
        )}

        {activeTab === "grn" && (
          <>
            <Section
              title={t("procurement.secGRNtitle", lang)}
              hint={t("procurement.secGRNhint", lang)}
              accent={ncrStats.critical_open > 0 ? "bad" : "default"}
            >
              <GrnQcPanel
                grns={grns}
                qcAgg={qcAgg}
                ncrs={ncrs}
                canWrite={canWrite}
                supplierIds={poSupplierMap}
                supplierNames={supplierNameMap}
              />
            </Section>
          </>
        )}

        {activeTab === "jadwal" && jadwalPayload && (
          <Section
            title={t("delivery.secTitle", lang)}
            hint={t("delivery.secHint", lang)}
          >
            <DeliveryScheduleView
              lang={lang}
              year={jadwalPayload.year}
              month={jadwalPayload.month}
              groups={jadwalPayload.groups}
              daySummaries={jadwalPayload.daySummaries}
            />
          </Section>
        )}

        {activeTab === "invoice" && (
          <>
            <Section icon="🧾" title={t("procurement.secINVtitle", lang)} hint={t("procurement.secINVhint", lang)}>
              {invoices.length === 0 ? (
                <EmptyState message={t("procurement.invEmpty", lang)} />
              ) : (
                <InvoiceTable rows={invoices} supplierNames={supplierNameMap} />
              )}
            </Section>

            <Section
              title={t("procurement.secReceiptsTitle", lang)}
              hint={t("procurement.secReceiptsHint", lang)}
            >
              {receipts.length === 0 ? (
                <EmptyState message={t("procurement.receiptsEmpty", lang)} />
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {receipts.map((r) => (
                    <div
                      key={r.id}
                      className="group overflow-hidden rounded-xl bg-paper ring-1 ring-ink/10 transition hover:shadow-card"
                    >
                      {r.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.photo_url}
                          alt={r.ref}
                          className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-ink/5 text-xs text-ink2/60">
                          {t("procurement.noPhoto", lang)}
                        </div>
                      )}
                      <div className="p-2 text-[11px]">
                        <div className="font-mono font-bold text-ink">{r.ref}</div>
                        <div className="text-ink2/70">
                          {new Date(r.created_at).toLocaleDateString(lang === "EN" ? "en-US" : "id-ID")}
                        </div>
                        {r.note && (
                          <div className="mt-1 line-clamp-2 text-ink2">
                            {r.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </PageContainer>
    </div>
  );
}
