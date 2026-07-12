"use client";

import { useState } from "react";

/* 共用：滑鼠追蹤 tooltip */
function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const show = (e: React.MouseEvent, text: string) => {
    const rect = (e.currentTarget.closest("[data-chart]") as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text });
  };
  const hide = () => setTip(null);
  const node = tip ? (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-ink px-3 py-1.5 text-xs font-medium text-white shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      {tip.text}
    </div>
  ) : null;
  return { show, hide, node };
}

export interface Datum {
  label: string;
  value: number;
  color?: string;
}

/* ---------- 水平長條圖 ---------- */
export function BarChart({
  data,
  unit = "",
  color = "#c8102e",
}: {
  data: Datum[];
  unit?: string;
  color?: string;
}) {
  const { show, hide, node } = useTooltip();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div data-chart className="relative space-y-2.5">
      {node}
      {data.map((d) => (
        <div
          key={d.label}
          className="flex items-center gap-3"
          onMouseMove={(e) => show(e, `${d.label}：${d.value}${unit}`)}
          onMouseLeave={hide}
        >
          <span className="w-24 shrink-0 truncate text-right text-[13px] text-ink-soft">
            {d.label}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink/5">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: `linear-gradient(90deg, ${d.color ?? color}cc, ${d.color ?? color})`,
              }}
            />
          </div>
          <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums text-ink">
            {d.value}
            <span className="ml-0.5 text-[11px] font-normal text-ink-muted">{unit}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 甜甜圈圖 ---------- */
export function DonutChart({
  data,
  centerLabel,
}: {
  data: Datum[];
  centerLabel?: string;
}) {
  const { show, hide, node } = useTooltip();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 70;
  const C = 2 * Math.PI * R;
  const gap = 3; // px 間隔
  let offset = 0;

  return (
    <div data-chart className="relative flex flex-wrap items-center justify-center gap-6">
      {node}
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0 -rotate-90">
        {data.map((d) => {
          const len = (d.value / total) * C - gap;
          const el = (
            <circle
              key={d.label}
              cx={90}
              cy={90}
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth={18}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(2, len)} ${C - Math.max(2, len)}`}
              strokeDashoffset={-offset}
              className="transition-all duration-700"
              onMouseMove={(e) =>
                show(e, `${d.label}：${d.value}（${Math.round((d.value / total) * 100)}%）`)
              }
              onMouseLeave={hide}
            />
          );
          offset += (d.value / total) * C;
          return el;
        })}
        <g transform="rotate(90 90 90)">
          <text x={90} y={86} textAnchor="middle" className="fill-[#1d1b16] text-2xl font-bold">
            {total}
          </text>
          {centerLabel && (
            <text x={90} y={104} textAnchor="middle" className="fill-[#898781] text-[10px]">
              {centerLabel}
            </text>
          )}
        </g>
      </svg>
      <ul className="min-w-36 space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 text-ink-soft">{d.label}</span>
            <span className="font-semibold tabular-nums text-ink">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- 雷達圖 ---------- */
export function RadarChart({ data }: { data: Datum[] }) {
  const n = data.length;
  const cx = 110;
  const cy = 105;
  const R = 72;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, r: number) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  const ring = (frac: number) =>
    data.map((_, i) => pt(i, R * frac).join(",")).join(" ");
  const poly = data.map((d, i) => pt(i, (R * Math.min(100, d.value)) / 100).join(",")).join(" ");

  return (
    <svg viewBox="0 0 220 210" className="mx-auto w-full max-w-[320px]">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#e6dfd0" strokeWidth={1} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e6dfd0" strokeWidth={1} />;
      })}
      <polygon
        points={poly}
        fill="rgba(212, 182, 94, 0.35)"
        stroke="#C9A227"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const [x, y] = pt(i, (R * Math.min(100, d.value)) / 100);
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#C9A227" stroke="#fff" strokeWidth={1.5} />;
      })}
      {data.map((d, i) => {
        const [x, y] = pt(i, R + 18);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#52514e] text-[10px]"
          >
            {d.label} {d.value}
          </text>
        );
      })}
    </svg>
  );
}

/* ---------- 熱力圖 ---------- */
export function Heatmap({
  rows,
  cols,
  title,
}: {
  rows: { label: string; values: number[] }[];
  cols: string[];
  title?: string;
}) {
  const { show, hide, node } = useTooltip();
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  const ramp = (v: number) => {
    if (v === 0) return "rgba(29,27,22,0.04)";
    const t = v / max;
    // 單一色相（BNI 紅）淺→深
    const stops = ["#fbe9ec", "#f3bcc6", "#e9899b", "#d94a63", "#c8102e", "#9e0b22"];
    return stops[Math.min(stops.length - 1, Math.floor(t * stops.length))];
  };
  return (
    <div data-chart className="relative overflow-x-auto">
      {node}
      <table className="w-full border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className="w-20 text-left text-[11px] font-normal text-ink-muted">{title ?? ""}</th>
            {cols.map((c) => (
              <th key={c} className="pb-1 text-[11px] font-normal text-ink-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="pr-2 text-right text-[12px] text-ink-soft">{r.label}</td>
              {r.values.map((v, i) => (
                <td
                  key={i}
                  className="h-8 min-w-8 rounded-lg text-center text-[11px] font-medium transition-transform hover:scale-105"
                  style={{ background: ramp(v), color: v / max > 0.5 ? "#fff" : "#52514e" }}
                  onMouseMove={(e) => show(e, `${r.label} · ${cols[i]}：${v} 次互動`)}
                  onMouseLeave={hide}
                >
                  {v > 0 ? v : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
