"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

interface PODInitial {
  porsi_delivered: number;
  arrival_at: string | null;
  temperature_c: number | null;
  receiver_name: string | null;
  signature_url: string | null;
  photo_url: string | null;
  note: string | null;
}

function nowIsoLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PODForm({
  stopId,
  initial
}: {
  stopId: number;
  initial: PODInitial;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [porsi, setPorsi] = useState<string>(
    String(initial.porsi_delivered || "")
  );
  const [arrival, setArrival] = useState<string>(
    toLocalInput(initial.arrival_at) || nowIsoLocal()
  );
  const [temp, setTemp] = useState<string>(
    initial.temperature_c == null ? "" : String(initial.temperature_c)
  );
  const [receiver, setReceiver] = useState<string>(initial.receiver_name ?? "");
  const [photoUrl, setPhotoUrl] = useState<string>(initial.photo_url ?? "");
  const [sigUrl, setSigUrl] = useState<string>(initial.signature_url ?? "");
  const [note, setNote] = useState<string>(initial.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const porsiN = Number(porsi);
      const tempN = temp === "" ? null : Number(temp);
      const arrivalIso = arrival ? new Date(arrival).toISOString() : null;

      const { error: err } = await supabase
        .from("delivery_stops")
        .update({
          porsi_delivered: Number.isFinite(porsiN) ? porsiN : 0,
          arrival_at: arrivalIso,
          temperature_c: tempN,
          receiver_name: receiver || null,
          signature_url: sigUrl || null,
          photo_url: photoUrl || null,
          note: note || null,
          status:
            porsiN > 0 && receiver
              ? porsiN >= 1
                ? "delivered"
                : "partial"
              : "dispatched"
        })
        .eq("id", stopId);

      if (err) {
        setError(err.message);
        return;
      }
      router.push("/deliveries");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("del.podPorsi", lang)}
          </span>
          <input
            type="number"
            min="0"
            value={porsi}
            onChange={(e) => setPorsi(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("del.podArrival", lang)}
          </span>
          <input
            type="datetime-local"
            value={arrival}
            onChange={(e) => setArrival(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("del.podReceiver", lang)}
          </span>
          <input
            type="text"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            placeholder="Ibu Wakil Kepala / Guru Piket"
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("del.podTemp", lang)}
          </span>
          <input
            type="number"
            step="0.1"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="65 = aman untuk hidangan panas"
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("del.podPhoto", lang)}
          </span>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("del.podSignature", lang)}
          </span>
          <input
            type="url"
            value={sigUrl}
            onChange={(e) => setSigUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-bold text-ink2">
            {t("del.podNote", lang)}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      {(photoUrl || sigUrl) && (
        <div className="flex flex-wrap gap-3">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="POD photo"
              className="h-32 rounded-xl object-cover ring-1 ring-ink/10"
            />
          )}
          {sigUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sigUrl}
              alt="Signature"
              className="h-32 rounded-xl bg-white object-contain ring-1 ring-ink/10"
            />
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-xl bg-ink px-5 py-3 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
        >
          {busy ? t("common.saving", lang) : t("del.podSubmit", lang)}
        </button>
      </div>
    </div>
  );
}
