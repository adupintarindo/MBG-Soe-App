import { redirect } from "next/navigation";
import { createServerReadClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { TransactionLog, type TxRow } from "@/components/transaction-log";
import {
  EmptyState,
  KpiGrid,
  KpiTile,
  NoticeCard,
  PageContainer,
  Section
} from "@/components/ui";
import {
  ScheduleTable,
  VolumeMatrixTable,
  ProcurementScheduleTable,
  SupplierSpendTable,
  type ScheduleRow,
  type VolumeRow,
  type ProcurementDayGroup,
  type SupplierSpendRow
} from "@/components/dashboard-tables";
import { porsiBreakdown, schoolsBreakdown } from "@/lib/bgn";
import {
  formatDateID,
  stockShortageForDate,
  toISODate,
  monthlyRequirements,
  dailyPlanning,
  dashboardKpis,
  requirementForDate,
  type Requirement,
  monthlyCashflow,
  budgetBurn,
  costPerPortionDaily,
  type MonthlyRequirement,
  type DailyPlan,
  type CashflowRow,
  type BudgetBurnRow,
  type CostPerPortionRow
} from "@/lib/engine";
import { DashboardAnalytics } from "@/components/dashboard-analytics";
import {
  demoBeneficiary,
  demoBeneficiaryToday,
  demoBudget,
  demoCashflow,
  demoCommodities,
  demoCostPerPortion,
  demoSuppliers
} from "@/lib/demo-analytics";
import { t, ti, formatNumber, MONTHS, DAYS } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type SearchParams = {
  from?: string;
  to?: string;
  demoStock?: string;
  demo?: string;
};

const DEMO_SHORTAGES: import("@/lib/engine").Shortage[] = [
  { item_code: "Beras Premium", required: 120.5, on_hand: 45.25, gap: 75.25, unit: "kg" },
  { item_code: "Ayam Karkas", required: 80.0, on_hand: 22.5, gap: 57.5, unit: "kg" },
  { item_code: "Telur Ayam Ras", required: 60.0, on_hand: 18.75, gap: 41.25, unit: "kg" },
  { item_code: "Tahu Putih", required: 45.0, on_hand: 12.0, gap: 33.0, unit: "kg" },
  { item_code: "Wortel Orange", required: 38.5, on_hand: 10.5, gap: 28.0, unit: "kg" },
  { item_code: "Bayam Hijau", required: 30.0, on_hand: 8.25, gap: 21.75, unit: "kg" },
  { item_code: "Minyak Goreng Curah", required: 25.0, on_hand: 6.5, gap: 18.5, unit: "liter" },
  { item_code: "Buah - Pisang Ambon", required: 220.0, on_hand: 165.0, gap: 55.0, unit: "buah" }
];

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const supabase = createServerReadClient();
  const lang = getLang();
  const sp = (searchParams
    ? await Promise.resolve(searchParams)
    : {}) as SearchParams;

  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  if (!profile.active) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <NoticeCard title={t("dashboard.notActiveTitle", lang)} tone="warn">
          <p>
            <span className="font-mono font-bold">{profile.email}</span>{" "}
            {t("dashboard.notActiveBody", lang)}
          </p>
        </NoticeCard>
      </main>
    );
  }

  // ---- date horizons ----
  const now = new Date();
  const today = toISODate(now);
  const monthStart = toISODate(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const mrStart = monthStart; // 4-month matrix starts this month

  // Supplier spend: fixed 5-month window ending with current month (last 5 months)
  const spendMonths: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    spendMonths.push(`${y}-${mo}`);
  }
  const spendRangeStart = `${spendMonths[0]}-01`;
  const spendRangeEnd = toISODate(
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  );

  // ---- parallel fetches ----
  const [
    kpis,
    shortages,
    monthly,
    supplierInvoices,
    planning,
    txRowsRaw,
    suppliers,
    attendanceRows,
    cashflow,
    budgetRows,
    costPorsi,
    schoolsToday,
    itemsRes
  ] = await Promise.all([
    dashboardKpis(supabase).catch(() => ({
      students_total: 0,
      schools_active: 0,
      menu_today_id: null,
      menu_today_name: null,
      suppliers_active: 0
    })),
    stockShortageForDate(supabase, today).catch(() => []),
    monthlyRequirements(supabase, mrStart, 5).catch(
      () => [] as MonthlyRequirement[]
    ),
    supabase
      .from("invoices")
      .select("supplier_id, inv_date, total, status")
      .gte("inv_date", spendRangeStart)
      .lte("inv_date", spendRangeEnd)
      .then((r) => r.data ?? []),
    dailyPlanning(supabase, 180).catch(() => [] as DailyPlan[]),
    supabase
      .from("transactions")
      .select(
        "id, tx_date, tx_type, ref_no, supplier_id, amount, description"
      )
      .order("tx_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(50)
      .then((r) => r.data ?? []),
    supabase
      .from("suppliers")
      .select("id, name, type, active")
      .then((r) => r.data ?? []),
    supabase
      .from("school_attendance")
      .select("att_date, school_id, qty")
      .gte("att_date", today)
      .then((r) => r.data ?? []),
    monthlyCashflow(supabase).catch(() => [] as CashflowRow[]),
    budgetBurn(supabase).catch(() => [] as BudgetBurnRow[]),
    costPerPortionDaily(supabase).catch(() => [] as CostPerPortionRow[]),
    schoolsBreakdown(supabase, today).catch(() => []),
    supabase
      .from("items")
      .select("code, unit")
      .then((r) => r.data ?? [])
  ]);

  const unitByCode = new Map<string, string>(
    (itemsRes as Array<{ code: string; unit: string | null }>).map((i) => [
      i.code,
      i.unit ?? "kg"
    ])
  );

  // ---- portion counts + beneficiary breakdown per horizon date ----
  const porsiByDate = new Map<
    string,
    { kecil: number; besar: number; total: number }
  >();
  const breakdownByDate = new Map<
    string,
    {
      schools_count: number;
      students_total: number;
      pregnant_count: number;
      toddler_count: number;
    }
  >();
  await Promise.all(
    planning.map(async (p) => {
      const [pcRes, bdRes] = await Promise.all([
        supabase.rpc("porsi_counts", { p_date: p.op_date }),
        porsiBreakdown(supabase, p.op_date).catch(() => null)
      ]);
      const row = (pcRes.data ?? [])[0] as
        | { besar: number; kecil: number; total: number }
        | undefined;
      if (row) {
        porsiByDate.set(p.op_date, {
          kecil: Number(row.kecil ?? 0),
          besar: Number(row.besar ?? 0),
          total: Number(row.total ?? 0)
        });
      }
      if (bdRes) {
        breakdownByDate.set(p.op_date, {
          schools_count: bdRes.schools_count,
          students_total: bdRes.students_total,
          pregnant_count: bdRes.pregnant_count,
          toddler_count: bdRes.toddler_count
        });
      }
    })
  );

  // ---- schools served per date (distinct school_id with qty>0) ----
  const schoolsPerDate = new Map<string, Set<string>>();
  for (const r of attendanceRows as Array<{
    att_date: string;
    school_id: string;
    qty: number | string;
  }>) {
    if (Number(r.qty) > 0) {
      let set = schoolsPerDate.get(r.att_date);
      if (!set) {
        set = new Set();
        schoolsPerDate.set(r.att_date, set);
      }
      set.add(r.school_id);
    }
  }

  // ---- derived ----
  const demoMode = sp.demo === "1" || sp.demo === "true";
  const demoStock = sp.demoStock === "1" || sp.demoStock === "true";
  const effectiveShortages =
    demoStock || (demoMode && shortages.length === 0)
      ? DEMO_SHORTAGES
      : shortages;
  const shortItems = effectiveShortages.filter((s) => Number(s.gap) > 0);

  // Transaction log with supplier names
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const supplierMeta = new Map(
    suppliers.map((s) => [s.id, { name: s.name, type: s.type, active: s.active }])
  );
  const txRows: TxRow[] = txRowsRaw.map((r) => ({
    id: r.id,
    tx_date: r.tx_date,
    tx_type: r.tx_type as TxRow["tx_type"],
    ref_no: r.ref_no,
    supplier_id: r.supplier_id,
    supplier_name: r.supplier_id
      ? supplierMap.get(r.supplier_id) ?? null
      : null,
    amount: r.amount,
    description: r.description
  }));

  // ---- Supplier spend aggregation (5-month matrix) ----
  const supplierAgg = new Map<
    string,
    { monthly: Record<string, number>; total: number; count: number }
  >();
  for (const r of supplierInvoices as Array<{
    supplier_id: string | null;
    inv_date: string;
    total: number | string | null;
    status: string | null;
  }>) {
    if (!r.supplier_id) continue;
    if (r.status === "cancelled") continue;
    const m = r.inv_date.slice(0, 7);
    if (!spendMonths.includes(m)) continue;
    const amt = Number(r.total ?? 0);
    let row = supplierAgg.get(r.supplier_id);
    if (!row) {
      row = { monthly: {}, total: 0, count: 0 };
      supplierAgg.set(r.supplier_id, row);
    }
    row.monthly[m] = (row.monthly[m] ?? 0) + amt;
    row.total += amt;
    row.count += 1;
  }
  const topSup = [...supplierAgg.entries()]
    .map(([supplier_id, agg]) => {
      const meta = supplierMeta.get(supplier_id);
      return {
        supplier_id,
        supplier_name: meta?.name ?? supplier_id,
        supplier_type: (meta?.type ?? "lokal") as string,
        active: meta?.active ?? true,
        total_spend: agg.total,
        invoice_count: agg.count,
        monthly: agg.monthly
      };
    })
    .filter((s) => s.active && s.total_spend > 0)
    .sort((a, b) => b.total_spend - a.total_spend);

  // Pivot monthly requirements: item_code × month → qty_kg
  // Force fixed 5-month horizon so every month shows even when data is sparse.
  const months: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${mo}`);
  }
  const itemTotals = new Map<string, number>();
  for (const r of monthly) {
    itemTotals.set(
      r.item_code,
      (itemTotals.get(r.item_code) ?? 0) + Number(r.qty_kg)
    );
  }
  const topItems = [...itemTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code);
  const matrix: Record<string, Record<string, number>> = {};
  for (const code of topItems) matrix[code] = {};
  for (const r of monthly) {
    if (!matrix[r.item_code]) continue;
    const m = r.month.slice(0, 7);
    matrix[r.item_code][m] =
      (matrix[r.item_code][m] ?? 0) + Number(r.qty_kg);
  }
  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const idx = Number(mo) - 1;
    const monShort = MONTHS.short[lang][idx];
    return `${monShort} ${y.slice(2)}`;
  };
  const displayCode = (code: string) => code.replace(/^Buah\s*-\s*/i, "");
  const commodityCategory = (name: string): string => {
    const n = name.toLowerCase();
    if (n.startsWith("beras") || n.includes("nasi")) return "BERAS";
    if (
      n.startsWith("buah") ||
      n.includes("pisang") ||
      n.includes("pepaya") ||
      n.includes("melon") ||
      n.includes("semangka") ||
      n.includes("jeruk") ||
      n.includes("apel") ||
      n.includes("anggur") ||
      n.includes("mangga")
    )
      return "BUAH";
    if (n.includes("tempe") || n.includes("tahu") || n.includes("kacang"))
      return "NABATI";
    if (
      n.includes("ayam") ||
      n.includes("ikan") ||
      n.includes("telur") ||
      n.includes("daging") ||
      n.includes("sapi")
    )
      return "HEWANI";
    if (
      n.includes("sawi") ||
      n.includes("kangkung") ||
      n.includes("bayam") ||
      n.includes("selada") ||
      n.includes("daun")
    )
      return "SAYUR_HIJAU";
    if (
      n.includes("cabai") ||
      n.includes("cabe") ||
      n.includes("jahe") ||
      n.includes("kunyit") ||
      n.includes("lengkuas") ||
      n.includes("serai") ||
      n.includes("merica") ||
      n.includes("ketumbar") ||
      n.includes("rempah")
    )
      return "REMPAH";
    if (
      n.includes("bawang") ||
      n.includes("kemiri")
    )
      return "BUMBU";
    if (
      n.includes("minyak") ||
      n.includes("gula") ||
      n.includes("garam") ||
      n.includes("kecap") ||
      n.includes("tepung") ||
      n.includes("saus")
    )
      return "SEMBAKO";
    if (n.includes("kentang") || n.includes("ubi") || n.includes("singkong"))
      return "UMBI";
    return "SAYUR";
  };

  // status today (used by KPI tile below; status chip lives in <Nav>)
  const todayPlan = planning.find((p) => p.op_date === today);
  void todayPlan;

  // Serializable rows for client-side sortable tables
  const scheduleRows: ScheduleRow[] = planning.map((p) => {
    const d = new Date(p.op_date + "T00:00:00");
    const dayName = DAYS.long[lang][d.getDay()];
    const dateLabel = `${dayName}, ${d.getDate()} ${MONTHS.long[lang][d.getMonth()]} ${d.getFullYear()}`;
    const porsi = porsiByDate.get(p.op_date);
    const bd = breakdownByDate.get(p.op_date);
    return {
      op_date: p.op_date,
      dateLabel,
      menu_id: p.menu_id,
      menu_name: p.menu_name,
      operasional: p.operasional,
      schools: bd?.schools_count ?? schoolsPerDate.get(p.op_date)?.size ?? 0,
      students: bd?.students_total ?? 0,
      pregnant: bd?.pregnant_count ?? 0,
      toddler: bd?.toddler_count ?? 0,
      kecil: porsi?.kecil ?? 0,
      besar: porsi?.besar ?? 0,
      total: porsi?.total ?? p.porsi_total
    };
  });

  const monthLabels: Record<string, string> = Object.fromEntries(
    months.map((m) => [m, monthLabel(m)])
  );
  const monthOpDays: Record<string, number> = Object.fromEntries(
    months.map((m) => [m, 0])
  );
  for (const p of planning) {
    if (!p.operasional) continue;
    const m = p.op_date.slice(0, 7);
    if (m in monthOpDays) monthOpDays[m] += 1;
  }
  const volumeRows: VolumeRow[] = topItems.map((code) => ({
    code,
    category: commodityCategory(code),
    unit: unitByCode.get(code) ?? "kg",
    total: itemTotals.get(code) ?? 0,
    monthly: Object.fromEntries(
      months.map((m) => [m, matrix[code]?.[m] ?? 0])
    )
  }));

  // ---- Procurement schedule: next 7 operational days × item × qty × price ----
  const procurementDays = planning
    .filter((p) => p.op_date >= today && p.operasional)
    .sort((a, b) => a.op_date.localeCompare(b.op_date))
    .slice(0, 7);

  const reqsByDate = new Map<string, Requirement[]>();
  await Promise.all(
    procurementDays.map(async (p) => {
      try {
        const reqs = await requirementForDate(supabase, p.op_date);
        reqsByDate.set(p.op_date, reqs);
      } catch {
        reqsByDate.set(p.op_date, []);
      }
    })
  );

  const procurementGroups: ProcurementDayGroup[] = procurementDays.map((p) => {
    const reqs = reqsByDate.get(p.op_date) ?? [];
    const d = new Date(p.op_date + "T00:00:00");
    const dayName = DAYS.long[lang][d.getDay()];
    const dayShort = DAYS.short[lang][d.getDay()];
    const dateLabel = `${dayName}, ${d.getDate()} ${MONTHS.long[lang][d.getMonth()]} ${d.getFullYear()}`;
    const dateShort = `${dayShort}, ${d.getDate()} ${MONTHS.short[lang][d.getMonth()]}`;
    const porsi = porsiByDate.get(p.op_date);
    const rows = reqs
      .map((r) => {
        const qty = Number(r.qty ?? 0);
        const price = Number(r.price_idr ?? 0);
        return {
          item_code: r.item_code,
          category: (r.category ?? commodityCategory(r.item_code)) as string,
          qty,
          unit: r.unit ?? "kg",
          price_idr: price,
          subtotal: qty * price
        };
      })
      .filter((r) => r.qty > 0)
      .sort((a, b) => b.subtotal - a.subtotal);
    const subtotal = rows.reduce((s, r) => s + r.subtotal, 0);
    return {
      op_date: p.op_date,
      dateLabel,
      dateShort,
      menu_id: p.menu_id,
      menu_name: p.menu_name,
      porsi_total: porsi?.total ?? p.porsi_total,
      rows,
      subtotal
    };
  });

  const supplierSpendRows: SupplierSpendRow[] = topSup.map((s) => ({
    supplier_id: s.supplier_id,
    supplier_name: s.supplier_name,
    supplier_type: s.supplier_type,
    invoice_count: s.invoice_count,
    total_spend: Number(s.total_spend),
    monthly: Object.fromEntries(
      spendMonths.map((m) => [m, s.monthly[m] ?? 0])
    )
  }));
  const spendMonthLabels: Record<string, string> = Object.fromEntries(
    spendMonths.map((m) => [m, monthLabel(m)])
  );

  // ---- Analytics payload (client-side tabbed charts) ----
  const beneficiaryDays = scheduleRows.map((r) => ({
    op_date: r.op_date,
    dateLabel: r.dateLabel,
    operasional: r.operasional,
    schools: r.schools,
    students: r.students,
    pregnant: r.pregnant,
    toddler: r.toddler,
    total: r.total
  }));

  const beneficiaryTodayList = (schoolsToday ?? []).map((s) => ({
    school_name: s.school_name,
    level: s.level,
    qty: s.total
  }));

  const commodityRows = [...itemTotals.entries()].map(([code, total_kg]) => ({
    code,
    total_kg
  }));

  const stockGapRows = shortItems.map((s) => ({
    item_code: s.item_code,
    required: Number(s.required),
    on_hand: Number(s.on_hand),
    gap: Number(s.gap),
    unit: s.unit
  }));

  const supplierRows = topSup.map((s) => ({
    supplier_name: s.supplier_name,
    total_spend: Number(s.total_spend),
    invoice_count: Number(s.invoice_count)
  }));

  const cashflowRows = (cashflow ?? []).map((c) => ({
    period: c.period,
    cash_in: Number(c.cash_in),
    cash_out: Number(c.cash_out),
    net: Number(c.net)
  }));

  const currentBudget = (() => {
    if (!budgetRows || budgetRows.length === 0) return null;
    const monthKey = monthStart.slice(0, 7);
    const row =
      budgetRows.find((b) => b.period.startsWith(monthKey)) ??
      budgetRows[budgetRows.length - 1];
    return {
      period: row.period,
      budget_total: Number(row.budget_total),
      spent_po: Number(row.spent_po),
      spent_invoice: Number(row.spent_invoice),
      spent_paid: Number(row.spent_paid)
    };
  })();

  const costPerPortionRows = (costPorsi ?? []).map((c) => ({
    op_date: c.op_date,
    cost_per_portion: Number(c.cost_per_portion ?? 0),
    target: c.target != null ? Number(c.target) : null
  }));

  // ---- demo overlay (activated with ?demo=1) ----
  // Menutupi lubang data untuk screenshot/presentasi tanpa menyentuh DB.
  const analyticsBeneficiary = demoMode
    ? demoBeneficiary(beneficiaryDays)
    : beneficiaryDays;

  const analyticsBeneficiaryToday =
    demoMode && beneficiaryTodayList.length === 0
      ? demoBeneficiaryToday()
      : beneficiaryTodayList;

  const analyticsCommodities =
    demoMode && commodityRows.length === 0 ? demoCommodities() : commodityRows;

  const analyticsSuppliers =
    demoMode && supplierRows.length === 0 ? demoSuppliers() : supplierRows;

  const analyticsCashflow =
    demoMode && cashflowRows.length === 0
      ? demoCashflow(monthStart)
      : cashflowRows;

  const analyticsBudget = demoMode
    ? demoBudget(monthStart, currentBudget)
    : currentBudget;

  const analyticsCostPerPortion =
    demoMode && costPerPortionRows.length === 0
      ? demoCostPerPortion(today)
      : costPerPortionRows;

  return (
    <div>
      <Nav
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
        menuToday={{
          id: kpis.menu_today_id,
          name: kpis.menu_today_name
        }}
      />

      <PageContainer>
        <KpiGrid>
          <KpiTile
            icon="👥"
            label={t("dashboard.kpiStudents", lang)}
            value={formatNumber(Number(kpis.students_total ?? 0), lang)}
            palette="blue"
          />
          <KpiTile
            icon="🏫"
            label={t("dashboard.kpiSchoolsActive", lang)}
            value={String(kpis.schools_active ?? 0)}
            palette="emerald"
          />
          <KpiTile
            icon="🍽️"
            label={t("dashboard.kpiMenuToday", lang)}
            value={
              <span
                className="block text-[13px] leading-snug"
                title={kpis.menu_today_name || "—"}
              >
                {kpis.menu_today_name || "—"}
              </span>
            }
            size="sm"
            tone="default"
            palette="amber"
          />
          <KpiTile
            icon="🤝"
            label={t("dashboard.kpiSuppliersActive", lang)}
            value={String(kpis.suppliers_active ?? 0)}
            palette="violet"
          />
        </KpiGrid>

        {/* Menu & Portion Schedule · 10 days */}
        <Section
          title={t("dashboard.scheduleTitle", lang)}
          hint={t("dashboard.scheduleHint", lang)}
        >
          {planning.length === 0 ? (
            <EmptyState message={t("dashboard.scheduleEmpty", lang)} />
          ) : (
            <ScheduleTable rows={scheduleRows} lang={lang} today={today} />
          )}
        </Section>

        {/* 50 Transaksi Terakhir with filter */}
        <TransactionLog rows={txRows} />

        {/* 4-month requirements matrix */}
        <Section
          title={t("dashboard.volumeTitle", lang)}
          hint={t("dashboard.volumeHint", lang)}
          accent="ok"
        >
          {topItems.length === 0 ? (
            <EmptyState
              title={t("dashboard.volumeEmptyTitle", lang)}
              message={t("dashboard.volumeEmptyMsg", lang)}
            />
          ) : (
            <VolumeMatrixTable
              rows={volumeRows}
              months={months}
              monthLabels={monthLabels}
              monthOpDays={monthOpDays}
              lang={lang}
            />
          )}
        </Section>

        <div className="mb-3 grid grid-cols-1 gap-3">
          <Section
            title={t("dashboard.procurementTitle", lang)}
            hint={t("dashboard.procurementHint", lang)}
            className="mb-0"
          >
            <ProcurementScheduleTable groups={procurementGroups} lang={lang} />
          </Section>
        </div>

        {/* Nilai belanja semua supplier bertransaksi */}
        <Section
          title={t("dashboard.supplierSpendTitle", lang)}
          hint={ti("dashboard.supplierSpendHint", lang, {
            start: formatDateID(spendRangeStart),
            end: formatDateID(spendRangeEnd),
            n: topSup.length
          })}
        >
          {topSup.length === 0 ? (
            <EmptyState message={t("dashboard.supplierSpendEmpty", lang)} />
          ) : (
            <SupplierSpendTable
              rows={supplierSpendRows}
              months={spendMonths}
              monthLabels={spendMonthLabels}
              lang={lang}
            />
          )}
        </Section>

        <DashboardAnalytics
          lang={lang}
          beneficiary={analyticsBeneficiary}
          beneficiaryToday={analyticsBeneficiaryToday}
          commodities={analyticsCommodities}
          stockGaps={stockGapRows}
          topSuppliers={analyticsSuppliers}
          cashflow={analyticsCashflow}
          budget={analyticsBudget}
          costPerPortion={analyticsCostPerPortion}
        />
      </PageContainer>
    </div>
  );
}
