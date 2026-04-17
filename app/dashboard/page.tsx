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
  Section,
  TableWrap,
  THead
} from "@/components/ui";
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
    attendanceRows
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
      .then((r) => r.data ?? [])
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
  const grandTotal = monthly.reduce((s, r) => s + Number(r.qty_kg), 0);
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
  const commodityCategory = (name: string) => {
    const n = name.toLowerCase();
    if (n.startsWith("beras") || n.includes("nasi"))
      return { dot: "bg-amber-500", label: t("dashboard.commodityCarbo", lang) };
    if (
      n.startsWith("buah") ||
      n.includes("pisang") ||
      n.includes("pepaya") ||
      n.includes("melon") ||
      n.includes("semangka") ||
      n.includes("jeruk") ||
      n.includes("apel")
    )
      return { dot: "bg-fuchsia-500", label: t("dashboard.commodityFruit", lang) };
    if (
      n.includes("ayam") ||
      n.includes("ikan") ||
      n.includes("telur") ||
      n.includes("daging") ||
      n.includes("tempe") ||
      n.includes("tahu")
    )
      return { dot: "bg-sky-500", label: t("dashboard.commodityProtein", lang) };
    if (n.includes("minyak") || n.includes("gula") || n.includes("garam"))
      return { dot: "bg-violet-500", label: t("dashboard.commoditySeasoning", lang) };
    return { dot: "bg-emerald-500", label: t("dashboard.commodityVeg", lang) };
  };

  // status today (used by KPI tile below; status chip lives in <Nav>)
  const todayPlan = planning.find((p) => p.op_date === today);

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
        {shortItems.length > 0 && (
          <div className="mb-4">
            <Badge tone="bad">{ti("dashboard.shortageToday", lang, { n: shortItems.length })}</Badge>
          </div>
        )}

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
            value={kpis.menu_today_name || "—"}
            size="md"
            tone={kpis.menu_today_name ? "info" : "default"}
            palette="amber"
          />
          <KpiTile
            icon="🤝"
            label={t("dashboard.kpiSuppliersActive", lang)}
            value={kpis.suppliers_active.toString()}
            palette="violet"
          />
        </KpiGrid>

        {/* Menu & Portion Schedule · 10 days */}
        <Section
          banner
          title={t("dashboard.scheduleTitle", lang)}
          hint={t("dashboard.scheduleHint", lang)}
        >
          {planning.length === 0 ? (
            <EmptyState message={t("dashboard.scheduleEmpty", lang)} />
          ) : (
            <TableWrap>
              <table className="w-full text-sm tabular-nums">
                <THead>
                  <th className="w-12 py-2 pl-2 pr-3 text-center">
                    {t("dashboard.tblNo", lang)}
                  </th>
                  <th className="py-2 pr-3">
                    {t("dashboard.tblDayDate", lang)}
                  </th>
                  <th className="py-2 pr-3">
                    {t("dashboard.tblMenuName", lang)}
                  </th>
                  <th className="py-2 pr-3 text-right">
                    {t("dashboard.tblSchools", lang)}
                  </th>
                  <th className="py-2 pr-3 text-right">
                    {t("dashboard.tblPorsiKecil", lang)}
                  </th>
                  <th className="py-2 pr-3 text-right">
                    {t("dashboard.tblPorsiBesar", lang)}
                  </th>
                  <th className="py-2 pr-3 text-right">
                    {t("dashboard.tblPorsiTotal", lang)}
                  </th>
                </THead>
                <tbody>
                  {planning.map((p, idx) => {
                    const d = new Date(p.op_date + "T00:00:00");
                    const dayName = DAYS.long[lang][d.getDay()];
                    const dateLabel = `${dayName}, ${d.getDate()} ${MONTHS.long[lang][d.getMonth()]} ${d.getFullYear()}`;
                    const porsi = porsiByDate.get(p.op_date);
                    const schoolsCount =
                      schoolsPerDate.get(p.op_date)?.size ?? 0;
                    const kecil = porsi?.kecil ?? 0;
                    const besar = porsi?.besar ?? 0;
                    const totalPorsi = porsi?.total ?? p.porsi_total;
                    return (
                      <tr
                        key={p.op_date}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pl-2 pr-3 text-center font-mono text-xs text-ink2">
                          {idx + 1}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="font-semibold">{dateLabel}</div>
                          {!p.operasional && (
                            <Badge tone="warn" className="mt-1">
                              {t("dashboard.badgeNonOp", lang)}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {p.menu_name ?? (
                            <span className="text-ink2/60">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {formatNumber(schoolsCount, lang)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {formatNumber(kecil, lang)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {formatNumber(besar, lang)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                          {formatNumber(totalPorsi, lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        {/* 50 Transaksi Terakhir with filter */}
        <TransactionLog rows={txRows} />

        {/* 4-month requirements matrix */}
        <Section
          title={ti("dashboard.volumeTitle", lang, {
            range:
              months.length > 0
                ? `${monthLabel(months[0])}–${monthLabel(months[months.length - 1])}`
                : t("dashboard.volumeRangeFallback", lang),
            total: formatKg(grandTotal, 0)
          })}
          hint={t("dashboard.volumeHint", lang)}
          accent="ok"
        >
          {topItems.length === 0 ? (
            <EmptyState
              title={t("dashboard.volumeEmptyTitle", lang)}
              message={t("dashboard.volumeEmptyMsg", lang)}
            />
          ) : (
            <TableWrap>
              <table className="w-full text-sm tabular-nums">
                <THead>
                  <th className="w-10 py-2 pl-2 pr-3 text-center">{t("dashboard.tblNo", lang)}</th>
                  <th className="py-2 pr-3">{t("dashboard.tblCommodity", lang)}</th>
                  {months.map((m) => (
                    <th key={m} className="py-2 pr-3 text-right">
                      {monthLabel(m)}
                    </th>
                  ))}
                  <th className="py-2 pl-4 pr-3 text-right">{t("dashboard.tblTotalKg", lang)}</th>
                </THead>
                <tbody>
                  {topItems.map((code, i) => {
                    const total = itemTotals.get(code) ?? 0;
                    const rowMax = Math.max(
                      1,
                      ...months.map((m) => matrix[code][m] ?? 0)
                    );
                    const share =
                      maxItemTotal > 0 ? total / maxItemTotal : 0;
                    const cat = commodityCategory(code);
                    const rankTone =
                      i === 0
                        ? "bg-emerald-600 text-white"
                        : i === 1
                          ? "bg-emerald-200 text-emerald-900"
                          : i === 2
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-100 text-ink2";
                    return (
                      <tr
                        key={code}
                        className="row-hover border-b border-ink/5 odd:bg-slate-50/50"
                      >
                        <td className="py-2 pl-2 pr-3">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-display text-[11px] font-bold ${rankTone}`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${cat.dot}`}
                              aria-hidden
                            />
                            <span className="font-semibold">{displayCode(code)}</span>
                            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-ink2/60 md:inline">
                              {cat.label}
                            </span>
                          </div>
                        </td>
                        {months.map((m) => {
                          const v = matrix[code][m] ?? 0;
                          const intensity = v / rowMax;
                          const bg =
                            intensity >= 0.95
                              ? "bg-emerald-100/80"
                              : intensity >= 0.7
                                ? "bg-emerald-50"
                                : intensity >= 0.4
                                  ? "bg-emerald-50/50"
                                  : "";
                          return (
                            <td
                              key={m}
                              className={`py-2 pr-3 text-right font-mono text-xs ${bg}`}
                            >
                              {formatNumber(v, lang, {
                                maximumFractionDigits: 1
                              })}
                            </td>
                          );
                        })}
                        <td className="py-2 pl-4 pr-3">
                          <div className="flex items-center justify-end gap-3">
                            <div className="relative hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-200/70 md:block">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                                style={{
                                  width: `${Math.max(4, share * 100)}%`
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs font-black">
                              {formatNumber(total, lang, {
                                maximumFractionDigits: 0
                              })}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <div className="mb-6 grid grid-cols-1 gap-6">
          <Section
            title={t("dashboard.planningTitle", lang)}
            hint={t("dashboard.planningHint", lang)}
            className="mb-0"
          >
            {planning.length === 0 ? (
              <EmptyState message={t("dashboard.planningEmpty", lang)} />
            ) : (
              <TableWrap>
                <table className="w-full text-sm">
                  <THead>
                    <th className="py-2 pr-3">{t("dashboard.tblDate", lang)}</th>
                    <th className="py-2 pr-3">{t("dashboard.tblMenu", lang)}</th>
                    <th className="py-2 pr-3 text-right">{t("dashboard.tblPorsi", lang)}</th>
                    <th className="py-2 pr-3 text-right">{t("dashboard.tblKebutuhan", lang)}</th>
                    <th className="py-2 pr-3 text-right">{t("dashboard.tblShort", lang)}</th>
                  </THead>
                  <tbody>
                    {planning.map((p) => (
                      <tr
                        key={p.op_date}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pr-3">
                          <div className="font-mono text-[11px]">
                            {p.op_date}
                          </div>
                          {!p.operasional && (
                            <Badge tone="warn" className="mt-1">
                              {t("dashboard.badgeNonOp", lang)}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {p.menu_name ?? (
                            <span className="text-ink2/60">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {formatNumber(p.porsi_total, lang)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {formatKg(Number(p.total_kg), 1)}
                        </td>
                        <td
                          className={`py-2 pr-3 text-right font-mono text-xs font-black ${p.short_items > 0 ? "text-red-700" : "text-emerald-700"}`}
                        >
                          {p.short_items}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Section>

          <Section
            title={t("dashboard.stockAlertTitle", lang)}
            hint={
              shortItems.length > 0
                ? ti("dashboard.stockAlertHintBad", lang, {
                    n: shortItems.length,
                    gap: formatKg(totalGap)
                  })
                : t("dashboard.stockAlertHintOk", lang)
            }
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
              <TableWrap>
                <table className="w-full text-sm">
                  <THead>
                    <th className="py-2 pr-3">{t("dashboard.tblItem", lang)}</th>
                    <th className="py-2 pr-3 text-right">{t("dashboard.tblButuh", lang)}</th>
                    <th className="py-2 pr-3 text-right">{t("dashboard.tblAda", lang)}</th>
                    <th className="py-2 pr-3 text-right">{t("dashboard.tblKurang", lang)}</th>
                  </THead>
                  <tbody>
                    {shortItems.slice(0, 10).map((s) => (
                      <tr
                        key={s.item_code}
                        className="row-hover border-b border-ink/5"
                      >
                        <td className="py-2 pr-3 font-semibold">
                          {displayCode(s.item_code)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {Number(s.required).toFixed(2)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {Number(s.on_hand).toFixed(2)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs font-black text-red-700">
                          {Number(s.gap).toFixed(2)} {s.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Section>
        </div>

        {/* Nilai belanja semua supplier bertransaksi */}
        <Section
          title={t("dashboard.supplierSpendTitle", lang)}
          hint={ti("dashboard.supplierSpendHint", lang, {
            start: monthStart,
            end: today,
            n: topSup.length
          })}
        >
          {topSup.length === 0 ? (
            <EmptyState message={t("dashboard.supplierSpendEmpty", lang)} />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <THead>
                  <th className="py-2 pr-3">{t("dashboard.tblNo", lang)}</th>
                  <th className="py-2 pr-3">{t("common.supplier", lang)}</th>
                  <th className="py-2 pr-3">{t("dashboard.tblType", lang)}</th>
                  <th className="py-2 pr-3 text-right">{t("dashboard.tblInvoice", lang)}</th>
                  <th className="py-2 pr-3">{t("dashboard.tblTotalSpend", lang)}</th>
                </THead>
                <tbody>
                  {topSup.map((s, i) => (
                    <tr
                      key={s.supplier_id}
                      className="row-hover border-b border-ink/5"
                    >
                      <td className="py-2 pr-3 text-ink2">{i + 1}</td>
                      <td className="py-2 pr-3 font-semibold">
                        {s.supplier_name}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone="neutral">{s.supplier_type}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {s.invoice_count}
                      </td>
                      <td className="py-2 pr-3 text-left font-mono text-xs font-black">
                        {formatIDR(Number(s.total_spend))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
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
