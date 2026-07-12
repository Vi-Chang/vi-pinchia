import type { AiAnalysis, AnalysisEntry } from "./types";
import { computePairSignal, MemberBundle, SUPPLY_CHAIN } from "./match-engine";

function entry(b: MemberBundle, reason: string, score: number): AnalysisEntry {
  return { member: b.member, reason, score };
}

function top(list: AnalysisEntry[], n = 3): AnalysisEntry[] {
  return list.sort((a, b) => b.score - a.score).slice(0, n);
}

/** 依據交流卡資料，產出七大面向的商機分析（規則引擎版） */
export function buildAnalysis(target: MemberBundle, all: MemberBundle[]): AiAnalysis {
  const others = all.filter((b) => b.member.id !== target.member.id);

  const introduceTo: AnalysisEntry[] = [];
  const receiveFrom: AnalysisEntry[] = [];
  const partners: AnalysisEntry[] = [];
  const overlapping: AnalysisEntry[] = [];
  const supplyChain: AnalysisEntry[] = [];
  const coEvent: AnalysisEntry[] = [];
  const crossSell: AnalysisEntry[] = [];

  for (const other of others) {
    const sig = computePairSignal(target, other);
    const c = sig.components;
    const sameIndustry = target.member.industry === other.member.industry;

    // 適合介紹給誰：我的客戶接著會需要對方（我是對方的上游）
    const myDown = SUPPLY_CHAIN[target.member.industry] ?? [];
    if (myDown.includes(other.member.industry)) {
      introduceTo.push(
        entry(other, sameIndustry
          ? "同業互補：超出你服務範圍或產能的案件，可直接轉介給對方"
          : `你的客戶完成${target.member.industry}服務後，常接著需要${other.member.industry}`, 60 + c.resourceFit)
      );
    }

    // 誰適合介紹給他：對方的客戶接著會需要我
    const theirDown = SUPPLY_CHAIN[other.member.industry] ?? [];
    if (theirDown.includes(target.member.industry)) {
      receiveFrom.push(
        entry(other, sameIndustry
          ? `同業互補：${other.member.company}承接不了的客戶，正是你的案源`
          : `${other.member.company}的客戶接著常需要你的${target.member.industry}服務`, 60 + c.resourceFit)
      );
    }

    // 可合作
    if (sig.score >= 45) {
      partners.push(entry(other, sig.reasons[0] ?? "多項條件契合，具合作潛力", sig.score));
    }

    // 客戶高度重疊
    if (c.customerOverlap >= 7) {
      overlapping.push(entry(other, "目標決策者與客戶規模高度一致", 50 + c.customerOverlap * 3));
    }

    // 上下游
    if (c.supplyChain >= 10) {
      supplyChain.push(
        entry(other, sameIndustry
          ? `同業夥伴（${target.member.industry}）：客源與專長互補，可互相轉介`
          : myDown.includes(other.member.industry)
            ? `下游夥伴：${target.member.industry} → ${other.member.industry}`
            : `上游夥伴：${other.member.industry} → ${target.member.industry}`, 50 + c.supplyChain * 2)
      );
    }

    // 可共同辦活動
    if (sig.tags.includes("可合辦活動")) {
      coEvent.push(entry(other, "偏好的活動型式一致，可共同主辦", 40 + c.coop * 5));
    }

    // 可交叉銷售
    if (sig.tags.includes("可交叉銷售")) {
      crossSell.push(entry(other, "雙方交叉銷售意願皆高，可互相打包服務", 55 + c.resourceFit));
    }
  }

  const t3 = top(partners, 1)[0];
  const narrative = t3
    ? `根據交流卡分析，${target.member.name}目前最具潛力的合作對象是${t3.member.name}（${t3.member.company}）：${t3.reason}。建議本月優先安排 121，聚焦「引薦流程」與「共同活動」兩件事，並在 30 天內完成第一次互相引薦。`
    : `${target.member.name}的交流卡資料尚不完整，完成度越高，AI 分析與配對結果越精準。建議先完成「個人品牌與資源」章節。`;

  return {
    introduceTo: top(introduceTo),
    receiveFrom: top(receiveFrom),
    partners: top(partners, 4),
    overlapping: top(overlapping),
    supplyChain: top(supplyChain, 4),
    coEvent: top(coEvent),
    crossSell: top(crossSell),
    narrative,
  };
}
