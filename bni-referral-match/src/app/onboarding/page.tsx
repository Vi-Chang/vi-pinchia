"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { INDUSTRIES, RESOURCES } from "@/lib/questions";
import type { Answer } from "@/lib/types";

const STEPS = ["我的專業", "我的商機", "我的資源"];

export default function OnboardingPage() {
  const { member, update } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // 切換步驟時捲回頂端，從第一個欄位開始填
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  const [a, setA] = useState<Record<string, Answer>>({
    ob_specialty: "",
    ob_services: "",
    s6_open_projects: "",
    s4_target_industries: [],
    s6_resources_give: [],
    s6_no_go: "",
  });

  if (!member) {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  const set = (k: string, v: Answer) => setA((p) => ({ ...p, [k]: v }));

  const toggle = (k: string, item: string) => {
    const cur = Array.isArray(a[k]) ? (a[k] as string[]) : [];
    set(k, cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]);
  };

  const finish = async (skip = false) => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId: member.id, answers: skip ? {} : a }),
      });
      const d = await res.json();
      if (res.ok && d.member) update(d.member);
    } finally {
      setBusy(false);
      router.push("/dashboard");
    }
  };

  const Chips = ({ k, options }: { k: string; options: string[] }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = Array.isArray(a[k]) && (a[k] as string[]).includes(o);
        return (
          <button key={o} type="button" onClick={() => toggle(k, o)} className={on ? "chip chip-on" : "chip"}>
            {o}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass w-full max-w-xl animate-fade-up p-8 lg:p-10">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          歡迎，{member.name}！
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          花兩分鐘完成 AI 商機資料，讓 AI 立刻為你找出最適合的合作夥伴。
        </p>

        {/* 進度 */}
        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full ${i <= step ? "bg-bni-red" : "bg-ink/10"}`} />
              <span className={`text-[11px] ${i === step ? "font-bold text-bni-red" : "text-ink-muted"}`}>{s}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 space-y-5">
          {step === 0 && (
            <>
              <div>
                <label className="label">我的專長</label>
                <textarea className="field" rows={2} value={String(a.ob_specialty ?? "")} onChange={(e) => set("ob_specialty", e.target.value)} placeholder="例：全瓷冠與美白貼片的數位設計製作" />
              </div>
              <div>
                <label className="label">我提供的服務</label>
                <textarea className="field" rows={2} value={String(a.ob_services ?? "")} onChange={(e) => set("ob_services", e.target.value)} placeholder="例：固定假牙製作、牙科行前諮詢與衛教" />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div>
                <label className="label">我目前想開發的商機</label>
                <textarea className="field" rows={2} value={String(a.s6_open_projects ?? "")} onChange={(e) => set("s6_open_projects", e.target.value)} placeholder="例：徵行銷夥伴推廣診所方案，預計 Q4 簽約" />
              </div>
              <div>
                <label className="label">我希望認識哪些產業</label>
                <Chips k="s4_target_industries" options={INDUSTRIES} />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label className="label">我可提供哪些合作資源</label>
                <Chips k="s6_resources_give" options={RESOURCES} />
              </div>
              <div>
                <label className="label">我目前不接哪些案件（選填）</label>
                <textarea className="field" rows={2} value={String(a.s6_no_go ?? "")} onChange={(e) => set("s6_no_go", e.target.value)} placeholder="例：削價競標案" />
              </div>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-ink/5 pt-5">
          {step > 0 ? (
            <button onClick={() => setStep((s) => s - 1)} className="btn-ghost">← 上一步</button>
          ) : (
            <button onClick={() => finish(true)} disabled={busy} className="text-sm text-ink-muted hover:text-ink">
              先跳過，之後再填
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary !px-6 !py-2.5 !text-sm">
              下一步 →
            </button>
          ) : (
            <button onClick={() => finish(false)} disabled={busy} className="btn-gold !px-6 !py-2.5 !text-sm disabled:opacity-50">
              {busy ? "儲存中…" : "完成，開始配對 ✨"}
            </button>
          )}
        </div>
        <SiteFooter />
      </div>
    </div>
  );
}
