"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Badge,
  Button,
  FieldLabel,
  Section,
  TableWrap,
  THead
} from "@/components/ui";
import {
  parseSchoolCalendar,
  type ParsedCalendarEntry
} from "./calendar-parser";
import { t, ti, DAYS } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type ExistingRow = { op_date: string; reason: string };

interface Props {
  canWrite: boolean;
  existing: ExistingRow[]; // upcoming non_op_days for reference
}

const EXAMPLE = `# Contoh format — bisa campur. Baris kosong diabaikan.
2026-05-04 : Hari Pertama MBG Soe (tidak operasional, soft-launch)
1-7 Januari 2026 : Libur Akhir Semester 1
28 Des 2025 - 7 Jan 2026 : Libur Akhir Semester Ganjil
20 Mar 2026 s.d. 25 Mar 2026 : Cuti Bersama Idul Fitri
17/08/2026 : HUT Kemerdekaan RI
9-21 Juni 2026 : Penilaian Akhir Semester Genap
22 Jun 2026 — 11 Jul 2026 : Libur Semester Genap
14-16 Jul 2026 : Masa Pengenalan Lingkungan Sekolah (MPLS)
`;

export function CalendarParserPanel({ canWrite, existing }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { lang } = useLang();
  const DAY_SHORT = DAYS.short[lang];

  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedCalendarEntry[]>([]);
  const [warnings, setWarnings] = useState<
    { line: number; text: string; msg: string }[]
  >([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [overrideReason, setOverrideReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const existingMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of existing) m.set(r.op_date, r.reason);
    return m;
  }, [existing]);

  const activeEntries = useMemo(
    () => parsed.filter((e) => !excluded.has(e.op_date)),
    [parsed, excluded]
  );

  const newCount = useMemo(
    () => activeEntries.filter((e) => !existingMap.has(e.op_date)).length,
    [activeEntries, existingMap]
  );
  const updateCount = useMemo(
    () => activeEntries.filter((e) => existingMap.has(e.op_date)).length,
    [activeEntries, existingMap]
  );

  function onParse() {
    setErr(null);
    setOk(null);
    const res = parseSchoolCalendar(raw);
    setParsed(res.entries);
    setWarnings(res.warnings);
    setExcluded(new Set());
    if (res.entries.length === 0) {
      setErr(t("calParser.errNoParsed", lang));
    }
  }

  function toggleExclude(date: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function useExample() {
    setRaw(EXAMPLE);
    setParsed([]);
    setWarnings([]);
    setExcluded(new Set());
    setErr(null);
    setOk(null);
  }

  async function onImport() {
    setErr(null);
    setOk(null);
    if (activeEntries.length === 0) {
      setErr(t("calParser.errNoEntries", lang));
      return;
    }
    const override = overrideReason.trim();
    const rows = activeEntries.map((e) => ({
      op_date: e.op_date,
      reason: override || e.reason
    }));
    const { error } = await supabase
      .from("non_op_days")
      .upsert(rows as never, { onConflict: "op_date" });
    if (error) {
      setErr(error.message);
      return;
    }
    setOk(
      ti("calParser.msgImported", lang, {
        n: rows.length,
        new: newCount,
        update: updateCount
      })
    );
    setParsed([]);
    setWarnings([]);
    setExcluded(new Set());
    setRaw("");
    startTransition(() => router.refresh());
  }

  async function onDelete(opDate: string) {
    setErr(null);
    setOk(null);
    const confirmed = window.confirm(
      ti("calParser.confirmDelete", lang, { date: opDate })
    );
    if (!confirmed) return;
    const { error } = await supabase
      .from("non_op_days")
      .delete()
      .eq("op_date", opDate);
    if (error) {
      setErr(error.message);
      return;
    }
    setOk(ti("calParser.msgDeleted", lang, { date: opDate }));
    startTransition(() => router.refresh());
  }

  return (
    <Section
      title={t("calParser.title", lang)}
      hint={t("calParser.hint", lang)}
    >
      {canWrite ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-paper p-4 ring-1 ring-ink/5">
            <label className="block">
              <FieldLabel>{t("calParser.textLabel", lang)}</FieldLabel>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={10}
                placeholder="Contoh:&#10;1-7 Januari 2026 : Libur Akhir Semester 1&#10;2026-03-20 s.d. 2026-03-25 : Cuti Bersama Idul Fitri&#10;17/08/2026 : HUT Kemerdekaan RI"
                className="w-full rounded-lg bg-white px-3 py-2 font-mono text-[12px] text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-2 focus:ring-accent-strong"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={onParse}>
                {t("calParser.btnParse", lang)}
              </Button>
              <Button variant="secondary" size="sm" onClick={useExample}>
                {t("calParser.btnExample", lang)}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRaw("");
                  setParsed([]);
                  setWarnings([]);
                  setExcluded(new Set());
                  setErr(null);
                  setOk(null);
                }}
              >
                {t("calParser.btnReset", lang)}
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

          {warnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <div className="text-[11px] font-black uppercase tracking-wide text-amber-900">
                {ti("calParser.warnUnrecognized", lang, { n: warnings.length })}
              </div>
              <ul className="mt-1 space-y-0.5 text-[11px] text-amber-900/90">
                {warnings.slice(0, 10).map((w, i) => (
                  <li key={`${w.line}-${i}`} className="font-mono">
                    <span className="opacity-60">#{w.line}</span>{" "}
                    <span className="opacity-80">{w.text}</span>
                    <span className="ml-1 italic opacity-70">— {w.msg}</span>
                  </li>
                ))}
                {warnings.length > 10 && (
                  <li className="italic opacity-70">
                    {ti("calParser.warnMoreLines", lang, { n: warnings.length - 10 })}
                  </li>
                )}
              </ul>
            </div>
          )}

          {parsed.length > 0 && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/5">
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <label className="block grow">
                  <FieldLabel>{t("calParser.overrideLabel", lang)}</FieldLabel>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder={t("calParser.overridePlaceholder", lang)}
                    className="w-full rounded-lg bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-ink/10"
                  />
                </label>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onImport}
                  disabled={pending || activeEntries.length === 0}
                >
                  {pending
                    ? t("calParser.btnImporting", lang)
                    : ti("calParser.btnImportN", lang, { n: activeEntries.length })}
                </Button>
              </div>

              <div className="mb-2 flex flex-wrap gap-3 text-[11px] font-semibold text-ink2">
                <span>
                  {t("calParser.statTotal", lang)}{" "}
                  <b className="text-ink">{parsed.length}</b>
                </span>
                <span>
                  {t("calParser.statActive", lang)}{" "}
                  <b className="text-emerald-700">{activeEntries.length}</b>
                </span>
                <span>
                  {t("calParser.statNew", lang)}{" "}
                  <b className="text-accent-strong">{newCount}</b>
                </span>
                <span>
                  {t("calParser.statUpdate", lang)}{" "}
                  <b className="text-amber-700">{updateCount}</b>
                </span>
                <span>
                  {t("calParser.statExcluded", lang)}{" "}
                  <b className="text-red-700">{excluded.size}</b>
                </span>
              </div>

              <TableWrap>
                <table className="w-full text-sm">
                  <THead>
                    <th className="py-2 pr-3">{t("calParser.colInclude", lang)}</th>
                    <th className="py-2 pr-3">{t("calParser.colDate", lang)}</th>
                    <th className="py-2 pr-3">{t("calParser.colDay", lang)}</th>
                    <th className="py-2 pr-3">{t("calParser.colReason", lang)}</th>
                    <th className="py-2 pr-3">{t("calParser.colStatus", lang)}</th>
                    <th className="py-2 pr-3 text-right">{t("calParser.colLine", lang)}</th>
                  </THead>
                  <tbody>
                    {parsed.map((e) => {
                      const isExcluded = excluded.has(e.op_date);
                      const existingReason = existingMap.get(e.op_date);
                      const dow = new Date(e.op_date).getDay();
                      const dowName = DAY_SHORT[dow];
                      const isWeekend = dow === 0 || dow === 6;
                      return (
                        <tr
                          key={e.op_date}
                          className={`row-hover border-b border-ink/5 ${
                            isExcluded ? "opacity-40" : ""
                          }`}
                        >
                          <td className="py-2 pr-3">
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={() => toggleExclude(e.op_date)}
                              className="h-4 w-4 accent-accent-strong"
                            />
                          </td>
                          <td className="py-2 pr-3 font-mono text-xs">
                            {e.op_date}
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className={`text-[11px] font-bold ${
                                isWeekend ? "text-ink2/50" : "text-ink"
                              }`}
                            >
                              {dowName}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-[12px]">
                            {e.reason}
                          </td>
                          <td className="py-2 pr-3">
                            {existingReason ? (
                              existingReason === e.reason ? (
                                <Badge tone="neutral">{t("calParser.badgeSame", lang)}</Badge>
                              ) : (
                                <Badge tone="warn">{t("calParser.badgeOverride", lang)}</Badge>
                              )
                            ) : (
                              <Badge tone="ok">{t("calParser.badgeNew", lang)}</Badge>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono text-[10px] text-ink2/60">
                            #{e.sourceLine}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-xl bg-paper px-4 py-3 text-[12px] text-ink2">
          {t("calParser.readOnly", lang)}
        </p>
      )}

      {/* Existing non_op_days reference */}
      <div className="mt-5">
        <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-ink2/70">
          {ti("calParser.storedHeader", lang, { n: existing.length })}
        </div>
        {existing.length === 0 ? (
          <p className="rounded-xl bg-paper px-4 py-3 text-[12px] text-ink2">
            {t("calParser.emptyStored", lang)}
          </p>
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <THead>
                <th className="py-2 pr-3">{t("calParser.colDate", lang)}</th>
                <th className="py-2 pr-3">{t("calParser.colDay", lang)}</th>
                <th className="py-2 pr-3">{t("calParser.colReason", lang)}</th>
                {canWrite && <th className="py-2 pr-3 text-right">{t("calParser.colAksi", lang)}</th>}
              </THead>
              <tbody>
                {existing.map((r) => {
                  const dow = new Date(r.op_date).getDay();
                  const dowName = DAY_SHORT[dow];
                  return (
                    <tr
                      key={r.op_date}
                      className="row-hover border-b border-ink/5"
                    >
                      <td className="py-2 pr-3 font-mono text-xs">
                        {r.op_date}
                      </td>
                      <td className="py-2 pr-3 text-[11px] font-bold text-ink">
                        {dowName}
                      </td>
                      <td className="py-2 pr-3 text-[12px]">{r.reason}</td>
                      {canWrite && (
                        <td className="py-2 pr-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(r.op_date)}
                          >
                            {t("calParser.btnHapus", lang)}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </Section>
  );
}
