"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

export type ToastVariant = "success" | "error" | "warn" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastCtx {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `t-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const duration = t.duration ?? (t.variant === "error" ? 6000 : 3500);
      setToasts((prev) => [...prev, { ...t, id }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Allow usage pre-mount: return no-op so component code won't crash
    return {
      push: () => "",
      dismiss: () => {},
      success: () => "",
      error: () => "",
      warn: () => "",
      info: () => ""
    };
  }
  return {
    push: ctx.push,
    dismiss: ctx.dismiss,
    success: (title: string, description?: string) =>
      ctx.push({ variant: "success", title, description }),
    error: (title: string, description?: string) =>
      ctx.push({ variant: "error", title, description }),
    warn: (title: string, description?: string) =>
      ctx.push({ variant: "warn", title, description }),
    info: (title: string, description?: string) =>
      ctx.push({ variant: "info", title, description })
  };
}

const VARIANT_STYLE: Record<ToastVariant, { bg: string; icon: string; ring: string }> = {
  success: {
    bg: "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-50",
    icon: "✓",
    ring: "ring-emerald-500/30"
  },
  error: {
    bg: "bg-red-50 text-red-900 dark:bg-red-900/40 dark:text-red-50",
    icon: "✕",
    ring: "ring-red-500/30"
  },
  warn: {
    bg: "bg-amber-50 text-amber-900 dark:bg-amber-900/40 dark:text-amber-50",
    icon: "⚠",
    ring: "ring-amber-500/30"
  },
  info: {
    bg: "bg-sky-50 text-sky-900 dark:bg-sky-900/40 dark:text-sky-50",
    icon: "ℹ",
    ring: "ring-sky-500/30"
  }
};

function ToastViewport({
  toasts,
  onDismiss
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => {
        const v = VARIANT_STYLE[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 shadow-cardlg ring-1 ${v.bg} ${v.ring}`}
          >
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/50 text-sm font-black dark:bg-white/20"
            >
              {v.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{t.title}</div>
              {t.description && (
                <div className="mt-0.5 text-[12px] leading-snug opacity-80">
                  {t.description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              className="ml-1 rounded-full p-1 text-xs opacity-60 hover:bg-white/40 hover:opacity-100 dark:hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Toast helpers usable outside React tree (e.g., from server action responses).
// Listens to `window.dispatchEvent(new CustomEvent('mbg:toast', { detail: ... }))`.
export function ToastBridge() {
  const { push } = useToast();
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as Omit<Toast, "id"> | undefined;
      if (detail && detail.title) push(detail);
    }
    window.addEventListener("mbg:toast", handler as EventListener);
    return () =>
      window.removeEventListener("mbg:toast", handler as EventListener);
  }, [push]);
  return null;
}
