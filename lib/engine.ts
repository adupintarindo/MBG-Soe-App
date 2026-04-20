// ============================================================================
// MBG Engine · TypeScript port of client-side MBG_ENGINE (HTML dashboard)
// Jembatan ke RPC Supabase — gunakan ini di server components / route handlers.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface PorsiCounts {
  kecil: number;
  besar: number;
  guru: number;
  total: number;
  operasional: boolean;
}

export interface Requirement {
  item_code: string;
  qty: number;
  unit: string;
  category: Database["public"]["Enums"]["item_category"];
  price_idr: number;
}

export interface Shortage {
  item_code: string;
  required: number;
  on_hand: number;
  gap: number;
  unit: string;
}

export interface UpcomingShortage {
  op_date: string;
  short_items: number;
  total_gap_kg: number;
}

export interface MonthlyRequirement {
  item_code: string;
  month: string;
  qty_kg: number;
}

export interface TopSupplier {
  supplier_id: string;
  supplier_name: string;
  supplier_type: Database["public"]["Enums"]["supplier_type"];
  total_spend: number;
  invoice_count: number;
}

export interface DailyPlan {
  op_date: string;
  menu_id: number | null;
  menu_name: string | null;
  porsi_total: number;
  porsi_eff: number;
  total_kg: number;
  short_items: number;
  operasional: boolean;
}

export interface DashboardKpis {
  students_total: number;
  schools_active: number;
  menu_today_id: number | null;
  menu_today_name: string | null;
  suppliers_active: number;
}

// ---------- RPC wrappers ----------

export async function porsiCounts(supabase: Client, date: string): Promise<PorsiCounts> {
  const { data, error } = await supabase
    .rpc("porsi_counts", { p_date: date })
    .single();
  if (error) throw error;
  return (
    data ?? { kecil: 0, besar: 0, guru: 0, total: 0, operasional: false }
  );
}

export interface PorsiCountsTiered {
  paud: number;
  sd13: number;
  sd46: number;
  smp_plus: number;
  total: number;
  operasional: boolean;
}

export async function porsiCountsTiered(
  supabase: Client,
  date: string
): Promise<PorsiCountsTiered> {
  const { data, error } = await supabase
    .rpc("porsi_counts_tiered", { p_date: date })
    .single();
  if (error) throw error;
  return (
    data ?? {
      paud: 0,
      sd13: 0,
      sd46: 0,
      smp_plus: 0,
      total: 0,
      operasional: false
    }
  );
}

export async function porsiEffective(supabase: Client, date: string): Promise<number> {
  const { data, error } = await supabase.rpc("porsi_effective", { p_date: date });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function requirementForDate(
  supabase: Client,
  date: string
): Promise<Requirement[]> {
  const { data, error } = await supabase.rpc("requirement_for_date", {
    p_date: date
  });
  if (error) throw error;
  return (data ?? []) as Requirement[];
}

export async function stockShortageForDate(
  supabase: Client,
  date: string
): Promise<Shortage[]> {
  const { data, error } = await supabase.rpc("stock_shortage_for_date", {
    p_date: date
  });
  if (error) throw error;
  return (data ?? []) as Shortage[];
}

export async function upcomingShortages(
  supabase: Client,
  horizon = 14
): Promise<UpcomingShortage[]> {
  const { data, error } = await supabase.rpc("upcoming_shortages", {
    p_horizon: horizon
  });
  if (error) throw error;
  return (data ?? []) as UpcomingShortage[];
}

export async function monthlyRequirements(
  supabase: Client,
  start: string,
  months = 4
): Promise<MonthlyRequirement[]> {
  const { data, error } = await supabase.rpc("monthly_requirements", {
    p_start: start,
    p_months: months
  });
  if (error) throw error;
  return (data ?? []) as MonthlyRequirement[];
}

export async function topSuppliersBySpend(
  supabase: Client,
  start: string,
  end: string,
  limit = 10
): Promise<TopSupplier[]> {
  const { data, error } = await supabase.rpc("top_suppliers_by_spend", {
    p_start: start,
    p_end: end,
    p_limit: limit
  });
  if (error) throw error;
  return (data ?? []) as TopSupplier[];
}

export async function dailyPlanning(
  supabase: Client,
  horizon = 10
): Promise<DailyPlan[]> {
  const { data, error } = await supabase.rpc("daily_planning", {
    p_horizon: horizon
  });
  if (error) throw error;
  return (data ?? []) as DailyPlan[];
}

export async function dashboardKpis(supabase: Client): Promise<DashboardKpis> {
  const { data, error } = await supabase.rpc("dashboard_kpis").single();
  if (error) throw error;
  return (
    data ?? {
      students_total: 0,
      schools_active: 0,
      menu_today_id: null,
      menu_today_name: null,
      suppliers_active: 0
    }
  );
}

// ---------- BOM Variance (plan vs actual) ----------

export interface BomVarianceRow {
  item_code: string;
  name_en: string | null;
  unit: string;
  category: Database["public"]["Enums"]["item_category"];
  plan_kg: number;
  actual_kg: number;
  variance_kg: number;
  variance_pct: number | null;
  flag: "OVER" | "UNDER" | "OK" | string;
}

export interface BomVarianceSummary {
  total_items: number;
  over_cnt: number;
  under_cnt: number;
  ok_cnt: number;
  total_plan_kg: number;
  total_actual_kg: number;
  total_variance_kg: number;
  total_variance_pct: number | null;
}

export interface BomVarianceMenuRow {
  menu_id: number;
  menu_name: string;
  days_served: number;
  plan_porsi: number;
  plan_kg_total: number;
  plan_cost_idr: number;
}

export async function bomVariance(
  supabase: Client,
  start: string,
  end: string,
  thresholdPct = 10
): Promise<BomVarianceRow[]> {
  const { data, error } = await supabase.rpc("bom_variance", {
    p_start: start,
    p_end: end,
    p_threshold_pct: thresholdPct
  });
  if (error) throw error;
  return (data ?? []) as BomVarianceRow[];
}

export async function bomVarianceSummary(
  supabase: Client,
  start: string,
  end: string,
  thresholdPct = 10
): Promise<BomVarianceSummary> {
  const { data, error } = await supabase.rpc("bom_variance_summary", {
    p_start: start,
    p_end: end,
    p_threshold_pct: thresholdPct
  });
  if (error) throw error;
  const row = (data ?? [])[0] as BomVarianceSummary | undefined;
  return (
    row ?? {
      total_items: 0,
      over_cnt: 0,
      under_cnt: 0,
      ok_cnt: 0,
      total_plan_kg: 0,
      total_actual_kg: 0,
      total_variance_kg: 0,
      total_variance_pct: null
    }
  );
}

export async function bomVarianceByMenu(
  supabase: Client,
  start: string,
  end: string
): Promise<BomVarianceMenuRow[]> {
  const { data, error } = await supabase.rpc("bom_variance_by_menu", {
    p_start: start,
    p_end: end
  });
  if (error) throw error;
  return (data ?? []) as BomVarianceMenuRow[];
}

// ---------- Supplier Action Tracker (Onboarding / MoM / Field) ----------

export type ActionStatus = Database["public"]["Enums"]["action_status"];
export type ActionPriority = Database["public"]["Enums"]["action_priority"];
export type ActionSource = Database["public"]["Enums"]["action_source"];

export interface SupplierAction {
  id: number;
  supplier_id: string | null;
  supplier_name: string | null;
  related_scope: string | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  owner: string;
  target_date: string | null;
  done_at: string | null;
  blocked_reason: string | null;
  output_notes: string | null;
  source: ActionSource;
  source_ref: string | null;
  days_to_target: number | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActionReadinessSnapshot {
  total: number;
  open_cnt: number;
  in_progress_cnt: number;
  blocked_cnt: number;
  done_cnt: number;
  cancelled_cnt: number;
  overdue_cnt: number;
  high_priority_open: number;
  readiness_pct: number;
}

export interface OverdueAction {
  id: number;
  supplier_id: string | null;
  supplier_name: string | null;
  related_scope: string | null;
  title: string;
  priority: ActionPriority;
  status: ActionStatus;
  target_date: string;
  days_late: number;
  owner: string;
}

export async function listSupplierActions(
  supabase: Client,
  opts: {
    supplierId?: string | null;
    status?: ActionStatus | null;
    source?: ActionSource | null;
  } = {}
): Promise<SupplierAction[]> {
  const { data, error } = await supabase.rpc("list_supplier_actions", {
    p_supplier_id: opts.supplierId ?? undefined,
    p_status: opts.status ?? undefined,
    p_source: opts.source ?? undefined
  });
  if (error) throw error;
  return (data ?? []) as SupplierAction[];
}

export async function updateActionStatus(
  supabase: Client,
  id: number,
  status: ActionStatus,
  notes: string | null = null,
  blockedReason: string | null = null
) {
  const { data, error } = await supabase.rpc("update_action_status", {
    p_id: id,
    p_status: status,
    p_notes: notes ?? undefined,
    p_blocked_reason: blockedReason ?? undefined
  });
  if (error) throw error;
  return data;
}

export async function actionReadinessSnapshot(
  supabase: Client
): Promise<ActionReadinessSnapshot> {
  const { data, error } = await supabase
    .rpc("action_readiness_snapshot")
    .single();
  if (error) throw error;
  return (
    data ?? {
      total: 0,
      open_cnt: 0,
      in_progress_cnt: 0,
      blocked_cnt: 0,
      done_cnt: 0,
      cancelled_cnt: 0,
      overdue_cnt: 0,
      high_priority_open: 0,
      readiness_pct: 0
    }
  );
}

export async function overdueActions(
  supabase: Client
): Promise<OverdueAction[]> {
  const { data, error } = await supabase.rpc("overdue_actions");
  if (error) throw error;
  return (data ?? []) as OverdueAction[];
}

// ---------- GRN QC Checks + Non-Conformance ----------

export type QcResult = Database["public"]["Enums"]["qc_result"];
export type NcrSeverity = Database["public"]["Enums"]["ncr_severity"];
export type NcrStatus = Database["public"]["Enums"]["ncr_status"];

export interface QcTemplate {
  id: number;
  category: Database["public"]["Enums"]["item_category"];
  checkpoint: string;
  expected: string | null;
  is_critical: boolean;
  sort_order: number;
}

export interface GrnQcCheck {
  id: number;
  grn_no: string;
  item_code: string | null;
  checkpoint: string;
  is_critical: boolean;
  result: QcResult;
  note: string | null;
  photo_url: string | null;
  checked_by: string | null;
  checked_at: string;
}

export interface NcrEntry {
  id: number;
  ncr_no: string | null;
  grn_no: string | null;
  supplier_id: string | null;
  item_code: string | null;
  severity: NcrSeverity;
  status: NcrStatus;
  issue: string;
  root_cause: string | null;
  corrective_action: string | null;
  qty_affected: number | null;
  unit: string | null;
  cost_impact_idr: number | null;
  reported_at: string;
  resolved_at: string | null;
  photo_url: string | null;
  linked_action_id: number | null;
}

export interface GrnQcSummary {
  total: number;
  pass: number;
  minor: number;
  major: number;
  critical: number;
  fail_total: number;
  has_critical: boolean;
}

export interface NcrSnapshot {
  total: number;
  open_cnt: number;
  in_progress_cnt: number;
  resolved_cnt: number;
  critical_open: number;
  avg_resolve_days: number | null;
}

export async function qcTemplateForItem(
  supabase: Client,
  itemCode: string
): Promise<QcTemplate[]> {
  const { data, error } = await supabase.rpc("qc_template_for_item", {
    p_item: itemCode
  });
  if (error) throw error;
  return (data ?? []) as QcTemplate[];
}

export async function listGrnQcChecks(
  supabase: Client,
  grnNo: string
): Promise<GrnQcCheck[]> {
  const { data, error } = await supabase
    .from("grn_qc_checks")
    .select(
      "id, grn_no, item_code, checkpoint, is_critical, result, note, photo_url, checked_by, checked_at"
    )
    .eq("grn_no", grnNo)
    .order("checked_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GrnQcCheck[];
}

export async function grnQcSummary(
  supabase: Client,
  grnNo: string
): Promise<GrnQcSummary> {
  const { data, error } = await supabase.rpc("grn_qc_summary", {
    p_grn_no: grnNo
  });
  if (error) throw error;
  const row = (data ?? [])[0] as GrnQcSummary | undefined;
  return (
    row ?? {
      total: 0,
      pass: 0,
      minor: 0,
      major: 0,
      critical: 0,
      fail_total: 0,
      has_critical: false
    }
  );
}

export async function listNcr(
  supabase: Client,
  opts: {
    status?: NcrStatus;
    supplierId?: string;
    grnNo?: string;
    limit?: number;
  } = {}
): Promise<NcrEntry[]> {
  let q = supabase
    .from("non_conformance_log")
    .select(
      "id, ncr_no, grn_no, supplier_id, item_code, severity, status, issue, root_cause, corrective_action, qty_affected, unit, cost_impact_idr, reported_at, resolved_at, photo_url, linked_action_id"
    )
    .order("reported_at", { ascending: false });
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.supplierId) q = q.eq("supplier_id", opts.supplierId);
  if (opts.grnNo) q = q.eq("grn_no", opts.grnNo);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as NcrEntry[];
}

export async function ncrSnapshot(supabase: Client): Promise<NcrSnapshot> {
  const { data, error } = await supabase.rpc("ncr_open_snapshot");
  if (error) throw error;
  const row = (data ?? [])[0] as NcrSnapshot | undefined;
  return (
    row ?? {
      total: 0,
      open_cnt: 0,
      in_progress_cnt: 0,
      resolved_cnt: 0,
      critical_open: 0,
      avg_resolve_days: null
    }
  );
}

// ---------- Supplier Re-Evaluation + QC Gallery ----------

export type RevalPeriod = Database["public"]["Enums"]["reval_period"];

export interface SupplierScorecardAuto {
  quality_score: number;
  delivery_score: number;
  price_score: number;
  compliance_score: number;
  responsiveness_score: number;
  total_score: number;
  grn_count: number;
  qc_pass: number;
  qc_fail: number;
  ncr_critical_open: number;
  actions_overdue: number;
  actions_total: number;
}

export interface SupplierRevalRow {
  id: number;
  supplier_id: string;
  period: RevalPeriod;
  period_start: string;
  period_end: string;
  quality_score: number;
  delivery_score: number;
  price_score: number;
  compliance_score: number;
  responsiveness_score: number;
  total_score: number;
  recommendation: string | null;
  notes: string | null;
  evaluated_at: string;
}

export interface QcGalleryItem {
  source: string;
  ref_id: string;
  item_code: string | null;
  result: string;
  note: string | null;
  photo_url: string;
  captured_at: string;
}

export async function supplierScorecardAuto(
  supabase: Client,
  supplierId: string,
  start: string,
  end: string
): Promise<SupplierScorecardAuto> {
  const { data, error } = await supabase.rpc("supplier_scorecard_auto", {
    p_supplier_id: supplierId,
    p_start: start,
    p_end: end
  });
  if (error) throw error;
  const row = (data ?? [])[0] as SupplierScorecardAuto | undefined;
  return (
    row ?? {
      quality_score: 0,
      delivery_score: 0,
      price_score: 0,
      compliance_score: 0,
      responsiveness_score: 0,
      total_score: 0,
      grn_count: 0,
      qc_pass: 0,
      qc_fail: 0,
      ncr_critical_open: 0,
      actions_overdue: 0,
      actions_total: 0
    }
  );
}

export async function saveSupplierReval(
  supabase: Client,
  args: {
    supplierId: string;
    period: RevalPeriod;
    start: string;
    end: string;
    recommendation?: string | null;
    notes?: string | null;
  }
): Promise<number> {
  const { data, error } = await supabase.rpc("save_supplier_reval", {
    p_supplier_id: args.supplierId,
    p_period: args.period,
    p_start: args.start,
    p_end: args.end,
    p_recommendation: args.recommendation ?? undefined,
    p_notes: args.notes ?? undefined
  });
  if (error) throw error;
  return Number(data);
}

export async function listSupplierReval(
  supabase: Client,
  supplierId: string
): Promise<SupplierRevalRow[]> {
  const { data, error } = await supabase.rpc("list_supplier_reval", {
    p_supplier_id: supplierId
  });
  if (error) throw error;
  return (data ?? []) as SupplierRevalRow[];
}

export async function supplierQcGallery(
  supabase: Client,
  supplierId: string,
  limit = 50
): Promise<QcGalleryItem[]> {
  const { data, error } = await supabase.rpc("supplier_qc_gallery", {
    p_supplier_id: supplierId,
    p_limit: limit
  });
  if (error) throw error;
  return (data ?? []) as QcGalleryItem[];
}

// ============================================================================
// SOP Runs (Module 5 · SOP form embeds)
// ============================================================================

export interface SopRunInput {
  sopId: string;
  sopTitle: string;
  sopCategory: string;
  stepsChecked: number;
  stepsTotal: number;
  risksFlagged: string[];
  notes?: string | null;
  runDate?: string | null;
}

export interface SopRunRow {
  id: number;
  sop_id: string;
  sop_title: string;
  sop_category: string;
  run_date: string;
  steps_checked: number;
  steps_total: number;
  risks_flagged: string[];
  notes: string | null;
  evaluator: string | null;
  created_at: string;
}

export interface SopComplianceRow {
  sop_id: string;
  sop_title: string;
  sop_category: string;
  run_count: number;
  last_run: string | null;
  avg_completion: number;
  total_risks: number;
}

export async function logSopRun(
  supabase: Client,
  input: SopRunInput
): Promise<number> {
  const { data, error } = await supabase.rpc("log_sop_run", {
    p_sop_id: input.sopId,
    p_sop_title: input.sopTitle,
    p_sop_category: input.sopCategory,
    p_steps_checked: input.stepsChecked,
    p_steps_total: input.stepsTotal,
    p_risks_flagged: input.risksFlagged,
    p_notes: input.notes ?? undefined,
    p_run_date: input.runDate ?? undefined
  });
  if (error) throw error;
  return data as number;
}

export async function listSopRuns(
  supabase: Client,
  sopId: string | null,
  limit = 25
): Promise<SopRunRow[]> {
  const { data, error } = await supabase.rpc("list_sop_runs", {
    p_sop_id: sopId ?? undefined,
    p_limit: limit
  });
  if (error) throw error;
  return (data ?? []) as SopRunRow[];
}

export async function sopComplianceSummary(
  supabase: Client,
  start?: string | null,
  end?: string | null
): Promise<SopComplianceRow[]> {
  const { data, error } = await supabase.rpc("sop_compliance_summary", {
    p_start: start ?? undefined,
    p_end: end ?? undefined
  });
  if (error) throw error;
  return (data ?? []) as SopComplianceRow[];
}

// ---------- Client-side pure helpers (tidak perlu RPC) ----------

export function formatIDR(n: number | null | undefined): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(v);
}

export function formatKg(n: number | null | undefined, digits = 1): string {
  const v = Number(n || 0);
  return `${v.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })} kg`;
}

export function formatDateID(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

/**
 * Short numeric date DD-MM-YYYY (day-first, Indonesian convention).
 * Accepts ISO "YYYY-MM-DD" strings or Date objects.
 */
export function formatDateShort(d: Date | string | null | undefined): string {
  if (d == null || d === "") return "—";
  if (typeof d === "string") {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const da = String(date.getDate()).padStart(2, "0");
  return `${da}-${mo}-${yr}`;
}

const DAY_NAMES_LONG = {
  ID: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  EN: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
} as const;

const MONTH_NAMES_LONG = {
  ID: [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ],
  EN: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
} as const;

/**
 * Long date with weekday — "Senin, 20 April 2026" (ID) or "Monday, 20 April 2026" (EN).
 * Accepts ISO "YYYY-MM-DD" strings or Date objects. Timezone-safe for date-only strings.
 */
export function formatDateLong(
  d: Date | string | null | undefined,
  lang: "ID" | "EN" = "ID"
): string {
  if (d == null || d === "") return "—";
  let date: Date;
  if (typeof d === "string") {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    } else {
      date = new Date(d);
    }
  } else {
    date = d;
  }
  if (Number.isNaN(date.getTime())) return "—";
  const day = DAY_NAMES_LONG[lang][date.getDay()];
  const month = MONTH_NAMES_LONG[lang][date.getMonth()];
  return `${day}, ${date.getDate()} ${month} ${date.getFullYear()}`;
}

export function isWeekend(d: Date | string): boolean {
  const date = typeof d === "string" ? new Date(d) : d;
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

export function toISODate(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

// ============================================================================
// 0031..0037 · Batch, payments, deliveries, audit, budget, supplier portal,
// global search. RPC wrappers.
// ============================================================================

export interface ExpiringBatch {
  id: number;
  item_code: string;
  item_name: string | null;
  grn_no: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  qty_remaining: number;
  unit: string;
  expiry_date: string;
  days_left: number;
  status: "expired" | "urgent" | "soon" | string;
}

export async function expiringBatches(
  supabase: Client,
  days = 14
): Promise<ExpiringBatch[]> {
  const { data, error } = await supabase.rpc("expiring_batches", {
    p_days: days
  });
  if (error) throw error;
  return (data ?? []) as ExpiringBatch[];
}

export interface FifoConsumeRow {
  batch_id: number;
  consumed: number;
  remaining_after: number;
}

export async function stockConsumeFifo(
  supabase: Client,
  params: {
    item_code: string;
    qty: number;
    ref_doc?: string;
    ref_no?: string | null;
    note?: string | null;
  }
): Promise<FifoConsumeRow[]> {
  const { data, error } = await supabase.rpc("stock_consume_fifo", {
    p_item_code: params.item_code,
    p_qty: params.qty,
    p_ref_doc: params.ref_doc ?? "menu_consumption",
    p_ref_no: params.ref_no ?? null,
    p_note: params.note ?? null
  });
  if (error) throw error;
  return (data ?? []) as FifoConsumeRow[];
}

// ---------- Payments / cashflow ----------

export interface OutstandingBySupplier {
  supplier_id: string;
  supplier_name: string;
  invoice_count: number;
  invoice_total: number;
  paid_total: number;
  outstanding: number;
  oldest_due: string | null;
}

export async function outstandingBySupplier(
  supabase: Client
): Promise<OutstandingBySupplier[]> {
  const { data, error } = await supabase.rpc("outstanding_by_supplier");
  if (error) throw error;
  return (data ?? []) as OutstandingBySupplier[];
}

export interface CashflowRow {
  period: string;
  cash_in: number;
  cash_out: number;
  net: number;
  cumulative: number;
}

export async function monthlyCashflow(
  supabase: Client,
  from?: string,
  to?: string
): Promise<CashflowRow[]> {
  const args: Record<string, string> = {};
  if (from) args.p_from = from;
  if (to) args.p_to = to;
  const { data, error } = await supabase.rpc("monthly_cashflow", args);
  if (error) throw error;
  return (data ?? []) as CashflowRow[];
}

export interface PaymentSummary {
  invoice_no: string;
  invoice_total: number;
  paid: number;
  outstanding: number;
  payment_count: number;
  last_payment_date: string | null;
}

export async function paymentSummaryByInvoice(
  supabase: Client,
  invoiceNo: string
): Promise<PaymentSummary | null> {
  const { data, error } = await supabase.rpc("payment_summary_by_invoice", {
    p_invoice_no: invoiceNo
  });
  if (error) throw error;
  const row = (data ?? [])[0] as PaymentSummary | undefined;
  return row ?? null;
}

// ---------- Deliveries ----------

export interface DeliverySummaryRow {
  delivery_date: string;
  delivery_no: string;
  status: string;
  stops_total: number;
  stops_delivered: number;
  porsi_planned: number;
  porsi_delivered: number;
  fulfilment_pct: number | null;
}

export async function dailyDeliverySummary(
  supabase: Client,
  from?: string,
  to?: string
): Promise<DeliverySummaryRow[]> {
  const args: Record<string, string> = {};
  if (from) args.p_from = from;
  if (to) args.p_to = to;
  const { data, error } = await supabase.rpc("daily_delivery_summary", args);
  if (error) throw error;
  return (data ?? []) as DeliverySummaryRow[];
}

export async function deliveryGenerateForDate(
  supabase: Client,
  date: string
): Promise<string> {
  const { data, error } = await supabase.rpc("delivery_generate_for_date", {
    p_date: date
  });
  if (error) throw error;
  return (data ?? "") as string;
}

// ---------- Budget ----------

export interface BudgetBurnRow {
  period: string;
  budget_total: number;
  spent_po: number;
  spent_invoice: number;
  spent_paid: number;
  burn_pct: number | null;
  remaining: number;
}

export async function budgetBurn(
  supabase: Client,
  from?: string,
  to?: string
): Promise<BudgetBurnRow[]> {
  const args: Record<string, string> = {};
  if (from) args.p_from = from;
  if (to) args.p_to = to;
  const { data, error } = await supabase.rpc("budget_burn", args);
  if (error) throw error;
  return (data ?? []) as BudgetBurnRow[];
}

export interface CostPerPortionRow {
  op_date: string;
  total_porsi: number;
  spent_po: number;
  cost_per_portion: number | null;
  target: number | null;
}

export async function costPerPortionDaily(
  supabase: Client,
  from?: string,
  to?: string
): Promise<CostPerPortionRow[]> {
  const args: Record<string, string> = {};
  if (from) args.p_from = from;
  if (to) args.p_to = to;
  const { data, error } = await supabase.rpc("cost_per_portion_daily", args);
  if (error) throw error;
  return (data ?? []) as CostPerPortionRow[];
}

// ---------- Supplier portal ----------

export interface SupplierPoInboxRow {
  po_no: string;
  po_date: string;
  delivery_date: string | null;
  total: number;
  po_status: Database["public"]["Enums"]["po_status"];
  ack_decision: Database["public"]["Enums"]["po_ack_decision"];
  ack_at: string | null;
  grn_status: Database["public"]["Enums"]["grn_status"] | null;
  invoice_status: Database["public"]["Enums"]["invoice_status"] | null;
  unread_msg: number;
}

export async function supplierPoInbox(
  supabase: Client,
  limit = 30
): Promise<SupplierPoInboxRow[]> {
  const { data, error } = await supabase.rpc("supplier_po_inbox", {
    p_limit: limit
  });
  if (error) throw error;
  return (data ?? []) as SupplierPoInboxRow[];
}

export interface SupplierPaymentStatusRow {
  invoice_no: string;
  po_no: string | null;
  inv_date: string;
  due_date: string | null;
  total: number;
  paid: number;
  outstanding: number;
  status: Database["public"]["Enums"]["invoice_status"];
}

export async function supplierPaymentStatus(
  supabase: Client
): Promise<SupplierPaymentStatusRow[]> {
  const { data, error } = await supabase.rpc("supplier_payment_status");
  if (error) throw error;
  return (data ?? []) as SupplierPaymentStatusRow[];
}

// ---------- Global search ----------

export interface SearchHit {
  kind:
    | "po"
    | "grn"
    | "invoice"
    | "qt"
    | "pr"
    | "item"
    | "supplier"
    | "menu"
    | "school"
    | "delivery"
    | string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  score: number;
}

export async function globalSearch(
  supabase: Client,
  query: string,
  limit = 10
): Promise<SearchHit[]> {
  if (!query || query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc("global_search", {
    p_query: query.trim(),
    p_limit: limit
  });
  if (error) throw error;
  return (data ?? []) as SearchHit[];
}

// ---------- Audit ----------

export interface AuditEvent {
  id: number;
  ts: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: Database["public"]["Enums"]["user_role"] | null;
  table_name: string;
  row_pk: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  diff: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    changed?: string[];
  };
  request_id: string | null;
  user_agent: string | null;
  ip: string | null;
}

export async function listAudit(
  supabase: Client,
  filters: {
    table?: string;
    actor?: string;
    action?: "INSERT" | "UPDATE" | "DELETE";
    from?: string;
    to?: string;
    limit?: number;
  } = {}
): Promise<AuditEvent[]> {
  const args: Record<string, unknown> = {};
  if (filters.table) args.p_table = filters.table;
  if (filters.actor) args.p_actor = filters.actor;
  if (filters.action) args.p_action = filters.action;
  if (filters.from) args.p_from = filters.from;
  if (filters.to) args.p_to = filters.to;
  if (filters.limit) args.p_limit = filters.limit;
  const { data, error } = await supabase.rpc("list_audit", args);
  if (error) throw error;
  return (data ?? []) as unknown as AuditEvent[];
}
