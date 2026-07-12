import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DEMO_CARDS, DEMO_INTERACTIONS, DEMO_MEMBERS, DEMO_PROJECTS } from "./demo-data";
import { matchesFor, type MemberBundle } from "./match-engine";
import type {
  BizAlert,
  CardStatus,
  CardVersion,
  ExchangeCard,
  Interaction,
  Member,
  Opportunity,
  OpportunityStatus,
  Project,
  Reminder,
} from "./types";

/**
 * 資料存取層。
 * - 設定 Supabase 環境變數時 → 走 Supabase（Postgres）
 * - 未設定時 → 走內建示範資料（記憶體儲存，可完整預覽所有功能）
 *
 * 「動態商業檔案」：交流卡以多版本（CardVersion）保存，
 * 使用中（active）版本即對外的最新需求，AI 分析與媒合預設採用它；
 * 歷史版本完整保留，可隨時查看需求變化。
 */

interface Account {
  email: string;
  memberId: string;
  passwordHash: string;
  salt: string;
}

interface Store {
  members: Member[];
  interactions: Interaction[];
  versions: CardVersion[];
  projects: Project[];
  alerts: BizAlert[];
  accounts: Account[];
  opportunities: Opportunity[];
}

declare global {
  // eslint-disable-next-line no-var
  var __brmStore: Store | undefined;
}

function nameOf(members: Member[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? id;
}

/** 由示範交流卡衍生版本資料：每人 v1（使用中），m1 另有三版歷程示範 */
function seedVersions(members: Member[]): CardVersion[] {
  const versions: CardVersion[] = [];
  for (const c of DEMO_CARDS) {
    const who = nameOf(members, c.memberId);
    // m9 示範「超過 90 天未更新」的智慧提醒
    const updatedAt = c.memberId === "m9" ? "2026-02-20T08:00:00Z" : c.updatedAt;
    versions.push({
      id: `v-${c.memberId}-1`,
      memberId: c.memberId,
      version: c.memberId === "m1" ? 3 : 1,
      title: c.memberId === "m1" ? "主推復健整廠設備方案" : "初版商業檔案",
      answers: structuredClone(c.answers),
      status: "active",
      createdAt: updatedAt,
      updatedAt,
      createdBy: who,
      updatedBy: who,
    });
  }
  // m1 的版本歷程示範（已完成的舊版本）
  const m1 = DEMO_CARDS.find((c) => c.memberId === "m1")!;
  const m1Name = nameOf(members, "m1");
  versions.unshift(
    {
      id: "v-m1-hist-1",
      memberId: "m1",
      version: 1,
      title: "開始推廣植牙設備方案",
      answers: {
        ...structuredClone(m1.answers),
        s2_dream_case: "牙科診所的植牙設備與耗材整合採購案。",
        s4_target_industries: ["醫療健康", "保險理財"],
      },
      status: "completed",
      createdAt: "2026-01-15T08:00:00Z",
      updatedAt: "2026-03-01T08:00:00Z",
      createdBy: m1Name,
      updatedBy: m1Name,
    },
    {
      id: "v-m1-hist-2",
      memberId: "m1",
      version: 2,
      title: "新增數位微笑設計設備線",
      answers: {
        ...structuredClone(m1.answers),
        s2_dream_case: "導入數位微笑設計（DSD）流程的牙科與醫美診所。",
      },
      status: "completed",
      createdAt: "2026-03-01T08:00:00Z",
      updatedAt: "2026-05-10T08:00:00Z",
      createdBy: m1Name,
      updatedBy: m1Name,
    }
  );
  return versions;
}

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

/** 示範會員帳號的預設密碼 */
const DEMO_PASSWORD = "demo1234";

function seedOpportunities(): Opportunity[] {
  const mk = (
    id: string,
    memberId: string,
    title: string,
    content: string,
    type: string,
    status: OpportunityStatus,
    createdAt: string
  ): Opportunity => ({ id, memberId, title, content, type, status, createdAt, updatedAt: createdAt });
  return [
    mk("op1", "m1", "復健診所整廠設備合作", "尋找室內設計與財稅夥伴，一起服務新開業復健診所；提供設備展示中心作為共同提案場地。", "轉介客戶", "open", "2026-07-01T08:00:00Z"),
    mk("op2", "m3", "醫療空間聯合提案", "醫療空間全案設計，徵醫療設備、建築營造夥伴聯合投標診所新建案。", "資源共享", "open", "2026-07-05T08:00:00Z"),
    mk("op3", "m9", "中秋聯名禮盒", "徵異業品牌聯名中秋禮盒（印刷包裝、行銷通路尤佳），共享彼此客戶名單。", "異業活動", "open", "2026-06-25T08:00:00Z"),
    mk("op4", "m5", "創業設立免費健檢", "提供商務夥伴的客戶免費公司設立與稅務健檢諮詢 30 分鐘，歡迎轉介。", "專業諮詢", "open", "2026-07-08T08:00:00Z"),
    mk("op5", "m7", "官網行銷健檢優惠", "上半年活動已結束：官網與社群行銷健檢五折優惠。", "優惠方案", "closed", "2026-05-01T08:00:00Z"),
  ];
}

function demoStore(): Store {
  if (!globalThis.__brmStore) {
    const members = structuredClone(DEMO_MEMBERS);
    for (const m of members) m.onboarded = true; // 示範會員已有完整交流卡
    globalThis.__brmStore = {
      members,
      interactions: structuredClone(DEMO_INTERACTIONS),
      versions: seedVersions(members),
      projects: structuredClone(DEMO_PROJECTS),
      alerts: [],
      accounts: members.map((m) => {
        const salt = randomBytes(8).toString("hex");
        return { email: m.email.toLowerCase(), memberId: m.id, salt, passwordHash: hashPassword(DEMO_PASSWORD, salt) };
      }),
      opportunities: seedOpportunities(),
    };
  }
  return globalThis.__brmStore;
}

export function hasSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function supabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function getMembers(): Promise<Member[]> {
  if (hasSupabase()) {
    const sb = await supabaseAdmin();
    const { data, error } = await sb.from("members").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map(rowToMember);
  }
  return demoStore().members;
}

export async function getMember(id: string): Promise<Member | undefined> {
  const members = await getMembers();
  return members.find((m) => m.id === id);
}

export async function getCards(): Promise<ExchangeCard[]> {
  if (hasSupabase()) {
    const sb = await supabaseAdmin();
    const { data, error } = await sb.from("exchange_cards").select("*");
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      memberId: r.member_id,
      answers: r.answers ?? {},
      updatedAt: r.updated_at,
    }));
  }
  // AI 分析／媒合以「使用中」版本為準；若無使用中版本，退回最新修改的非封存交流卡
  const store = demoStore();
  const byMember = new Map<string, (typeof store.versions)[number]>();
  for (const v of store.versions) {
    if (v.status === "archived") continue;
    const cur = byMember.get(v.memberId);
    const better =
      !cur ||
      (v.status === "active" && cur.status !== "active") ||
      (v.status === cur.status && v.updatedAt > cur.updatedAt) ||
      (cur.status !== "active" && v.updatedAt > cur.updatedAt);
    if (better) byMember.set(v.memberId, v);
  }
  return Array.from(byMember.values()).map((v) => ({
    memberId: v.memberId,
    answers: v.answers,
    updatedAt: v.updatedAt,
  }));
}

export async function getCard(memberId: string): Promise<ExchangeCard | undefined> {
  const cards = await getCards();
  return cards.find((c) => c.memberId === memberId);
}

export async function saveCard(
  memberId: string,
  answers: ExchangeCard["answers"],
  versionId?: string
): Promise<ExchangeCard> {
  const card: ExchangeCard = { memberId, answers, updatedAt: new Date().toISOString() };
  if (hasSupabase()) {
    const sb = await supabaseAdmin();
    const { error } = await sb.from("exchange_cards").upsert({
      member_id: memberId,
      answers,
      updated_at: card.updatedAt,
    });
    if (error) throw error;
    return card;
  }
  const store = demoStore();
  const who = nameOf(store.members, memberId);
  let target = versionId
    ? store.versions.find((v) => v.id === versionId && v.memberId === memberId)
    : store.versions.find((v) => v.memberId === memberId && v.status === "active");
  if (!target) {
    target = {
      id: `v-${memberId}-${Date.now()}`,
      memberId,
      version: nextVersionNumber(store, memberId),
      title: "初版商業檔案",
      answers: {},
      status: "active",
      createdAt: card.updatedAt,
      updatedAt: card.updatedAt,
      createdBy: who,
      updatedBy: who,
    };
    store.versions.push(target);
  }
  target.answers = answers;
  target.updatedAt = card.updatedAt;
  target.updatedBy = who;
  // 交流卡更新 → AI 立即重新計算媒合
  await recomputeAlerts(memberId, `${who}更新了交流卡`);
  return { memberId, answers, updatedAt: target.updatedAt };
}

/* ═══════════ 交流卡生命週期（Business Profile Timeline） ═══════════ */

function nextVersionNumber(store: Store, memberId: string): number {
  return Math.max(0, ...store.versions.filter((v) => v.memberId === memberId).map((v) => v.version)) + 1;
}

/** 取得會員的所有交流卡版本（新→舊） */
export async function getCardVersions(memberId: string): Promise<CardVersion[]> {
  return demoStore()
    .versions.filter((v) => v.memberId === memberId)
    .sort((a, b) => b.version - a.version);
}

export async function getCardVersion(id: string): Promise<CardVersion | undefined> {
  return demoStore().versions.find((v) => v.id === id);
}

/** 建立新交流卡（可從既有版本複製快速修改） */
export async function createCardVersion(
  memberId: string,
  opts: { title?: string; fromVersionId?: string } = {}
): Promise<CardVersion> {
  const store = demoStore();
  const who = nameOf(store.members, memberId);
  const from = opts.fromVersionId
    ? store.versions.find((v) => v.id === opts.fromVersionId)
    : undefined;
  const now = new Date().toISOString();
  const v: CardVersion = {
    id: `v-${memberId}-${Date.now()}`,
    memberId,
    version: nextVersionNumber(store, memberId),
    title: opts.title?.trim() || (from ? `複製自版本 ${from.version}` : "新交流卡"),
    answers: from ? structuredClone(from.answers) : {},
    status: "draft",
    createdAt: now,
    updatedAt: now,
    createdBy: who,
    updatedBy: who,
  };
  store.versions.push(v);
  return v;
}

/** 更新版本標題或狀態；設為使用中時，原使用中版本自動改為已完成 */
export async function updateCardVersion(
  id: string,
  patch: { title?: string; status?: CardStatus }
): Promise<CardVersion | undefined> {
  const store = demoStore();
  const v = store.versions.find((x) => x.id === id);
  if (!v) return undefined;
  const who = nameOf(store.members, v.memberId);
  if (patch.status === "active") {
    for (const other of store.versions) {
      if (other.memberId === v.memberId && other.status === "active" && other.id !== id) {
        other.status = "completed";
      }
    }
  }
  if (patch.title !== undefined) v.title = patch.title.trim() || v.title;
  if (patch.status !== undefined) v.status = patch.status;
  v.updatedAt = new Date().toISOString();
  v.updatedBy = who;
  if (patch.status === "active") {
    await recomputeAlerts(v.memberId, `${who}啟用了新的交流卡「${v.title}」`);
  }
  return v;
}

export async function deleteCardVersion(id: string): Promise<boolean> {
  const store = demoStore();
  const idx = store.versions.findIndex((v) => v.id === id);
  if (idx < 0) return false;
  store.versions.splice(idx, 1);
  return true;
}

/* ═══════════ 專案管理（Projects） ═══════════ */

export async function getProjects(memberId?: string): Promise<Project[]> {
  const all = demoStore().projects;
  const list = memberId ? all.filter((p) => p.memberId === memberId) : all;
  return [...list].sort(
    (a, b) => Number(b.isMain) - Number(a.isMain) || b.importance - a.importance
  );
}

/** 新增或更新專案；設為主推時自動取消其他專案的主推 */
export async function saveProject(
  input: Omit<Project, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<Project> {
  const store = demoStore();
  const now = new Date().toISOString();
  if (input.isMain) {
    for (const p of store.projects) {
      if (p.memberId === input.memberId) p.isMain = false;
    }
  }
  let project: Project;
  const existing = input.id ? store.projects.find((p) => p.id === input.id) : undefined;
  if (existing) {
    project = Object.assign(existing, input, { updatedAt: now });
  } else {
    project = { ...input, id: `p-${Date.now()}`, createdAt: now, updatedAt: now };
    store.projects.push(project);
  }
  const who = nameOf(store.members, input.memberId);
  // 新增／更新專案 → AI 立即重新計算媒合
  await recomputeAlerts(input.memberId, `${who}${existing ? "更新" : "新增"}了專案「${project.name}」`);
  return project;
}

export async function deleteProject(id: string): Promise<boolean> {
  const store = demoStore();
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  store.projects.splice(idx, 1);
  return true;
}

/* ═══════════ 智慧提醒與 AI 商機快訊 ═══════════ */

const DAY = 24 * 60 * 60 * 1000;

/** 智慧提醒：交流卡逾 90 天未更新、主推專案已逾結束日期 */
export async function getReminders(memberId: string): Promise<Reminder[]> {
  const store = demoStore();
  const reminders: Reminder[] = [];
  const active = store.versions.find((v) => v.memberId === memberId && v.status === "active");
  if (active && Date.now() - new Date(active.updatedAt).getTime() > 90 * DAY) {
    reminders.push({
      id: `r-stale-${memberId}`,
      kind: "card_stale",
      message: "您的商機資料可能已過期，建議更新最新需求，以提高AI媒合精準度。",
      actionLabel: "前往更新交流卡",
      actionHref: "/card",
    });
  }
  for (const p of store.projects) {
    if (p.memberId !== memberId || !p.isMain || !p.endDate) continue;
    if (new Date(p.endDate).getTime() < Date.now()) {
      reminders.push({
        id: `r-proj-${p.id}`,
        kind: "project_expired",
        message: `主推專案「${p.name}」已超過結束日期（${p.endDate}）。是否建立新的專案？`,
        actionLabel: "建立新的專案",
        actionHref: "/projects",
      });
    }
  }
  return reminders;
}

/** 取得與我有關的商機快訊（新→舊） */
export async function getAlerts(memberId: string): Promise<BizAlert[]> {
  return demoStore()
    .alerts.filter((a) => a.memberIds.includes(memberId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * AI 商機快訊：資料異動時立即重新計算媒合，
 * 成功率 ≥ 85% 即通知配對雙方（同一組合 7 天內不重複通知）。
 */
export async function recomputeAlerts(changedMemberId: string, trigger: string): Promise<BizAlert[]> {
  const store = demoStore();
  const cards = await getCards();
  const cardMap = new Map(cards.map((c) => [c.memberId, c]));
  const bundles: MemberBundle[] = store.members.map((m) => ({
    member: m,
    card: cardMap.get(m.id),
    projects: store.projects.filter((p) => p.memberId === m.id),
  }));
  const target = bundles.find((b) => b.member.id === changedMemberId);
  if (!target) return [];

  const created: BizAlert[] = [];
  for (const r of matchesFor(target, bundles, store.interactions)) {
    if (r.probability < 85) continue;
    const pairKey = [r.memberId, r.targetId].sort().join("|");
    const recent = store.alerts.find(
      (a) =>
        [a.pair.aId, a.pair.bId].sort().join("|") === pairKey &&
        Date.now() - new Date(a.createdAt).getTime() < 7 * DAY
    );
    if (recent) continue;
    const other = bundles.find((b) => b.member.id === r.targetId)!;
    const alert: BizAlert = {
      id: `al-${Date.now()}-${r.targetId}`,
      memberIds: [r.memberId, r.targetId],
      pair: {
        aId: target.member.id,
        aName: target.member.name,
        aIndustry: target.member.industry,
        bId: other.member.id,
        bName: other.member.name,
        bIndustry: other.member.industry,
      },
      probability: r.probability,
      reasons: r.reasons,
      trigger,
      createdAt: new Date().toISOString(),
    };
    store.alerts.unshift(alert);
    created.push(alert);
  }
  store.alerts.length = Math.min(store.alerts.length, 100);
  return created;
}

export async function updateMember(member: Member): Promise<Member> {
  if (hasSupabase()) {
    const sb = await supabaseAdmin();
    const { error } = await sb.from("members").upsert({
      id: member.id,
      name: member.name,
      company: member.company,
      industry: member.industry,
      chapter: member.chapter,
      title: member.title,
      phone: member.phone,
      line: member.line,
      email: member.email,
      website: member.website ?? null,
      facebook: member.facebook ?? null,
      instagram: member.instagram ?? null,
      linkedin: member.linkedin ?? null,
      role: member.role,
      color: member.color,
      media: member.media,
    });
    if (error) throw error;
    return member;
  }
  const store = demoStore();
  const idx = store.members.findIndex((m) => m.id === member.id);
  if (idx >= 0) store.members[idx] = member;
  return member;
}

export async function getInteractions(): Promise<Interaction[]> {
  if (hasSupabase()) {
    const sb = await supabaseAdmin();
    const { data, error } = await sb.from("interactions").select("*").order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      type: r.type,
      fromId: r.from_id,
      toId: r.to_id,
      date: r.date,
      note: r.note ?? undefined,
      amount: r.amount ?? undefined,
      closed: r.closed ?? undefined,
    }));
  }
  return demoStore().interactions;
}

function rowToMember(r: any): Member {
  return {
    id: r.id,
    name: r.name,
    company: r.company ?? "",
    industry: r.industry ?? "",
    chapter: r.chapter ?? "",
    title: r.title ?? "",
    phone: r.phone ?? "",
    line: r.line ?? "",
    email: r.email ?? "",
    website: r.website ?? undefined,
    facebook: r.facebook ?? undefined,
    instagram: r.instagram ?? undefined,
    linkedin: r.linkedin ?? undefined,
    role: r.role ?? "member",
    color: r.color ?? "#c8102e",
    media: r.media ?? {},
  };
}

/* ═══════════ Email 帳號登入／註冊 ═══════════ */

const PALETTE_COLORS = ["#c8102e", "#2a78d6", "#eda100", "#1baf7a", "#4a3aa7", "#eb6834", "#e87ba4", "#008300"];

export async function verifyLogin(email: string, password: string): Promise<Member | null> {
  const store = demoStore();
  const acc = store.accounts.find((a) => a.email === email.trim().toLowerCase());
  if (!acc) return null;
  if (hashPassword(password, acc.salt) !== acc.passwordHash) return null;
  return store.members.find((m) => m.id === acc.memberId) ?? null;
}

export interface RegisterInput {
  name: string;
  chapter: string;
  email: string;
  phone: string;
  industry: string;
  password: string;
  company?: string;
  line?: string;
}

export async function registerMember(input: RegisterInput): Promise<{ member?: Member; error?: string }> {
  const store = demoStore();
  const email = input.email.trim().toLowerCase();
  if (store.accounts.some((a) => a.email === email)) {
    return { error: "這個 Email 已經註冊過了，請直接登入" };
  }
  const member: Member = {
    id: randomUUID(),
    name: input.name.trim(),
    company: input.company?.trim() ?? "",
    industry: input.industry.trim(),
    chapter: input.chapter.trim(),
    title: "",
    phone: input.phone.trim(),
    line: input.line?.trim() ?? "",
    email,
    role: "member",
    color: PALETTE_COLORS[store.members.length % PALETTE_COLORS.length],
    media: {},
    onboarded: false,
  };
  store.members.push(member);
  const salt = randomBytes(8).toString("hex");
  store.accounts.push({ email, memberId: member.id, salt, passwordHash: hashPassword(input.password, salt) });
  return { member };
}

/** 完成首次登入引導：寫入 AI 商機資料並標記完成 */
export async function completeOnboarding(
  memberId: string,
  answers: Record<string, ExchangeCard["answers"][string]>
): Promise<Member | null> {
  const store = demoStore();
  const member = store.members.find((m) => m.id === memberId);
  if (!member) return null;
  const existing = await getCard(memberId);
  await saveCard(memberId, { ...(existing?.answers ?? {}), ...answers });
  member.onboarded = true;
  return member;
}

/* ═══════════ 商機廣場（Opportunity Plaza） ═══════════ */

export async function getOpportunities(): Promise<(Opportunity & { member: Member })[]> {
  const store = demoStore();
  return store.opportunities
    .map((o) => ({ ...o, member: store.members.find((m) => m.id === o.memberId)! }))
    .filter((o) => o.member)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveOpportunity(
  input: Omit<Opportunity, "id" | "createdAt" | "updatedAt" | "status"> & {
    id?: string;
    status?: OpportunityStatus;
  }
): Promise<Opportunity> {
  const store = demoStore();
  const now = new Date().toISOString();
  const existing = input.id ? store.opportunities.find((o) => o.id === input.id) : undefined;
  let opp: Opportunity;
  if (existing) {
    opp = Object.assign(existing, {
      title: input.title,
      content: input.content,
      type: input.type,
      ...(input.status ? { status: input.status } : {}),
      updatedAt: now,
    });
  } else {
    opp = {
      id: `op-${Date.now()}`,
      memberId: input.memberId,
      title: input.title,
      content: input.content,
      type: input.type,
      status: input.status ?? "open",
      createdAt: now,
      updatedAt: now,
    };
    store.opportunities.push(opp);
    const who = nameOf(store.members, input.memberId);
    // 新增商機 → AI 立即重新計算媒合
    await recomputeAlerts(input.memberId, `${who}在商機廣場發布了「${opp.title}」`);
  }
  return opp;
}

export async function setOpportunityStatus(id: string, status: OpportunityStatus): Promise<Opportunity | undefined> {
  const store = demoStore();
  const o = store.opportunities.find((x) => x.id === id);
  if (!o) return undefined;
  o.status = status;
  o.updatedAt = new Date().toISOString();
  return o;
}

export async function deleteOpportunity(id: string): Promise<boolean> {
  const store = demoStore();
  const idx = store.opportunities.findIndex((o) => o.id === id);
  if (idx < 0) return false;
  store.opportunities.splice(idx, 1);
  return true;
}

/** 我要合作：通知商機發布者 */
export async function expressInterest(oppId: string, fromMemberId: string): Promise<boolean> {
  const store = demoStore();
  const opp = store.opportunities.find((o) => o.id === oppId);
  const from = store.members.find((m) => m.id === fromMemberId);
  const owner = opp && store.members.find((m) => m.id === opp.memberId);
  if (!opp || !from || !owner || from.id === owner.id) return false;
  store.alerts.unshift({
    id: `al-${Date.now()}-${fromMemberId}`,
    memberIds: [owner.id, from.id],
    pair: {
      aId: from.id,
      aName: from.name,
      aIndustry: from.industry,
      bId: owner.id,
      bName: owner.name,
      bIndustry: owner.industry,
    },
    probability: 0,
    reasons: [`${from.name}對你的合作「${opp.title}」表達了合作意願`, `聯絡方式：${from.phone}${from.line ? `｜LINE：${from.line}` : ""}`],
    trigger: `商機廣場：${from.name}點擊了「我要合作」`,
    createdAt: new Date().toISOString(),
  });
  return true;
}
