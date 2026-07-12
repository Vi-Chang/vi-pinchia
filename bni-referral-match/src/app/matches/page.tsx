"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Stars";
import type { CoopSuggestion } from "@/lib/suggestions";
import type { MatchResult, Member } from "@/lib/types";

type MatchWithMember = MatchResult & { target: Member; suggestion?: CoopSuggestion };

export default function MatchesPage() {
  const { member } = useAuth();
  const [matches, setMatches] = useState<MatchWithMember[] | null>(null);
  const [scope, setScope] = useState<"all" | "chapter">("all");
  const [open, setOpen] = useState<string | null>(null);

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
