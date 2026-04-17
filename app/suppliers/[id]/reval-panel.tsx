"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RevalPeriod, SupplierRevalRow } from "@/lib/engine";
import { saveSupplierReval } from "@/lib/engine";
import {
  Badge,
  Button,
  FieldLabel,
  Input,
  TableWrap,
  THead
} from "@/components/ui";

interface Props {
  supplierId: string;
  defaultStart: string;
  defaultEnd: string;
  canWrite: boolean;
  history: SupplierRevalRow[];
}

const PERIOD_OPTIONS: RevalPeriod[] = [
  "quarterly",
  "semester",
  "annual",
  "ad_hoc"
];

const RECO_OPTIONS = [
  { v: "RETAIN", label: "RETAIN — pertahankan" },
  { v: "IMPROVE", label: "IMPROVE — perbaikan" },
  { v: "REPLACE", label: "REPLACE — ganti" },
  { v: "EXIT", label: "EXIT — putus kontrak" }
];

export function RevalPanel({
  supplierId,
  defaultStart,
  defaultEnd,
  canWrite,
  history
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [period, setPeriod] = useState<RevalPeriod>("quarterly");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [reco, setReco] = useState("RETAIN");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSave() {
    setErr(null);
    setOk(null);
    if (!start || !end || start > end) {
      setErr("Rentang tanggal tidak valid.");
      return;
    }
    try {
      const id = await saveSupplierReval(supabase, {
        supplierId,
        period,
        start,
        end,
        recommendation: reco,
        notes: notes.trim() || null
      });
      setOk(`Tersimpan (#${id}).`);
      setNotes("");
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    }
  }

  return (
    <div>
      {canWrite && (
        <div className="mb-5 rounded-2xl bg-paper p-4 ring-1 ring-ink/5">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="block">
              <FieldLabel>Periode</FieldLabel>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as RevalPeriod)}
                className="w-full rounded-lg bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-ink/10"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <FieldLabel>Dari</FieldLabel>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="block">
              <FieldLabel>Sampai</FieldLabel>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <label className="block">
              <FieldLabel>Rekomendasi</FieldLabel>
              <select
                value={reco}
                onChange={(e) => setReco(e.target.value)}
                className="w-full rounded-lg bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-ink/10"
              >
                {RECO_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 block">
            <FieldLabel>Catatan Evaluator</FieldLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-white px-3 py-2 text-sm text-ink ring-1 ring-ink/10"
              placeholder="Catatan tambahan (opsional)…"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={pending}
              onClick={onSave}
            >
              {pending ? "Menyimpan…" : "Hitung & Simpan Evaluasi"}
            </Button>
            {err && (
              <span className="text-[12px] font-semibold text-red-700">
                {err}
              </span>
            )}
            {ok && (
              <span className="text-[12px] font-semibold text-emerald-700">
                {ok}
              </span>
            )}
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="rounded-xl bg-paper px-4 py-3 text-[12px] text-ink2">
          Belum ada riwayat evaluasi untuk supplier ini.
        </p>
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 pr-3">Periode</th>
              <th className="py-2 pr-3">Rentang</th>
              <th className="py-2 pr-3 text-right">Q</th>
              <th className="py-2 pr-3 text-right">D</th>
              <th className="py-2 pr-3 text-right">P</th>
              <th className="py-2 pr-3 text-right">C</th>
              <th className="py-2 pr-3 text-right">R</th>
              <th className="py-2 pr-3 text-right">Total</th>
              <th className="py-2 pr-3">Reco</th>
              <th className="py-2 pr-3">Evaluasi</th>
            </THead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="row-hover border-b border-ink/5">
                  <td className="py-2 pr-3">
                    <Badge tone="info">{r.period}</Badge>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-ink2">
                    {r.period_start} → {r.period_end}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {Number(r.quality_score).toFixed(0)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {Number(r.delivery_score).toFixed(0)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {Number(r.price_score).toFixed(0)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {Number(r.compliance_score).toFixed(0)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {Number(r.responsiveness_score).toFixed(0)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-sm font-black">
                    {Number(r.total_score).toFixed(1)}
                  </td>
                  <td className="py-2 pr-3">
                    {r.recommendation ? (
                      <Badge
                        tone={
                          r.recommendation === "RETAIN"
                            ? "ok"
                            : r.recommendation === "IMPROVE"
                              ? "info"
                              : r.recommendation === "REPLACE"
                                ? "warn"
                                : "bad"
                        }
                      >
                        {r.recommendation}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-ink2/60">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-ink2/70">
                    {new Date(r.evaluated_at).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}
