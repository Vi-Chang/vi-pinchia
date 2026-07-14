import { NextRequest, NextResponse } from "next/server";
import { getCards, getInteractions, getMembers, getOpportunities, getProjects } from "@/lib/db";
import { matchesFor, MemberBundle } from "@/lib/match-engine";
import { buildSuggestion } from "@/lib/suggestions";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const memberId = req.nextUrl.searchParams.get("memberId");
  const scope = req.nextUrl.searchParams.get("scope"); // "chapter" = 僅同分會
  const [members, cards, projects, interactions, opportunities] = await Promise.all([
    getMembers(),
    getCards(),
    getProjects(),
    getInteractions(),
    getOpportunities(),
  ]);
  const cardMap = new Map(cards.map((c) => [c.memberId, c]));
  const bundles: MemberBundle[] = members.map((m) => ({
    member: m,
    card: cardMap.get(m.id),
    projects: projects.filter((p) => p.memberId === m.id),
  }));

  // 每位會員「最後更新內容」的時間戳（交流卡或商機廣場，取較新者）
  const lastActivity = new Map<string, string>();
  for (const c of cards) {
    const d = c.updatedAt ?? "";
    if (d > (lastActivity.get(c.memberId) ?? "")) lastActivity.set(c.memberId, d);
  }
  for (const o of opportunities) {
    const d = o.updatedAt ?? "";
    if (d > (lastActivity.get(o.memberId) ?? "")) lastActivity.set(o.memberId, d);
  }

  if (memberId) {
    const target = bundles.find((b) => b.member.id === memberId);
    if (!target) return NextResponse.json({ error: "member not found" }, { status: 404 });

    // 我最近一次與各夥伴 121 的日期
    const last121 = new Map<string, string>();
    for (const i of interactions) {
      if (i.type !== "121") continue;
      const other = i.fromId === memberId ? i.toId : i.toId === memberId ? i.fromId : "";
      if (!other) continue;
      if (i.date > (last121.get(other) ?? "")) last121.set(other, i.date);
    }
    // 已完成 121 且對方之後沒更新內容 → 暫不推薦（比對完整時間戳）
    const isDismissed = (tid: string) => {
      const d121 = last121.get(tid);
      if (!d121) return false;
      const la = lastActivity.get(tid) ?? "";
      return d121 >= la; // 我 121 的時間晚於對方最後更新 → 暫不推薦；對方一更新即恢復
    };

    // 支援多分會：可只在自己分會內媒合，或跨全部分會
    const pool =
      scope === "chapter"
        ? bundles.filter(
            (b) => b.member.chapter === target.member.chapter || b.member.id === memberId
          )
        : bundles;
    const results = matchesFor(target, pool, interactions);
    return NextResponse.json({
      matches: results.map((r) => {
        const other = bundles.find((b) => b.member.id === r.targetId)!;
        return {
          ...r,
          target: other.member,
          suggestion: buildSuggestion(target, other),
          dismissed121: isDismissed(r.targetId),
        };
      }),
    });
  }

  // 全體配對（後台用）：每人取前 3 名
  const all = bundles.map((b) => ({
    memberId: b.member.id,
    top: matchesFor(b, bundles, interactions).slice(0, 3),
  }));
  return NextResponse.json({ all });
}
