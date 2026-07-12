"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Stars";
import { StatCard } from "@/components/ui/StatCard";
import type { Interaction, MatchResult, Member } from "@/lib/types";

type MatchWithMember = MatchResult & { target: Member };

export default function DashboardPage() {
  const { member } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [matches, setMatches] = useState<MatchWithMember[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!member) return;
    fetch("/api/interactions").then((r) => r.json()).then((d) => setInteractions(d.interactions ?? []));
    fetch(`/api/matches?memberId=${member.id}`).then((r) => r.json()).then((d) => setMatches(d.matches ?? []));
    fetch(`/api/card?memberId=${member.id}`).then((r) => r.json()).then((d) => setProgress(d.progress ?? 0));
  }, [member]);

  const stats = useMemo(() => {
    if (!member) return { m121: 0, ref: 0 };
    const month = "2026-07";
    const mine = interactions.filter(
      (i) => (i.fromId === member.id || i.toId === member.id) && i.date.startsWith(month)
    );
    return {
      m121: mine.filter((i) => i.type === "121").length,
      ref: mine.filter((i) => i.type === "referral").length,
    };
  }, [interactions, member]);

  const goodMatches = matches.filter((m) => m.score >= 45);
  const today = matches[0];

  if (!member) return <AppShell><div /></AppShell>;

  return (
    <AppShell>
      <div className="stagger mx-auto max-w-6xl space-y-6">
        {/* 歡迎區 */}
        <section className="glass relative overflow-hidden p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-gold-300/50 to-transparent blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar name={member.name} color={member.color} size={64} />
              <div>
                <p className="text-sm text-ink-muted">歡迎回來 · {member.chapter}</p>
                <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-3xl">
                  {member.name}，今天也來創造商機吧
                </h1>
                <p className="mt-1 text-sm text-ink-soft">
                  {member.company} · {member.title}
                </p>
              </div>
            </div>
            <Link href="/card" className="btn-primary">
              📋 開始填寫交流卡
            </Link>
          </div>
        </section>

        {/* 統計卡 */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="本月 121" value={stats.m121} unit="次" icon="🤝" accent="gold" hint="2026 年 7 月" />
          <StatCard label="本月轉介" value={stats.ref} unit="筆" icon="🎯" accent="red" hint="含給出與收到" />
          <StatCard label="交流卡完成率" value={`${progress}%`} icon="📋" accent="green" hint={progress >= 80 ? "資料完整，配對更精準" : "完成度越高，配對越準"} />
          <StatCard label="商機配對數" value={goodMatches.length} unit="位" icon="💎" accent="blue" hint="45 分以上的高潛力對象" />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* AI 今日推薦 */}
          <section className="glass glass-hover relative overflow-hidden p-7">
            <div className="pointer-events-none absolute -bottom-14 -right-10 h-44 w-44 rounded-full bg-bni-red/8 blur-2xl" />
            <div className="flex items-center gap-2">
              <span className="tag-red">AI 今日推薦</span>
              <span className="text-xs text-ink-muted">今天最適合 121 的人</span>
            </div>

            {progress < 80 ? (
              <div className="relative mt-6 rounded-2xl bg-white/50 p-6 text-center">
                <div className="text-3xl">📋</div>
                <p className="mt-2 text-sm font-semibold text-ink">先完成交流卡，才能開始 AI 配對</p>
                <p className="mt-1 text-xs text-ink-soft">
                  目前完成度 {progress}%（需達 80%）
                </p>
                <Link href="/card" className="btn-primary mt-4 inline-block !px-5 !py-2 !text-sm">
                  前往填寫交流卡 →
                </Link>
              </div>
            ) : today ? (
              <div className="relative mt-5">
                <div className="flex items-center gap-4">
                  <Avatar name={today.target.name} color={today.target.color} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold text-ink">{today.target.name}</div>
                    <div className="truncate text-sm text-ink-soft">
                      {today.target.company} · {today.target.industry}
                    </div>
                  </div>
                  <div className="text-right">
                    <Stars count={today.stars} />
                    <div className="text-2xl font-bold text-bni-red">{today.probability}%</div>
                    <div className="text-[11px] text-ink-muted">預估合作機率</div>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {today.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                      <span className="mt-0.5 text-gold-500">◆</span>
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex gap-3">
                  <Link href="/matches" className="btn-gold">查看完整配對</Link>
                  <Link href="/analysis" className="btn-ghost">AI 深度分析</Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 animate-pulse rounded-2xl bg-white/50 p-6 text-sm text-ink-muted">
                正在計算今日最佳配對…
              </div>
            )}
          </section>

          {/* 合作建議 */}
          <section className="glass p-7">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              💡 合作建議
            </h2>
            <ul className="mt-4 space-y-3">
              {progress < 80 && (
                <li className="rounded-2xl bg-white/40 p-4 text-sm text-ink-muted">
                  完成交流卡後，這裡會列出 AI 找到的合作夥伴。
                </li>
              )}
              {progress >= 80 && goodMatches.slice(1, 5).map((m) => (
                <li key={m.targetId}>
                  <Link
                    href="/matches"
                    className="flex items-center gap-3 rounded-2xl bg-white/40 p-3 transition hover:bg-white/80"
                  >
                    <Avatar name={m.target.name} color={m.target.color} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink">{m.target.name}</div>
                      <div className="truncate text-xs text-ink-muted">
                        {m.reasons[0] ?? m.target.industry}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gold-600">{m.probability}%</span>
                  </Link>
                </li>
              ))}
              {goodMatches.length <= 1 && (
                <li className="rounded-2xl bg-white/40 p-4 text-sm text-ink-muted">
                  完成交流卡後，AI 將為你找出更多合作對象。
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* 快速入口 */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { href: "/card", icon: "📋", title: "交流卡", desc: "六大章節完整盤點" },
            { href: "/network", icon: "🕸️", title: "會員關係圖", desc: "看見分會互動網絡" },
            { href: "/search", icon: "🔍", title: "搜尋會員", desc: "找產業、找需求、找資源" },
            { href: "/profile", icon: "👤", title: "我的資料", desc: "名片與媒體上傳" },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="glass glass-hover p-5">
              <div className="text-2xl">{c.icon}</div>
              <div className="mt-2 font-bold text-ink">{c.title}</div>
              <div className="mt-0.5 text-xs text-ink-muted">{c.desc}</div>
            </Link>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
