"use client";

/**
 * Lightweight SVG chart primitives — tanpa dependency chart library.
 * Dipakai di dashboard analytics tabs (penerima manfaat / supply chain / keuangan).
 *
 * Semua chart:
 *  - responsive via viewBox + preserveAspectRatio
 *  - themed via Tailwind token warna
 *  - tooltip via <title> native (aksesibel + tidak perlu JS)
 */

import type { ReactNode } from "react";

/* ---------------- helpers ---------------- */

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / pow;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * pow;
}

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return n.toLocaleString("id-ID");
}

export function ChartLegend({
  items
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <div
          key={it.label}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink2"
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: it.color }}
          />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartFrame({
  title,
  subtitle,
  children,
  footer,
  accent
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  accent?: "blue" | "emerald" | "amber" | "violet" | "slate";
}) {
  const borderCls =
    accent === "emerald"
      ? "border-t-2 border-emerald-500/60"
      : accent === "amber"
        ? "border-t-2 border-amber-500/60"
        : accent === "violet"
          ? "border-t-2 border-violet-500/60"
          : accent === "slate"
            ? "border-t-2 border-slate-500/60"
            : "border-t-2 border-accent-strong/60";
  return (
    <div
      className={`flex flex-col rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5 ${borderCls}`}
    >
      <div className="mb-2">
        <h3 className="font-display text-[12px] font-bold uppercase tracking-[0.08em] text-ink">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-ink2/70">{subtitle}</p>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      {footer && <div className="mt-2 text-[11px] text-ink2/70">{footer}</div>}
    </div>
  );
}

/* ---------------- Stacked Bar (kategori × segmen) ---------------- */

export interface StackedSegment {
  key: string;
  value: number;
}
export interface StackedBarRow {
  label: string;
  sub?: string;
  segments: StackedSegment[];
}
export interface StackedBarProps {
  rows: StackedBarRow[];
  keys: Array<{ key: string; label: string; color: string }>;
  height?: number;
  format?: (v: number) => string;
}

export function StackedBarChart({
  rows,
  keys,
  height = 220,
  format = fmtCompact
}: StackedBarProps) {
  if (rows.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-[12px] text-ink2/60">
        Belum ada data.
      </div>
    );
  }
  const maxTotal = rows.reduce(
    (m, r) => Math.max(m, r.segments.reduce((s, x) => s + x.value, 0)),
    0
  );
  const top = niceMax(maxTotal);
  const pad = { l: 36, r: 8, t: 8, b: 28 };
  const w = Math.max(rows.length * 56, 320);
  const h = height;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const barW = Math.max(16, Math.min(34, (innerW / rows.length) * 0.6));
  const step = innerW / rows.length;
  const gridLines = 4;
  const colorFor = (k: string) => keys.find((x) => x.key === k)?.color ?? "#94a3b8";

  return (
    <>
      <svg
        role="img"
        aria-label="Stacked bar chart"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-[220px] w-full"
      >
        {/* gridlines */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = pad.t + (innerH / gridLines) * i;
          const v = top - (top / gridLines) * i;
          return (
            <g key={i}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={pad.l - 6}
                y={y + 3}
                fontSize={9}
                textAnchor="end"
                fill="#64748b"
              >
                {format(v)}
              </text>
            </g>
          );
        })}
        {rows.map((r, i) => {
          const x0 = pad.l + step * i + (step - barW) / 2;
          let yCursor = pad.t + innerH;
          return (
            <g key={i}>
              {r.segments.map((s, j) => {
                const segH = top > 0 ? (s.value / top) * innerH : 0;
                yCursor -= segH;
                return (
                  <rect
                    key={j}
                    x={x0}
                    y={yCursor}
                    width={barW}
                    height={Math.max(0, segH)}
                    fill={colorFor(s.key)}
                    rx={2}
                  >
                    <title>{`${r.label} · ${keys.find((k) => k.key === s.key)?.label ?? s.key}: ${format(s.value)}`}</title>
                  </rect>
                );
              })}
              <text
                x={pad.l + step * i + step / 2}
                y={h - pad.b + 14}
                fontSize={9.5}
                textAnchor="middle"
                fill="#475569"
                fontWeight={600}
              >
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartLegend items={keys.map((k) => ({ label: k.label, color: k.color }))} />
    </>
  );
}

/* ---------------- Line Chart (trend series) ---------------- */

export interface LineChartSeries {
  key: string;
  label: string;
  color: string;
  values: Array<{ label: string; value: number }>;
}

export interface LineChartProps {
  series: LineChartSeries[];
  height?: number;
  format?: (v: number) => string;
  benchmark?: { value: number; label: string };
}

export function LineChart({
  series,
  height = 220,
  format = fmtCompact,
  benchmark
}: LineChartProps) {
  if (series.length === 0 || series[0].values.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-[12px] text-ink2/60">
        Belum ada data.
      </div>
    );
  }
  const labels = series[0].values.map((v) => v.label);
  const n = labels.length;
  let max = 0;
  for (const s of series) for (const v of s.values) max = Math.max(max, v.value);
  if (benchmark) max = Math.max(max, benchmark.value);
  const top = niceMax(max || 1);
  const pad = { l: 40, r: 10, t: 10, b: 26 };
  const w = Math.max(n * 54, 320);
  const h = height;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const xOf = (i: number) => pad.l + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const yOf = (v: number) => pad.t + innerH - (v / top) * innerH;
  const gridLines = 4;

  return (
    <>
      <svg
        role="img"
        aria-label="Line chart"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-[220px] w-full"
      >
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = pad.t + (innerH / gridLines) * i;
          const v = top - (top / gridLines) * i;
          return (
            <g key={i}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={pad.l - 6}
                y={y + 3}
                fontSize={9}
                textAnchor="end"
                fill="#64748b"
              >
                {format(v)}
              </text>
            </g>
          );
        })}
        {benchmark && (
          <g>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={yOf(benchmark.value)}
              y2={yOf(benchmark.value)}
              stroke="#dc2626"
              strokeWidth={1.25}
              strokeDasharray="4 4"
            />
            <text
              x={w - pad.r - 4}
              y={yOf(benchmark.value) - 3}
              fontSize={9}
              textAnchor="end"
              fill="#dc2626"
              fontWeight={700}
            >
              {benchmark.label}
            </text>
          </g>
        )}
        {series.map((s) => {
          const path = s.values
            .map((v, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(v.value)}`)
            .join(" ");
          const area = `${path} L ${xOf(n - 1)} ${pad.t + innerH} L ${xOf(0)} ${pad.t + innerH} Z`;
          return (
            <g key={s.key}>
              <path d={area} fill={s.color} opacity={0.12} />
              <path d={path} fill="none" stroke={s.color} strokeWidth={2} />
              {s.values.map((v, i) => (
                <circle
                  key={i}
                  cx={xOf(i)}
                  cy={yOf(v.value)}
                  r={2.5}
                  fill={s.color}
                >
                  <title>{`${v.label} · ${s.label}: ${format(v.value)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {labels.map((l, i) => (
          <text
            key={i}
            x={xOf(i)}
            y={h - pad.b + 14}
            fontSize={9.5}
            textAnchor="middle"
            fill="#475569"
            fontWeight={600}
          >
            {l}
          </text>
        ))}
      </svg>
      {series.length > 1 && (
        <ChartLegend
          items={series.map((s) => ({ label: s.label, color: s.color }))}
        />
      )}
    </>
  );
}

/* ---------------- Horizontal Ranked Bar ---------------- */

export interface HBarRow {
  label: string;
  value: number;
  sub?: string;
}

export function HBarChart({
  rows,
  format = fmtCompact,
  color = "#0f766e",
  max
}: {
  rows: HBarRow[];
  format?: (v: number) => string;
  color?: string;
  max?: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-[12px] text-ink2/60">
        Belum ada data.
      </div>
    );
  }
  const top = max ?? niceMax(Math.max(...rows.map((r) => r.value)));
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r, i) => {
        const pct = top > 0 ? Math.min(100, (r.value / top) * 100) : 0;
        return (
          <li key={`${r.label}-${i}`} className="grid grid-cols-[minmax(110px,28%)_1fr_auto] items-center gap-2">
            <span className="truncate text-[11.5px] font-semibold text-ink" title={r.label}>
              {r.label}
              {r.sub && (
                <span className="ml-1 text-[10px] font-normal text-ink2/60">
                  {r.sub}
                </span>
              )}
            </span>
            <span className="relative block h-5 rounded-md bg-ink/5">
              <span
                className="absolute inset-y-0 left-0 rounded-md"
                style={{ width: `${pct}%`, background: color }}
              />
            </span>
            <span className="tabular-nums text-right text-[11.5px] font-bold text-ink">
              {format(r.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- Bullet: required vs on-hand ---------------- */

export interface BulletRow {
  label: string;
  required: number;
  actual: number;
  unit?: string;
}

export function BulletBarChart({
  rows,
  format = (v: number) => v.toLocaleString("id-ID")
}: {
  rows: BulletRow[];
  format?: (v: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-[12px] text-ink2/60">
        Belum ada data.
      </div>
    );
  }
  const max = Math.max(...rows.map((r) => Math.max(r.required, r.actual)));
  const top = niceMax(max || 1);
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r, i) => {
        const pctReq = top > 0 ? (r.required / top) * 100 : 0;
        const pctAct = top > 0 ? (r.actual / top) * 100 : 0;
        const shortage = r.required - r.actual;
        return (
          <li key={`${r.label}-${i}`} className="grid grid-cols-[minmax(120px,28%)_1fr_auto] items-center gap-2">
            <span className="truncate text-[11.5px] font-semibold text-ink" title={r.label}>
              {r.label}
            </span>
            <span className="relative block h-5 rounded-md bg-ink/5">
              <span
                className="absolute inset-y-0 left-0 rounded-md bg-amber-200"
                style={{ width: `${pctReq}%` }}
                title={`Butuh: ${format(r.required)}${r.unit ? " " + r.unit : ""}`}
              />
              <span
                className="absolute inset-y-1 left-0 rounded-sm bg-red-600"
                style={{ width: `${pctAct}%` }}
                title={`Ada: ${format(r.actual)}${r.unit ? " " + r.unit : ""}`}
              />
            </span>
            <span className="tabular-nums text-right text-[11px] font-bold text-red-700">
              −{format(Math.max(0, shortage))}
              {r.unit && <span className="ml-0.5 font-normal text-ink2/60">{r.unit}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
