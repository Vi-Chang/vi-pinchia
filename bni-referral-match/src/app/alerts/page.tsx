"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import type { BizAlert, Reminder } from "@/lib/types";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

export default function AlertsPage() {
  const { member } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [alerts, setAlerts] = useState<BizAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!member) return;
    fetch(`/api/alerts?memberId=${member.id}`)
      .then((r) => r.json())
      .then((d) => {
        setReminders(d.reminders ?? []);
        setAlerts(d.alerts ?? []);
        setLoaded(true);
      });
  }, [member]);

  if (!member) return <AppShell><div /></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="glass animate-fade-up p-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink">🔔 商機快訊</h1>
          <p className="mt-2 text-sm text-ink-soft">
            當有會員更新交流卡、新增專案或資源時，AI 立即重新計算媒合；
            合作成功率超過 <strong className="text-bni-red">85%</strong> 時，第一時間通知雙方。
          </p>
        </div>

        {/* 智慧提醒 */}
        {reminders.length > 0 && (
          <div className="space-y-3">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="glass animate-fade-up flex flex-wrap items-center gap-4 border-l-4 border-gold-500 p-5"
              >
                <span className="text-2xl">⏰</span>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">{r.message}</p>
                <Link href={r.actionHref} className="btn-gold shrink-0 !px-4 !py-2 !text-sm">
                  {r.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* 快訊清單 */}
        {loaded && alerts.length === 0 && (
          <div className="glass p-10 text-center text-sm text-ink-muted">
            目前沒有新的快訊。更新你的
            <Link href="/card" className="mx-1 font-semibold text-bni-red">交流卡</Link>
            或新增
            <Link href="/projects" className="mx-1 font-semibold text-bni-red">專案</Link>
            ，AI 會立即為你重新計算媒合。
          </div>
        )}
        {alerts.map((a) => (
          <div key={a.id} className="glass animate-fade-up overflow-hidden">
            <div className="border-b border-ink/5 bg-gradient-to-r from-bni-red/10 to-gold-400/10 px-6 py-4">
              <div className="font-bold text-ink">🎉 AI發現新的合作機會！</div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {timeAgo(a.createdAt)}｜觸發：{a.trigger}
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center gap-4 text-center">
                <div className="flex-1">
                  <div className="text-lg font-bold text-ink">{a.pair.aName}</div>
                  <div className="text-xs text-ink-muted">{a.pair.aIndustry}</div>
                </div>
                <div className="text-2xl text-ink-muted">×</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-ink">{a.pair.bName}</div>
                  <div className="text-xs text-ink-muted">{a.pair.bIndustry}</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-xs tracking-wide text-ink-muted">合作成功率</div>
                <div className="text-4xl font-bold text-bni-red">{a.probability}%</div>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
                {a.reasons.map((r, i) => (
                  <li key={i}>✓ {r}</li>
                ))}
              </ul>
              <div className="mt-5 border-t border-ink/5 pt-4 text-center">
                <Link
                  href={`/matches`}
                  className="btn-primary inline-block !px-6 !py-2.5 !text-sm"
                >
                  建議立即安排 121 →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
