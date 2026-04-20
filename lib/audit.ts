// ============================================================================
// Audit helper · dipanggil dari server action setelah mutation sukses
// ----------------------------------------------------------------------------
// Tabel tujuan: public.audit_events (dibuat di 0034_audit_events.sql)
// Struktur minimum: action (INSERT|UPDATE|DELETE), entity, entity_id,
//                    actor_id, diff (jsonb), created_at
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export interface AuditEntry {
  action: AuditAction;
  entity: string;
  entity_id: string;
  actor_id?: string | null;
  diff?: Record<string, unknown> | null;
  note?: string | null;
}

/**
 * Catat event audit. Fail-open: error logging tidak menggagalkan transaksi bisnis.
 * Panggil SETELAH mutation sukses, jangan sebelum.
 */
export async function recordAudit(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    const { error } = await supabase.from("audit_events").insert({
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id,
      actor_id: entry.actor_id ?? null,
      diff: entry.diff ?? null,
      note: entry.note ?? null
    });
    if (error) {
      console.warn("[audit] failed to record", entry.entity, error.message);
    }
  } catch (err) {
    console.warn("[audit] threw", err);
  }
}

/**
 * Helper untuk UPDATE: simpan hanya field yang berubah di `diff`.
 */
export function diffChanged<T extends Record<string, unknown>>(
  before: T,
  after: T
): Partial<Record<keyof T, { from: unknown; to: unknown }>> {
  const out: Partial<Record<keyof T, { from: unknown; to: unknown }>> = {};
  for (const k of Object.keys(after) as (keyof T)[]) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      out[k] = { from: before[k], to: after[k] };
    }
  }
  return out;
}

/**
 * Tagged console warn utk developer: flag server action tanpa audit.
 * Cari di codebase:  grep -R "auditMissing("
 */
export function auditMissing(where: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[audit] TODO: wire recordAudit() at ${where}`);
  }
}
