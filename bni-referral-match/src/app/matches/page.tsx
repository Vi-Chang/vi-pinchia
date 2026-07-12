"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Stars";
import type { PairInsight } from "@/lib/ai-insight";
import type { CoopSuggestion } from "@/lib/suggestions";
import type { MatchResult, Member } from "@/lib/types";

type MatchWithMember = MatchResult & { target: Member; suggestion?: CoopSuggestion };

type InsightState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; insight: PairInsight; cached: boolean };

export default function MatchesPage() {
  const { member } = useAuth();
  const [matches, setMatches] = useState<MatchWithMember[] | null>(null);
  const [scope, setScope] = useState<"all" | "chapter">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [insights, setInsights] = useState<Record<string, InsightState>>({});

  const runAiInsight = async (targetId: string) => {
    if (!member || insights[targetId]?.status === "loading") return;
    setInsights((s) => ({ ...s, [targetId]: { status: "loading" } }));
    try {
      const res = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId: member.id, targetId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "AI 分析失敗");
      setInsights((s) => ({
        ...s,
        [targetId]: { status: "done", insight: d.insight, cached: d.cached },
      }));
    } catch (e) {
      setInsights((s) => ({
        ...s,
        [targetId]: { status: "error", message: e instanceof Error ? e.message : "AI 分析失敗" },
      }));
    }
  };

  useEffect(() => {
    if (!member) return;
    setMatches(null);
    fetch(`/api/matches?memberId=${member.id}&scope=${scope}`)
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []));
  }, [member, scope]);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="glass animate-fade-up p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">💎 商機配對引擎</h1>
              <p className="mt-1 text-sm text-ink-soft">
                以主推專案與最新交流卡為最高優先，加上理想客戶、資源互補、過去合作、地區、產業與關鍵字媒合。
              </p>
            </div>
            {/* 多分會：可切換媒合範圍 */}
            <div className="glass flex overflow-hidden rounded-full text-sm">
              <button
                onClick={() => setScope("all")}
                className={`px-4 py-2 font-medium transition ${
                  scope === "all" ? "bg-ink text-white" : "text-ink-soft"
                }`}
              >
                全部分會
              </button>
              <button
                onClick={() => setScope("chapter")}
                className={`px-4 py-2 font-medium transition ${
                  scope === "chapter" ? "bg-ink text-white" : "text-ink-soft"
                }`}
              >
                僅{member?.chapter ?? "同分會"}
              </button>
            </div>
          </div>
        </div>

        {!matches && (
          <div className="glass animate-pulse p-10 text-center text-ink-muted">計算配對中…</div>
        )}

        <div className="stagger grid gap-4 md:grid-cols-2">
          {matches?.map((m, idx) => (
            <div key={m.targetId} className="glass glass-hover relative overflow-hidden p-6">
              {idx === 0 && (
                <span className="absolute right-0 top-0 rounded-bl-2xl bg-gradient-to-r from-gold-400 to-gold-500 px-3 py-1 text-xs font-bold text-white">
                  最佳配對
                </span>
              )}
              <div className="flex items-center gap-4">
                <Avatar name={m.target.name} color={m.target.color} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-ink">{m.target.name}</div>
                  <div className="truncate text-xs text-ink-muted">
                    {m.target.company} · {m.target.industry} · {m.target.chapter}
                  </div>
                  <Stars count={m.stars} size={13} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-bni-red">{m.probability}%</div>
                  <div className="text-[10px] text-ink-muted">配對成功率</div>
                </div>
              </div>

              {/* Match Score bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-400 to-bni-red transition-all duration-700"
                    style={{ width: `${m.score}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums text-ink">{m.score} 分</span>
              </div>

              {m.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.tags.map((t) => (
                    <span key={t} className="tag-gold">{t}</span>
                  ))}
                </div>
              )}

              <ul className="mt-3 space-y-1">
                {m.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink-soft">
                    <span className="mt-0.5 text-gold-500">◆</span>
                    {r}
                  </li>
                ))}
                {m.reasons.length === 0 && (
                  <li className="text-[13px] text-ink-muted">
                    交集較少——完成雙方交流卡後分數會更準確。
                  </li>
                )}
              </ul>

              {/* AI 商機建議 */}
              {m.suggestion && (
                <div className="mt-4 border-t border-ink/5 pt-3">
                  <button
                    onClick={() => setOpen(open === m.targetId ? null : m.targetId)}
                    className="text-sm font-semibold text-bni-red"
                  >
                    🤖 AI 商機建議 {open === m.targetId ? "▲" : "▼"}
                  </button>
                  {open === m.targetId && (
                    <dl className="mt-3 space-y-3 text-[13px]">
                      <div>
                        <dt className="font-semibold text-ink">建議合作方式</dt>
                        <dd className="mt-1 flex flex-wrap gap-1.5">
                          {m.suggestion.coopMethods.map((c) => (
                            <span key={c} className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-ink-soft">
                              {c}
                            </span>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">可以互相介紹的客戶</dt>
                        <dd className="mt-1 space-y-1 text-ink-soft">
                          <p>→ {m.suggestion.introAtoB}</p>
                          <p>← {m.suggestion.introBtoA}</p>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">建議如何向對方提案</dt>
                        <dd className="mt-1 text-ink-soft">{m.suggestion.pitch}</dd>
                      </div>

                      {/* AI 按需深度分析：點擊才呼叫 Anthropic API */}
                      <div className="border-t border-ink/5 pt-3">
                        {!insights[m.targetId] && (
                          <button
                            onClick={() => runAiInsight(m.targetId)}
                            className="btn-gold !px-4 !py-2 !text-xs"
                          >
                            ✨ AI 深度分析（呼叫 Claude 產生專屬提案）
                          </button>
                        )}
                        {insights[m.targetId]?.status === "loading" && (
                          <p className="animate-pulse text-xs text-ink-muted">
                            🤖 Claude 正在深度分析這組合作…
                          </p>
                        )}
                        {insights[m.targetId]?.status === "error" && (
                          <p className="text-xs text-bni-red">
                            {(insights[m.targetId] as { message: string }).message}
                            <button
                              onClick={() => runAiInsight(m.targetId)}
                              className="ml-2 underline"
                            >
                              重試
                            </button>
                          </p>
                        )}
                        {insights[m.targetId]?.status === "done" && (() => {
                          const st = insights[m.targetId] as { insight: PairInsight; cached: boolean };
                          const ai = st.insight;
                          return (
                            <div className="rounded-2xl border border-gold-300/50 bg-white/60 p-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold tracking-wide text-gold-600">
                                  ✨ Claude 深度分析
                                </span>
                                {st.cached && (
                                  <span className="text-[10px] text-ink-muted">已快取（不重複計費）</span>
                                )}
                              </div>
                              <p className="mt-2 text-[13px] leading-6 text-ink">{ai.whyMatch}</p>
                              {ai.coopPlan.length > 0 && (
                                <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-ink-soft">
                                  {ai.coopPlan.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ol>
                              )}
                              <dl className="mt-3 space-y-2 text-[13px] text-ink-soft">
                                {ai.referralAtoB && (
                                  <div><dt className="inline font-semibold text-ink">你介紹給對方：</dt><dd className="inline">{ai.referralAtoB}</dd></div>
                                )}
                                {ai.referralBtoA && (
                                  <div><dt className="inline font-semibold text-ink">對方介紹給你：</dt><dd className="inline">{ai.referralBtoA}</dd></div>
                                )}
                                {ai.pitch && (
                                  <div><dt className="inline font-semibold text-ink">提案切入：</dt><dd className="inline">{ai.pitch}</dd></div>
                                )}
                                {ai.icebreaker && (
                                  <div><dt className="inline font-semibold text-ink">121 開場白：</dt><dd className="inline">「{ai.icebreaker}」</dd></div>
                                )}
                              </dl>
                            </div>
                          );
                        })()}
                      </div>
                    </dl>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
