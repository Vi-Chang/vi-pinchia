import { NextRequest, NextResponse } from "next/server";
import { getCards, getInteractions, getMembers, getProjects } from "@/lib/db";
import { matchesFor, MemberBundle } from "@/lib/match-engine";
import { buildSuggestion } from "@/lib/suggestions";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const memberId = req.nextUrl.searchParams.get("memberId");
  const scope = req.nextUrl.searchParams.get("scope"); // "chapter" = 僅同分會
  const [members, cards, projects, interactions] = await Promise.all([
    getMembers(),
    getCards(),
    getProjects(),
    getInteractions(),
  ]);
  const cardMap = new Map(cards.map((c) => [c.memberId, c]));
  const bundles: MemberBundle[] = members.map((m) => ({
    member: m,
    card: cardMap.get(m.id),
    projects: projects.filter((p) => p.memberId === m.id),
  }));

  if (memberId) {
    const target = bundles.find((b) => b.member.id === memberId);
    if (!target) return NextResponse.json({ error: "member not found" }, { status: 404 });
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
