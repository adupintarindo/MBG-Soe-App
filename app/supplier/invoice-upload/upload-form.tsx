"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type PO = { no: string; po_date: string; total: number };
type GRN = {
  no: string;
  po_no: string | null;
  grn_date: string;
  status: string;
};

export function InvoiceUploadForm({
  supplierId,
  pos,
  grns
}: {
  supplierId: string;
  pos: PO[];
  grns: GRN[];
}) {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [poNo, setPoNo] = useState("");
  const [grnNo, setGrnNo] = useState("");
  const [invoiceNoSupplier, setInvoiceNoSupplier] = useState("");
  const [total, setTotal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const filteredGrns = useMemo(() => {
    if (!poNo) return grns;
    return grns.filter((g) => g.po_no === poNo);
  }, [grns, poNo]);

  async function upload() {
    if (!file) {
      setError(
        lang === "EN" ? "Pick a file first" : "Pilih file dulu"
      );
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${supplierId}/invoices/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("supplier_docs")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data: signed } = await supabase.storage
        .from("supplier_docs")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      setFileUrl(signed?.signedUrl ?? path);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    const amt = Number(total);
    if (!(amt > 0)) {
      setError(lang === "EN" ? "Total must be > 0" : "Total harus > 0");
      return;
    }
    if (!fileUrl) {
      setError(
        lang === "EN"
          ? "Upload the file first"
          : "Upload file dulu sebelum submit"
      );
      return;
    }
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;
      const { error: err } = await supabase
        .from("invoice_uploads")
        .insert({
          po_no: poNo || null,
          grn_no: grnNo || null,
          supplier_id: supplierId,
          invoice_no_supplier: invoiceNoSupplier || null,
          total: amt,
          file_url: fileUrl,
          uploaded_by: userId
        });
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/supplier");
        router.refresh();
      }, 800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">PO</span>
          <select
            value={poNo}
            onChange={(e) => {
              setPoNo(e.target.value);
              setGrnNo("");
              const found = pos.find((p) => p.no === e.target.value);
              if (found && !total) setTotal(String(found.total));
            }}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          >
            <option value="">— {lang === "EN" ? "optional" : "opsional"} —</option>
            {pos.map((p) => (
              <option key={p.no} value={p.no}>
                {p.no} · {p.po_date}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">GRN</span>
          <select
            value={grnNo}
            onChange={(e) => setGrnNo(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          >
            <option value="">— {lang === "EN" ? "optional" : "opsional"} —</option>
            {filteredGrns.map((g) => (
              <option key={g.no} value={g.no}>
                {g.no} · {g.grn_date} · {g.status}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("sup.uploadFormInvNo", lang)}
          </span>
          <input
            type="text"
            value={invoiceNoSupplier}
            onChange={(e) => setInvoiceNoSupplier(e.target.value)}
            placeholder="INV-SUP-2026-001"
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("sup.uploadFormTotal", lang)}
          </span>
          <input
            type="number"
            min="0"
            step="1000"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="rounded-xl bg-ink2/5 p-3">
        <div className="mb-2 text-[11px] font-bold text-ink2">
          {t("sup.uploadFormFile", lang)}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setFileUrl("");
            }}
            className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
          />
          <button
            type="button"
            onClick={upload}
            disabled={!file || uploading || !!fileUrl}
            className="rounded-xl bg-primary-strong px-4 py-2 text-xs font-black text-white shadow-card hover:bg-primary disabled:opacity-50"
          >
            {uploading
              ? t("common.saving", lang)
              : fileUrl
                ? "✓ Uploaded"
                : "Upload file"}
          </button>
        </div>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate text-[11px] text-emerald-700 underline"
          >
            {fileUrl}
          </a>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
          {lang === "EN"
            ? "Uploaded. Redirecting..."
            : "Terkirim. Mengalihkan..."}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !fileUrl}
          className="rounded-xl bg-ink px-5 py-3 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
        >
          {busy
            ? t("common.saving", lang)
            : t("sup.uploadSubmit", lang)}
        </button>
      </div>
    </div>
  );
}
