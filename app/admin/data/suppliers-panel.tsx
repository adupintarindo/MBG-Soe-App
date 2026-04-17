"use client";

import { useMemo, useState } from "react";
import type { Database } from "@/types/database";
import {
  Badge,
  EmptyState,
  Input,
  Section,
  TableWrap,
  THead
} from "@/components/ui";

type SupplierRow = Pick<
  Database["public"]["Tables"]["suppliers"]["Row"],
  | "id"
  | "name"
  | "type"
  | "commodity"
  | "pic"
  | "phone"
  | "address"
  | "email"
  | "score"
  | "status"
  | "active"
>;

function scoreTone(score: number): "ok" | "warn" | "bad" {
  if (score >= 80) return "ok";
  if (score >= 70) return "warn";
  return "bad";
}

export function SuppliersPanel({ initial }: { initial: SupplierRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter(
      (s) =>
        s.id.toLowerCase().includes(needle) ||
        s.name.toLowerCase().includes(needle) ||
        (s.commodity ?? "").toLowerCase().includes(needle) ||
        (s.pic ?? "").toLowerCase().includes(needle)
    );
  }, [initial, q]);

  return (
    <Section
      title={`🤝 Supplier · ${initial.length} vendor`}
      hint="Read-only browser. Edit profil & status di Supabase Studio."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            placeholder="Cari vendor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-44 py-1.5 text-xs"
          />
          <Badge tone="info">
            {filtered.length} / {initial.length}
          </Badge>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState message="Tidak ada supplier." />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 pr-3">Nama</th>
              <th className="py-2 pr-3">Tipe</th>
              <th className="py-2 pr-3">Komoditas</th>
              <th className="py-2 pr-3">PIC</th>
              <th className="py-2 pr-3">Phone</th>
              <th className="py-2 pr-3 text-right">Score</th>
              <th className="py-2 pr-3 text-right">Status</th>
            </THead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="row-hover border-b border-ink/5">
                  <td className="py-2 pr-3 font-mono text-xs">{s.id}</td>
                  <td className="py-2 pr-3 text-xs font-bold text-ink">
                    {s.name}
                  </td>
                  <td className="py-2 pr-3 text-[11px] text-ink2">
                    {s.type ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-[11px] text-ink2/80">
                    {s.commodity ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-xs">{s.pic ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-ink2">
                    {s.phone ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Badge tone={scoreTone(Number(s.score ?? 0))}>
                      {Number(s.score ?? 0).toFixed(0)}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {s.active ? (
                      <Badge tone="ok">{s.status ?? "aktif"}</Badge>
                    ) : (
                      <Badge tone="muted">non-aktif</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Section>
  );
}
