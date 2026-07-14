"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import type { AiAnalysis } from "@/lib/types";

const BLOCKS: { key: keyof Omit<AiAnalysis, "narrative">; title: string; icon: string; desc: string }[] = [
  { key: "introduceTo", title: "適合介紹給誰", icon: "📤", desc: "你的客戶接著會需要這些夥伴" },
  { key: "receiveFrom", title: "誰適合介紹給你", icon: "📥", desc: "這些夥伴的客戶正是你的案源" },
  { key: "partners", title: "可以合作的會員", icon: "🤝", desc: "多項條件契合的合作對象" },
  { key: "overlapping", title: "客戶高度重疊", icon: "🎯", desc: "目標客群一致，可互相引薦" },
  { key: "supplyChain", title: "上下游夥伴", icon: "🔗", desc: "產業鏈上的天然盟友" },
  { key: "coEvent", title: "可共同辦活動", icon: "🎪", desc: "活動偏好一致的夥伴" },
  { key: "crossSell", title: "可交叉銷售", icon: "🔁", desc: "可互相打包彼此服務" },
];

type AiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; narrative: string; cached: boolean };

export default function AnalysisPage() {
  const { member } = useAuth();
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [ai, setAi] = useState<AiState>({ status: "idle" });

  useEffect(() => {
    if (!member) return;
    setAi({ status: "idle" });
    fetch(`/api/analysis?memberId=${member.id}`)
      .then((r) => r.json())
      .then((d) => setAnalysis(d.analysis ?? null));
  }, [member]);

  // AI 深度總結：按需呼叫 Claude（含快取），與全站 AI 成本控管一致
  const runAiSummary = async () => {
    if (!member || ai.status === "loading") return;
    setAi({ status: "loading" });
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "AI 總結失敗");
      setAi({ status: "done", narrative: d.narrative, cached: d.cached });
    } catch (e) {
      setAi({ status: "error", message: e instanceof Error ? e.message : "AI 總結失敗" });
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="glass animate-fade-up relative overflow-hidden p-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-300/40 blur-2xl" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">🤖 AI 商機分析</h1>
          <p className="mt-1 text-sm text-ink-soft">
            根據你的交流卡內容，AI 自動分析七大商機面向。
          </p>
          {analysis && (
            <div className="mt-5 rounded-2xl border border-gold-300/50 bg-white/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold tracking-wide text-gold-600">
                  {ai.status === "done" ? "✨ AI 深度總結" : "本月行動建議"}
                </div>
                {ai.status === "done" && ai.cached && (
                  <span className="text-[10px] text-ink-muted">已快取（不重複計費）</span>
                )}
              </div>
              <p className="mt-1.5 leading-7 text-ink">
                {ai.status === "done" ? ai.narrative : analysis.narrative}
              </p>

              {/* AI 深度總結：點擊才呼叫 Claude */}
              <div className="mt-3 border-t border-ink/5 pt-3">
                {(ai.status === "idle" || ai.status === "error") && (
                  <button onClick={runAiSummary} className="btn-gold !px-4 !py-2 !text-xs">
                    ✨ AI 深度總結（呼叫 Claude 產生專屬建議）
                  </button>
                )}
                {ai.status === "loading" && (
                  <p className="animate-pulse text-xs text-ink-muted">🤖 Claude 正在深度分析…</p>
                )}
                {ai.status === "error" && (
                  <p className="mt-2 text-xs text-bni-red">{ai.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {!analysis && (
          <div className="glass animate-pulse p-10 text-center text-ink-muted">AI 分析中…</div>
        )}

        <div className="stagger grid gap-4 md:grid-cols-2">
          {analysis &&
            BLOCKS.map((b) => {
              const items = analysis[b.key];
              return (
                <section key={b.key} className="glass p-6">
                  <h2 className="font-bold text-ink">
                    {b.icon} {b.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-muted">{b.desc}</p>
                  <ul className="mt-4 space-y-2.5">
                    {items.length === 0 && (
                      <li className="rounded-2xl bg-white/40 p-3 text-sm text-ink-muted">
                        目前資料尚無明顯訊號——補完交流卡可提升分析精準度。
                      </li>
                    )}
                    {items.map((e) => (
                      <li key={e.member.id} className="flex items-start gap-3 rounded-2xl bg-white/40 p-3">
                        <Avatar name={e.member.name} color={e.member.color} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold text-ink">
                              {e.member.name}
                              {e.member.isDemo && <span className="ml-1 text-xs font-normal text-amber-600">（範例）</span>}
                            </span>
                            <span className="shrink-0 text-xs font-bold text-gold-600">
                              {Math.min(97, e.score)} 分
                            </span>
                          </div>
                          <div className="text-xs leading-5 text-ink-soft">{e.reason}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
        </div>
      </div>
    </AppShell>
  );
}
