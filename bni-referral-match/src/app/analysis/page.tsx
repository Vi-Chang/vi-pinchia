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

export default function AnalysisPage() {
  const { member } = useAuth();
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);

  useEffect(() => {
    if (!member) return;
    fetch(`/api/analysis?memberId=${member.id}`)
      .then((r) => r.json())
      .then((d) => setAnalysis(d.analysis ?? null));
  }, [member]);

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
              <div className="text-xs font-semibold tracking-wide text-gold-600">本月行動建議</div>
              <p className="mt-1.5 leading-7 text-ink">{analysis.narrative}</p>
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
                            <span className="text-sm font-semibold text-ink">{e.member.name}</span>
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
