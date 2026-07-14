import { NextRequest, NextResponse } from "next/server";
import { buildAnalysis } from "@/lib/ai-analysis";
import { getMemberNarrative, hasAiKey } from "@/lib/ai-insight";
import { getCards, getMembers } from "@/lib/db";
import type { MemberBundle } from "@/lib/match-engine";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 取得目標會員與全體 bundle（供規則引擎與 AI 總結共用） */
async function loadBundles(memberId: string) {
  const [members, cards] = await Promise.all([getMembers(), getCards()]);
  const cardMap = new Map(cards.map((c) => [c.memberId, c]));
  const bundles: MemberBundle[] = members.map((m) => ({ member: m, card: cardMap.get(m.id) }));
  const target = bundles.find((b) => b.member.id === memberId);
  return { bundles, target };
}

/**
 * 七大面向規則引擎分析（本地、零 API 成本）。
 * 只回規則引擎結果——不再在此處呼叫 Anthropic，避免每次開分析頁就扣費。
 * AI 深度總結改由前端按需觸發（見下方 POST）。
 */
export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const { bundles, target } = await loadBundles(memberId);
  if (!target) return NextResponse.json({ error: "member not found" }, { status: 404 });

  const analysis = buildAnalysis(target, bundles);
  return NextResponse.json({ analysis });
}

/**
 * AI 深度總結（按需呼叫）：使用者主動點擊才進到這裡，走全站統一的 callClaude 路徑與模型，含快取。
 */
export async function POST(req: NextRequest) {
  if (!getSessionMemberId(req)) return NextResponse.json({ error: "未登入" }, { status: 401 });
  if (!hasAiKey()) {
    return NextResponse.json(
      { error: "尚未設定 ANTHROPIC_API_KEY，AI 深度總結未啟用（其他功能不受影響）。" },
      { status: 503 }
    );
  }
  const { memberId } = (await req.json()) ?? {};
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const { bundles, target } = await loadBundles(memberId);
  if (!target) return NextResponse.json({ error: "member not found" }, { status: 404 });

  try {
    const result = await getMemberNarrative(target, bundles);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: `AI 總結暫時無法使用：${e instanceof Error ? e.message : "unknown"}` },
      { status: 502 }
    );
  }
}
