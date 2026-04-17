"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatIDR } from "@/lib/engine";
import { Section, TableWrap, THead } from "@/components/ui";
import type {
  SupplierRow,
  SupItemLink,
  InvoiceTx
} from "./types";
import { t, ti } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

const TYPE_COLOR: Record<string, string> = {
  BUMN: "bg-red-50 text-red-900 ring-red-200",
  PT: "bg-blue-50 text-blue-900 ring-blue-200",
  CV: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  UD: "bg-amber-50 text-amber-900 ring-amber-200",
  KOPERASI: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  POKTAN: "bg-lime-50 text-lime-900 ring-lime-200",
  TOKO: "bg-violet-50 text-violet-900 ring-violet-200",
  KIOS: "bg-pink-50 text-pink-900 ring-pink-200",
  INFORMAL: "bg-slate-50 text-slate-900 ring-slate-200"
};

const STATUS_COLOR: Record<string, string> = {
  signed: "bg-emerald-100 text-emerald-800",
  awaiting: "bg-amber-100 text-amber-900",
  draft: "bg-slate-100 text-slate-800",
  rejected: "bg-red-100 text-red-800"
};

interface Props {
  suppliers: SupplierRow[];
  supItems: SupItemLink[];
  invoices: InvoiceTx[];
}

export function SuppliersShell({ suppliers, supItems, invoices }: Props) {
  const { lang } = useLang();
  const spendBySup = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    for (const inv of invoices) {
      const cur = m.get(inv.supplier_id) ?? { total: 0, count: 0 };
      cur.total += Number(inv.total);
      cur.count += 1;
      m.set(inv.supplier_id, cur);
    }
    return m;
  }, [invoices]);

  const itemsBySup = useMemo(() => {
    const m = new Map<string, SupItemLink[]>();
    for (const si of supItems) {
      const list = m.get(si.supplier_id) ?? [];
      list.push(si);
      m.set(si.supplier_id, list);
    }
    return m;
  }, [supItems]);

  const rejected = suppliers.filter((s) => s.status === "rejected");
  const topByScore = [...suppliers]
    .filter((s) => s.status === "signed" || s.status === "awaiting")
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));

  return (
    <>
      <Section
        title={t("suppliers.cardsTitle", lang)}
        hint={t("suppliers.cardsHint", lang)}
        noPad
      >
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 lg:grid-cols-3">
          {topByScore.map((s) => {
            const spend = spendBySup.get(s.id);
            const linked = itemsBySup.get(s.id) ?? [];
            const score = Number(s.score ?? 0);
            const scoreTone =
              score >= 80
                ? {
                    text: "text-emerald-700",
                    bg: "bg-emerald-50",
                    ring: "ring-emerald-200/70",
                    bar: "bg-emerald-500"
                  }
                : score >= 70
                  ? {
                      text: "text-amber-700",
                      bg: "bg-amber-50",
                      ring: "ring-amber-200/70",
                      bar: "bg-amber-500"
                    }
                  : {
                      text: "text-red-700",
                      bg: "bg-red-50",
                      ring: "ring-red-200/70",
                      bar: "bg-red-500"
                    };
            return (
              <Link
                key={s.id}
                href={`/suppliers/${s.id}`}
                className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card ring-1 ring-ink/[0.06] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardlg hover:ring-accent-strong/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong ${s.status === "rejected" ? "opacity-60" : ""}`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-1 ${scoreTone.bar}`}
                />

                <div className="flex items-center justify-between gap-2 px-5 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-ink2/50">
                      {s.id}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[s.type] ?? TYPE_COLOR.INFORMAL}`}
                    >
                      {s.type}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
                  >
                    {s.status}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 px-5 pt-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-black leading-tight text-ink">
                      {s.name}
                    </h3>
                    <div className="mt-0.5 truncate text-[11px] text-ink2/70">
                      {s.address}
                    </div>
                  </div>
                  <div
                    className={`flex flex-shrink-0 flex-col items-center justify-center rounded-xl px-2.5 py-1.5 ring-1 ${scoreTone.bg} ${scoreTone.ring}`}
                  >
                    <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink2/60">
                      {t("suppliers.cardScore", lang)}
                    </div>
                    <div
                      className={`text-lg font-black leading-none ${scoreTone.text}`}
                    >
                      {score.toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="mx-5 mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-ink/[0.06] pt-3 text-[11px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-ink2/50">
                    {t("suppliers.cardPic", lang)}
                  </span>
                  <span className="truncate font-semibold text-ink">
                    {s.pic ?? "—"}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-ink2/50">
                    {t("suppliers.cardTel", lang)}
                  </span>
                  <span className="truncate font-mono text-ink2">
                    {s.phone ?? "—"}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-ink2/50">
                    {t("suppliers.cardEmail", lang)}
                  </span>
                  <span className="truncate font-mono text-ink2/80">
                    {s.email ?? "—"}
                  </span>
                </div>

                {linked.length > 0 && (
                  <div className="mx-5 mt-3 border-t border-ink/[0.06] pt-3">
                    <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-ink2/60">
                      {ti("suppliers.cardCommodity", lang, { n: linked.length })}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {linked.slice(0, 8).map((li) => (
                        <span
                          key={li.item_code}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${li.is_main ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-primary-soft/60 text-ink2 ring-ink/[0.06]"}`}
                        >
                          {li.item_code}
                          {li.is_main && (
                            <span className="text-amber-500">★</span>
                          )}
                        </span>
                      ))}
                      {linked.length > 8 && (
                        <span className="inline-flex items-center rounded-md bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink2/60">
                          +{linked.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {spend && (
                  <div className="mx-5 mt-3 flex items-center justify-between rounded-lg bg-emerald-50/70 px-3 py-2 text-[11px] ring-1 ring-emerald-100">
                    <span className="font-semibold text-emerald-900/80">
                      {ti("suppliers.cardInvoices", lang, { n: spend.count })}
                    </span>
                    <span className="font-mono font-black text-emerald-800">
                      {formatIDR(spend.total)}
                    </span>
                  </div>
                )}

                {s.notes && (
                  <p className="mx-5 mt-2 line-clamp-2 text-[10px] italic text-ink2/70">
                    {s.notes}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-end border-t border-ink/[0.06] px-5 py-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-strong">
                    {t("suppliers.cardDetail", lang)}
                    <span className="transition-transform duration-200 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      {rejected.length > 0 && (
        <Section title={t("suppliers.rejectedTitle", lang)} accent="bad">
          <div className="space-y-2">
            {rejected.map((s) => (
              <Link
                key={s.id}
                href={`/suppliers/${s.id}`}
                className="flex w-full items-center justify-between rounded-xl bg-red-50 px-4 py-2 text-left ring-1 ring-red-200 transition hover:bg-red-100"
              >
                <div>
                  <div className="text-xs font-bold text-red-900">
                    {s.id} · {s.name}
                  </div>
                  <div className="text-[10px] text-red-800/80">{s.notes}</div>
                </div>
                <span className="font-mono text-sm font-black text-red-700">
                  {Number(s.score ?? 0).toFixed(1)}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title={ti("suppliers.tableTitle", lang, { n: suppliers.length })}>
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="w-20 py-2 pl-3 pr-2">{t("suppliers.colId", lang)}</th>
              <th className="py-2 pr-3">{t("suppliers.colName", lang)}</th>
              <th className="w-20 py-2 pr-3">{t("suppliers.colType", lang)}</th>
              <th className="py-2 pr-3">{t("suppliers.colKomoditas", lang)}</th>
              <th className="w-14 py-2 pr-3 text-right">{t("suppliers.colItems", lang)}</th>
              <th className="w-16 py-2 pr-3 text-right">{t("suppliers.colScore", lang)}</th>
              <th className="w-24 py-2 pr-3">{t("suppliers.colStatus", lang)}</th>
              <th className="w-32 py-2 pl-3 pr-3">{t("suppliers.colSpend", lang)}</th>
            </THead>
            <tbody>
              {suppliers.map((s) => {
                const spend = spendBySup.get(s.id);
                const linked = itemsBySup.get(s.id) ?? [];
                const score = Number(s.score ?? 0);
                return (
                  <tr
                    key={s.id}
                    className="row-hover border-b border-ink/5 align-middle"
                  >
                    <td className="py-2 pl-3 pr-2 align-middle font-mono text-[11px] text-ink2">
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="block hover:text-accent-strong hover:underline"
                      >
                        {s.id}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 align-middle font-semibold">
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="block hover:text-accent-strong hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 align-middle">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[s.type] ?? TYPE_COLOR.INFORMAL}`}
                      >
                        {s.type}
                      </span>
                    </td>
                    <td className="max-w-0 py-2 pr-3 align-middle">
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="block truncate text-[11px] text-ink2 hover:text-accent-strong"
                        title={s.commodity ?? ""}
                      >
                        {s.commodity || "—"}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-right align-middle font-mono text-xs tabular-nums">
                      {linked.length}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right align-middle font-mono text-xs font-black tabular-nums ${
                        score >= 80
                          ? "text-emerald-700"
                          : score >= 70
                            ? "text-amber-700"
                            : "text-red-700"
                      }`}
                    >
                      {score.toFixed(1)}
                    </td>
                    <td className="py-2 pr-3 align-middle">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 pl-3 pr-3 text-left align-middle font-mono text-xs tabular-nums">
                      {spend ? (
                        <span className="font-bold text-emerald-800">
                          {formatIDR(spend.total)}
                        </span>
                      ) : (
                        <span className="text-ink2/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>
    </>
  );
}
