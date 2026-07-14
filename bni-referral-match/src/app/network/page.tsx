"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { edgeStyle, EDGE_STYLE, NetworkGraph } from "@/components/charts/NetworkGraph";
import { Avatar } from "@/components/ui/Avatar";
import type { Interaction, InteractionType, Member } from "@/lib/types";

const REL_BUTTONS: { kind: string; label: string }[] = [
  { kind: "121", label: "💬 已 121" },
  { kind: "referral_out", label: "→ 我引薦他" },
  { kind: "referral_in", label: "← 他引薦我" },
  { kind: "referral_two", label: "⇄ 雙向引薦" },
  { kind: "cooperation", label: "🤝 合作" },
  { kind: "potential", label: "🌱 可能產生合作" },
];

export default function NetworkPage() {
  const { member } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadInteractions = useCallback(async () => {
    const d = await fetch("/api/interactions").then((r) => r.json());
    setInteractions(d.interactions ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then((d) => setMembers(d.members ?? []));
    loadInteractions();
  }, [loadInteractions]);

  const detail = useMemo(() => {
    if (!selected) return [];
    return interactions
      .filter((i) => i.fromId === selected.id || i.toId === selected.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selected, interactions]);

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  if (!member) return <AppShell><div /></AppShell>;

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  };

  const record = async (kind: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId: member.id, targetId: selected.id, kind }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "記錄失敗");
      setInteractions(d.interactions ?? []);
      flash("已記錄，關係圖與首頁統計已更新！");
    } catch (e) {
      flash(e instanceof Error ? e.message : "記錄失敗");
    } finally {
      setBusy(false);
    }
  };

  const removeInteraction = async (id: string) => {
    if (!confirm("確定要刪除這筆互動紀錄嗎？")) return;
    const res = await fetch(`/api/interactions?id=${id}&requesterId=${member.id}`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) setInteractions(d.interactions ?? []);
    else flash(d.error || "刪除失敗");
  };

  // 與所選會員「和我之間」的關係摘要
  const withMe = selected
    ? detail.filter((i) => i.fromId === member.id || i.toId === member.id)
    : [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="glass animate-fade-up p-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink">🕸️ 會員關係圖</h1>
          <p className="mt-1 text-sm text-ink-soft">
            每位會員是一個節點，線條代表 121、引薦、合作與可能產生合作。
            <strong className="text-ink">點擊節點</strong>即可查看明細，並記錄你與該會員的關係。
          </p>
          {/* 圖例 */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {(["121", "referral", "cooperation", "potential"] as InteractionType[]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-ink-soft">
                <span className="inline-block h-2.5 w-5 rounded-full" style={{ background: EDGE_STYLE[t].color }} />
                {EDGE_STYLE[t].label}
              </span>
            ))}
          </div>
        </div>

        {notice && (
          <div className="glass animate-fade-up border-l-4 border-gold-500 p-3 text-sm text-ink">✅ {notice}</div>
        )}

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

          {/* 明細 + 關係設定面板 */}
          <div className="glass animate-fade-up p-6">
            {selected ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar name={selected.name} color={selected.color} size={48} />
                  <div className="min-w-0">
                    <div className="font-bold text-ink">{selected.name}</div>
                    <div className="truncate text-xs text-ink-muted">
                      {selected.company} · {selected.industry}
                    </div>
                  </div>
                </div>

                {/* 記錄我與他的關係 */}
                {selected.id !== member.id ? (
                  <div className="mt-4 rounded-2xl bg-white/50 p-4">
                    <div className="text-sm font-semibold text-ink">設定我與 {selected.name} 的關係</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {REL_BUTTONS.map((b) => (
                        <button
                          key={b.kind}
                          onClick={() => record(b.kind)}
                          disabled={busy}
                          className="chip !text-xs disabled:opacity-50"
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                    {withMe.length > 0 && (
                      <div className="mt-3 border-t border-ink/5 pt-3">
                        <div className="mb-1 text-[11px] text-ink-muted">我與他的紀錄（點 ✕ 可刪除）</div>
                        <ul className="space-y-1.5">
                          {withMe.map((i) => (
                            <li key={i.id} className="flex items-center justify-between gap-2 text-[13px]">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                                  style={{ background: edgeStyle(i.type).color }}
                                >
                                  {edgeStyle(i.type).label}
                                </span>
                                <span className="text-ink-soft">
                                  {i.fromId === member.id ? `我 → ${selected.name}` : `${selected.name} → 我`}
                                </span>
                                <span className="text-[11px] text-ink-muted">{i.date.slice(0, 10)}</span>
                              </span>
                              <button
                                onClick={() => removeInteraction(i.id)}
                                className="text-ink-muted transition hover:text-bni-red"
                                title="刪除這筆"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-white/50 p-3 text-center text-xs text-ink-muted">這是你自己</div>
                )}

                {/* 統計 */}
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {(["121", "referral", "cooperation", "potential"] as InteractionType[]).map((t) => (
                    <div key={t} className="rounded-2xl bg-white/50 p-2">
                      <div className="text-lg font-bold" style={{ color: EDGE_STYLE[t].color }}>
                        {detail.filter((i) => i.type === t).length}
                      </div>
                      <div className="text-[10px] text-ink-muted">{EDGE_STYLE[t].label}</div>
                    </div>
                  ))}
                </div>

                {/* 全部互動明細 */}
                <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {detail.map((i) => (
                    <li key={i.id} className="rounded-2xl bg-white/40 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{ background: edgeStyle(i.type).color }}
                        >
                          {edgeStyle(i.type).label}
                        </span>
                        <span className="text-[11px] text-ink-muted">{i.date.slice(0, 10)}</span>
                      </div>
                      <div className="mt-1.5 text-[13px] text-ink">
                        {nameOf(i.fromId)} → {nameOf(i.toId)}
                      </div>
                      {i.note && <div className="text-xs text-ink-soft">{i.note}</div>}
                    </li>
                  ))}
                  {detail.length === 0 && (
                    <li className="rounded-2xl bg-white/40 p-3 text-center text-xs text-ink-muted">
                      還沒有互動紀錄——用上方按鈕記錄你與他的關係。
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                <div className="text-4xl">👆</div>
                <p className="mt-3 text-sm text-ink-muted">
                  點擊左圖任一節點
                  <br />
                  查看明細並記錄你與該會員的關係
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
