"use client";

import { useEffect, useMemo, useState } from "react";
import type { Interaction, InteractionType, Member } from "@/lib/types";

type EdgeStyle = { color: string; dash?: string; width: number; label: string };
const EDGE_STYLE: Record<InteractionType, EdgeStyle> = {
  "121": { color: "#C9A227", width: 1.5, label: "121" },
  referral: { color: "#c8102e", width: 2.5, label: "轉介" },
  cooperation: { color: "#2a78d6", width: 2, label: "合作" },
  potential: { color: "#1baf7a", dash: "4 4", width: 1.5, label: "可能產生合作" },
};
/** 安全取樣式：未知或舊版型別（如 shared_client）回退為「可能產生合作」，避免畫面壞掉 */
const edgeStyle = (t: InteractionType): EdgeStyle => EDGE_STYLE[t] ?? EDGE_STYLE.potential;

interface Node {
  member: Member;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  a: string;
  b: string;
  type: InteractionType;
  count: number;
  notes: string[];
}

const W = 720;
const H = 520;

/** 簡易力導向佈局：斥力 + 邊彈簧 + 向心力，於掛載時跑固定迭代數 */
function layout(members: Member[], edges: Edge[]): Node[] {
  const nodes: Node[] = members.map((m, i) => {
    const a = (Math.PI * 2 * i) / members.length;
    return {
      member: m,
      x: W / 2 + Math.cos(a) * 180,
      y: H / 2 + Math.sin(a) * 160,
      vx: 0,
      vy: 0,
    };
  });
  const byId = new Map(nodes.map((n) => [n.member.id, n]));

  for (let iter = 0; iter < 320; iter++) {
    // 節點間斥力
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const d2 = Math.max(100, dx * dx + dy * dy);
        const f = 22000 / d2;
        const d = Math.sqrt(d2);
        dx /= d;
        dy /= d;
        a.vx += dx * f;
        a.vy += dy * f;
        b.vx -= dx * f;
        b.vy -= dy * f;
      }
    }
    // 邊彈簧
    for (const e of edges) {
      const a = byId.get(e.a);
      const b = byId.get(e.b);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const f = (d - 170) * 0.015 * Math.min(2, e.count);
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
    // 向心 + 阻尼 + 邊界
    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * 0.004;
      n.vy += (H / 2 - n.y) * 0.004;
      n.x += n.vx * 0.6;
      n.y += n.vy * 0.6;
      n.vx *= 0.55;
      n.vy *= 0.55;
      n.x = Math.max(52, Math.min(W - 52, n.x));
      n.y = Math.max(44, Math.min(H - 44, n.y));
    }
  }
  return nodes;
}

export function NetworkGraph({
  members,
  interactions,
  onSelect,
  selectedId,
}: {
  members: Member[];
  interactions: Interaction[];
  onSelect?: (m: Member | null) => void;
  selectedId?: string | null;
}) {
  const edges = useMemo<Edge[]>(() => {
    const map = new Map<string, Edge>();
    for (const i of interactions) {
      const [a, b] = [i.fromId, i.toId].sort();
      const key = `${a}|${b}|${i.type}`;
      const e = map.get(key);
      if (e) {
        e.count += 1;
        if (i.note) e.notes.push(i.note);
      } else {
        map.set(key, { a, b, type: i.type, count: 1, notes: i.note ? [i.note] : [] });
      }
    }
    return Array.from(map.values());
  }, [interactions]);

  const [nodes, setNodes] = useState<Node[]>([]);
  useEffect(() => {
    setNodes(layout(members, edges));
  }, [members, edges]);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const focusId = selectedId ?? hoverId;
  const byId = new Map(nodes.map((n) => [n.member.id, n]));

  const connected = (id: string) =>
    new Set(edges.filter((e) => e.a === id || e.b === id).flatMap((e) => [e.a, e.b]));

  const focusSet = focusId ? connected(focusId) : null;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-card"
        onClick={() => onSelect?.(null)}
      >
        {/* 邊 */}
        {edges.map((e, i) => {
          const a = byId.get(e.a);
          const b = byId.get(e.b);
          if (!a || !b) return null;
          const s = edgeStyle(e.type);
          const dim = focusId && e.a !== focusId && e.b !== focusId;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={s.color}
              strokeWidth={s.width + (e.count - 1)}
              strokeDasharray={s.dash}
              opacity={dim ? 0.12 : 0.65}
              className="transition-opacity duration-300"
            />
          );
        })}
        {/* 節點 */}
        {nodes.map((n) => {
          const dim = focusSet && !focusSet.has(n.member.id) && n.member.id !== focusId;
          const active = n.member.id === focusId;
          return (
            <g
              key={n.member.id}
              transform={`translate(${n.x}, ${n.y})`}
              className="cursor-pointer transition-opacity duration-300"
              opacity={dim ? 0.25 : 1}
              onMouseEnter={() => setHoverId(n.member.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(n.member);
              }}
            >
              {active && <circle r={26} fill={n.member.color} opacity={0.18} />}
              <circle
                r={18}
                fill={n.member.color}
                stroke="#fff"
                strokeWidth={2.5}
                style={{ filter: "drop-shadow(0 4px 8px rgba(31,26,12,0.2))" }}
              />
              <text textAnchor="middle" dominantBaseline="middle" className="fill-white text-[13px] font-bold" y={1}>
                {n.member.name.slice(0, 1)}
              </text>
              <text textAnchor="middle" y={32} className="fill-[#52514e] text-[11px] font-medium">
                {n.member.name}
              </text>
              {n.member.isDemo && (
                <text textAnchor="middle" y={45} className="fill-[#b45309] text-[9px] font-medium">
                  （範例）
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* 圖例 */}
      <div className="flex flex-wrap items-center gap-4 px-2 text-xs text-ink-soft">
        {Object.values(EDGE_STYLE).map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <svg width="24" height="6">
              <line
                x1="0"
                y1="3"
                x2="24"
                y2="3"
                stroke={s.color}
                strokeWidth={s.width}
                strokeDasharray={s.dash}
              />
            </svg>
            {s.label}
          </span>
        ))}
        <span className="text-ink-muted">點擊節點查看會員互動明細</span>
      </div>
    </div>
  );
}

export { EDGE_STYLE, edgeStyle };
