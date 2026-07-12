"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import type { Member, MatchResult, Opportunity } from "@/lib/types";

type Opp = Opportunity & { member: Member };
type Rec = MatchResult & { target: Member };

const TYPES = ["轉介客戶", "資源共享", "異業活動", "專業諮詢", "優惠方案", "其他"];
const FAV_KEY = "brm-plaza-favs";

function fmt(iso: string): string {
  return iso ? iso.slice(0, 10).replaceAll("-", "/") : "—";
}

export default function PlazaPage() {
  const { member } = useAuth();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("全部類型");
  const [chapterF, setChapterF] = useState("全部分會");
  const [openOnly, setOpenOnly] = useState(true);
  const [sort, setSort] = useState<"created" | "updated">("created");
  const [favs, setFavs] = useState<string[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [mine, setMine] = useState(false);
  const [draft, setDraft] = useState<{ id?: string; title: string; content: string; type: string } | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/plaza").then((r) => r.json());
    setOpps(d.opportunities ?? []);
  }, []);

  useEffect(() => {
    load();
    try {
      setFavs(JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"));
    } catch {}
  }, [load]);

  useEffect(() => {
    if (!member) return;
    // AI 推薦（本地規則引擎，零 API 成本）
    fetch(`/api/matches?memberId=${member.id}`)
      .then((r) => r.json())
      .then((d) => setRecs((d.matches ?? []).slice(0, 3)));
  }, [member]);

  const chapters = useMemo(
    () => ["全部分會", ...Array.from(new Set(opps.map((o) => o.member.chapter).filter(Boolean)))],
    [opps]
  );

  const list = useMemo(() => {
    const kw = q.trim();
    return opps
      .filter((o) => !mine || o.memberId === member?.id)
      .filter((o) => !openOnly || mine || o.status === "open")
      .filter((o) => typeF === "全部類型" || o.type === typeF)
      .filter((o) => chapterF === "全部分會" || o.member.chapter === chapterF)
      .filter((o) => !favOnly || favs.includes(o.id))
      .filter(
        (o) =>
          !kw ||
          [o.member.name, o.member.chapter, o.member.industry, o.title, o.content].some((s) =>
            s.includes(kw)
          )
      )
      .sort((a, b) =>
        sort === "created" ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)
      );
  }, [opps, q, typeF, chapterF, openOnly, sort, favs, favOnly, mine, member]);

  if (!member) return <AppShell><div /></AppShell>;

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(next);
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
  };

  const save = async () => {
    if (!draft?.title.trim() || !draft.content.trim() || !draft.type) {
      alert("標題、內容與合作類型都要填喔");
      return;
    }
    const res = await fetch("/api/plaza", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...draft, memberId: member.id }),
    });
    if (res.ok) {
      setDraft(null);
      await load();
      flash("已發布！AI 已重新計算媒合。");
    }
  };

  const setStatus = async (o: Opp, status: "open" | "closed") => {
    await fetch("/api/plaza", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: o.id, status }),
    });
    await load();
  };

  const remove = async (o: Opp) => {
    const label = o.isTemplate ? `範本「${o.title}」` : `「${o.title}」`;
    if (!confirm(`確定要刪除${label}嗎？`)) return;
    const res = await fetch(`/api/plaza?id=${o.id}&memberId=${member!.id}`, { method: "DELETE" });
    if (!res.ok) flash((await res.json()).error || "刪除失敗");
    await load();
  };

  const interest = async (o: Opp) => {
    const res = await fetch("/api/plaza/interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ oppId: o.id, memberId: member.id }),
    });
    if (res.ok) flash(`已通知 ${o.member.name}，對方會在商機快訊看到你的合作意願！`);
    else flash((await res.json()).error || "送出失敗");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        {/* 標題 + 我的合作 */}
        <div className="glass animate-fade-up p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">🏪 商機廣場</h1>
              <p className="mt-1 text-sm text-ink-soft">
                所有會員正在開放的合作與商機，找到就直接出手。
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMine(!mine)} className={mine ? "chip chip-on" : "chip"}>
                我的合作
              </button>
              <button
                onClick={() => setDraft({ title: "", content: "", type: "" })}
                className="btn-primary !px-5 !py-2.5 !text-sm"
              >
                ＋ 新增合作
              </button>
            </div>
          </div>

          {/* 搜尋與篩選 */}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋姓名、分會、職業、合作內容…"
            className="field mt-5 !rounded-full"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <select className="chip !py-2" value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option>全部類型</option>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select className="chip !py-2" value={chapterF} onChange={(e) => setChapterF(e.target.value)}>
              {chapters.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button onClick={() => setOpenOnly(!openOnly)} className={openOnly ? "chip chip-on" : "chip"}>
              只看開放中
            </button>
            <button onClick={() => setFavOnly(!favOnly)} className={favOnly ? "chip chip-on" : "chip"}>
              ⭐ 收藏
            </button>
            <span className="ml-auto flex items-center gap-1 text-xs text-ink-muted">
              排序
              <button onClick={() => setSort("created")} className={`chip !px-3 !py-1.5 ${sort === "created" ? "chip-on" : ""}`}>
                最新發布
              </button>
              <button onClick={() => setSort("updated")} className={`chip !px-3 !py-1.5 ${sort === "updated" ? "chip-on" : ""}`}>
                最近更新
              </button>
            </span>
          </div>
        </div>

        {notice && (
          <div className="glass animate-fade-up border-l-4 border-gold-500 p-4 text-sm text-ink">
            ✅ {notice}
          </div>
        )}

        {/* 新增／編輯表單 */}
        {draft && (
          <div className="glass animate-fade-up space-y-4 p-7">
            <h2 className="text-lg font-bold text-ink">{draft.id ? "編輯合作" : "新增合作"}</h2>
            <div>
              <label className="label">合作標題 *</label>
              <input className="field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="例：中秋聯名禮盒徵異業夥伴" />
            </div>
            <div>
              <label className="label">合作內容 *</label>
              <textarea className="field" rows={3} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="想找什麼夥伴、能提供什麼、怎麼合作…" />
            </div>
            <div>
              <label className="label">合作類型 *</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setDraft({ ...draft, type: t })} className={draft.type === t ? "chip chip-on" : "chip"}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 border-t border-ink/5 pt-4">
              <button onClick={save} className="btn-primary">發布</button>
              <button onClick={() => setDraft(null)} className="btn-ghost">取消</button>
            </div>
          </div>
        )}

        {/* AI 推薦 */}
        {!mine && recs.length > 0 && (
          <div className="glass animate-fade-up p-6">
            <h2 className="font-bold text-ink">🤖 AI 為你推薦的合作夥伴</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {recs.map((r) => (
                <div key={r.targetId} className="rounded-2xl bg-white/50 p-4">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.target.name} color={r.target.color} size={34} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink">{r.target.name}</div>
                      <div className="truncate text-[11px] text-ink-muted">{r.target.industry}</div>
                    </div>
                    <span className="ml-auto text-sm font-bold text-bni-red">{r.probability}%</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">{r.reasons[0]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 商機卡片 */}
        <div className="stagger grid gap-4 md:grid-cols-2">
          {list.length === 0 && (
            <div className="glass col-span-full p-10 text-center text-sm text-ink-muted">
              {mine ? "你還沒有發布合作，點「＋ 新增合作」開始。" : "沒有符合條件的商機。"}
            </div>
          )}
          {list.map((o) => {
            const isMine = o.memberId === member.id;
            const isAdmin = member.role === "admin";
            const open = o.status === "open";
            return (
              <div key={o.id} className={`glass glass-hover flex flex-col p-6 ${!open ? "opacity-70" : ""}`}>
                <div className="flex items-center gap-3">
                  <Avatar name={o.member.name} color={o.member.color} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink">{o.member.name}</div>
                    <div className="truncate text-xs text-ink-muted">
                      {o.member.chapter} · {o.member.industry}
                    </div>
                  </div>
                  {o.isTemplate && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                      範本
                    </span>
                  )}
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${open ? "bg-emerald-100 text-emerald-700" : "bg-ink/10 text-ink-soft"}`}>
                    {open ? "開放中" : "已結束"}
                  </span>
                </div>

                <h3 className="mt-4 font-bold text-ink">{o.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-6 text-ink-soft">{o.content}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="tag-gold">{o.type}</span>
                  <span className="text-ink-muted">發布 {fmt(o.createdAt)}</span>
                  {o.updatedAt !== o.createdAt && <span className="text-ink-muted">· 更新 {fmt(o.updatedAt)}</span>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/5 pt-4 text-xs">
                  {isMine ? (
                    <>
                      <button onClick={() => setDraft({ id: o.id, title: o.title, content: o.content, type: o.type })} className="chip">✏️ 編輯</button>
                      {open ? (
                        <button onClick={() => setStatus(o, "closed")} className="chip">⏹️ 結束合作</button>
                      ) : (
                        <button onClick={() => setStatus(o, "open")} className="chip">▶️ 重新開放</button>
                      )}
                      <button onClick={() => remove(o)} className="chip !text-bni-red">🗑️ 刪除</button>
                    </>
                  ) : (
                    <>
                      {open && (
                        <button onClick={() => interest(o)} className="btn-primary !px-4 !py-2 !text-xs">
                          🤝 我要合作
                        </button>
                      )}
                      <a href={o.member.line ? `https://line.me/R/ti/p/~${o.member.line}` : `mailto:${o.member.email}`} target="_blank" rel="noopener" className="chip">
                        💬 私訊會員
                      </a>
                      <button onClick={() => toggleFav(o.id)} className={`chip ${favs.includes(o.id) ? "chip-on" : ""}`}>
                        {favs.includes(o.id) ? "⭐ 已收藏" : "☆ 收藏"}
                      </button>
                      {isAdmin && (
                        <button onClick={() => remove(o)} className="chip !text-bni-red" title="管理員刪除">
                          🗑️ 刪除
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
