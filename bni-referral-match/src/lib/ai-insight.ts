import type { Answer } from "./types";
import type { MemberBundle } from "./match-engine";
import { computeMatch } from "./match-engine";
import { buildSuggestion } from "./suggestions";
import { buildAnalysis } from "./ai-analysis";

/**
 * 全站唯一的 Anthropic 模型設定：
 * 深度合作分析（夥伴商機卡／配對頁）與 AI 深度總結（分析頁）共用同一個模型與呼叫路徑，
 * 不再各自寫死不同模型。可用環境變數 ANTHROPIC_MODEL 覆寫。
 */
export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
}

/**
 * AI 按需深度分析（成本控管設計）：
 * - 平台所有配對、搜尋、篩選、統計一律走本地規則引擎，零 API 成本
 * - 只有使用者主動點擊「AI 深度分析」時才呼叫 Anthropic API
 * - 相同輸入（交流卡未變動）直接回快取，不重複扣費
 */

export interface PairInsight {
  whyMatch: string; // 合作原因分析
  coopPlan: string[]; // 建議合作方式（具體步驟）
  referralAtoB: string; // 我可以介紹給對方的客戶
  referralBtoA: string; // 對方可以介紹給我的客戶
  pitch: string; // 建議如何向對方提案
  icebreaker: string; // 121 開場白
}

interface CacheEntry {
  insight: PairInsight;
  cachedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __brmAiCache: Map<string, CacheEntry> | undefined;
}

function cache(): Map<string, CacheEntry> {
  if (!globalThis.__brmAiCache) globalThis.__brmAiCache = new Map();
  return globalThis.__brmAiCache;
}

export function hasAiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function asText(a: Answer | undefined): string {
  return typeof a === "string" ? a.trim() : "";
}

function asList(a: Answer | undefined): string {
  return Array.isArray(a) ? a.join("、") : "";
}

function memberBrief(b: MemberBundle): string {
  const A = b.card?.answers ?? {};
  const main = b.projects?.find((p) => p.isMain);
  return [
    `姓名：${b.member.name}（${b.member.title}）`,
    `公司：${b.member.company}｜產業：${b.member.industry}｜分會：${b.member.chapter}`,
    `一句話介紹：${asText(A.s6_intro_60) || asText(A.s6_company_line) || "（未填）"}`,
    `理想客戶：${asText(A.s6_ideal_customer) || "（未填）"}`,
    `希望認識：${asText(A.s2_want_to_meet) || "（未填）"}`,
    `可提供資源：${asList(A.s6_resources_give) || "（未填）"}`,
    `需要資源：${asList(A.s6_resources_need) || "（未填）"}`,
    `正在開放的合作或專案：${asText(A.s6_open_projects) || "（未填）"}`,
    main
      ? `主推專案：「${main.name}」（${main.intro}；需要產業：${main.industriesNeeded.join("、")}；希望介紹：${main.idealReferrals}）`
      : "主推專案：（無）",
  ].join("\n");
}

/** 呼叫 Anthropic Messages API（全站唯一入口，統一模型與標頭）；失敗會 throw。 */
export async function callClaude(prompt: string, maxTokens = 1200): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: anthropicModel(),
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.content ?? [])
    .filter((c: { type: string }) => c.type === "text")
    .map((c: { text: string }) => c.text)
    .join("");
}

function parseJson(text: string): PairInsight | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1));
    if (!o.whyMatch) return null;
    return {
      whyMatch: String(o.whyMatch),
      coopPlan: Array.isArray(o.coopPlan) ? o.coopPlan.map(String) : [String(o.coopPlan ?? "")],
      referralAtoB: String(o.referralAtoB ?? ""),
      referralBtoA: String(o.referralBtoA ?? ""),
      pitch: String(o.pitch ?? ""),
      icebreaker: String(o.icebreaker ?? ""),
    };
  } catch {
    return null;
  }
}

/** 兩位會員的 AI 深度合作分析（含快取；交流卡或專案變動即失效） */
export async function getPairInsight(
  a: MemberBundle,
  b: MemberBundle
): Promise<{ insight: PairInsight; cached: boolean; cachedAt: string }> {
  const key = [
    "pair",
    [a.member.id, b.member.id].sort().join("|"),
    a.card?.updatedAt ?? "",
    b.card?.updatedAt ?? "",
    a.projects?.map((p) => p.updatedAt).join(",") ?? "",
    b.projects?.map((p) => p.updatedAt).join(",") ?? "",
  ].join("::");
  const hit = cache().get(key);
  if (hit) return { insight: hit.insight, cached: true, cachedAt: hit.cachedAt };

  const match = computeMatch(a, b);
  const rule = buildSuggestion(a, b);
  const prompt = `你是商務引薦顧問，擅長協助分會會員設計具體可執行的合作方案。以下是兩位會員的商業檔案與本地規則引擎的初步配對結果，請產出深度合作建議。

【會員 A】
${memberBrief(a)}

【會員 B】
${memberBrief(b)}

【規則引擎配對結果】
配對分數：${match.score}/100（成功率 ${match.probability}%）
配對理由：${match.reasons.join("；")}
初步建議合作方式：${rule.coopMethods.join("、")}

請以 A 的視角，只回傳以下 JSON（繁體中文，勿加任何其他文字或 markdown）：
{
  "whyMatch": "80字內，說明這組合作為什麼值得優先推進，點出雙方互補的核心",
  "coopPlan": ["三個具體可執行的合作步驟，每個30字內，依先後順序"],
  "referralAtoB": "40字內，A 應留意哪類客戶可介紹給 B（要具體到情境）",
  "referralBtoA": "40字內，B 應留意哪類客戶可介紹給 A（要具體到情境）",
  "pitch": "60字內，A 向 B 提案時的切入點與價值主張",
  "icebreaker": "40字內，121 見面時自然的開場白，提到對方的專案或需求"
}`;

  const text = await callClaude(prompt);
  const insight = parseJson(text) ?? {
    whyMatch: text.slice(0, 300),
    coopPlan: [],
    referralAtoB: "",
    referralBtoA: "",
    pitch: "",
    icebreaker: "",
  };
  const cachedAt = new Date().toISOString();
  cache().set(key, { insight, cachedAt });
  return { insight, cached: false, cachedAt };
}

/* ------------------------------------------------------------------ *
 * AI 深度總結（分析頁）：整併自舊 /api/analysis 的那段內嵌 prompt。
 * 現在改為「按需呼叫 + 快取」，與全站 AI 成本控管一致，
 * 不再每次開分析頁就扣費。走上面同一條 callClaude 路徑與同一個模型。
 * ------------------------------------------------------------------ */

interface NarrativeCacheEntry {
  narrative: string;
  cachedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __brmNarrativeCache: Map<string, NarrativeCacheEntry> | undefined;
}

function narrativeCache(): Map<string, NarrativeCacheEntry> {
  if (!globalThis.__brmNarrativeCache) globalThis.__brmNarrativeCache = new Map();
  return globalThis.__brmNarrativeCache;
}

/**
 * 針對某位會員，產生「本月最應優先推進的一個合作機會與具體第一步」的深度總結。
 * 以本地規則引擎的最佳配對為基礎，交由 Claude 產生 150 字內敘事；含快取。
 * 快取鍵包含目標與全體會員的更新時間，任一方更新即失效。
 */
export async function getMemberNarrative(
  target: MemberBundle,
  all: MemberBundle[]
): Promise<{ narrative: string; cached: boolean; cachedAt: string }> {
  // 快取鍵：目標卡＋專案＋全體會員內容更新時間（有人更新即重算）
  const signature = all
    .map((b) => `${b.member.id}:${b.card?.updatedAt ?? ""}`)
    .sort()
    .join(",");
  const key = ["narrative", target.member.id, signature].join("::");
  const hit = narrativeCache().get(key);
  if (hit) return { narrative: hit.narrative, cached: true, cachedAt: hit.cachedAt };

  // 先用本地規則引擎算出七大面向，取最佳合作對象作為 prompt 的立足點
  const analysis = buildAnalysis(target, all);
  const summary = all
    .map((b) => {
      const a = b.card?.answers ?? {};
      return `${b.member.name}（${b.member.company}／${b.member.industry}）：${asText(a.s6_intro_60)} 理想客戶：${asText(a.s6_ideal_customer)} 可提供：${asList(a.s6_resources_give)} 需要：${asList(a.s6_resources_need)}`;
    })
    .join("\n");

  const prompt = `你是商務引薦商機分析顧問。以下是分會成員的交流卡摘要：
${summary}

本地規則引擎判斷「${target.member.name}」目前最具潛力的合作對象與理由：${analysis.narrative}

請針對「${target.member.name}」，用 150 字以內的繁體中文，說明他本月最應該優先推進的一個合作機會與具體第一步。只回純文字，不要 markdown。`;

  const text = (await callClaude(prompt, 600)).trim();
  // 呼叫成功但內容為空時，退回規則引擎敘事，避免顯示空白
  const narrative = text || analysis.narrative;
  const cachedAt = new Date().toISOString();
  narrativeCache().set(key, { narrative, cachedAt });
  return { narrative, cached: false, cachedAt };
}
