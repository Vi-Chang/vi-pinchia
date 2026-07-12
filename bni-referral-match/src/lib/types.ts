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
}

/** 交流卡答案：字串（radio/dropdown/textarea）、字串陣列（checkbox）、
 *  比例物件（checkbox-percent，如 { BNI: 30, 舊客戶: 40 }）或數字（scale） */
export type Answer = string | string[] | Record<string, number> | number | null;

export interface ExchangeCard {
  memberId: string;
  answers: Record<string, Answer>;
  updatedAt: string;
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
