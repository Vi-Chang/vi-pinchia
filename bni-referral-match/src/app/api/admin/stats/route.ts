import { NextRequest, NextResponse } from "next/server";
import { getCards, getInteractions, getMember, getMembers } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";
import {
  activityHeatmap,
  cardProgress,
  chapterRadar,
  industryDistribution,
  missingIndustries,
  oneToOneRanking,
  optionCounts,
  referralRanking,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const uid = getSessionMemberId(req);
  if (!uid) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const requester = await getMember(uid);
  if (requester?.role !== "admin") return NextResponse.json({ error: "僅管理員可存取" }, { status: 403 });
  const [members, cards, interactions] = await Promise.all([
    getMembers(),
    getCards(),
    getInteractions(),
  ]);

  const heat = activityHeatmap(members, interactions);

  return NextResponse.json({
    memberCount: members.length,
    cardDone: cards.filter((c) => cardProgress(c) >= 80).length,
    referralTotal: interactions.filter((i) => i.type === "referral").length,
    referralAmount: interactions
      .filter((i) => i.type === "referral")
      .reduce((s, i) => s + (i.amount ?? 0), 0),
    oneToOneTotal: interactions.filter((i) => i.type === "121").length,
    referralRank: referralRanking(members, interactions).map((r) => ({
      name: r.member.name,
      company: r.member.company,
      color: r.member.color,
      value: r.value,
    })),
    oneToOneRank: oneToOneRanking(members, interactions).map((r) => ({
      name: r.member.name,
      company: r.member.company,
      color: r.member.color,
      value: r.value,
    })),
    industries: industryDistribution(members),
    missingIndustries: missingIndustries(members),
    needRank: optionCounts(cards, "s6_resources_need"),
    giveRank: optionCounts(cards, "s6_resources_give"),
    helpRank: optionCounts(cards, "s5_help_needed"),
    radar: chapterRadar(members, cards, interactions),
    heatmap: {
      weeks: heat.weeks,
      rows: heat.cells.map((c) => ({ label: c.member.name, values: c.values })),
    },
    members: members.map((m) => ({
      ...m,
      progress: cardProgress(cards.find((c) => c.memberId === m.id)),
    })),
    cards,
  });
}
