/**
 * BGN (Badan Gizi Nasional) — data access helpers.
 *
 * Alasan file ini: migrasi 0050/0051 menambah 15 tabel yang belum ikut
 * ter-regenerate ke types/database.ts. Supaya page/API route tetap compile
 * clean tanpa ribuan `as any`, semua query tabel BGN disalurkan lewat
 * fungsi di sini dengan type hasil yang eksplisit.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/* ============================================================================
 * Domain types (mirror migrasi 0050)
 * ========================================================================== */

export type SppgRole =
  | "kepala_sppg"
  | "pengawas_gizi"
  | "pengawas_keuangan"
  | "jurutama_masak"
  | "asisten_lapangan"
  | "persiapan_makanan"
  | "pemrosesan_makanan"
  | "pengemasan"
  | "pemorsian"
  | "distribusi"
  | "pencucian_alat"
  | "pencucian"
  | "sanitasi"
  | "kader_posyandu";

export type OrganolepticPhase =
  | "before_dispatch"
  | "on_arrival"
  | "before_consumption";

export type OrganolepticVerdict = "aman" | "tidak_aman";

export type CoaCategory =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export type PayrollStatus = "draft" | "finalized" | "paid";

export type AttendanceStatus = "H" | "S" | "I" | "A" | "OFF";

export type CashFlowDirection = "masuk" | "keluar";

/* ============================================================================
 * Row types
 * ========================================================================== */

export interface SppgStaff {
  id: string;
  seq_no: number | null;
  full_name: string;
  nik: string | null;
  phone: string | null;
  email: string | null;
  role: SppgRole;
  role_label: string | null;
  bank_name: string | null;
  bank_account: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  gaji_pokok: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodSampleLog {
  id: string;
  delivery_date: string;
  delivery_seq: number;
  school_id: string | null;
  menu_assign_date: string | null;
  officer_id: string | null;
  officer_signature_url: string | null;
  sample_kept: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface OrganolepticTest {
  id: string;
  test_date: string;
  test_phase: OrganolepticPhase;
  school_id: string | null;
  menu_assign_date: string | null;
  rasa: number | null;
  warna: number | null;
  aroma: number | null;
  tekstur: number | null;
  verdict: OrganolepticVerdict;
  officer_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Posyandu {
  id: string;
  name: string;
  village: string | null;
  district: string | null;
  lat: number | string | null;
  lng: number | string | null;
  active: boolean;
  created_at: string;
}

export interface KaderIncentive {
  id: string;
  posyandu_id: string | null;
  kader_staff_id: string | null;
  period_start: string;
  period_end: string;
  porsi_senin: number;
  porsi_kamis: number;
  unit_cost: number | string;
  total_amount: number | string;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export interface PicSchool {
  id: string;
  school_id: string | null;
  pic_staff_id: string | null;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface PicIncentive {
  id: string;
  pic_school_id: string | null;
  period_start: string;
  period_end: string;
  total_porsi: number;
  unit_cost: number | string;
  total_amount: number | string;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export interface DailyCashLog {
  id: string;
  log_date: string;
  log_time: string | null;
  uang_masuk: number | string;
  uang_keluar: number | string;
  saldo_akhir: number | string | null;
  keterangan: string | null;
  bukti_nota_url: string | null;
  category: string | null;
  po_no: string | null;
  po_line_no: number | null;
  created_at: string;
  created_by: string | null;
}

export interface ChartOfAccount {
  code: string;
  name: string;
  category: CoaCategory;
  parent_code: string | null;
  active: boolean;
  notes: string | null;
}

export interface GlEntry {
  id: string;
  entry_date: string;
  description: string | null;
  debit_account: string | null;
  credit_account: string | null;
  amount: number | string;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface PettyCash {
  id: string;
  tx_date: string;
  tx_time: string | null;
  direction: CashFlowDirection;
  amount: number | string;
  description: string | null;
  bukti_url: string | null;
  balance_after: number | string | null;
  created_at: string;
  created_by: string | null;
}

export interface PayrollPeriod {
  id: string;
  period_label: string;
  start_date: string;
  end_date: string;
  status: PayrollStatus;
  finalized_at: string | null;
  paid_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface PayrollAttendance {
  id: string;
  period_id: string | null;
  staff_id: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  lembur_hours: number | string;
  notes: string | null;
  created_at: string;
}

export interface PayrollSlip {
  id: string;
  period_id: string | null;
  staff_id: string | null;
  gaji_pokok: number | string;
  hari_kerja: number;
  upah_per_hari: number | string;
  nilai_gaji: number | string;
  tunjangan: number | string;
  insentif_kehadiran: number | string;
  insentif_kinerja: number | string;
  lain_lain: number | string;
  lembur_jam: number | string;
  upah_lembur_jam: number | string;
  total_lembur: number | string;
  potongan_kehadiran: number | string;
  potongan_bpjs_kes: number | string;
  potongan_bpjs_tk: number | string;
  potongan_lain: number | string;
  penerimaan_kotor: number | string;
  penerimaan_bersih: number | string;
  paid: boolean;
  paid_at: string | null;
  transfer_ref: string | null;
  created_at: string;
}

export interface BgnGenerationLog {
  id: string;
  lampiran_code: string;
  format: "pdf" | "docx" | "xlsx";
  period_start: string | null;
  period_end: string | null;
  scope_school_id: string | null;
  generated_at: string;
  generated_by: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
}

/* ============================================================================
 * Helpers
 * ========================================================================== */

/**
 * Casting escape hatch — aman dipakai karena tabel BGN memang ada di database,
 * tapi belum ter-generate ke `types/database.ts`. Kita re-generate setelah
 * 0050/0051 di-apply ke Supabase Cloud.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

function asAny(client: Client): AnyClient {
  return client as AnyClient;
}

/* ----------------------------- SPPG Staff --------------------------------- */

export async function listSppgStaff(
  supabase: Client,
  opts: { active?: boolean } = {}
): Promise<SppgStaff[]> {
  let q = asAny(supabase).from("sppg_staff").select("*").order("seq_no");
  if (opts.active !== undefined) q = q.eq("active", opts.active);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SppgStaff[];
}

/* ----------------------------- Food Sample -------------------------------- */

export async function listFoodSampleLog(
  supabase: Client,
  opts: { from?: string; to?: string; limit?: number } = {}
): Promise<FoodSampleLog[]> {
  let q = asAny(supabase)
    .from("food_sample_log")
    .select("*")
    .order("delivery_date", { ascending: false });
  if (opts.from) q = q.gte("delivery_date", opts.from);
  if (opts.to) q = q.lte("delivery_date", opts.to);
  q = q.limit(opts.limit ?? 100);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as FoodSampleLog[];
}

/* ----------------------------- Organoleptic ------------------------------- */

export async function listOrganolepticTest(
  supabase: Client,
  opts: { from?: string; to?: string; limit?: number } = {}
): Promise<OrganolepticTest[]> {
  let q = asAny(supabase)
    .from("organoleptic_test")
    .select("*")
    .order("test_date", { ascending: false });
  if (opts.from) q = q.gte("test_date", opts.from);
  if (opts.to) q = q.lte("test_date", opts.to);
  q = q.limit(opts.limit ?? 100);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as OrganolepticTest[];
}

/* ----------------------------- Daily Cash Log ----------------------------- */

export async function listDailyCashLog(
  supabase: Client,
  opts: { from?: string; to?: string; limit?: number } = {}
): Promise<DailyCashLog[]> {
  let q = asAny(supabase)
    .from("daily_cash_log")
    .select("*")
    .order("log_date", { ascending: false });
  if (opts.from) q = q.gte("log_date", opts.from);
  if (opts.to) q = q.lte("log_date", opts.to);
  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DailyCashLog[];
}

/* ----------------------------- Chart of Accounts -------------------------- */

export async function listChartOfAccounts(
  supabase: Client,
  opts: { active?: boolean } = {}
): Promise<ChartOfAccount[]> {
  let q = asAny(supabase).from("chart_of_accounts").select("*").order("code");
  if (opts.active !== undefined) q = q.eq("active", opts.active);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ChartOfAccount[];
}

/* ----------------------------- GL Entry ----------------------------------- */

export async function listGlEntry(
  supabase: Client,
  opts: { from?: string; to?: string; account?: string; limit?: number } = {}
): Promise<GlEntry[]> {
  let q = asAny(supabase)
    .from("gl_entry")
    .select("*")
    .order("entry_date", { ascending: false });
  if (opts.from) q = q.gte("entry_date", opts.from);
  if (opts.to) q = q.lte("entry_date", opts.to);
  if (opts.account) {
    q = q.or(`debit_account.eq.${opts.account},credit_account.eq.${opts.account}`);
  }
  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GlEntry[];
}

/* ----------------------------- Petty Cash --------------------------------- */

export async function listPettyCash(
  supabase: Client,
  opts: { from?: string; to?: string; limit?: number } = {}
): Promise<PettyCash[]> {
  let q = asAny(supabase)
    .from("petty_cash")
    .select("*")
    .order("tx_date", { ascending: false });
  if (opts.from) q = q.gte("tx_date", opts.from);
  if (opts.to) q = q.lte("tx_date", opts.to);
  q = q.limit(opts.limit ?? 100);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PettyCash[];
}

/* ----------------------------- Payroll ------------------------------------ */

export async function listPayrollPeriod(
  supabase: Client,
  opts: { limit?: number } = {}
): Promise<PayrollPeriod[]> {
  const { data, error } = await asAny(supabase)
    .from("payroll_period")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(opts.limit ?? 12);
  if (error) throw error;
  return (data ?? []) as PayrollPeriod[];
}

export async function listPayrollSlip(
  supabase: Client,
  opts: { period_id?: string; limit?: number } = {}
): Promise<PayrollSlip[]> {
  let q = asAny(supabase).from("payroll_slip").select("*");
  if (opts.period_id) q = q.eq("period_id", opts.period_id);
  q = q.order("created_at", { ascending: false }).limit(opts.limit ?? 100);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PayrollSlip[];
}

export async function listPayrollAttendance(
  supabase: Client,
  opts: {
    period_id?: string;
    staff_id?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {}
): Promise<PayrollAttendance[]> {
  let q = asAny(supabase)
    .from("payroll_attendance")
    .select("*")
    .order("attendance_date", { ascending: false });
  if (opts.period_id) q = q.eq("period_id", opts.period_id);
  if (opts.staff_id) q = q.eq("staff_id", opts.staff_id);
  if (opts.from) q = q.gte("attendance_date", opts.from);
  if (opts.to) q = q.lte("attendance_date", opts.to);
  q = q.limit(opts.limit ?? 500);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PayrollAttendance[];
}

/* ----------------------------- Kader / PIC Insentif ----------------------- */

export async function listKaderIncentive(
  supabase: Client,
  opts: { limit?: number } = {}
): Promise<KaderIncentive[]> {
  const { data, error } = await asAny(supabase)
    .from("kader_incentive")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(opts.limit ?? 50);
  if (error) throw error;
  return (data ?? []) as KaderIncentive[];
}

export async function listPicIncentive(
  supabase: Client,
  opts: { limit?: number } = {}
): Promise<PicIncentive[]> {
  const { data, error } = await asAny(supabase)
    .from("pic_incentive")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(opts.limit ?? 50);
  if (error) throw error;
  return (data ?? []) as PicIncentive[];
}

export async function listPosyandu(
  supabase: Client
): Promise<Posyandu[]> {
  const { data, error } = await asAny(supabase)
    .from("posyandu")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Posyandu[];
}

export async function listPicSchool(
  supabase: Client,
  opts: { active?: boolean } = {}
): Promise<PicSchool[]> {
  let q = asAny(supabase).from("pic_school").select("*");
  if (opts.active !== undefined) q = q.eq("active", opts.active);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PicSchool[];
}

/* ----------------------------- Beneficiaries ------------------------------ */

export type PregnantPhase = "hamil" | "menyusui";

export interface BeneficiaryPregnant {
  id: string;
  full_name: string;
  nik: string | null;
  phase: PregnantPhase;
  gestational_week: number | null;
  child_age_months: number | null;
  age: number | null;
  posyandu_id: string | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryToddler {
  id: string;
  full_name: string;
  nik: string | null;
  dob: string | null;
  gender: "L" | "P" | null;
  mother_name: string | null;
  posyandu_id: string | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listBeneficiaryPregnant(
  supabase: Client,
  opts: { active?: boolean } = {}
): Promise<BeneficiaryPregnant[]> {
  let q = asAny(supabase).from("beneficiary_pregnant").select("*");
  if (opts.active !== undefined) q = q.eq("active", opts.active);
  const { data, error } = await q.order("full_name");
  if (error) throw error;
  return (data ?? []) as BeneficiaryPregnant[];
}

export async function listBeneficiaryToddler(
  supabase: Client,
  opts: { active?: boolean } = {}
): Promise<BeneficiaryToddler[]> {
  let q = asAny(supabase).from("beneficiary_toddler").select("*");
  if (opts.active !== undefined) q = q.eq("active", opts.active);
  const { data, error } = await q.order("full_name");
  if (error) throw error;
  return (data ?? []) as BeneficiaryToddler[];
}

export interface PorsiBreakdown {
  schools_count: number;
  students_total: number;
  pregnant_count: number;
  toddler_count: number;
  operasional: boolean;
}

export async function porsiBreakdown(
  supabase: Client,
  date: string
): Promise<PorsiBreakdown | null> {
  const { data, error } = await asAny(supabase).rpc("porsi_breakdown", {
    p_date: date
  });
  if (error) throw error;
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    schools_count: Number(row.schools_count ?? 0),
    students_total: Number(row.students_total ?? 0),
    pregnant_count: Number(row.pregnant_count ?? 0),
    toddler_count: Number(row.toddler_count ?? 0),
    operasional: Boolean(row.operasional)
  };
}

export interface SchoolBreakdownRow {
  school_id: string;
  school_name: string;
  level: string;
  qty: number;
  students: number;
}

export async function schoolsBreakdown(
  supabase: Client,
  date: string
): Promise<SchoolBreakdownRow[]> {
  const { data, error } = await asAny(supabase).rpc("schools_breakdown", {
    p_date: date
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    school_id: String(r.school_id),
    school_name: String(r.school_name),
    level: String(r.level),
    qty: Number(r.qty ?? 0),
    students: Number(r.students ?? 0)
  }));
}

/* ----------------------------- BGN Generation Log ------------------------- */

export async function listBgnGenerationLog(
  supabase: Client,
  opts: { limit?: number } = {}
): Promise<BgnGenerationLog[]> {
  const { data, error } = await asAny(supabase)
    .from("bgn_generation_log")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (error) throw error;
  return (data ?? []) as BgnGenerationLog[];
}

export async function insertBgnGenerationLog(
  supabase: Client,
  row: Omit<BgnGenerationLog, "id" | "generated_at">
): Promise<BgnGenerationLog | null> {
  const { data, error } = await asAny(supabase)
    .from("bgn_generation_log")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return (data ?? null) as BgnGenerationLog | null;
}

/* ----------------------------- Label helpers ------------------------------ */

export const SPPG_ROLE_LABEL_ID: Record<SppgRole, string> = {
  kepala_sppg: "Kepala SPPG",
  pengawas_gizi: "Pengawas Gizi",
  pengawas_keuangan: "Pengawas Keuangan",
  jurutama_masak: "Juru Tama Masak",
  asisten_lapangan: "Asisten Lapangan",
  persiapan_makanan: "Persiapan Makanan",
  pemrosesan_makanan: "Pemrosesan Makanan",
  pengemasan: "Pengemasan",
  pemorsian: "Pemorsian",
  distribusi: "Distribusi",
  pencucian_alat: "Pencucian Alat",
  pencucian: "Pencucian",
  sanitasi: "Sanitasi",
  kader_posyandu: "Kader Posyandu"
};

export const SPPG_ROLE_LABEL_EN: Record<SppgRole, string> = {
  kepala_sppg: "SPPG Lead",
  pengawas_gizi: "Nutrition Supervisor",
  pengawas_keuangan: "Finance Supervisor",
  jurutama_masak: "Head Cook",
  asisten_lapangan: "Field Assistant",
  persiapan_makanan: "Food Prep",
  pemrosesan_makanan: "Food Processing",
  pengemasan: "Packaging",
  pemorsian: "Portioning",
  distribusi: "Distribution",
  pencucian_alat: "Equipment Washing",
  pencucian: "Washing",
  sanitasi: "Sanitation",
  kader_posyandu: "Posyandu Cadre"
};

export function sppgRoleLabel(role: SppgRole, lang: "ID" | "EN"): string {
  return lang === "EN" ? SPPG_ROLE_LABEL_EN[role] : SPPG_ROLE_LABEL_ID[role];
}
