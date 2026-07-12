import { NextRequest, NextResponse } from "next/server";
import { getCards, getMembers, getProjects } from "@/lib/db";
import { getPairInsight, hasAiKey } from "@/lib/ai-insight";
import type { MemberBundle } from "@/lib/match-engine";

export const dynamic = "force-dynamic";

/**
 * AI 深度分析（按需呼叫）：
 * 只有使用者主動點擊時才進到這裡；其餘功能一律走本地規則引擎。
 */
export async function POST(req: NextRequest) {
  if (!hasAiKey()) {
    return NextResponse.json(
      { error: "尚未設定 ANTHROPIC_API_KEY，AI 深度分析未啟用（其他功能不受影響）。" },
      { status: 503 }
    );
  }
  const { memberId, targetId } = (await req.json()) ?? {};
  if (!memberId || !targetId) {
    return NextResponse.json({ error: "memberId 與 targetId 必填" }, { status: 400 });
  }

  const [members, cards, projects] = await Promise.all([getMembers(), getCards(), getProjects()]);
  const cardMap = new Map(cards.map((c) => [c.memberId, c]));
  const bundle = (id: string): MemberBundle | undefined => {
    const m = members.find((x) => x.id === id);
    if (!m) return undefined;
    return { member: m, card: cardMap.get(id), projects: projects.filter((p) => p.memberId === id) };
  };
  const a = bundle(memberId);
  const b = bundle(targetId);
  if (!a || !b) return NextResponse.json({ error: "member not found" }, { status: 404 });

  try {
    const result = await getPairInsight(a, b);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: `AI 分析暫時無法使用：${e instanceof Error ? e.message : "unknown"}` },
      { status: 502 }
    );
  }
}
