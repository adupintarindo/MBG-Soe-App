import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { TransactionLog, type TxRow } from "@/components/transaction-log";
import {
  Badge,
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
  PlanningTable,
  StockAlertTable,
  SupplierSpendTable,
  type ScheduleRow,
  type VolumeRow,
  type PlanRow,
  type StockAlertRow,
  type SupplierSpendRow
} from "@/components/dashboard-tables";
import {
  formatIDR,
  formatKg,
  formatDateID,
  stockShortageForDate,
  upcomingShortages,
  toISODate,
  monthlyRequirements,
  topSuppliersBySpend,
  dailyPlanning,
  dashboardKpis,
  type MonthlyRequirement,
  type TopSupplier,
  type DailyPlan
} from "@/lib/engine";
import { t, ti, formatNumber, MONTHS, DAYS } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const lang = getLang();

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

  // ---- HPP date range (default last 7 days ending today) ----
  const sevenAgo = new Date(now);
  sevenAgo.setDate(sevenAgo.getDate() - 6);
  const hppFrom = isISODate(sp.hpp_from) ? sp.hpp_from : toISODate(sevenAgo);
  const hppTo = isISODate(sp.hpp_to) ? sp.hpp_to : today;

  // ---- parallel fetches ----
  const [
    kpis,
    shortages,
    upcoming,
    monthly,
    topSup,
    planning,
    txRowsRaw,
    suppliers,
    attendanceRows,
    hppRows
  ] = await Promise.all([
    dashboardKpis(supabase).catch(() => ({
      students_total: 0,
      schools_active: 0,
      menu_today_id: null,
      menu_today_name: null,
      suppliers_active: 0
    })),
    stockShortageForDate(supabase, today).catch(() => []),
    upcomingShortages(supabase, 14).catch(() => []),
    monthlyRequirements(supabase, mrStart, 4).catch(
      () => [] as MonthlyRequirement[]
    ),
    topSuppliersBySpend(supabase, monthStart, today, 1000).catch(
      () => [] as TopSupplier[]
    ),
    dailyPlanning(supabase, 10).catch(() => [] as DailyPlan[]),
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
      .select("id, name")
      .then((r) => r.data ?? []),
    supabase
      .from("school_attendance")
      .select("att_date, school_id, qty")
      .gte("att_date", today)
      .then((r) => r.data ?? []),
    costPerPortionDaily(supabase, hppFrom, hppTo).catch(
      () => [] as CostPerPortionRow[]
    )
  ]);

  // ---- portion counts per horizon date ----
  const porsiByDate = new Map<
    string,
    { kecil: number; besar: number; total: number }
  >();
  await Promise.all(
    planning.map(async (p) => {
      const { data } = await supabase.rpc("porsi_counts", {
        p_date: p.op_date
      });
      const row = (data ?? [])[0] as
        | { besar: number; kecil: number; total: number }
        | undefined;
      if (row) {
        porsiByDate.set(p.op_date, {
          kecil: Number(row.kecil ?? 0),
          besar: Number(row.besar ?? 0),
          total: Number(row.total ?? 0)
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
  const shortItems = shortages.filter((s) => Number(s.gap) > 0);
  const totalGap = shortItems.reduce((s, x) => s + Number(x.gap || 0), 0);

  // ---- HPP aggregation (weighted average across period) ----
  const hppSorted = [...hppRows].sort((a, b) =>
    a.op_date.localeCompare(b.op_date)
  );
  const hppTotalPorsi = hppSorted.reduce(
    (s, r) => s + Number(r.total_porsi || 0),
    0
  );
  const hppTotalSpent = hppSorted.reduce(
    (s, r) => s + Number(r.spent_po || 0),
    0
  );
  const hppAvg = hppTotalPorsi > 0 ? hppTotalSpent / hppTotalPorsi : 0;
  const hppActiveDays = hppSorted.filter(
    (r) => Number(r.total_porsi || 0) > 0
  ).length;

  // ---- day-of-week label for date inputs (local time, not UTC) ----
  const dayNameFromISO = (iso: string): string => {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return "";
    const dow = new Date(y, m - 1, d).getDay();
    return DAYS.long[lang][dow] ?? "";
  };
  const hppFromDay = dayNameFromISO(hppFrom);
  const hppToDay = dayNameFromISO(hppTo);

  // Transaction log with supplier names
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
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

  // Pivot monthly requirements: item_code × month → qty_kg
  const months = Array.from(
    new Set(monthly.map((r) => r.month.slice(0, 7)))
  ).sort();
  const itemTotals = new Map<string, number>();
  for (const r of monthly) {
    itemTotals.set(
      r.item_code,
      (itemTotals.get(r.item_code) ?? 0) + Number(r.qty_kg)
    );
  }
  const topItems = [...itemTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([code]) => code);
  const matrix: Record<string, Record<string, number>> = {};
  for (const code of topItems) matrix[code] = {};
  for (const r of monthly) {
    if (!matrix[r.item_code]) continue;
    const m = r.month.slice(0, 7);
    matrix[r.item_code][m] =
      (matrix[r.item_code][m] ?? 0) + Number(r.qty_kg);
  }
  const maxItemTotal = topItems.length
    ? (itemTotals.get(topItems[0]) ?? 0)
    : 0;
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
    return {
      op_date: p.op_date,
      dateLabel,
      menu_name: p.menu_name,
      operasional: p.operasional,
      schools: schoolsPerDate.get(p.op_date)?.size ?? 0,
      kecil: porsi?.kecil ?? 0,
      besar: porsi?.besar ?? 0,
      total: porsi?.total ?? p.porsi_total
    };
  });

  const monthLabels: Record<string, string> = Object.fromEntries(
    months.map((m) => [m, monthLabel(m)])
  );
  const volumeRows: VolumeRow[] = topItems.map((code) => ({
    code,
    category: commodityCategory(code),
    total: itemTotals.get(code) ?? 0,
    monthly: Object.fromEntries(
      months.map((m) => [m, matrix[code]?.[m] ?? 0])
    )
  }));

  const planRows: PlanRow[] = planning.map((p) => ({
    op_date: p.op_date,
    menu_name: p.menu_name,
    operasional: p.operasional,
    porsi_total: p.porsi_total,
    total_kg: Number(p.total_kg),
    short_items: p.short_items
  }));

  const stockAlertRows: StockAlertRow[] = shortItems.slice(0, 10).map((s) => ({
    item_code: s.item_code,
    category: commodityCategory(s.item_code),
    required: Number(s.required),
    on_hand: Number(s.on_hand),
    gap: Number(s.gap),
    unit: s.unit
  }));

  const supplierSpendRows: SupplierSpendRow[] = topSup.map((s) => ({
    supplier_id: s.supplier_id,
    supplier_name: s.supplier_name,
    supplier_type: s.supplier_type,
    invoice_count: s.invoice_count,
    total_spend: Number(s.total_spend)
  }));

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
            value={formatNumber(kpis.students_total, lang)}
            palette="blue"
          />
          <KpiTile
            icon="🏫"
            label={t("dashboard.kpiSchoolsActive", lang)}
            value={kpis.schools_active.toString()}
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
            value={kpis.suppliers_active.toString()}
            palette="violet"
          />
        </KpiGrid>

        {/* HPP / Cost per Portion · period picker */}
        <Section title={t("dashboard.hppTitle", lang)}>
          <form
            method="get"
            className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-ink/10"
          >
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-ink2">
              <span>{t("dashboard.hppFrom", lang)}</span>
              <span className="flex flex-col">
                <input
                  type="date"
                  name="hpp_from"
                  defaultValue={hppFrom}
                  max={hppTo}
                  className="rounded-md bg-white px-2 py-1 font-mono text-xs font-semibold text-ink ring-1 ring-ink/15 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="mt-0.5 font-sans text-[10px] font-semibold normal-case tracking-normal text-primary">
                  {hppFromDay}
                </span>
              </span>
            </label>
            <span className="text-ink2/50">–</span>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-ink2">
              <span>{t("dashboard.hppTo", lang)}</span>
              <span className="flex flex-col">
                <input
                  type="date"
                  name="hpp_to"
                  defaultValue={hppTo}
                  min={hppFrom}
                  className="rounded-md bg-white px-2 py-1 font-mono text-xs font-semibold text-ink ring-1 ring-ink/15 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="mt-0.5 font-sans text-[10px] font-semibold normal-case tracking-normal text-primary">
                  {hppToDay}
                </span>
              </span>
            </label>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              {t("dashboard.hppApply", lang)}
            </button>
          </form>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiTile
              icon="💵"
              label={t("dashboard.hppAvg", lang)}
              value={hppTotalPorsi > 0 ? formatIDR(Math.round(hppAvg)) : "—"}
              palette="emerald"
              size="sm"
            />
            <KpiTile
              icon="🍛"
              label={t("dashboard.hppTotalPorsi", lang)}
              value={formatNumber(hppTotalPorsi, lang)}
              palette="blue"
              size="sm"
            />
            <KpiTile
              icon="🧾"
              label={t("dashboard.hppTotalSpent", lang)}
              value={formatIDR(hppTotalSpent)}
              palette="amber"
              size="sm"
            />
          </div>

          {hppTotalPorsi === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-[12px] text-ink2 ring-1 ring-ink/10">
              <span>🗒️</span>
              <span>{t("dashboard.hppEmpty", lang)}</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg ring-1 ring-ink/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-ink/10 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-ink2">
                    <th className="px-3 py-2 font-bold">
                      {t("dashboard.hppColDate", lang)}
                    </th>
                    <th className="px-3 py-2 text-right font-bold">
                      {t("dashboard.hppColPorsi", lang)}
                    </th>
                    <th className="px-3 py-2 text-right font-bold">
                      {t("dashboard.hppColSpent", lang)}
                    </th>
                    <th className="px-3 py-2 text-right font-bold">
                      {t("dashboard.hppColHpp", lang)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hppSorted.map((r) => {
                    const porsi = Number(r.total_porsi || 0);
                    const spent = Number(r.spent_po || 0);
                    const cpp = porsi > 0 ? spent / porsi : 0;
                    return (
                      <tr
                        key={r.op_date}
                        className="border-b border-ink/5 last:border-0"
                      >
                        <td className="px-3 py-1.5 font-mono text-[11px]">
                          {r.op_date}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {formatNumber(porsi, lang)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {formatIDR(spent)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-black">
                          {porsi > 0 ? formatIDR(Math.round(cpp)) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Menu & Portion Schedule · 10 days */}
        <Section
          banner
          title={t("dashboard.scheduleTitle", lang)}
        >
          {planning.length === 0 ? (
            <EmptyState message={t("dashboard.scheduleEmpty", lang)} />
          ) : (
            <ScheduleTable rows={scheduleRows} lang={lang} />
          )}
        </Section>

        {/* 50 Transaksi Terakhir with filter */}
        <TransactionLog rows={txRows} />

        {/* 4-month requirements matrix */}
        <Section
          title={t("dashboard.volumeTitle", lang)}
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
              maxItemTotal={maxItemTotal}
              lang={lang}
            />
          )}
        </Section>

        <div className="mb-6 grid grid-cols-1 gap-6">
          <Section
            title={t("dashboard.planningTitle", lang)}
            className="mb-0"
          >
            {planning.length === 0 ? (
              <EmptyState message={t("dashboard.planningEmpty", lang)} />
            ) : (
              <PlanningTable rows={planRows} lang={lang} />
            )}
          </Section>

          <Section
            title={t("dashboard.stockAlertTitle", lang)}
            accent={shortItems.length > 0 ? "bad" : "ok"}
            className="mb-0"
          >
            {shortItems.length === 0 ? (
              <EmptyState
                icon="✅"
                tone="ok"
                message={t("dashboard.stockAlertEmpty", lang)}
              />
            ) : (
              <StockAlertTable rows={stockAlertRows} lang={lang} />
            )}
          </Section>
        </div>

        {/* Nilai belanja semua supplier bertransaksi */}
        <Section title={t("dashboard.supplierSpendTitle", lang)}>
          {topSup.length === 0 ? (
            <EmptyState message={t("dashboard.supplierSpendEmpty", lang)} />
          ) : (
            <SupplierSpendTable rows={supplierSpendRows} lang={lang} />
          )}
        </Section>

        {/* 14-day upcoming shortages */}
        <Section
          title={t("dashboard.forecastTitle", lang)}
          accent={upcoming.length > 0 ? "warn" : "ok"}
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon="✅"
              tone="ok"
              message={t("dashboard.forecastEmpty", lang)}
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {upcoming.map((u) => (
                <li
                  key={u.op_date}
                  className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200"
                >
                  <div>
                    <div className="font-bold text-amber-900">
                      {formatDateID(u.op_date)}
                    </div>
                    <div className="text-[11px] text-amber-800">
                      {ti("dashboard.forecastItemsShort", lang, { n: u.short_items })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-amber-900">
                      {ti("dashboard.forecastGap", lang, { value: formatKg(Number(u.total_gap_kg)) })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <p className="mt-8 text-center text-[11px] text-ink2/60">
          {t("dashboard.footer", lang)}
        </p>
      </PageContainer>
    </div>
  );
}
