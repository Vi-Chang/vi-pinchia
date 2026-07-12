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
import type { Answer } from "@/lib/types";

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

  const section = SECTIONS[active];

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
              <QuestionField key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
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
}: {
  q: Question;
  value: Answer | undefined;
  onChange: (v: Answer) => void;
}) {
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
        <CheckboxGroup value={answerAsArray(value)} options={q.options ?? []} onChange={onChange} />
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
