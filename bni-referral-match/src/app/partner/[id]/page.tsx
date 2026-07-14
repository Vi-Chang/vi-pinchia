"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import type { PairInsight } from "@/lib/ai-insight";
import type { CoopSuggestion } from "@/lib/suggestions";
import type { Answer, MatchResult, Member, Opportunity } from "@/lib/types";

type MatchRec = MatchResult & { target: Member; suggestion?: CoopSuggestion };
type Opp = Opportunity & { member: Member };

/** 商機卡上要展示的重點欄位 */
const HIGHLIGHTS: { id: string; label: string }[] = [
  { id: "ob_specialty", label: "專長" },
  { id: "ob_services", label: "提供的服務" },
  { id: "s6_intro_60", label: "一句話介紹" },
  { id: "s6_company_line", label: "公司定位" },
  { id: "s2_easy_customer", label: "最容易成為客戶的人" },
  { id: "s6_ideal_customer", label: "理想客戶" },
  { id: "s2_want_to_meet", label: "希望認識" },
  { id: "s6_open_projects", label: "正在開放的合作或專案" },
  { id: "s6_resources_give", label: "可提供資源" },
  { id: "s6_resources_need", label: "需要資源" },
  { id: "s6_regions", label: "服務地區" },
  { id: "s6_no_go", label: "不接的案件" },
];

function fmtAnswer(a: Answer | undefined): string {
  if (a == null) return "";
  if (typeof a === "string") return a;
  if (typeof a === "number") return String(a);
  if (Array.isArray(a)) return a.join("、");
  return Object.entries(a as Record<string, number>).map(([k, v]) => `${k} ${v}%`).join("、");
}

export default function PartnerPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<AppShell><div /></AppShell>}>
      <PartnerDetail id={params.id} />
    </Suspense>
  );
}

function PartnerDetail({ id }: { id: string }) {
  const { member } = useAuth();
  const fromInterest = useSearchParams().get("from") === "interest";
  const [target, setTarget] = useState<Member | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [opps, setOpps] = useState<Opp[]>([]);
  const [match, setMatch] = useState<MatchRec | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [insight, setInsight] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; insight: PairInsight; cached: boolean }
  >({ status: "idle" });

  useEffect(() => {
    if (!member) return;
    Promise.all([
      fetch("/api/members").then((r) => r.json()),
      fetch(`/api/card?memberId=${id}`).then((r) => r.json()),
      fetch("/api/plaza").then((r) => r.json()),
      member.id !== id
        ? fetch(`/api/matches?memberId=${member.id}`).then((r) => r.json())
        : Promise.resolve({ matches: [] }),
    ]).then(([mem, card, plaza, matches]) => {
      setTarget(mem.members.find((m: Member) => m.id === id) ?? null);
      setAnswers(card.card?.answers ?? {});
      setOpps((plaza.opportunities ?? []).filter((o: Opp) => o.memberId === id && o.status === "open"));
      setMatch((matches.matches ?? []).find((r: MatchRec) => r.targetId === id) ?? null);
      setLoaded(true);
    });
  }, [member, id]);

  if (!member) return <AppShell><div /></AppShell>;

  const runInsight = async () => {
    setInsight({ status: "loading" });
    try {
      const res = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId: member.id, targetId: id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "AI 分析失敗");
      setInsight({ status: "done", insight: d.insight, cached: d.cached });
    } catch (e) {
      setInsight({ status: "error", message: e instanceof Error ? e.message : "AI 分析失敗" });
    }
  };

  const highlights = HIGHLIGHTS.map((h) => ({ ...h, value: fmtAnswer(answers[h.id]) })).filter(
    (h) => h.value
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5">
        {fromInterest && (
          <div className="glass animate-fade-up border-l-4 border-gold-500 p-4 text-sm text-ink">
            ✅ 已通知對方你的合作意願！先看看這位夥伴的商機卡，準備好你的提案。
          </div>
        )}

        {loaded && !target && (
          <div className="glass p-10 text-center text-sm text-ink-muted">
            找不到這位會員。<Link href="/plaza" className="ml-1 font-semibold text-bni-red">回想要引薦或合作</Link>
          </div>
        )}

        {target && (
          <>
            {/* 夥伴基本資料 */}
            <div className="glass animate-fade-up p-7">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={target.name} color={target.color} size={64} />
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold tracking-tight text-ink">
                    {target.name}
                    {target.isDemo && <span className="ml-2 text-sm font-normal text-amber-600">（範例）</span>}
                    {target.role === "admin" && <span className="tag-red ml-2 align-middle">管理員</span>}
                  </h1>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {target.company || "—"}{target.title ? ` · ${target.title}` : ""}
                  </p>
                  <p className="text-xs text-ink-muted">{target.chapter} · {target.industry}</p>
                </div>
                {match && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-bni-red">{match.probability}%</div>
                    <div className="text-[11px] text-ink-muted">與你的合作成功率</div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <a href={`tel:${target.phone}`} className="chip">📞 {target.phone || "電話"}</a>
                <a href={`mailto:${target.email}`} className="chip">✉️ Email</a>
                {target.line && (
                  <a href={`https://line.me/R/ti/p/~${target.line}`} target="_blank" rel="noopener" className="chip">
                    💬 LINE
                  </a>
                )}
              </div>
            </div>

            {/* 與你的媒合建議 */}
            {match && (
              <div className="glass animate-fade-up p-7">
                <h2 className="font-bold text-ink">🤖 AI 合作建議</h2>
                <ul className="mt-3 space-y-1">
                  {match.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-ink-soft">
                      <span className="mt-0.5 text-gold-500">◆</span>{r}
                    </li>
                  ))}
                </ul>
                {match.suggestion && (
                  <dl className="mt-4 space-y-2 text-[13px] text-ink-soft">
                    <div>
                      <dt className="inline font-semibold text-ink">建議合作方式：</dt>
                      <dd className="inline">{match.suggestion.coopMethods.join("、")}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-ink">你可以介紹：</dt>
                      <dd className="inline">{match.suggestion.introAtoB}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-ink">提案切入：</dt>
                      <dd className="inline">{match.suggestion.pitch}</dd>
                    </div>
                  </dl>
                )}
                <div className="mt-4 border-t border-ink/5 pt-4">
                  {insight.status === "idle" && (
                    <button onClick={runInsight} className="btn-gold !px-4 !py-2 !text-xs">
                      ✨ AI 深度分析（呼叫 Claude 產生專屬提案）
                    </button>
                  )}
                  {insight.status === "loading" && (
                    <p className="animate-pulse text-xs text-ink-muted">🤖 Claude 正在深度分析這組合作…</p>
                  )}
                  {insight.status === "error" && (
                    <p className="text-xs text-bni-red">
                      {insight.message}
                      <button onClick={runInsight} className="ml-2 underline">重試</button>
                    </p>
                  )}
                  {insight.status === "done" && (
                    <div className="rounded-2xl border border-gold-300/50 bg-white/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wide text-gold-600">✨ Claude 深度分析</span>
                        {insight.cached && <span className="text-[10px] text-ink-muted">已快取（不重複計費）</span>}
                      </div>
                      <p className="mt-2 text-[13px] leading-6 text-ink">{insight.insight.whyMatch}</p>
                      {insight.insight.coopPlan.length > 0 && (
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-ink-soft">
                          {insight.insight.coopPlan.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                      )}
                      {insight.insight.icebreaker && (
                        <p className="mt-3 text-[13px] text-ink-soft">
                          <span className="font-semibold text-ink">121 開場白：</span>「{insight.insight.icebreaker}」
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 開放中的合作 */}
            {opps.length > 0 && (
              <div className="glass animate-fade-up p-7">
                <h2 className="font-bold text-ink">🤝 正在開放的引薦/合作</h2>
                <div className="mt-4 space-y-3">
                  {opps.map((o) => (
                    <div key={o.id} className="rounded-2xl bg-white/50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{o.title}</span>
                        <span className="tag-gold">{o.type}</span>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-ink-soft">{o.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 商機卡重點 */}
            <div className="glass animate-fade-up p-7">
              <h2 className="font-bold text-ink">🪪 商機卡</h2>
              {highlights.length === 0 && (
                <p className="mt-3 text-sm text-ink-muted">這位夥伴還沒有填寫交流卡。</p>
              )}
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {highlights.map((h) => (
                  <div key={h.id} className="rounded-xl bg-white/50 p-3">
                    <dt className="text-[11px] font-semibold text-ink-muted">{h.label}</dt>
                    <dd className="mt-1 text-[13px] leading-5 text-ink">{h.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
