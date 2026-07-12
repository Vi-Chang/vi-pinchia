"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Stars } from "@/components/ui/Stars";
import type { Project } from "@/lib/types";

const INDUSTRIES = [
  "醫療健康", "室內設計", "房地產", "會計財稅", "法律服務", "行銷廣告",
  "網頁/軟體開發", "餐飲食品", "印刷包裝", "保險理財", "人力資源", "電商零售", "建築營造",
];

type Draft = Omit<Project, "id" | "memberId" | "createdAt" | "updatedAt"> & { id?: string };

const EMPTY: Draft = {
  name: "",
  intro: "",
  idealReferrals: "",
  industriesNeeded: [],
  resourcesOffered: "",
  expectedClose: "",
  startDate: "",
  endDate: "",
  isMain: false,
  importance: 3,
};

export default function ProjectsPage() {
  const { member } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!member) return;
    const d = await fetch(`/api/projects?memberId=${member.id}`).then((r) => r.json());
    setProjects(d.projects ?? []);
  }, [member]);

  useEffect(() => {
    load();
  }, [load]);

  if (!member) return <AppShell><div /></AppShell>;

  const save = async () => {
    if (!draft?.name.trim()) {
      alert("請填寫專案名稱");
      return;
    }
    setSaving(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...draft, memberId: member.id }),
    });
    setSaving(false);
    setDraft(null);
    await load();
  };

  const remove = async (p: Project) => {
    if (!confirm(`確定要刪除專案「${p.name}」嗎？`)) return;
    await fetch(`/api/projects?id=${p.id}`, { method: "DELETE" });
    await load();
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="glass animate-fade-up p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">📁 專案管理</h1>
              <p className="mt-2 max-w-xl text-sm text-ink-soft">
                每位會員可建立多個專案。AI 媒合時以「主推專案」為最高優先，替你找出最需要的合作夥伴。
              </p>
            </div>
            <button onClick={() => setDraft({ ...EMPTY })} className="btn-primary shrink-0">
              ＋ 建立專案
            </button>
          </div>
        </div>

        {/* 專案表單 */}
        {draft && (
          <div className="glass animate-fade-up space-y-5 p-7">
            <h2 className="text-lg font-bold text-ink">{draft.id ? "編輯專案" : "新專案"}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">專案名稱 *</label>
                <input
                  className="field"
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="例：復健診所整廠設備專案"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">專案介紹</label>
                <textarea
                  className="field"
                  rows={3}
                  value={draft.intro}
                  onChange={(e) => set("intro", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">希望介紹的客戶</label>
                <textarea
                  className="field"
                  rows={2}
                  value={draft.idealReferrals}
                  onChange={(e) => set("idealReferrals", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">需要哪些產業合作</label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((ind) => {
                    const on = draft.industriesNeeded.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() =>
                          set(
                            "industriesNeeded",
                            on
                              ? draft.industriesNeeded.filter((x) => x !== ind)
                              : [...draft.industriesNeeded, ind]
                          )
                        }
                        className={on ? "chip chip-on" : "chip"}
                      >
                        {ind}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">可提供哪些資源</label>
                <textarea
                  className="field"
                  rows={2}
                  value={draft.resourcesOffered}
                  onChange={(e) => set("resourcesOffered", e.target.value)}
                />
              </div>
              <div>
                <label className="label">預計成交期間</label>
                <input
                  className="field"
                  value={draft.expectedClose}
                  onChange={(e) => set("expectedClose", e.target.value)}
                  placeholder="例：2026 Q4"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">開始日期</label>
                  <input
                    type="date"
                    className="field"
                    value={draft.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">結束日期</label>
                  <input
                    type="date"
                    className="field"
                    value={draft.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label">是否目前主推</label>
                <button
                  type="button"
                  onClick={() => set("isMain", !draft.isMain)}
                  className={draft.isMain ? "chip chip-on" : "chip"}
                >
                  {draft.isMain ? "🔥 目前主推" : "設為主推"}
                </button>
              </div>
              <div>
                <label className="label">重要程度</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => set("importance", i)}
                      className={`text-2xl transition ${i <= draft.importance ? "text-gold-500" : "text-ink/15"}`}
                      aria-label={`${i} 星`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t border-ink/5 pt-5">
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? "儲存中…" : "儲存專案"}
              </button>
              <button onClick={() => setDraft(null)} className="btn-ghost">取消</button>
            </div>
          </div>
        )}

        {/* 專案清單 */}
        <div className="space-y-3">
          {projects.length === 0 && !draft && (
            <div className="glass p-8 text-center text-sm text-ink-muted">
              還沒有專案，點右上角「建立專案」開始。
            </div>
          )}
          {projects.map((p) => {
            const expired = p.endDate && new Date(p.endDate).getTime() < Date.now();
            return (
              <div key={p.id} className="glass animate-fade-up p-6">
                <div className="flex flex-wrap items-center gap-3">
                  {p.isMain && (
                    <span className="rounded-full bg-bni-red px-3 py-1 text-xs font-bold text-white">
                      🔥 主推
                    </span>
                  )}
                  <h3 className="min-w-0 flex-1 truncate text-lg font-bold text-ink">{p.name}</h3>
                  <Stars count={p.importance} />
                </div>
                {p.intro && <p className="mt-2 text-sm text-ink-soft">{p.intro}</p>}
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {p.idealReferrals && (
                    <div>
                      <dt className="text-xs text-ink-muted">希望介紹的客戶</dt>
                      <dd className="text-ink-soft">{p.idealReferrals}</dd>
                    </div>
                  )}
                  {p.resourcesOffered && (
                    <div>
                      <dt className="text-xs text-ink-muted">可提供資源</dt>
                      <dd className="text-ink-soft">{p.resourcesOffered}</dd>
                    </div>
                  )}
                  {p.industriesNeeded.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-ink-muted">需要產業合作</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {p.industriesNeeded.map((i) => (
                          <span key={i} className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-ink-soft">
                            {i}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-ink-muted">期間</dt>
                    <dd className={expired ? "font-semibold text-bni-red" : "text-ink-soft"}>
                      {p.startDate || "—"} ～ {p.endDate || "—"}
                      {expired && "（已逾期）"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">預計成交</dt>
                    <dd className="text-ink-soft">{p.expectedClose || "—"}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2 text-xs">
                  <button onClick={() => setDraft({ ...p })} className="chip">✏️ 編輯</button>
                  <button onClick={() => remove(p)} className="chip !text-bni-red">🗑️ 刪除</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
