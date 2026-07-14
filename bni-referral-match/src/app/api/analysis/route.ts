import { NextRequest, NextResponse } from "next/server";
import { buildAnalysis } from "@/lib/ai-analysis";
import { getCards, getMembers } from "@/lib/db";
import type { MemberBundle } from "@/lib/match-engine";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const [members, cards] = await Promise.all([getMembers(), getCards()]);
  const cardMap = new Map(cards.map((c) => [c.memberId, c]));
  const bundles: MemberBundle[] = members.map((m) => ({ member: m, card: cardMap.get(m.id) }));
  const target = bundles.find((b) => b.member.id === memberId);
  if (!target) return NextResponse.json({ error: "member not found" }, { status: 404 });

  const analysis = buildAnalysis(target, bundles);

  // 設定 ANTHROPIC_API_KEY 時，改由 Claude 產生更深入的分析敘事
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const summary = bundles
        .map((b) => {
          const a = b.card?.answers ?? {};
          return `${b.member.name}（${b.member.company}／${b.member.industry}）：${a.s6_intro_60 ?? ""} 理想客戶：${a.s6_ideal_customer ?? ""} 可提供：${JSON.stringify(a.s6_resources_give ?? [])} 需要：${JSON.stringify(a.s6_resources_need ?? [])}`;
        })
        .join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 600,
          messages: [
            {
              role: "user",
              content: `你是商務引薦商機分析顧問。以下是分會成員的交流卡摘要：\n${summary}\n\n請針對「${target.member.name}」，用 150 字以內的繁體中文，說明他本月最應該優先推進的一個合作機會與具體第一步。`,
            },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.content?.[0]?.text;
        if (text) analysis.narrative = text;
      }
    } catch {
      // 呼叫失敗時保留規則引擎的敘事
    }
  }

  return NextResponse.json({ analysis });
}
