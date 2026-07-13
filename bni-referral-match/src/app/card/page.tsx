"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import {
  answerAsArray,
  answerAsNumber,
  answerAsPercent,
  answerAsString,
  CheckboxGroup,
  CheckboxPercent,
  Dropdown,
  RadioGroup,
  Scale,
  TextArea,
} from "@/components/form/controls";
import { useAutosave } from "@/hooks/useAutosave";
import { SECTIONS, type Question } from "@/lib/questions";
import type { CoopSuggestion } from "@/lib/suggestions";
import type { Answer, MatchResult, Member } from "@/lib/types";

type MatchRec = MatchResult & { target: Member; suggestion?: CoopSuggestion };

export default function CardPage() {
  return (
    <Suspense fallback={<AppShell><div /></AppShell>}>
      <CardEditor />
    </Suspense>
  );
}

function CardEditor() {
  const { member } = useAuth();
  const versionId = useSearchParams().get("v");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [versionInfo, setVersionInfo] = useState<{ version: number; title: string; status: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!member) return;
    const qs = versionId ? `&versionId=${versionId}` : "";
    fetch(`/api/card?memberId=${member.id}${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setAnswers(d.card?.answers ?? {});
        setVersionInfo(d.version ?? null);
        setProgress(d.progress ?? 0);
        setLoaded(true);
      });
  }, [member, versionId]);

  const { state } = useAutosave(
    answers,
    async (a) => {
      if (!member) return;
      const res = await fetch("/api/card", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId: member.id, answers: a, versionId: versionId ?? undefined }),
      });
      if (!res.ok) throw new Error("save failed");
      const d = await res.json();
      setProgress(d.progress ?? 0);
    },
    { enabled: loaded && !!member }
  );

  const set = (id: string, v: Answer) => setAnswers((prev) => ({ ...prev, [id]: v }));

  // 切換章節時捲回頁面頂端，從第一題開始填
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active]);

  const section = SECTIONS[active];

  // 目前已填卡人數（第四部分顯示）
  const [filled, setFilled] = useState<{ total: number; real: number; demo: number } | null>(null);
  useEffect(() => {
    if (section.id !== "s4" || filled !== null) return;
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => setFilled(d.filled ?? null))
      .catch(() => {});
  }, [section.id, filled]);

  // 進入第五部分（30 天行動計畫）前，先給 AI 媒合結果與提案建議
  const [recs, setRecs] = useState<MatchRec[] | null>(null);
  useEffect(() => {
    if (!member || section.id !== "s5" || recs !== null) return;
    fetch(`/api/matches?memberId=${member.id}&scope=all`)
      .then((r) => r.json())
      .then((d) => setRecs((d.matches ?? []).slice(0, 4)))
      .catch(() => setRecs([]));
  }, [member, section.id, recs]);


  const sectionDone = useMemo(
    () =>
      SECTIONS.map((s) => {
        const done = s.questions.filter((q) => {
          const a = answers[q.id];
          if (a == null) return false;
          if (typeof a === "string") return a.trim() !== "";
          if (Array.isArray(a)) return a.length > 0;
          if (typeof a === "object") return Object.keys(a).length > 0;
          return true;
        }).length;
        return { done, total: s.questions.length };
      }),
    [answers]
  );

  if (!member) return <AppShell><div /></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        {/* 標題 + 進度 */}
        <div className="glass animate-fade-up p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">商機交流卡</h1>
              <p className="mt-1 text-sm text-ink-soft">
                完整盤點你的事業與商機需求，AI 會依據內容自動配對。
              </p>
              {versionInfo && (
                <p className="mt-2 text-xs text-ink-muted">
                  正在編輯：版本 {versionInfo.version}｜{versionInfo.title}
                  <Link href="/cards" className="ml-2 font-semibold text-bni-red">
                    ← 回交流卡管理
                  </Link>
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-bni-red">{progress}%</div>
              <SaveIndicator state={state} />
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-400 to-bni-red transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 章節導覽 */}
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {SECTIONS.map((s, i) => {
            const d = sectionDone[i];
            const on = i === active;
            return (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                  on
                    ? "bg-ink text-white shadow-glass-lg"
                    : "glass text-ink-soft hover:bg-white/80"
                }`}
              >
                <span>{s.icon}</span>
                {s.num}、{s.title}
                <span className={`text-[11px] ${on ? "text-white/70" : "text-ink-muted"}`}>
                  {d.done}/{d.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* 第四部分：目前已填卡人數 */}
        {section.id === "s4" && filled && (
          <div className="glass animate-fade-up flex flex-wrap items-center gap-3 p-5">
            <span className="text-2xl">📊</span>
            <p className="text-sm text-ink">
              目前已填卡人數：<strong className="text-bni-red">{filled.total} 位</strong>
              {filled.demo > 0 && (
                <span className="ml-1 text-xs text-ink-muted">
                  （含範例人物 {filled.demo} 位，真實會員填卡超過 5 人後範例將自動移除）
                </span>
              )}
            </p>
          </div>
        )}

        {/* 第五部分前：AI 媒合結果＋提案建議 */}
        {section.id === "s5" && (
          <div className="glass animate-fade-up p-7">
            <h2 className="text-lg font-bold text-ink">🤖 AI 已根據你前四部分的內容完成媒合</h2>
            <p className="mt-1 text-sm text-ink-soft">
              先看看最值得安排 121 的夥伴與提案建議，再規劃你的 30 天行動。
            </p>
            {recs === null && (
              <div className="mt-4 animate-pulse rounded-2xl bg-white/50 p-4 text-sm text-ink-muted">
                AI 媒合計算中…
              </div>
            )}
            {recs !== null && recs.length === 0 && (
              <div className="mt-4 rounded-2xl bg-white/50 p-4 text-sm text-ink-muted">
                目前媒合訊號較少——前四部分填得越完整，推薦越精準。
              </div>
            )}
            <div className="mt-4 space-y-3">
              {recs?.map((r) => {
                return (
                  <div key={r.targetId} className="rounded-2xl bg-white/50 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-ink">{r.target.name}</span>
                        {r.target.isDemo && (
                          <span className="ml-1 text-xs text-amber-600">（範例）</span>
                        )}
                        <span className="ml-2 text-xs text-ink-muted">
                          {r.target.company} · {r.target.industry}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-bni-red">{r.probability}%</span>
                      <Link href={`/partner/${r.targetId}`} className="chip !text-xs">
                        🪪 看商機卡
                      </Link>
                    </div>
                    {r.reasons[0] && (
                      <p className="mt-2 text-[13px] text-ink-soft">◆ {r.reasons[0]}</p>
                    )}
                    {r.suggestion?.pitch && (
                      <p className="mt-1 text-[13px] text-ink-soft">
                        <span className="font-semibold text-ink">提案建議：</span>
                        {r.suggestion.pitch}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 題目卡片 */}
        <div key={section.id} className="glass animate-fade-up p-7 lg:p-9">
          <div className="mb-8">
            <div className="text-sm font-semibold text-gold-600">第{section.num}部分</div>
            <h2 className="mt-1 text-xl font-bold text-ink">
              {section.icon} {section.title}
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">{section.subtitle}</p>
          </div>

          <div className="space-y-9">
            {section.questions.map((q) => (
              <QuestionField
                key={q.id}
                q={q}
                value={answers[q.id]}
                onChange={(v) => set(q.id, v)}
                otherValue={answers[`${q.id}_other`]}
                onOtherChange={(v) => set(`${q.id}_other`, v)}
              />
            ))}
          </div>

          {/* 上一步 / 下一步 */}
          <div className="mt-10 flex items-center justify-between border-t border-ink/5 pt-6">
            <button
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              disabled={active === 0}
              className="btn-ghost disabled:invisible"
            >
              ← 上一部分
            </button>
            <SaveIndicator state={state} />
            {active < SECTIONS.length - 1 ? (
              <button onClick={() => setActive((a) => a + 1)} className="btn-primary !px-6 !py-2.5 !text-sm">
                下一部分 →
              </button>
            ) : (
              <a href="/analysis" className="btn-gold">完成 · 查看 AI 分析 ✨</a>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function QuestionField({
  q,
  value,
  onChange,
  otherValue,
  onOtherChange,
}: {
  q: Question;
  value: Answer | undefined;
  onChange: (v: Answer) => void;
  otherValue?: Answer;
  onOtherChange?: (v: Answer) => void;
}) {
  const otherChecked = q.allowOther && answerAsArray(value).includes("其他");
  return (
    <div>
      <label className="label">{q.label}</label>
      {q.helper && <p className="-mt-1 mb-2 text-xs text-ink-muted">{q.helper}</p>}
      {q.type === "dropdown" && (
        <Dropdown value={answerAsString(value)} options={q.options ?? []} onChange={onChange} />
      )}
      {q.type === "radio" && (
        <RadioGroup value={answerAsString(value)} options={q.options ?? []} onChange={onChange} />
      )}
      {q.type === "checkbox" && (
        <>
          <CheckboxGroup value={answerAsArray(value)} options={q.options ?? []} onChange={onChange} />
          {otherChecked && onOtherChange && (
            <input
              className="field mt-3"
              value={answerAsString(otherValue)}
              onChange={(e) => onOtherChange(e.target.value)}
              placeholder="請填寫其他回饋模式…"
              maxLength={50}
            />
          )}
        </>
      )}
      {q.type === "checkbox-percent" && (
        <CheckboxPercent value={answerAsPercent(value)} options={q.options ?? []} onChange={onChange} />
      )}
      {q.type === "textarea" && (
        <TextArea
          value={answerAsString(value)}
          onChange={onChange}
          placeholder={q.placeholder}
          maxLength={q.maxLength}
        />
      )}
      {q.type === "scale" && <Scale value={answerAsNumber(value)} onChange={onChange} />}
    </div>
  );
}
