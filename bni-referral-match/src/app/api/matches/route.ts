import { NextRequest, NextResponse } from "next/server";
import { getCards, getMembers } from "@/lib/db";
import { matchesFor, MemberBundle } from "@/lib/match-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("memberId");
  const [members, cards] = await Promise.all([getMembers(), getCards()]);
  const cardMap = new Map(cards.map((c) => [c.memberId, c]));
  const bundles: MemberBundle[] = members.map((m) => ({ member: m, card: cardMap.get(m.id) }));

  if (memberId) {
    const target = bundles.find((b) => b.member.id === memberId);
    if (!target) return NextResponse.json({ error: "member not found" }, { status: 404 });
    const results = matchesFor(target, bundles);
    return NextResponse.json({
      matches: results.map((r) => ({
        ...r,
        target: bundles.find((b) => b.member.id === r.targetId)!.member,
      })),
    });
  }

  // 全體配對（後台用）：每人取前 3 名
  const all = bundles.map((b) => ({
    memberId: b.member.id,
    top: matchesFor(b, bundles).slice(0, 3),
  }));
  return NextResponse.json({ all });
}
