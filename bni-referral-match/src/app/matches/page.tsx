"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Stars";
import type { MatchResult, Member } from "@/lib/types";

type MatchWithMember = MatchResult & { target: Member };

export default function MatchesPage() {
  const { member } = useAuth();
  const [matches, setMatches] = useState<MatchWithMember[] | null>(null);

  useEffect(() => {
    if (!member) return;
    fetch(`/api/matches?memberId=${member.id}`)
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []));
  }, [member]);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="glass animate-fade-up p-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink">💎 商機配對引擎</h1>
          <p className="mt-1 text-sm text-ink-soft">
            依產業、理想客戶、資源互補、服務地區與關鍵字自動媒合，Match Score 0–100 分。
          </p>
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
                    {m.target.company} · {m.target.industry}
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
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
