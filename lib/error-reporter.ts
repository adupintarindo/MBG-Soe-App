// ============================================================================
// Error reporter · thin abstraction utk Sentry/console/etc
// ----------------------------------------------------------------------------
// Default: log ke console + POST ke /api/log (opsional).
// Ganti ke Sentry dengan install:
//   pnpm add @sentry/nextjs
//   npx @sentry/wizard@latest -i nextjs
// Lalu ganti body fungsi `report()` dengan `Sentry.captureException(err)`.
// ============================================================================

export interface ReportContext {
  route?: string;
  action?: string;
  userId?: string | null;
  extra?: Record<string, unknown>;
}

export function report(err: unknown, ctx: ReportContext = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...ctx
  };

  // 1. Always console.error — visible di server log & browser devtools
  console.error("[report]", payload);

  // 2. If SENTRY DSN is configured, forward to a logging endpoint
  //    (placeholder — replace with Sentry.captureException saat integrasi)
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      void fetch("/api/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch {
      // swallow — logging failure must never cascade
    }
  }
}

/**
 * Wrap async handler utk auto-report.
 */
export function withReport<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  ctx: ReportContext
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (err) {
      report(err, ctx);
      throw err;
    }
  }) as T;
}
