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

type SchoolRow = Pick<
  Database["public"]["Tables"]["schools"]["Row"],
  | "id"
  | "name"
  | "level"
  | "students"
  | "kelas13"
  | "kelas46"
  | "guru"
  | "distance_km"
  | "pic"
  | "phone"
  | "address"
  | "active"
>;

export function SchoolsPanel({ initial }: { initial: SchoolRow[] }) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("");

  const levels = useMemo(
    () => Array.from(new Set(initial.map((s) => s.level))).sort(),
    [initial]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initial.filter((s) => {
      if (level && s.level !== level) return false;
      if (!needle) return true;
      return (
        s.id.toLowerCase().includes(needle) ||
        s.name.toLowerCase().includes(needle) ||
        (s.pic ?? "").toLowerCase().includes(needle)
      );
    });
  }, [initial, q, level]);

  const totalStudents = filtered.reduce(
    (s, sc) => s + Number(sc.students ?? 0),
    0
  );
  const totalGuru = filtered.reduce((s, sc) => s + Number(sc.guru ?? 0), 0);

  return (
    <Section
      title={`🏫 Sekolah · ${initial.length} unit`}
      hint="Read-only browser. Edit profil sekolah di Supabase Studio."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            placeholder="Cari sekolah / PIC…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-44 py-1.5 text-xs"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm focus:border-accent-strong focus:outline-none"
          >
            <option value="">Semua jenjang</option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <Badge tone="info">{totalStudents.toLocaleString("id-ID")} siswa</Badge>
          <Badge tone="neutral">{totalGuru} guru</Badge>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState message="Tidak ada sekolah sesuai filter." />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <THead>
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 pr-3">Nama</th>
              <th className="py-2 pr-3">Jenjang</th>
              <th className="py-2 pr-3 text-right">Siswa</th>
              <th className="py-2 pr-3 text-right">K1-3</th>
              <th className="py-2 pr-3 text-right">K4-6</th>
              <th className="py-2 pr-3 text-right">Guru</th>
              <th className="py-2 pr-3 text-right">Jarak (km)</th>
              <th className="py-2 pr-3">PIC</th>
              <th className="py-2 pr-3 text-right">Status</th>
            </THead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="row-hover border-b border-ink/5">
                  <td className="py-2 pr-3 font-mono text-xs">{s.id}</td>
                  <td className="py-2 pr-3 text-xs font-bold text-ink">
                    {s.name}
                  </td>
                  <td className="py-2 pr-3 text-[11px] font-bold text-ink2/80">
                    {s.level}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs font-black">
                    {Number(s.students ?? 0).toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {Number(s.kelas13 ?? 0)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {Number(s.kelas46 ?? 0)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {Number(s.guru ?? 0)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {Number(s.distance_km ?? 0).toFixed(1)}
                  </td>
                  <td className="py-2 pr-3 text-xs">{s.pic ?? "—"}</td>
                  <td className="py-2 pr-3 text-right">
                    {s.active ? (
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
