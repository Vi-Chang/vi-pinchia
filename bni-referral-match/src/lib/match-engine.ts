import type { Answer, ExchangeCard, Interaction, MatchResult, Member, Project } from "./types";

export interface MemberBundle {
  member: Member;
  card?: ExchangeCard;
  /** 會員的專案清單（含主推專案），提供給優先順序媒合使用 */
  projects?: Project[];
}

/** 產業上下游關係表：key 的客戶接著會需要 value（key → value 為下游方向） */
const SUPPLY_CHAIN: Record<string, string[]> = {
  房地產: ["室內設計", "法律服務", "會計財稅", "保險理財"],
  室內設計: ["醫療健康", "餐飲食品", "建築營造", "印刷包裝"],
  建築營造: ["室內設計", "房地產"],
  行銷廣告: ["網頁/軟體開發", "印刷包裝", "餐飲食品"],
  "網頁/軟體開發": ["行銷廣告", "電商零售"],
  會計財稅: ["法律服務", "保險理財"],
  法律服務: ["會計財稅", "房地產"],
  醫療健康: ["保險理財", "醫療健康", "人力資源"],
  餐飲食品: ["印刷包裝", "行銷廣告", "電商零售"],
  印刷包裝: ["餐飲食品", "電商零售", "行銷廣告", "美容美業"],
  保險理財: ["醫療健康", "會計財稅"],
  人力資源: ["教育訓練", "法律服務"],
  電商零售: ["網頁/軟體開發", "印刷包裝", "行銷廣告"],
};

/** 文字關鍵字字典（配對引擎用） */
const KEYWORDS = [
  "醫療", "診所", "復健", "健康", "醫師", "院長", "長照",
  "設計", "裝修", "裝潢", "空間", "開幕", "展店", "開業", "搬遷",
  "房產", "商辦", "店面", "置產", "房仲",
  "稅務", "記帳", "財稅", "會計", "設立", "創業", "股權",
  "法律", "合約", "顧問", "訴訟", "加盟",
  "行銷", "品牌", "社群", "曝光", "廣告", "官網",
  "網站", "系統", "電商", "數位", "轉型",
  "禮盒", "烘焙", "甜點", "婚宴", "喜餅", "節慶",
  "印刷", "包裝", "包材", "打樣",
  "保險", "理財", "企業主", "人資", "採購", "福委",
];

function asArray(a: Answer | undefined): string[] {
  if (Array.isArray(a)) return a;
  if (typeof a === "string" && a) return [a];
  return [];
}

function asText(a: Answer | undefined): string {
  return typeof a === "string" ? a : "";
}

function overlap(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

export function extractKeywords(bundle: MemberBundle): string[] {
  const ans = bundle.card?.answers ?? {};
  const text = [
    bundle.member.company,
    bundle.member.industry,
    asText(ans.s2_dream_case),
    asText(ans.s2_want_to_meet),
    asText(ans.s4_upstream),
    asText(ans.s4_downstream),
    asText(ans.s6_intro_60),
    asText(ans.s6_ideal_customer),
    asText(ans.s6_company_line),
    asText(ans.s6_success_case),
    asText(ans.s6_open_projects),
    asText(ans.ob_specialty),
    asText(ans.ob_services),
  ].join(" ");
  return KEYWORDS.filter((k) => text.includes(k));
}

interface PairSignal {
  score: number;
  reasons: string[];
  tags: string[];
  components: {
    resourceFit: number;
    supplyChain: number;
    targetIndustry: number;
    region: number;
    customerOverlap: number;
    keyword: number;
    coop: number;
  };
}

/** 計算 a → b 的配對訊號（分數對稱，理由以 a 的視角描述） */
export function computePairSignal(a: MemberBundle, b: MemberBundle): PairSignal {
  const A = a.card?.answers ?? {};
  const B = b.card?.answers ?? {};
  const reasons: string[] = [];
  const tags: string[] = [];

  // 1) 資源互補（0–30）：我提供的正是對方需要的，反之亦然
  const giveA = asArray(A.s6_resources_give);
  const needA = asArray(A.s6_resources_need);
  const giveB = asArray(B.s6_resources_give);
  const needB = asArray(B.s6_resources_need);
  const aHelpsB = overlap(giveA, needB);
  const bHelpsA = overlap(giveB, needA);
  const resourceFit = Math.min(30, (aHelpsB.length + bHelpsA.length) * 8);
  if (aHelpsB.length) reasons.push(`你能提供對方需要的「${aHelpsB[0]}」`);
  if (bHelpsA.length) reasons.push(`對方能提供你需要的「${bHelpsA[0]}」`);
  if (resourceFit >= 16) tags.push("資源互補");

  // 2) 產業上下游（0–20）
  const down = SUPPLY_CHAIN[a.member.industry] ?? [];
  const up = SUPPLY_CHAIN[b.member.industry] ?? [];
  let supplyChain = 0;
  const sameIndustry = a.member.industry === b.member.industry;
  if (sameIndustry && down.includes(b.member.industry)) {
    supplyChain += 20;
    reasons.push("同產業夥伴，客源與案件規模可互補，同業引薦明確");
    tags.push("同業互補");
  } else {
    if (down.includes(b.member.industry)) {
      supplyChain += 10;
      reasons.push(`${a.member.industry}的客戶接著常需要${b.member.industry}`);
    }
    if (up.includes(a.member.industry)) {
      supplyChain += 10;
      reasons.push(`${b.member.industry}是你的上游案源`);
    }
    if (supplyChain >= 10) tags.push("上下游");
  }

  // 3) 期待合作產業互指（0–12）
  const wantA = asArray(A.s4_target_industries);
  const wantB = asArray(B.s4_target_industries);
  let targetIndustry = 0;
  if (wantA.includes(b.member.industry)) targetIndustry += 6;
  if (wantB.includes(a.member.industry)) targetIndustry += 6;
  if (targetIndustry === 12) reasons.push("雙方都把對方列為期待合作的產業");

  // 4) 服務地區重疊（0–10）
  const regionHit = overlap(asArray(A.s6_regions), asArray(B.s6_regions));
  const region = Math.min(10, regionHit.length * 4);
  if (regionHit.length) reasons.push(`服務地區重疊（${regionHit.slice(0, 2).join("、")}）`);

  // 5) 客群重疊（0–12）：決策者與企業規模
  const dmHit = overlap(asArray(A.s2_decision_maker), asArray(B.s2_decision_maker));
  const sizeHit = overlap(asArray(A.s2_company_size), asArray(B.s2_company_size));
  const customerOverlap = Math.min(12, dmHit.length * 4 + sizeHit.length * 3);
  if (customerOverlap >= 7) {
    reasons.push("目標客群高度一致，客戶可直接互相引薦");
    tags.push("客群重疊");
  }

  // 6) 關鍵字交集（0–8）
  const kwHit = overlap(extractKeywords(a), extractKeywords(b));
  const keyword = Math.min(8, kwHit.length * 2);
  if (kwHit.length >= 3) reasons.push(`共同關鍵字：${kwHit.slice(0, 3).join("、")}`);

  // 7) 合作方式與活動契合（0–8）
  const coopHit = overlap(asArray(A.s4_coop_methods), asArray(B.s4_coop_methods));
  const eventHit = overlap(asArray(A.s4_events), asArray(B.s4_events));
  const coop = Math.min(8, coopHit.length * 2 + eventHit.length * 2);
  if (eventHit.length) tags.push("可合辦活動");
  const crossA = asText(A.s4_cross_sell);
  const crossB = asText(B.s4_cross_sell);
  if (crossA.startsWith("高") && crossB.startsWith("高")) tags.push("可交叉銷售");

  const score = Math.min(
    100,
    resourceFit + supplyChain + targetIndustry + region + customerOverlap + keyword + coop
  );

  return {
    score,
    reasons,
    tags,
    components: { resourceFit, supplyChain, targetIndustry, region, customerOverlap, keyword, coop },
  };
}

const DAY = 24 * 60 * 60 * 1000;

function mainProjectOf(b: MemberBundle): Project | undefined {
  return b.projects?.find((p) => p.isMain) ?? b.projects?.[0];
}

/**
 * AI 媒合優先順序（依序加權，滿分 100）：
 * ① 主推專案 20 ② 最新交流卡 10 ③ 理想客戶 12 ④ 目前需要資源 12
 * ⑤ 提供資源 12 ⑥ 希望認識的人 8 ⑦ 過去合作紀錄 8 ⑧ 地區 6 ⑨ 產業 8 ⑩ 關鍵字 4
 */
export function computeMatch(
  a: MemberBundle,
  b: MemberBundle,
  interactions: Interaction[] = []
): MatchResult {
  const base = computePairSignal(a, b);
  const c = base.components;
  const A = a.card?.answers ?? {};
  const B = b.card?.answers ?? {};
  const reasons: string[] = [];
  const tags = [...base.tags];

  // ① 主推專案（0–20）
  const mainA = mainProjectOf(a);
  const mainB = mainProjectOf(b);
  let project = 0;
  if (mainA?.industriesNeeded.includes(b.member.industry)) {
    project += 8;
    reasons.push(`你的主推專案「${mainA.name}」正需要${b.member.industry}的合作`);
  }
  if (mainB?.industriesNeeded.includes(a.member.industry)) {
    project += 8;
    reasons.push(`對方主推專案「${mainB.name}」正在找${a.member.industry}夥伴`);
  }
  if (project >= 16 && (mainA?.importance ?? 0) >= 4 && (mainB?.importance ?? 0) >= 4) {
    project += 4;
    tags.push("主推專案互需");
  }
  project = Math.min(20, project);

  // ② 最新交流卡（0–10）：90 天內有更新代表需求是現況
  const now = Date.now();
  const freshA = a.card && now - new Date(a.card.updatedAt).getTime() <= 90 * DAY;
  const freshB = b.card && now - new Date(b.card.updatedAt).getTime() <= 90 * DAY;
  const freshness = (freshA ? 5 : 0) + (freshB ? 5 : 0);
  if (freshA && freshB) reasons.push("雙方交流卡皆為 90 天內的最新需求");

  // ③ 理想客戶（0–12）：目標決策者與企業規模重疊
  const idealCustomer = c.customerOverlap;

  // ④ 目前需要資源（0–12）：對方提供的正是我需要的
  const needA = asArray(A.s6_resources_need);
  const giveB = asArray(B.s6_resources_give);
  const bHelpsA = overlap(giveB, needA);
  const needRes = Math.min(12, bHelpsA.length * 6);
  if (bHelpsA.length) reasons.push(`對方能提供你目前需要的「${bHelpsA[0]}」`);

  // ⑤ 提供資源（0–12）：我提供的正是對方需要的
  const giveA = asArray(A.s6_resources_give);
  const needB = asArray(B.s6_resources_need);
  const aHelpsB = overlap(giveA, needB);
  const giveRes = Math.min(12, aHelpsB.length * 6);
  if (aHelpsB.length) reasons.push(`你能提供對方需要的「${aHelpsB[0]}」`);

  // ⑥ 希望認識的人（0–8）：互指期待合作產業／想認識對象
  let wantToMeet = 0;
  if (asArray(A.s4_target_industries).includes(b.member.industry)) wantToMeet += 4;
  if (asArray(B.s4_target_industries).includes(a.member.industry)) wantToMeet += 4;
  if (wantToMeet === 8) reasons.push("雙方都把對方列為希望認識的產業");

  // ⑦ 過去合作紀錄（0–8）
  const pastCount = interactions.filter(
    (i) =>
      (i.fromId === a.member.id && i.toId === b.member.id) ||
      (i.fromId === b.member.id && i.toId === a.member.id)
  ).length;
  const pastCoop = Math.min(8, pastCount * 3);
  if (pastCount > 0) reasons.push(`已有 ${pastCount} 次互動紀錄，信任基礎佳`);

  // ⑧ 地區（0–6）
  const region = Math.min(6, c.region);

  // ⑨ 產業（0–8）：上下游／同業互補
  const industry = Math.round((c.supplyChain / 20) * 8);

  // ⑩ 關鍵字（0–4）
  const keyword = Math.min(4, c.keyword);

  const score = Math.min(
    100,
    project + freshness + idealCustomer + needRes + giveRes + wantToMeet + pastCoop + region + industry + keyword
  );

  // 補上基礎引擎的產業／客群理由（排在優先項之後）
  for (const r of base.reasons) if (reasons.length < 6 && !reasons.includes(r)) reasons.push(r);

  return {
    memberId: a.member.id,
    targetId: b.member.id,
    score,
    stars: Math.max(1, Math.min(5, Math.round(score / 20))),
    probability: Math.max(30, Math.min(97, score + 5)),
    reasons: reasons.slice(0, 4),
    tags: Array.from(new Set(tags)),
  };
}

/** 取得某會員對其他所有會員的配對結果（分數由高至低） */
export function matchesFor(
  target: MemberBundle,
  all: MemberBundle[],
  interactions: Interaction[] = []
): MatchResult[] {
  return all
    .filter((b) => b.member.id !== target.member.id)
    .map((b) => computeMatch(target, b, interactions))
    .sort((x, y) => y.score - x.score);
}

export { computePairSignal as pairSignal, SUPPLY_CHAIN };
