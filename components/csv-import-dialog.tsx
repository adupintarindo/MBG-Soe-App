"use client";

import { useRef, useState } from "react";
import { parseCsv } from "@/lib/csv";
import { useToast } from "@/components/toast";

interface Props<T> {
  /** Tombol trigger — anak dapat callback `open()`. */
  renderTrigger?: (open: () => void) => React.ReactNode;
  /** Label entity untuk copy UX, mis. "Item", "Supplier", "Sekolah". */
  entity: string;
  /** Header yang diharapkan (case-sensitive). */
  expectedHeaders: string[];
  /** Validator + mapper 1 baris → payload utk DB. Kembalikan error string kalau invalid. */
  mapRow: (row: Record<string, string>, index: number) =>
    | { ok: true; data: T }
    | { ok: false; error: string };
  /** Server action / function yang terima array payload. */
  onCommit: (rows: T[]) => Promise<{ inserted: number; errors?: string[] }>;
}

export function CsvImportDialog<T>({
  renderTrigger,
  entity,
  expectedHeaders,
  mapRow,
  onCommit
}: Props<T>) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{
    headers: string[];
    valid: T[];
    invalid: { line: number; error: string }[];
    total: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const { headers, rows, errors } = parseCsv<Record<string, string>>(text);
    // Header validation
    const missing = expectedHeaders.filter((h) => !headers.includes(h));
    if (missing.length) {
      toast.error(
        "Header tidak lengkap",
        `Kolom hilang: ${missing.join(", ")}`
      );
      return;
    }
    const valid: T[] = [];
    const invalid: { line: number; error: string }[] = [];
    errors.forEach((e) => invalid.push({ line: e.line, error: e.message }));
    rows.forEach((r, idx) => {
      const result = mapRow(r, idx);
      if (result.ok) valid.push(result.data);
      else invalid.push({ line: idx + 2, error: result.error });
    });
    setPreview({ headers, valid, invalid, total: rows.length });
  }

  async function commit() {
    if (!preview || preview.valid.length === 0) return;
    setBusy(true);
    try {
      const res = await onCommit(preview.valid);
      toast.success(
        `Import ${entity} selesai`,
        `${res.inserted} baris sukses${res.errors?.length ? `, ${res.errors.length} gagal` : ""}`
      );
      setOpen(false);
      reset();
    } catch (err) {
      toast.error("Import gagal", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary-2 shadow-card hover:bg-primary hover:text-white dark:bg-d-surface-2 dark:text-d-text"
        >
          📥 Import CSV
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-cardlg ring-1 ring-ink/10 dark:bg-d-surface dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-ink/10 px-5 py-3 dark:border-white/10">
              <div className="font-display text-base font-black text-ink dark:text-d-text">
                📥 Import {entity} dari CSV
              </div>
              <div className="mt-1 text-[11px] text-ink2 dark:text-d-text-2">
                Kolom wajib: <span className="font-mono">{expectedHeaders.join(", ")}</span>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="block w-full text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white hover:file:bg-primary-2 dark:text-d-text dark:file:bg-accent-strong"
              />

              {preview && (
                <div className="rounded-xl bg-ink/[0.03] p-3 text-[12px] dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-100">
                      ✓ {preview.valid.length} valid
                    </span>
                    {preview.invalid.length > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-800 dark:bg-red-800/40 dark:text-red-100">
                        ✕ {preview.invalid.length} error
                      </span>
                    )}
                    <span className="text-ink2 dark:text-d-text-2">
                      total {preview.total} baris
                    </span>
                  </div>
                  {preview.invalid.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-ink2">
                        Lihat error ({preview.invalid.length})
                      </summary>
                      <ul className="mt-2 max-h-40 overflow-y-auto space-y-0.5 text-[11px]">
                        {preview.invalid.slice(0, 50).map((e, i) => (
                          <li key={i} className="font-mono text-red-700 dark:text-red-300">
                            L{e.line}: {e.error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-ink/10 bg-ink/[0.02] px-5 py-3 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => !busy && (setOpen(false), reset())}
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-ink2 shadow-card hover:bg-ink/5 dark:bg-d-surface-2 dark:text-d-text"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!preview || preview.valid.length === 0 || busy}
                onClick={commit}
                className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white shadow-card hover:bg-primary-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-strong"
              >
                {busy ? "Menyimpan…" : `Import ${preview?.valid.length ?? 0} baris`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
