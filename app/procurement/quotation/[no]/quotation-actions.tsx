"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

export function QuotationActions({
  qtNo,
  status,
  canWrite,
  canSupplierRespond,
  convertedPoNo
}: {
  qtNo: string;
  status: string;
  canWrite: boolean;
  canSupplierRespond: boolean;
  convertedPoNo: string | null;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function updateStatus(next: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/quotations/${encodeURIComponent(qtNo)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "failed");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  async function convertToPo() {
    if (!confirm(ti("qtActions.confirmConvert", lang, { no: qtNo }))) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/quotations/${encodeURIComponent(qtNo)}/convert`,
        { method: "POST" }
      );
      const json = (await res.json()) as {
        ok: boolean;
        po_no?: string;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.po_no) {
        setError(json.error ?? "failed");
        return;
      }
      alert(ti("qtActions.convertSuccess", lang, { po: json.po_no }));
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  if (convertedPoNo) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200">
        {t("qtActions.convertedLbl", lang)}{" "}
        <span className="font-mono">{convertedPoNo}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canWrite && status === "draft" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => updateStatus("sent")}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-card hover:bg-blue-700 disabled:opacity-50"
        >
          {t("qtActions.btnMarkSent", lang)}
        </button>
      )}
      {canSupplierRespond && (
        <button
          type="button"
          disabled={busy}
          onClick={() => updateStatus("responded")}
          className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white shadow-card hover:bg-amber-700 disabled:opacity-50"
        >
          {t("qtActions.btnMarkResponded", lang)}
        </button>
      )}
      {canWrite && (status === "sent" || status === "responded") && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => updateStatus("accepted")}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-card hover:bg-emerald-700 disabled:opacity-50"
          >
            {t("qtActions.btnAccept", lang)}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => updateStatus("rejected")}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            {t("qtActions.btnReject", lang)}
          </button>
        </>
      )}
      {canWrite && (status === "accepted" || status === "responded") && (
        <button
          type="button"
          disabled={busy}
          onClick={convertToPo}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
        >
          {t("qtActions.btnConvertPo", lang)}
        </button>
      )}
      {error && (
        <span className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </span>
      )}
    </div>
  );
}
