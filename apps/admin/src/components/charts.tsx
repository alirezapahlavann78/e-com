"use client";
import { useState } from "react";

export type BarDatum = { label: string; value: number };

/**
 * Pure SVG bar chart. Single series — no legend needed; the title names it.
 * Bars: thin marks with rounded data-ends, 2px gaps, recessive grid, hover tooltip.
 * RTL-safe: renders bars right-to-left (newest day on the left edge of time order).
 */
export function BarChart({ data, height = 220, formatValue }: { data: BarDatum[]; height?: number; formatValue?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 640;
  const padT = 10;
  const padB = 26;
  const padX = 8;
  const plotH = height - padT - padB;
  const slot = (w - padX * 2) / Math.max(1, data.length);
  const barW = Math.min(28, slot * 0.6);
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("fa-IR"));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="نمودار میله‌ای درآمد">
        {/* recessive gridlines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padX} x2={w - padX} y1={padT + plotH * (1 - f)} y2={padT + plotH * (1 - f)} stroke="var(--border)" strokeWidth="1" />
        ))}
        <line x1={padX} x2={w - padX} y1={padT + plotH} y2={padT + plotH} stroke="var(--border)" strokeWidth="1" />
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * plotH);
          const x = padX + slot * i + (slot - barW) / 2;
          const y = padT + plotH - h;
          const isHover = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* generous hit target */}
              <rect x={padX + slot * i} y={padT} width={slot} height={plotH} fill="transparent" />
              <rect
                x={x} y={y} width={barW} height={h} rx={Math.min(4, barW / 2)}
                fill={isHover ? "#0369a1" : "#0284c7"}
                opacity={hover === null || isHover ? 1 : 0.55}
              />
              {i % Math.ceil(data.length / 7) === 0 || i === data.length - 1 ? (
                <text x={padX + slot * i + slot / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {hover !== null ? (
        <div
          className="pointer-events-none absolute -top-1 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-xs shadow-lg"
          style={{ right: `${((padX + slot * hover + slot / 2) / w) * 100}%`, transform: "translateX(50%)" }}
        >
          <span className="text-[var(--muted)]">{data[hover]?.label}: </span>
          <span className="font-medium text-[var(--foreground)]">{fmt(data[hover]?.value ?? 0)}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Single-series sparkline (2px line). */
export function Sparkline({ values, width = 120, height = 36 }: { values: number[]; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const n = values.length;
  if (n < 2) return <svg width={width} height={height} />;
  const pts = values.map((v, i) => {
    const x = (i / (n - 1)) * (width - 4) + 2;
    const y = height - 3 - (v / max) * (height - 6);
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
