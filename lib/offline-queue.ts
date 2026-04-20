// Offline outbox powered by IndexedDB.
//
// Use case: operator records attendance, GRN line, stock move, or POD while
// offline. Mutation is serialised and queued; replayed when connectivity
// returns (either automatically via `online` event / periodic flush, or
// triggered by the service worker `sync` event).
//
// Each entry has {table, op, payload, match?}. Ops:
//   - insert   → supabase.from(table).insert(payload)
//   - upsert   → supabase.from(table).upsert(payload, {onConflict: match})
//   - update   → supabase.from(table).update(payload).match(match)
//
// Callers should never invoke Supabase directly for these mutations; wrap via
// `queueOrExecute()` so behaviour stays consistent online/offline.

"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

const DB_NAME = "mbg-soe-outbox";
const DB_VERSION = 1;
const STORE = "queue";

export type OutboxOp = "insert" | "upsert" | "update";

export interface OutboxEntry {
  id?: number;
  table: string;
  op: OutboxOp;
  payload: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
  onConflict?: string;
  createdAt: string;
  lastError?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true
        });
        store.createIndex("by_createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result: T;
    Promise.resolve(work(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function enqueue(entry: Omit<OutboxEntry, "createdAt">): Promise<number> {
  return tx<number>("readwrite", (store) => {
    return new Promise<number>((resolve, reject) => {
      const req = store.add({ ...entry, createdAt: new Date().toISOString() });
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function listQueued(): Promise<OutboxEntry[]> {
  return tx<OutboxEntry[]>("readonly", (store) => {
    return new Promise<OutboxEntry[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result ?? []) as OutboxEntry[]);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function removeEntry(id: number): Promise<void> {
  await tx<void>("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function updateEntry(entry: OutboxEntry): Promise<void> {
  await tx<void>("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function queueOrExecute(
  supabase: SupabaseClient,
  entry: Omit<OutboxEntry, "createdAt">
): Promise<{ online: boolean; id?: number; error?: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const id = await enqueue(entry);
    return { online: false, id };
  }
  try {
    const res = await executeEntry(supabase, entry);
    if (res.error) {
      const id = await enqueue(entry);
      return { online: true, id, error: res.error };
    }
    return { online: true };
  } catch (e) {
    const id = await enqueue(entry);
    return { online: false, id, error: (e as Error).message };
  }
}

async function executeEntry(
  supabase: SupabaseClient,
  entry: Omit<OutboxEntry, "id" | "createdAt">
): Promise<{ error?: string }> {
  const q = supabase.from(entry.table);
  if (entry.op === "insert") {
    const { error } = await q.insert(entry.payload as never);
    return { error: error?.message };
  }
  if (entry.op === "upsert") {
    const { error } = await q.upsert(entry.payload as never, {
      onConflict: entry.onConflict
    });
    return { error: error?.message };
  }
  if (entry.op === "update") {
    if (!entry.match) return { error: "update requires match" };
    const { error } = await q
      .update(entry.payload as never)
      .match(entry.match);
    return { error: error?.message };
  }
  return { error: `unknown op: ${entry.op}` };
}

let flushing = false;

export async function flushOutbox(
  supabase: SupabaseClient
): Promise<{ flushed: number; remaining: number; errors: string[] }> {
  if (flushing) return { flushed: 0, remaining: 0, errors: [] };
  flushing = true;
  const errors: string[] = [];
  let flushed = 0;
  try {
    const entries = await listQueued();
    for (const e of entries) {
      if (typeof navigator !== "undefined" && !navigator.onLine) break;
      try {
        const res = await executeEntry(supabase, e);
        if (res.error) {
          errors.push(`${e.table}: ${res.error}`);
          await updateEntry({ ...e, lastError: res.error });
        } else if (e.id != null) {
          await removeEntry(e.id);
          flushed += 1;
        }
      } catch (err) {
        errors.push(`${e.table}: ${(err as Error).message}`);
      }
    }
    const remaining = (await listQueued()).length;
    return { flushed, remaining, errors };
  } finally {
    flushing = false;
  }
}

export async function outboxCount(): Promise<number> {
  const all = await listQueued();
  return all.length;
}
