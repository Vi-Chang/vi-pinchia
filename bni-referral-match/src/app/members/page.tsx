"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import type { Member } from "@/lib/types";

export default function MembersPage() {
  const { member } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [filled, setFilled] = useState<{ total: number; real: number; demo: number } | null>(null);
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = member?.role === "admin";

  const load = useCallback(async () => {
    const d = await fetch("/api/members").then((r) => r.json());
    setMembers(d.members ?? []);
    setFilled(d.filled ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!member) return <AppShell><div /></AppShell>;

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const remove = async (m: Member) => {
    if (!confirm(`確定要刪除會員「${m.name}」嗎？\n其帳號、交流卡、專案、商機與互動紀錄將一併刪除，無法復原。`)) return;
    const res = await fetch(`/api/members?id=${m.id}&requesterId=${member.id}`, { method: "DELETE" });
    if (!res.ok) {
      flash((await res.json()).error || "刪除失敗");
      return;
    }
    flash(`已刪除會員「${m.name}」`);
    await load();
  };

  const toggleAdmin = async (m: Member) => {
    const next = m.role === "admin" ? "member" : "admin";
    const label = next === "admin" ? `開通「${m.name}」的管理員權限？` : `收回「${m.name}」的管理員權限？`;
    if (!confirm(label)) return;
    const res = await fetch("/api/members", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: m.id, role: next, requesterId: member.id }),
    });
    if (!res.ok) {
      flash((await res.json()).error || "調整失敗");
      return;
    }
    flash(next === "admin" ? `${m.name} 已成為管理員` : `已收回 ${m.name} 的管理員權限`);
    await load();
  };

  const kw = q.trim();
  const list = members.filter(
    (m) =>
      !kw ||
      [m.name, m.chapter, m.industry, m.company, m.email, m.phone].some((s) => (s ?? "").includes(kw))
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="glass animate-fade-up p-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink">👥 所有會員資料</h1>
          <p className="mt-1 text-sm text-ink-soft">
            全體會員名錄
            {filled && (
              <span className="ml-2 text-xs text-ink-muted">
                （已填卡 {filled.total} 位{filled.demo > 0 ? `，含範例 ${filled.demo} 位` : ""}）
              </span>
            )}
            {isAdmin && <span className="ml-2 text-xs text-bni-red">管理員模式：可刪除會員與調整權限</span>}
          </p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋姓名、分會、產業、公司、Email、電話…"
            className="field mt-4 !rounded-full"
          />
        </div>

        {notice && (
          <div className="glass animate-fade-up border-l-4 border-gold-500 p-4 text-sm text-ink">
            ✅ {notice}
          </div>
        )}

        <div className="stagger space-y-3">
          {list.map((m) => (
            <div key={m.id} className="glass glass-hover p-5">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={m.name} color={m.color} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{m.name}</span>
                    {m.isDemo && <span className="text-xs text-amber-600">（範例）</span>}
                    {m.role === "admin" && <span className="tag-red">管理員</span>}
                    <span className="tag-gold">{m.industry || "—"}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-ink-soft">
                    {m.company || "—"}{m.title ? ` · ${m.title}` : ""} · {m.chapter || "—"}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
                    <span>📱 {m.phone || "—"}</span>
                    <span>✉️ {m.email || "—"}</span>
                    {m.line && <span>💬 {m.line}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 text-xs">
                  <a href={`tel:${m.phone}`} className="chip">📞 電話</a>
                  <a href={`mailto:${m.email}`} className="chip">✉️ Email</a>
                  {isAdmin && m.id !== member.id && (
                    <>
                      <button onClick={() => toggleAdmin(m)} className="chip">
                        {m.role === "admin" ? "⬇️ 收回管理員" : "⭐ 開通管理員"}
                      </button>
                      <button onClick={() => remove(m)} className="chip !text-bni-red">
                        🗑️ 刪除
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="glass p-8 text-center text-sm text-ink-muted">沒有符合的會員。</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
