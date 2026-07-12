"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { EDGE_STYLE, NetworkGraph } from "@/components/charts/NetworkGraph";
import { Avatar } from "@/components/ui/Avatar";
import type { Interaction, Member } from "@/lib/types";

export default function NetworkPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then((d) => setMembers(d.members ?? []));
    fetch("/api/interactions").then((r) => r.json()).then((d) => setInteractions(d.interactions ?? []));
  }, []);

  const detail = useMemo(() => {
    if (!selected) return [];
    return interactions
      .filter((i) => i.fromId === selected.id || i.toId === selected.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selected, interactions]);

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="glass animate-fade-up p-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink">🕸️ 會員關係圖</h1>
          <p className="mt-1 text-sm text-ink-soft">
            每位會員是一個節點，線條代表 121、合作、轉介與共同客戶。點擊節點查看明細。
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="glass animate-fade-up p-4 lg:p-6">
            {members.length > 0 ? (
              <NetworkGraph
                members={members}
                interactions={interactions}
                onSelect={setSelected}
                selectedId={selected?.id}
              />
            ) : (
              <div className="animate-pulse p-16 text-center text-ink-muted">建構網絡中…</div>
            )}
          </div>

          {/* 明細面板 */}
          <div className="glass animate-fade-up p-6">
            {selected ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar name={selected.name} color={selected.color} size={48} />
                  <div>
                    <div className="font-bold text-ink">{selected.name}</div>
                    <div className="text-xs text-ink-muted">
                      {selected.company} · {selected.industry}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {(["121", "referral", "cooperation", "shared_client"] as const).map((t) => (
                    <div key={t} className="rounded-2xl bg-white/50 p-2">
                      <div className="text-lg font-bold" style={{ color: EDGE_STYLE[t].color }}>
                        {detail.filter((i) => i.type === t).length}
                      </div>
                      <div className="text-[10px] text-ink-muted">{EDGE_STYLE[t].label}</div>
                    </div>
                  ))}
                </div>
                <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {detail.map((i) => (
                    <li key={i.id} className="rounded-2xl bg-white/40 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{ background: EDGE_STYLE[i.type].color }}
                        >
                          {EDGE_STYLE[i.type].label}
                        </span>
                        <span className="text-[11px] text-ink-muted">{i.date}</span>
                      </div>
                      <div className="mt-1.5 text-[13px] text-ink">
                        {nameOf(i.fromId)} → {nameOf(i.toId)}
                      </div>
                      {i.note && <div className="text-xs text-ink-soft">{i.note}</div>}
                      {i.amount != null && (
                        <div className="mt-0.5 text-xs font-semibold text-gold-600">
                          NT$ {i.amount.toLocaleString()} {i.closed ? "· 已成交" : "· 進行中"}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                <div className="text-4xl">👆</div>
                <p className="mt-3 text-sm text-ink-muted">
                  點擊左圖任一節點
                  <br />
                  查看該會員的互動明細
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
