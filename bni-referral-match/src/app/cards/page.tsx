"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import type { CardStatus, CardVersion } from "@/lib/types";

const STATUS_META: Record<CardStatus, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "bg-ink/10 text-ink-soft" },
  active: { label: "使用中", cls: "bg-emerald-100 text-emerald-700" },
  completed: { label: "已完成", cls: "bg-sky-100 text-sky-700" },
  archived: { label: "已封存", cls: "bg-amber-100 text-amber-700" },
};

function fmt(iso: string): string {
  return iso ? iso.slice(0, 10).replaceAll("-", "/") : "—";
}

export default function CardsPage() {
  const { member } = useAuth();
  const [versions, setVersions] = useState<CardVersion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    if (!member) return;
    const d = await fetch(`/api/card-versions?memberId=${member.id}`).then((r) => r.json());
    setVersions(d.versions ?? []);
    setLoaded(true);
  }, [member]);

  useEffect(() => {
    load();
  }, [load]);

  if (!member) return <AppShell><div /></AppShell>;

  const act = async (fn: () => Promise<Response>) => {
    await fn();
    await load();
  };

  const createNew = () => {
    const title = prompt("為新的交流卡取個摘要（例如：主推全瓷貼片）", "");
    if (title === null) return;
    act(() =>
      fetch("/api/card-versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId: member.id, title }),
      })
    );
  };

  const duplicate = (v: CardVersion) =>
    act(() =>
      fetch("/api/card-versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId: member.id, fromVersionId: v.id, title: `${v.title}（修改版）` }),
      })
    );

  const setStatus = (v: CardVersion, status: CardStatus) =>
    act(() =>
      fetch("/api/card-versions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: v.id, status }),
      })
    );

  const rename = (v: CardVersion) => {
    const title = prompt("修改版本摘要", v.title);
    if (!title) return;
    act(() =>
      fetch("/api/card-versions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: v.id, title }),
      })
    );
  };

  const remove = (v: CardVersion) => {
    if (!confirm(`確定要刪除「版本 ${v.version}｜${v.title}」嗎？此動作無法復原。`)) return;
    act(() => fetch(`/api/card-versions?id=${v.id}`, { method: "DELETE" }));
  };

  const visible = versions.filter((v) => showHistory || v.status !== "archived");
  const timeline = [...versions].sort((a, b) => a.version - b.version);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        {/* 設計理念 */}
        <div className="glass animate-fade-up p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                🗂️ 交流卡管理
                <span className="ml-2 align-middle text-xs font-medium tracking-wide text-ink-muted">
                  Business Profile Timeline
                </span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
                每位會員在不同時間，會因為市場變化、產品更新、服務調整、年度目標、專案推進或公司策略改變，而擁有不同的商業需求。
                本系統採用「<strong className="text-ink">動態商業檔案</strong>」概念——交流卡可持續更新，並完整保留歷史紀錄。
                AI 分析預設採用<strong className="text-ink">使用中</strong>的最新版本。
              </p>
            </div>
            <button onClick={createNew} className="btn-primary shrink-0">
              ＋ 建立新的交流卡
            </button>
          </div>
        </div>

        {/* 版本清單 */}
        <div className="space-y-3">
          {loaded && visible.length === 0 && (
            <div className="glass p-8 text-center text-sm text-ink-muted">
              還沒有交流卡，點右上角「建立新的交流卡」開始。
            </div>
          )}
          {visible.map((v) => {
            const s = STATUS_META[v.status];
            return (
              <div key={v.id} className="glass animate-fade-up p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-ink">
                      版本 {v.version}｜{v.title}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      建立 {fmt(v.createdAt)}（{v.createdBy}）　最後修改 {fmt(v.updatedAt)}（{v.updatedBy}）
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link href={`/card?v=${v.id}`} className="chip">✏️ 編輯</Link>
                  <button onClick={() => rename(v)} className="chip">📝 改摘要</button>
                  <button onClick={() => duplicate(v)} className="chip">📄 複製快速修改</button>
                  {v.status !== "active" && (
                    <button onClick={() => setStatus(v, "active")} className="chip">
                      ⭐ 設為使用中
                    </button>
                  )}
                  {v.status !== "archived" && (
                    <button onClick={() => setStatus(v, "archived")} className="chip">📦 封存</button>
                  )}
                  {v.status === "archived" && (
                    <button onClick={() => setStatus(v, "draft")} className="chip">↩️ 取消封存</button>
                  )}
                  <button onClick={() => remove(v)} className="chip !text-bni-red">🗑️ 刪除</button>
                </div>
              </div>
            );
          })}
        </div>

        <label className="flex items-center gap-2 px-1 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={showHistory}
            onChange={(e) => setShowHistory(e.target.checked)}
          />
          顯示已封存的交流卡
        </label>

        {/* 版本歷程 Timeline */}
        {timeline.length > 0 && (
          <div className="glass animate-fade-up p-7">
            <h2 className="text-lg font-bold text-ink">🕓 版本歷程（History）</h2>
            <p className="mt-1 text-sm text-ink-soft">
              保留所有修改紀錄；管理員可查看歷史需求變化。
            </p>
            <div className="mt-6 space-y-0">
              {timeline.map((v, i) => (
                <div key={v.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow ${
                        v.status === "active" ? "bg-bni-red" : "bg-ink/30"
                      }`}
                    />
                    {i < timeline.length - 1 && <span className="w-px flex-1 bg-ink/15" />}
                  </div>
                  <div className={i < timeline.length - 1 ? "pb-7" : ""}>
                    <div className="text-xs text-ink-muted">{fmt(v.updatedAt)}</div>
                    <div className="mt-0.5 font-semibold text-ink">
                      版本 {v.version}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_META[v.status].cls}`}>
                        {STATUS_META[v.status].label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm text-ink-soft">{v.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
