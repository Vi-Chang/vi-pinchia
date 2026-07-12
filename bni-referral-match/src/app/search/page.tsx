"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import type { ExchangeCard, Member } from "@/lib/types";

const SCOPES = ["全部", "姓名", "公司", "產業", "服務", "需求", "資源"] as const;

export default function SearchPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [cards, setCards] = useState<ExchangeCard[]>([]);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("全部");
  const [chapter, setChapter] = useState("全部分會");

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then((d) => setMembers(d.members ?? []));
    fetch("/api/admin/stats").then((r) => r.json()).then((d) => setCards(d.cards ?? []));
  }, []);

  const chapters = useMemo(
    () => ["全部分會", ...Array.from(new Set(members.map((m) => m.chapter).filter(Boolean)))],
    [members]
  );

  const results = useMemo(() => {
    const kw = q.trim();
    const pool = chapter === "全部分會" ? members : members.filter((m) => m.chapter === chapter);
    // 只選分會、未輸入關鍵字 → 直接列出該分會會員
    if (!kw) {
      if (chapter === "全部分會") return [];
      const cardMap = new Map(cards.map((c) => [c.memberId, c]));
      return pool.map((m) => ({ member: m, card: cardMap.get(m.id), hitField: undefined }));
    }
    const cardMap = new Map(cards.map((c) => [c.memberId, c]));
    return pool
      .map((m) => {
        const card = cardMap.get(m.id);
        const a = card?.answers ?? {};
        const fields: Record<(typeof SCOPES)[number], string> = {
          全部: "",
          姓名: m.name,
          公司: m.company,
          產業: [m.industry, ...(Array.isArray(a.s6_industries) ? a.s6_industries : [])].join(" "),
          服務: [a.s6_intro_60, a.s6_company_line, a.s6_success_case, a.s2_dream_case]
            .filter((x) => typeof x === "string")
            .join(" "),
          需求: [
            ...(Array.isArray(a.s6_resources_need) ? a.s6_resources_need : []),
            typeof a.s2_want_to_meet === "string" ? a.s2_want_to_meet : "",
            typeof a.s6_ideal_customer === "string" ? a.s6_ideal_customer : "",
          ].join(" "),
          資源: (Array.isArray(a.s6_resources_give) ? a.s6_resources_give : []).join(" "),
        };
        fields.全部 = Object.values(fields).join(" ");
        const hay = fields[scope];
        if (!hay.includes(kw)) return null;

        // 找出命中的欄位，做為結果說明
        const hitField = (Object.keys(fields) as (typeof SCOPES)[number][])
          .filter((k) => k !== "全部")
          .find((k) => fields[k].includes(kw));
        return { member: m, card, hitField };
      })
      .filter(Boolean) as { member: Member; card?: ExchangeCard; hitField?: string }[];
  }, [q, scope, chapter, members, cards]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="glass animate-fade-up p-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink">🔍 搜尋會員</h1>
          <p className="mt-1 text-sm text-ink-soft">
            搜尋姓名、公司、產業、服務、需求、資源與關鍵字。
          </p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="輸入關鍵字，例如：醫療、禮盒、行銷曝光、診所…"
            className="field mt-5 !rounded-full !px-6 !py-4 text-base"
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`chip ${scope === s ? "chip-on" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
          {/* 多分會：依分會查詢 */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-muted">分會：</span>
            {chapters.map((c) => (
              <button
                key={c}
                onClick={() => setChapter(c)}
                className={`chip ${chapter === c ? "chip-on" : ""}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {(q.trim() || chapter !== "全部分會") && (
          <p className="px-2 text-sm text-ink-muted">
            {chapter !== "全部分會" && `【${chapter}】`}
            找到 {results.length} 位{q.trim() ? `符合「${q}」的` : ""}會員
          </p>
        )}

        <div className="stagger space-y-3">
          {results.map(({ member: m, card, hitField }) => {
            const a = card?.answers ?? {};
            return (
              <div key={m.id} className="glass glass-hover flex flex-wrap items-center gap-4 p-5">
                <Avatar name={m.name} color={m.color} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{m.name}</span>
                    <span className="tag-gold">{m.industry}</span>
                    <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink-soft">{m.chapter}</span>
                    {hitField && hitField !== "姓名" && (
                      <span className="tag-red">命中：{hitField}</span>
                    )}
                  </div>
                  <div className="text-sm text-ink-soft">
                    {m.company} · {m.title}
                  </div>
                  {typeof a.s6_intro_60 === "string" && a.s6_intro_60 && (
                    <p className="mt-1 text-[13px] italic text-ink-muted">「{a.s6_intro_60}」</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${m.phone}`} className="btn-ghost !px-4 !py-2 text-xs">📞 電話</a>
                  <a href={`mailto:${m.email}`} className="btn-ghost !px-4 !py-2 text-xs">✉️ Email</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
