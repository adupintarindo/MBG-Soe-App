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

type MenuRow = Pick<
  Database["public"]["Tables"]["menus"]["Row"],
  "id" | "name" | "name_en" | "cycle_day" | "active" | "notes"
>;

export function MenusPanel({ initial }: { initial: MenuRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter(
      (m) =>
        String(m.id).includes(needle) ||
        m.name.toLowerCase().includes(needle) ||
        (m.name_en ?? "").toLowerCase().includes(needle)
    );
  }, [initial, q]);

  return (
    <Section
      title={`🍲 Menu Cycle · ${initial.length} resep`}
      hint="Read-only browser. Untuk ubah BOM gunakan halaman /menu."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            placeholder="Cari menu…"
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
        <EmptyState message="Tidak ada menu." />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 pr-3">Nama</th>
              <th className="py-2 pr-3">Nama EN</th>
              <th className="py-2 pr-3 text-right">Cycle Day</th>
              <th className="py-2 pr-3">Catatan</th>
              <th className="py-2 pr-3 text-right">Status</th>
            </THead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="row-hover border-b border-ink/5">
                  <td className="py-2 pr-3 font-mono text-xs">{m.id}</td>
                  <td className="py-2 pr-3 text-xs font-bold text-ink">
                    {m.name}
                  </td>
                  <td className="py-2 pr-3 text-xs text-ink2">
                    {m.name_en ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {m.cycle_day ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-[11px] text-ink2/80">
                    {m.notes ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {m.active ? (
                      <Badge tone="ok">aktif</Badge>
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
