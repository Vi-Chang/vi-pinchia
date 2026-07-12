"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { StatCard } from "@/components/ui/StatCard";
import { BarChart, DonutChart, Heatmap, RadarChart } from "@/components/charts/charts";
import { PALETTE } from "@/lib/demo-data";
import { ALL_QUESTIONS } from "@/lib/questions";
import type { ExchangeCard } from "@/lib/types";

interface AdminStats {
  memberCount: number;
  cardDone: number;
  referralTotal: number;
  referralAmount: number;
  oneToOneTotal: number;
  referralRank: { name: string; company: string; color: string; value: number }[];
  oneToOneRank: { name: string; company: string; color: string; value: number }[];
  industries: { label: string; value: number }[];
  missingIndustries: string[];
  needRank: { label: string; value: number }[];
  giveRank: { label: string; value: number }[];
  helpRank: { label: string; value: number }[];
  radar: { label: string; value: number }[];
  heatmap: { weeks: string[]; rows: { label: string; values: number[] }[] };
  members: any[];
  cards: ExchangeCard[];
}

export default function AdminPage() {
  const { member } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [openMember, setOpenMember] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (member && member.role !== "admin") {
    return (
      <AppShell>
        <div className="glass mx-auto max-w-md p-10 text-center">
          <div className="text-3xl">🔒</div>
          <p className="mt-3 text-ink-soft">此頁面僅限管理員存取</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="glass animate-fade-up p-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink">🛠️ 管理員後台</h1>
          <p className="mt-1 text-sm text-ink-soft">
            分會整體商機儀表板：會員、引薦、產業結構與資源供需一覽。
          </p>
        </div>

        {!stats ? (
          <div className="glass animate-pulse p-10 text-center text-ink-muted">載入統計中…</div>
        ) : (
          <>
            {/* 總覽統計 */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatCard label="會員數" value={stats.memberCount} unit="位" icon="👥" accent="gold" />
              <StatCard label="交流卡完成" value={stats.cardDone} unit="位" icon="📋" accent="green" hint="完成度 80% 以上" />
              <StatCard label="累計 121" value={stats.oneToOneTotal} unit="次" icon="🤝" accent="blue" />
              <StatCard label="累計轉介" value={stats.referralTotal} unit="筆" icon="🎯" accent="red" />
              <StatCard
                label="轉介金額"
                value={`${Math.round(stats.referralAmount / 10000)}`}
                unit="萬"
                icon="💰"
                accent="gold"
              />
            </section>

            {/* 圖表列 1：排行 */}
            <section className="stagger grid gap-5 lg:grid-cols-2">
              <div className="glass p-6">
                <h2 className="mb-5 font-bold text-ink">🏆 轉介排行（給出）</h2>
                <BarChart
                  data={stats.referralRank.map((r) => ({ label: r.name, value: r.value, color: r.color }))}
                  unit="筆"
                />
              </div>
              <div className="glass p-6">
                <h2 className="mb-5 font-bold text-ink">🤝 121 排行</h2>
                <BarChart
                  data={stats.oneToOneRank.map((r) => ({ label: r.name, value: r.value, color: r.color }))}
                  unit="次"
                  color="#C9A227"
                />
              </div>
            </section>

            {/* 圖表列 2：產業結構 + 健康度 */}
            <section className="stagger grid gap-5 lg:grid-cols-2">
              <div className="glass p-6">
                <h2 className="mb-4 font-bold text-ink">🍩 熱門產業分佈</h2>
                <DonutChart
                  data={stats.industries.map((d, i) => ({ ...d, color: PALETTE[i % PALETTE.length] }))}
                  centerLabel="位會員"
                />
                <div className="mt-5 rounded-2xl bg-white/50 p-4">
                  <div className="text-xs font-semibold text-bni-red">最缺乏產業（招募建議）</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {stats.missingIndustries.map((i) => (
                      <span key={i} className="tag-red">{i}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="glass p-6">
                <h2 className="mb-4 font-bold text-ink">📡 分會健康度雷達</h2>
                <RadarChart data={stats.radar} />
                <p className="mt-3 text-center text-xs text-ink-muted">
                  五指標皆為 0–100，依本月互動與交流卡完成度計算
                </p>
              </div>
            </section>

            {/* 圖表列 3：熱力圖 */}
            <section className="glass animate-fade-up p-6">
              <h2 className="mb-4 font-bold text-ink">🔥 會員活躍熱力圖（近 8 週互動次數）</h2>
              <Heatmap rows={stats.heatmap.rows} cols={stats.heatmap.weeks} title="會員" />
            </section>

            {/* 資源供需 */}
            <section className="stagger grid gap-5 lg:grid-cols-3">
              <div className="glass p-6">
                <h2 className="mb-5 font-bold text-ink">🙋 會員需求排行榜</h2>
                <BarChart data={stats.helpRank} unit="人" color="#eb6834" />
              </div>
              <div className="glass p-6">
                <h2 className="mb-5 font-bold text-ink">🧲 最多人需要的資源</h2>
                <BarChart data={stats.needRank} unit="人" color="#c8102e" />
              </div>
              <div className="glass p-6">
                <h2 className="mb-5 font-bold text-ink">🎁 最多人提供的資源</h2>
                <BarChart data={stats.giveRank} unit="人" color="#1baf7a" />
              </div>
            </section>

            {/* 所有會員與回答 */}
            <section className="glass animate-fade-up p-6">
              <h2 className="font-bold text-ink">👥 所有會員與交流卡回答</h2>
              <p className="mt-1 text-xs text-ink-muted">點擊會員展開完整回答內容</p>
              <div className="mt-4 space-y-2">
                {stats.members.map((m) => {
                  const card = stats.cards.find((c) => c.memberId === m.id);
                  const open = openMember === m.id;
                  return (
                    <div key={m.id} className="overflow-hidden rounded-2xl bg-white/40">
                      <button
                        onClick={() => setOpenMember(open ? null : m.id)}
                        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/60"
                      >
                        <Avatar name={m.name} color={m.color} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-ink">
                            {m.name}
                            <span className="ml-2 text-xs font-normal text-ink-muted">
                              {m.company} · {m.industry}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-ink/5">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-gold-400 to-bni-red"
                                style={{ width: `${m.progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-ink-muted">完成 {m.progress}%</span>
                          </div>
                        </div>
                        <span className="text-ink-muted">{open ? "▴" : "▾"}</span>
                      </button>
                      {open && card && (
                        <dl className="grid gap-3 border-t border-ink/5 p-5 sm:grid-cols-2">
                          {ALL_QUESTIONS.map((q) => {
                            const a = card.answers[q.id];
                            if (a == null || a === "" || (Array.isArray(a) && a.length === 0))
                              return null;
                            return (
                              <div key={q.id} className="rounded-xl bg-white/60 p-3">
                                <dt className="text-[11px] font-semibold text-ink-muted">{q.label}</dt>
                                <dd className="mt-1 text-[13px] leading-5 text-ink">
                                  {typeof a === "string" || typeof a === "number"
                                    ? String(a)
                                    : Array.isArray(a)
                                      ? a.join("、")
                                      : Object.entries(a as Record<string, number>)
                                          .map(([k, v]) => `${k} ${v}%`)
                                          .join("、")}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      )}
                      {open && !card && (
                        <p className="border-t border-ink/5 p-5 text-sm text-ink-muted">
                          尚未填寫交流卡
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
