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
    p_supplier_id: opts.supplierId ?? null,
    p_status: opts.status ?? null,
    p_source: opts.source ?? null
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
    p_notes: notes,
    p_blocked_reason: blockedReason
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
    p_recommendation: args.recommendation ?? null,
    p_notes: args.notes ?? null
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
