import type { Answer } from "./types";
import type { MemberBundle } from "./match-engine";

/** AI 商機建議：合作方式、互相介紹的客戶、提案切入點 */
export interface CoopSuggestion {
  coopMethods: string[]; // 建議合作方式
  introAtoB: string; // 我可以介紹給對方的客戶
  introBtoA: string; // 對方可以介紹給我的客戶
  pitch: string; // 建議如何向對方提案
}

function asArray(a: Answer | undefined): string[] {
  if (Array.isArray(a)) return a;
  if (typeof a === "string" && a) return [a];
  return [];
}

function asText(a: Answer | undefined): string {
  return typeof a === "string" ? a.trim() : "";
}

export function buildSuggestion(a: MemberBundle, b: MemberBundle): CoopSuggestion {
  const A = a.card?.answers ?? {};
  const B = b.card?.answers ?? {};

  // 建議合作方式：雙方都勾選的優先，其次取雙方聯集前兩項
  const mA = asArray(A.s4_coop_methods);
  const mB = asArray(B.s4_coop_methods);
  const common = mA.filter((x) => mB.includes(x));
  const coopMethods = (common.length ? common : Array.from(new Set([...mA, ...mB]))).slice(0, 3);
  if (coopMethods.length === 0) coopMethods.push("互相引薦客戶");

  // 可以互相介紹哪些客戶：以對方的理想客戶描述為準
  const idealB = asText(B.s6_ideal_customer) || `${b.member.industry}相關需求的客戶`;
  const idealA = asText(A.s6_ideal_customer) || `${a.member.industry}相關需求的客戶`;
  const introAtoB = `留意你客戶中「${idealB}」的對象，直接引薦給${b.member.name}`;
  const introBtoA = `請${b.member.name}留意「${idealA}」的對象，回頭引薦給你`;

  // 建議如何向對方提案
  const opener = asText(A.s6_intro_60) || asText(A.s6_company_line);
  const needB = asArray(B.s6_resources_need)[0];
  const openProjB = asText(B.s6_open_projects);
  const mainB = b.projects?.find((p) => p.isMain);
  const hook = mainB
    ? `對方目前主推「${mainB.name}」，從你能如何補位這個專案切入`
    : openProjB
      ? `對方正開放的合作：「${openProjB.slice(0, 40)}…」，從這裡切入`
      : needB
        ? `對方目前需要「${needB}」，先展示你能怎麼補上這塊`
        : `聚焦「${coopMethods[0]}」的具體第一步`;
  const pitch = `${opener ? `以一句話開場：「${opener}」，` : ""}${hook}；121 時帶一個 30 天內可以互相引薦的具體行動作結。`;

  return { coopMethods, introAtoB, introBtoA, pitch };
}
