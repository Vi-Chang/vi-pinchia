export type MediaKind =
  | "logo"
  | "avatar"
  | "company"
  | "portfolio"
  | "video"
  | "businessCard";

export interface Member {
  id: string;
  name: string;
  company: string;
  industry: string;
  chapter: string;
  title: string;
  phone: string;
  line: string;
  email: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  role: "member" | "admin";
  color: string;
  media: Partial<Record<MediaKind, string[]>>;
  /** 是否已完成首次登入的 AI 商機資料引導 */
  onboarded?: boolean;
  /** 範例人物：名字旁標註（範例），真實填卡人數超過 5 人時自動移除 */
  isDemo?: boolean;
}

/** 商機廣場：會員發布的開放合作 */
export type OpportunityStatus = "open" | "closed";

export interface Opportunity {
  id: string;
  memberId: string;
  title: string; // 合作標題
  content: string; // 合作內容
  type: string; // 合作類型 Tag（轉介客戶/資源共享/異業活動/專業諮詢/優惠方案/其他）
  status: OpportunityStatus;
  createdAt: string; // 發布日期
  updatedAt: string;
  /** 內建示範資料：卡片標註「範本」，任何會員皆可刪除 */
  isTemplate?: boolean;
}

/** 交流卡答案：字串（radio/dropdown/textarea）、字串陣列（checkbox）、
 *  比例物件（checkbox-percent，如 { 商會引薦: 30, 舊客戶: 40 }）或數字（scale） */
export type Answer = string | string[] | Record<string, number> | number | null;

export interface ExchangeCard {
  memberId: string;
  answers: Record<string, Answer>;
  updatedAt: string;
}

/** 交流卡狀態：草稿 / 使用中 / 已完成 / 已封存 */
export type CardStatus = "draft" | "active" | "completed" | "archived";

/** 動態商業檔案：一位會員可擁有多份交流卡版本，完整保留歷史 */
export interface CardVersion {
  id: string;
  memberId: string;
  version: number; // 版本號（同一會員遞增）
  title: string; // 版本摘要，如「開始推廣植牙」
  answers: Record<string, Answer>;
  status: CardStatus;
  createdAt: string; // 建立日期
  updatedAt: string; // 最後修改日期
  createdBy: string; // 建立者
  updatedBy: string; // 修改者
}

/** 專案（Projects）：每位會員可建立多個專案 */
export interface Project {
  id: string;
  memberId: string;
  name: string; // 專案名稱
  intro: string; // 專案介紹
  idealReferrals: string; // 希望介紹的客戶
  industriesNeeded: string[]; // 需要哪些產業合作
  resourcesOffered: string; // 可提供哪些資源
  expectedClose: string; // 預計成交期間
  startDate: string; // 開始日期
  endDate: string; // 結束日期
  isMain: boolean; // 是否目前主推
  importance: number; // 重要程度 1–5 星
  createdAt: string;
  updatedAt: string;
}

/** 智慧提醒 */
export interface Reminder {
  id: string;
  kind: "card_stale" | "project_expired";
  message: string;
  actionLabel: string;
  actionHref: string;
}

/** AI 商機快訊：媒合成功率 ≥ 85% 時通知雙方 */
export interface BizAlert {
  id: string;
  memberIds: [string, string]; // 通知雙方
  pair: { aId: string; aName: string; aIndustry: string; bId: string; bName: string; bIndustry: string };
  probability: number;
  reasons: string[];
  trigger: string; // 觸發原因，如「王小明更新了交流卡」
  createdAt: string;
}

export type InteractionType = "121" | "referral" | "cooperation" | "shared_client";

export interface Interaction {
  id: string;
  type: InteractionType;
  fromId: string;
  toId: string;
  date: string; // ISO
  note?: string;
  amount?: number; // 轉介金額（referral）
  closed?: boolean; // 轉介是否成交
}

export interface MatchResult {
  memberId: string;
  targetId: string;
  score: number; // 0-100
  stars: number; // 1-5
  probability: number; // 配對成功率 %
  reasons: string[];
  tags: string[];
}

export interface AnalysisEntry {
  member: Member;
  reason: string;
  score: number;
}

export interface AiAnalysis {
  introduceTo: AnalysisEntry[]; // 適合介紹給誰
  receiveFrom: AnalysisEntry[]; // 誰適合介紹給他
  partners: AnalysisEntry[]; // 可合作
  overlapping: AnalysisEntry[]; // 客戶高度重疊
  supplyChain: AnalysisEntry[]; // 上下游
  coEvent: AnalysisEntry[]; // 可共同辦活動
  crossSell: AnalysisEntry[]; // 可交叉銷售
  narrative: string;
}
