import { ALL_QUESTIONS, INDUSTRIES } from "./questions";
import type { ExchangeCard, Interaction, Member } from "./types";

export function monthOf(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}

export function countThisMonth(
  interactions: Interaction[],
  memberId: string,
  type: Interaction["type"],
  month: string
): number {
  return interactions.filter(
    (i) =>
      i.type === type &&
      monthOf(i.date) === month &&
      (i.fromId === memberId || i.toId === memberId)
  ).length;
}

/** 交流卡完成率（已回答題數 / 總題數） */
export function cardProgress(card?: ExchangeCard): number {
  if (!card) return 0;
  const answered = ALL_QUESTIONS.filter((q) => {
    const a = card.answers[q.id];
    if (a == null) return false;
    if (typeof a === "string") return a.trim().length > 0;
    if (Array.isArray(a)) return a.length > 0;
    if (typeof a === "object") return Object.keys(a).length > 0;
    return true;
  }).length;
  return Math.round((answered / ALL_QUESTIONS.length) * 100);
}

export interface RankRow {
  member: Member;
  value: number;
}

export function rankBy(
  members: Member[],
  interactions: Interaction[],
  fn: (m: Member) => number
): RankRow[] {
  return members
    .map((m) => ({ member: m, value: fn(m) }))
    .sort((a, b) => b.value - a.value);
}

export function referralRanking(members: Member[], interactions: Interaction[]): RankRow[] {
  return rankBy(members, interactions, (m) =>
    interactions.filter((i) => i.type === "referral" && i.fromId === m.id).length
  );
}

export function oneToOneRanking(members: Member[], interactions: Interaction[]): RankRow[] {
  return rankBy(members, interactions, (m) =>
    interactions.filter((i) => i.type === "121" && (i.fromId === m.id || i.toId === m.id)).length
  );
}

export function industryDistribution(members: Member[]): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const m of members) map.set(m.industry, (map.get(m.industry) ?? 0) + 1);
  return Array.from(map, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function missingIndustries(members: Member[]): string[] {
  const present = new Set(members.map((m) => m.industry));
  return INDUSTRIES.filter((i) => !present.has(i));
}

/** 統計 checkbox 題目各選項被勾選次數（如可提供／需要資源） */
export function optionCounts(cards: ExchangeCard[], questionId: string): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const c of cards) {
    const a = c.answers[questionId];
    if (Array.isArray(a)) for (const opt of a) map.set(opt, (map.get(opt) ?? 0) + 1);
  }
  return Array.from(map, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** 熱力圖：會員 × 週（近 8 週）121 + 轉介活躍度 */
export function activityHeatmap(members: Member[], interactions: Interaction[]) {
  const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
  const base = new Date("2026-05-18").getTime(); // 近 8 週起點
  const cells = members.map((m) => {
    const row = new Array(8).fill(0);
    for (const i of interactions) {
      if (i.fromId !== m.id && i.toId !== m.id) continue;
      const idx = Math.floor((new Date(i.date).getTime() - base) / (7 * 86400000));
      if (idx >= 0 && idx < 8) row[idx] += 1;
    }
    return { member: m, values: row };
  });
  return { weeks, cells };
}

/** 雷達圖：分會健康度五指標（0–100） */
export function chapterRadar(members: Member[], cards: ExchangeCard[], interactions: Interaction[]) {
  const month = "2026-07";
  const n = Math.max(1, members.length);
  const m121 = interactions.filter((i) => i.type === "121" && monthOf(i.date) === month).length;
  const refs = interactions.filter((i) => i.type === "referral" && monthOf(i.date) === month);
  const closed = refs.filter((r) => r.closed).length;
  const coop = interactions.filter((i) => i.type === "cooperation").length;
  const avgProgress = cards.reduce((s, c) => s + cardProgress(c), 0) / n;
  return [
    { label: "121 活躍", value: Math.min(100, Math.round((m121 / n) * 100)) },
    { label: "引薦動能", value: Math.min(100, Math.round((refs.length / n) * 120)) },
    { label: "成交轉化", value: refs.length ? Math.round((closed / refs.length) * 100) : 0 },
    { label: "合作深度", value: Math.min(100, Math.round((coop / n) * 200)) },
    { label: "資料完整", value: Math.round(avgProgress) },
  ];
}
