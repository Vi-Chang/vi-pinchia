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
 * 資料存取層（規則引擎 + 永久儲存）。
 *
 * - 未設定 Supabase → 純記憶體示範模式（重啟即重置）
 * - 設定 Supabase（NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY）→
 *   啟動時把整個資料集載入記憶體（首次自動植入示範資料），
 *   所有讀取走記憶體（規則引擎零延遲），所有變更即時寫回 Supabase（永久保存）。
 *
 * 「動態商業檔案」：交流卡以多版本（CardVersion）保存，
 * 使用中（active）版本即對外的最新需求，AI 分析與媒合預設採用它。
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
  var __brmStorePromise: Promise<Store> | undefined;
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
    {
      auth: { persistSession: false },
      global: {
        // 繞過 Next.js 的 fetch 資料快取，確保每次都讀到資料庫即時狀態
        fetch: (url, opts) => fetch(url, { ...opts, cache: "no-store" }),
      },
    }
  );
}

function nameOf(members: Member[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? id;
}

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

/* ═══════════ 示範資料種子 ═══════════ */

/** 示範會員帳號的預設密碼 */
const DEMO_PASSWORD = "demo1234";

/** 平台管理員（張婕） */
const ADMIN_MEMBER: Member = {
  id: "admin-vi",
  name: "張婕",
  company: "品嘉牙體技術所",
  industry: "醫療健康",
  chapter: "長城鈦金分會",
  title: "總監",
  phone: "0966-305619",
  line: "",
  email: "pinchia8860@gmail.com",
  role: "admin",
  color: "#c8102e",
  media: {},
  onboarded: true,
};
const ADMIN_PASSWORD = "3345678";

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

function seedOpportunities(): Opportunity[] {
  const mk = (
    id: string,
    memberId: string,
    title: string,
    content: string,
    type: string,
    status: OpportunityStatus,
    createdAt: string
  ): Opportunity => ({ id, memberId, title, content, type, status, createdAt, updatedAt: createdAt, isTemplate: true });
  return [
    mk("op1", "m1", "復健診所整廠設備合作", "尋找室內設計與財稅夥伴，一起服務新開業復健診所；提供設備展示中心作為共同提案場地。", "轉介客戶", "open", "2026-07-01T08:00:00Z"),
    mk("op2", "m3", "醫療空間聯合提案", "醫療空間全案設計，徵醫療設備、建築營造夥伴聯合投標診所新建案。", "資源共享", "open", "2026-07-05T08:00:00Z"),
    mk("op3", "m9", "中秋聯名禮盒", "徵異業品牌聯名中秋禮盒（印刷包裝、行銷通路尤佳），共享彼此客戶名單。", "異業活動", "open", "2026-06-25T08:00:00Z"),
    mk("op4", "m5", "創業設立免費健檢", "提供商務夥伴的客戶免費公司設立與稅務健檢諮詢 30 分鐘，歡迎轉介。", "專業諮詢", "open", "2026-07-08T08:00:00Z"),
    mk("op5", "m7", "官網行銷健檢優惠", "上半年活動已結束：官網與社群行銷健檢五折優惠。", "優惠方案", "closed", "2026-05-01T08:00:00Z"),
  ];
}

function buildSeedStore(): Store {
  const members = structuredClone(DEMO_MEMBERS);
  for (const m of members) {
    m.onboarded = true; // 示範會員已有完整交流卡
    m.isDemo = true; // 範例人物：真實填卡人數超過 5 人時自動移除
  }
  const accounts = members.map((m) => {
    const salt = randomBytes(8).toString("hex");
    return { email: m.email.toLowerCase(), memberId: m.id, salt, passwordHash: hashPassword(DEMO_PASSWORD, salt) };
  });
  // 管理員帳號（張婕）
  members.push(structuredClone(ADMIN_MEMBER));
  const adminSalt = randomBytes(8).toString("hex");
  accounts.push({
    email: ADMIN_MEMBER.email.toLowerCase(),
    memberId: ADMIN_MEMBER.id,
    salt: adminSalt,
    passwordHash: hashPassword(ADMIN_PASSWORD, adminSalt),
  });
  return {
    members,
    interactions: structuredClone(DEMO_INTERACTIONS),
    versions: seedVersions(members),
    projects: structuredClone(DEMO_PROJECTS),
    alerts: [],
    accounts,
    opportunities: seedOpportunities(),
  };
}

/* ═══════════ Supabase 列與物件互轉 ═══════════ */

/* eslint-disable @typescript-eslint/no-explicit-any */

function memberToRow(m: Member): any {
  return {
    id: m.id, name: m.name, company: m.company, industry: m.industry, chapter: m.chapter,
    title: m.title, phone: m.phone, line: m.line, email: m.email,
    website: m.website ?? null, facebook: m.facebook ?? null, instagram: m.instagram ?? null,
    linkedin: m.linkedin ?? null, role: m.role, color: m.color, media: m.media,
    onboarded: m.onboarded ?? false, is_demo: m.isDemo ?? false,
  };
}
function rowToMember(r: any): Member {
  return {
    id: r.id, name: r.name, company: r.company ?? "", industry: r.industry ?? "",
    chapter: r.chapter ?? "", title: r.title ?? "", phone: r.phone ?? "", line: r.line ?? "",
    email: r.email ?? "", website: r.website ?? undefined, facebook: r.facebook ?? undefined,
    instagram: r.instagram ?? undefined, linkedin: r.linkedin ?? undefined,
    role: r.role ?? "member", color: r.color ?? "#c8102e", media: r.media ?? {},
    onboarded: r.onboarded ?? false, isDemo: r.is_demo ?? false,
  };
}
function accountToRow(a: Account): any {
  return { email: a.email, member_id: a.memberId, password_hash: a.passwordHash, salt: a.salt };
}
function rowToAccount(r: any): Account {
  return { email: r.email, memberId: r.member_id, passwordHash: r.password_hash, salt: r.salt };
}
function versionToRow(v: CardVersion): any {
  return {
    id: v.id, member_id: v.memberId, version: v.version, title: v.title, answers: v.answers,
    status: v.status, created_at: v.createdAt, updated_at: v.updatedAt,
    created_by: v.createdBy, updated_by: v.updatedBy,
  };
}
function rowToVersion(r: any): CardVersion {
  return {
    id: r.id, memberId: r.member_id, version: r.version, title: r.title ?? "",
    answers: r.answers ?? {}, status: r.status ?? "draft", createdAt: r.created_at,
    updatedAt: r.updated_at, createdBy: r.created_by ?? "", updatedBy: r.updated_by ?? "",
  };
}
function projectToRow(p: Project): any {
  return {
    id: p.id, member_id: p.memberId, name: p.name, intro: p.intro,
    ideal_referrals: p.idealReferrals, industries_needed: p.industriesNeeded,
    resources_offered: p.resourcesOffered, expected_close: p.expectedClose,
    start_date: p.startDate, end_date: p.endDate, is_main: p.isMain,
    importance: p.importance, created_at: p.createdAt, updated_at: p.updatedAt,
  };
}
function rowToProject(r: any): Project {
  return {
    id: r.id, memberId: r.member_id, name: r.name ?? "", intro: r.intro ?? "",
    idealReferrals: r.ideal_referrals ?? "", industriesNeeded: r.industries_needed ?? [],
    resourcesOffered: r.resources_offered ?? "", expectedClose: r.expected_close ?? "",
    startDate: r.start_date ?? "", endDate: r.end_date ?? "", isMain: r.is_main ?? false,
    importance: r.importance ?? 3, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function opportunityToRow(o: Opportunity): any {
  return {
    id: o.id, member_id: o.memberId, title: o.title, content: o.content, type: o.type,
    status: o.status, created_at: o.createdAt, updated_at: o.updatedAt,
    is_template: o.isTemplate ?? false,
  };
}
function rowToOpportunity(r: any): Opportunity {
  return {
    id: r.id, memberId: r.member_id, title: r.title ?? "", content: r.content ?? "",
    type: r.type ?? "其他", status: r.status ?? "open", createdAt: r.created_at,
    updatedAt: r.updated_at, isTemplate: r.is_template ?? false,
  };
}
function interactionToRow(i: Interaction): any {
  return {
    id: i.id, type: i.type, from_id: i.fromId, to_id: i.toId, date: i.date,
    note: i.note ?? null, amount: i.amount ?? null, closed: i.closed ?? null,
  };
}
function rowToInteraction(r: any): Interaction {
  return {
    id: r.id, type: r.type, fromId: r.from_id, toId: r.to_id, date: r.date,
    note: r.note ?? undefined, amount: r.amount != null ? Number(r.amount) : undefined,
    closed: r.closed ?? undefined,
  };
}
function alertToRow(a: BizAlert): any {
  return {
    id: a.id, member_ids: a.memberIds, pair: a.pair, probability: a.probability,
    reasons: a.reasons, trigger: a.trigger, created_at: a.createdAt,
  };
}
function rowToAlert(r: any): BizAlert {
  return {
    id: r.id, memberIds: r.member_ids ?? [], pair: r.pair ?? {}, probability: r.probability ?? 0,
    reasons: r.reasons ?? [], trigger: r.trigger ?? "", createdAt: r.created_at,
  };
}

/* ═══════════ 寫回 Supabase（write-through；示範模式為 no-op） ═══════════ */

async function persist(table: string, row: any): Promise<void> {
  if (!hasSupabase()) return;
  try {
    const sb = await supabaseAdmin();
    const { error } = await sb.from(table).upsert(row);
    if (error) console.error(`[supabase] upsert ${table} failed:`, error.message);
  } catch (e) {
    console.error(`[supabase] upsert ${table} failed:`, e);
  }
}

async function persistMany(table: string, rows: any[]): Promise<void> {
  if (!hasSupabase() || rows.length === 0) return;
  try {
    const sb = await supabaseAdmin();
    const { error } = await sb.from(table).upsert(rows);
    if (error) console.error(`[supabase] bulk upsert ${table} failed:`, error.message);
  } catch (e) {
    console.error(`[supabase] bulk upsert ${table} failed:`, e);
  }
}

async function removeRows(table: string, column: string, values: string[]): Promise<void> {
  if (!hasSupabase() || values.length === 0) return;
  try {
    const sb = await supabaseAdmin();
    const { error } = await sb.from(table).delete().in(column, values);
    if (error) console.error(`[supabase] delete ${table} failed:`, error.message);
  } catch (e) {
    console.error(`[supabase] delete ${table} failed:`, e);
  }
}

/* ═══════════ 啟動載入 ═══════════ */

async function loadFromSupabase(): Promise<Store> {
  const sb = await supabaseAdmin();
  const [members, accounts, versions, projects, opportunities, interactions, alerts] =
    await Promise.all([
      sb.from("members").select("*"),
      sb.from("accounts").select("*"),
      sb.from("card_versions").select("*"),
      sb.from("projects").select("*"),
      sb.from("opportunities").select("*"),
      sb.from("interactions").select("*"),
      sb.from("biz_alerts").select("*"),
    ]);
  for (const r of [members, accounts, versions, projects, opportunities, interactions, alerts]) {
    if (r.error) throw new Error(`Supabase 載入失敗：${r.error.message}（請確認已執行 supabase/schema.sql）`);
  }

  // 首次啟動（資料庫為空）→ 植入示範資料
  if ((members.data ?? []).length === 0) {
    const seed = buildSeedStore();
    await persistMany("members", seed.members.map(memberToRow));
    await persistMany("accounts", seed.accounts.map(accountToRow));
    await persistMany("card_versions", seed.versions.map(versionToRow));
    await persistMany("projects", seed.projects.map(projectToRow));
    await persistMany("opportunities", seed.opportunities.map(opportunityToRow));
    await persistMany("interactions", seed.interactions.map(interactionToRow));
    console.log("[supabase] 資料庫為空，已植入示範資料");
    return seed;
  }

  return {
    members: (members.data ?? []).map(rowToMember),
    accounts: (accounts.data ?? []).map(rowToAccount),
    versions: (versions.data ?? []).map(rowToVersion),
    projects: (projects.data ?? []).map(rowToProject),
    opportunities: (opportunities.data ?? []).map(rowToOpportunity),
    interactions: (interactions.data ?? []).map(rowToInteraction),
    alerts: (alerts.data ?? []).map(rowToAlert).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

function getStore(): Promise<Store> {
  if (!globalThis.__brmStorePromise) {
    globalThis.__brmStorePromise = hasSupabase()
      ? loadFromSupabase().catch((e) => {
          // 載入失敗時不要快取失敗結果，讓下一次請求重試
          globalThis.__brmStorePromise = undefined;
          throw e;
        })
      : Promise.resolve(buildSeedStore());
  }
  return globalThis.__brmStorePromise;
}

/* ═══════════ 基本查詢 ═══════════ */

export async function getMembers(): Promise<Member[]> {
  return (await getStore()).members;
}

export async function getMember(id: string): Promise<Member | undefined> {
  return (await getStore()).members.find((m) => m.id === id);
}

export async function getInteractions(): Promise<Interaction[]> {
  return (await getStore()).interactions;
}

let intSeq = 0;
/** 記錄一筆互動關係（121／引薦／合作／可能產生合作），寫回 Supabase */
export async function createInteraction(input: {
  type: Interaction["type"];
  fromId: string;
  toId: string;
  note?: string;
}): Promise<Interaction> {
  const store = await getStore();
  const interaction: Interaction = {
    id: `int-${Date.now()}-${intSeq++}`,
    type: input.type,
    fromId: input.fromId,
    toId: input.toId,
    // 存完整時間戳，方便判斷「已完成121」是否在對方最後更新之後（顯示時再截成日期）
    date: new Date().toISOString(),
    note: input.note,
  };
  store.interactions.unshift(interaction);
  await persist("interactions", interactionToRow(interaction));
  return interaction;
}

/** 刪除自己記錄的互動（使用者主動操作） */
export async function deleteInteraction(id: string, requesterId: string): Promise<{ ok: boolean; error?: string }> {
  const store = await getStore();
  const it = store.interactions.find((i) => i.id === id);
  if (!it) return { ok: false, error: "找不到這筆互動" };
  const requester = store.members.find((m) => m.id === requesterId);
  const involved = it.fromId === requesterId || it.toId === requesterId;
  if (!involved && requester?.role !== "admin") {
    return { ok: false, error: "只能刪除與自己相關的互動" };
  }
  store.interactions = store.interactions.filter((i) => i.id !== id);
  await removeRows("interactions", "id", [id]);
  return { ok: true };
}

export async function updateMember(member: Member): Promise<Member> {
  const store = await getStore();
  const idx = store.members.findIndex((m) => m.id === member.id);
  if (idx >= 0) store.members[idx] = member;
  await persist("members", memberToRow(member));
  return member;
}

/** 已填卡人數：擁有至少一題答案的會員數 */
export async function getFilledCount(): Promise<{ total: number; real: number; demo: number }> {
  const store = await getStore();
  const filledIds = new Set(
    store.versions.filter((v) => Object.keys(v.answers).length > 0).map((v) => v.memberId)
  );
  let real = 0;
  let demo = 0;
  for (const m of store.members) {
    if (!filledIds.has(m.id)) continue;
    if (m.isDemo) demo++;
    else real++;
  }
  return { total: real + demo, real, demo };
}

/** 真實會員填卡超過 5 人 → 自動刪除所有範例人物與其資料 */
async function purgeDemoIfReady(): Promise<void> {
  const store = await getStore();
  const { real } = await getFilledCount();
  if (real <= 5) return;
  const demoIds = new Set(store.members.filter((m) => m.isDemo).map((m) => m.id));
  if (demoIds.size === 0) return;
  const removedAlertIds = store.alerts
    .filter((a) => a.memberIds.some((id) => demoIds.has(id)))
    .map((a) => a.id);
  store.members = store.members.filter((m) => !demoIds.has(m.id));
  store.accounts = store.accounts.filter((a) => !demoIds.has(a.memberId));
  store.versions = store.versions.filter((v) => !demoIds.has(v.memberId));
  store.projects = store.projects.filter((p) => !demoIds.has(p.memberId));
  store.opportunities = store.opportunities.filter((o) => !demoIds.has(o.memberId));
  store.interactions = store.interactions.filter(
    (i) => !demoIds.has(i.fromId) && !demoIds.has(i.toId)
  );
  store.alerts = store.alerts.filter((a) => !removedAlertIds.includes(a.id));
  // members 刪除後，帳號/交流卡/專案/商機/互動由外鍵 cascade 一併清除
  await removeRows("members", "id", Array.from(demoIds));
  await removeRows("biz_alerts", "id", removedAlertIds);
}

/* ═══════════ 交流卡 ═══════════ */

export async function getCards(): Promise<ExchangeCard[]> {
  // AI 分析／媒合以「使用中」版本為準；若無使用中版本，退回最新修改的非封存交流卡
  const store = await getStore();
  const byMember = new Map<string, CardVersion>();
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
  const now = new Date().toISOString();
  const store = await getStore();
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
      createdAt: now,
      updatedAt: now,
      createdBy: who,
      updatedBy: who,
    };
    store.versions.push(target);
  }
  target.answers = answers;
  target.updatedAt = now;
  target.updatedBy = who;
  await persist("card_versions", versionToRow(target));
  // 使用中的交流卡填了「正在開放的合作或專案」→ 自動同步到商機廣場
  if (target.status === "active") {
    await syncAutoOpportunity(memberId, answers);
  }
  // 真實填卡人數超過 5 人 → 自動移除範例人物
  await purgeDemoIfReady();
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
  return (await getStore()).versions
    .filter((v) => v.memberId === memberId)
    .sort((a, b) => b.version - a.version);
}

export async function getCardVersion(id: string): Promise<CardVersion | undefined> {
  return (await getStore()).versions.find((v) => v.id === id);
}

/** 建立新交流卡（可從既有版本複製快速修改） */
export async function createCardVersion(
  memberId: string,
  opts: { title?: string; fromVersionId?: string } = {}
): Promise<CardVersion> {
  const store = await getStore();
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
  await persist("card_versions", versionToRow(v));
  return v;
}

/** 更新版本標題或狀態；設為使用中時，原使用中版本自動改為已完成 */
export async function updateCardVersion(
  id: string,
  patch: { title?: string; status?: CardStatus }
): Promise<CardVersion | undefined> {
  const store = await getStore();
  const v = store.versions.find((x) => x.id === id);
  if (!v) return undefined;
  const who = nameOf(store.members, v.memberId);
  if (patch.status === "active") {
    for (const other of store.versions) {
      if (other.memberId === v.memberId && other.status === "active" && other.id !== id) {
        other.status = "completed";
        await persist("card_versions", versionToRow(other));
      }
    }
  }
  if (patch.title !== undefined) v.title = patch.title.trim() || v.title;
  if (patch.status !== undefined) v.status = patch.status;
  v.updatedAt = new Date().toISOString();
  v.updatedBy = who;
  await persist("card_versions", versionToRow(v));
  if (patch.status === "active") {
    await recomputeAlerts(v.memberId, `${who}啟用了新的交流卡「${v.title}」`);
  }
  return v;
}

export async function deleteCardVersion(id: string): Promise<boolean> {
  const store = await getStore();
  const idx = store.versions.findIndex((v) => v.id === id);
  if (idx < 0) return false;
  store.versions.splice(idx, 1);
  await removeRows("card_versions", "id", [id]);
  return true;
}

/* ═══════════ 專案管理（Projects） ═══════════ */

export async function getProjects(memberId?: string): Promise<Project[]> {
  const all = (await getStore()).projects;
  const list = memberId ? all.filter((p) => p.memberId === memberId) : all;
  return [...list].sort(
    (a, b) => Number(b.isMain) - Number(a.isMain) || b.importance - a.importance
  );
}

/** 新增或更新專案；設為主推時自動取消其他專案的主推 */
export async function saveProject(
  input: Omit<Project, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<Project> {
  const store = await getStore();
  const now = new Date().toISOString();
  if (input.isMain) {
    for (const p of store.projects) {
      if (p.memberId === input.memberId && p.isMain) {
        p.isMain = false;
        await persist("projects", projectToRow(p));
      }
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
  await persist("projects", projectToRow(project));
  const who = nameOf(store.members, input.memberId);
  // 新增／更新專案 → AI 立即重新計算媒合
  await recomputeAlerts(input.memberId, `${who}${existing ? "更新" : "新增"}了專案「${project.name}」`);
  return project;
}

export async function deleteProject(id: string): Promise<boolean> {
  const store = await getStore();
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  store.projects.splice(idx, 1);
  await removeRows("projects", "id", [id]);
  return true;
}

/* ═══════════ 智慧提醒與 AI 商機快訊 ═══════════ */

const DAY = 24 * 60 * 60 * 1000;

/** 智慧提醒：交流卡逾 90 天未更新、主推專案已逾結束日期 */
export async function getReminders(memberId: string): Promise<Reminder[]> {
  const store = await getStore();
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
        actionHref: "/plaza",
      });
    }
  }
  return reminders;
}

/** 取得與我有關的商機快訊（新→舊） */
export async function getAlerts(memberId: string): Promise<BizAlert[]> {
  return (await getStore()).alerts
    .filter((a) => a.memberIds.includes(memberId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * AI 商機快訊：資料異動時立即重新計算媒合，
 * 成功率 ≥ 85% 即通知配對雙方（同一組合 7 天內不重複通知）。
 */
export async function recomputeAlerts(changedMemberId: string, trigger: string): Promise<BizAlert[]> {
  const store = await getStore();
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
    await persist("biz_alerts", alertToRow(alert));
  }
  store.alerts.length = Math.min(store.alerts.length, 100);
  return created;
}

/* ═══════════ Email 帳號登入／註冊 ═══════════ */

const PALETTE_COLORS = ["#c8102e", "#2a78d6", "#eda100", "#1baf7a", "#4a3aa7", "#eb6834", "#e87ba4", "#008300"];

export async function verifyLogin(email: string, password: string): Promise<Member | null> {
  const store = await getStore();
  const acc = store.accounts.find((a) => a.email === email.trim().toLowerCase());
  if (!acc) return null;
  if (hashPassword(password, acc.salt) !== acc.passwordHash) return null;
  return store.members.find((m) => m.id === acc.memberId) ?? null;
}

/**
 * 忘記密碼：以 Email 找出帳號，比對「帳號登記的手機號碼」驗證為本人後，重設密碼。
 * 重設碼（0000）由 API 端把關；此處只負責身分比對與寫入新密碼。
 * 只換密碼（新 salt + hash），不動任何其他會員資料，符合資料保全鐵律。
 */
export async function resetPasswordByPhone(
  email: string,
  phone: string,
  newPassword: string
): Promise<{ member?: Member; error?: string }> {
  const store = await getStore();
  const acc = store.accounts.find((a) => a.email === email.trim().toLowerCase());
  const member = acc ? store.members.find((m) => m.id === acc.memberId) : undefined;
  if (!acc || !member) return { error: "查無此 Email 帳號，請確認或改用註冊" };
  // 只留數字比對，容忍空格、-、+886 等格式差異
  const digits = (s: string) => s.replace(/\D/g, "");
  if (!member.phone || digits(member.phone) !== digits(phone)) {
    return { error: "手機號碼與帳號登記的不符，無法確認身分" };
  }
  acc.salt = randomBytes(8).toString("hex");
  acc.passwordHash = hashPassword(newPassword, acc.salt);
  await persist("accounts", accountToRow(acc));
  return { member };
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
  const store = await getStore();
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
  const account = { email, memberId: member.id, salt, passwordHash: hashPassword(input.password, salt) };
  store.accounts.push(account);
  await persist("members", memberToRow(member));
  await persist("accounts", accountToRow(account));
  return { member };
}

/** 完成首次登入引導：寫入 AI 商機資料並標記完成 */
export async function completeOnboarding(
  memberId: string,
  answers: Record<string, ExchangeCard["answers"][string]>
): Promise<Member | null> {
  const store = await getStore();
  const member = store.members.find((m) => m.id === memberId);
  if (!member) return null;
  const existing = await getCard(memberId);
  await saveCard(memberId, { ...(existing?.answers ?? {}), ...answers });
  member.onboarded = true;
  await persist("members", memberToRow(member));
  return member;
}

/** 管理員刪除會員：連同帳號、交流卡、專案、商機、互動與快訊一併移除 */
export async function deleteMember(
  id: string,
  requesterId: string
): Promise<{ ok: boolean; error?: string }> {
  const store = await getStore();
  const requester = store.members.find((m) => m.id === requesterId);
  if (requester?.role !== "admin") return { ok: false, error: "僅管理員可刪除會員" };
  if (id === requesterId) return { ok: false, error: "無法刪除自己的帳號" };
  const target = store.members.find((m) => m.id === id);
  if (!target) return { ok: false, error: "找不到這位會員" };
  const removedAlertIds = store.alerts.filter((a) => a.memberIds.includes(id)).map((a) => a.id);
  store.members = store.members.filter((m) => m.id !== id);
  store.accounts = store.accounts.filter((a) => a.memberId !== id);
  store.versions = store.versions.filter((v) => v.memberId !== id);
  store.projects = store.projects.filter((p) => p.memberId !== id);
  store.opportunities = store.opportunities.filter((o) => o.memberId !== id);
  store.interactions = store.interactions.filter((i) => i.fromId !== id && i.toId !== id);
  store.alerts = store.alerts.filter((a) => !removedAlertIds.includes(a.id));
  // members 刪除後，其餘資料由外鍵 cascade 清除
  await removeRows("members", "id", [id]);
  await removeRows("biz_alerts", "id", removedAlertIds);
  return { ok: true };
}

/* ═══════════ Supabase 用量總覽（後台監控） ═══════════ */

export interface UsageTable {
  key: string;
  label: string;
  rows: number;
  bytes: number; // 以 JSON 位元組估算（非資料庫實際佔用，僅供趨勢參考）
}

export interface UsageStats {
  supabase: boolean; // 是否已連 Supabase（false = 記憶體示範模式）
  tables: UsageTable[];
  totalRows: number;
  totalBytes: number;
  freeLimitBytes: number; // Supabase 免費方案資料庫上限
  lastActivity: string | null; // 最近一次內容異動時間（ISO）
}

/**
 * 後台用量總覽：各資料表筆數與估算資料量、免費方案上限對照、最後活動時間。
 * 純讀取記憶體中的資料集，不呼叫外部服務、不需額外金鑰。
 * 位元組為 JSON 估算值（Postgres 實際佔用含索引與型別開銷會不同），僅供掌握規模與趨勢。
 */
export async function getUsageStats(): Promise<UsageStats> {
  const store = await getStore();
  const defs: { key: keyof Store; label: string }[] = [
    { key: "members", label: "會員" },
    { key: "accounts", label: "登入帳號" },
    { key: "versions", label: "交流卡版本" },
    { key: "projects", label: "專案" },
    { key: "opportunities", label: "引薦／合作卡" },
    { key: "interactions", label: "互動紀錄" },
    { key: "alerts", label: "商機快訊" },
  ];
  const tables: UsageTable[] = defs.map(({ key, label }) => {
    const rows = store[key] as unknown[];
    return { key, label, rows: rows.length, bytes: Buffer.byteLength(JSON.stringify(rows)) };
  });
  const totalRows = tables.reduce((s, t) => s + t.rows, 0);
  const totalBytes = tables.reduce((s, t) => s + t.bytes, 0);

  // 最近活動：取各類內容時間欄位的最大值（判斷距離「7 天無活動被暫停」還有多久）
  const times: string[] = [
    ...store.versions.map((v) => v.updatedAt),
    ...store.projects.map((p) => p.updatedAt),
    ...store.opportunities.map((o) => o.updatedAt),
    ...store.interactions.map((i) => i.date),
    ...store.alerts.map((a) => a.createdAt),
  ].filter(Boolean);
  const lastActivity = times.length ? times.reduce((a, b) => (a > b ? a : b)) : null;

  return {
    supabase: hasSupabase(),
    tables,
    totalRows,
    totalBytes,
    freeLimitBytes: 500 * 1024 * 1024, // Supabase 免費方案：資料庫 500MB
    lastActivity,
  };
}

/** 管理員開通／收回其他會員的管理員權限 */
export async function setMemberRole(
  id: string,
  role: "member" | "admin",
  requesterId: string
): Promise<{ ok: boolean; member?: Member; error?: string }> {
  const store = await getStore();
  const requester = store.members.find((m) => m.id === requesterId);
  if (requester?.role !== "admin") return { ok: false, error: "僅管理員可調整權限" };
  if (id === requesterId) return { ok: false, error: "無法調整自己的權限" };
  const target = store.members.find((m) => m.id === id);
  if (!target) return { ok: false, error: "找不到這位會員" };
  target.role = role;
  await persist("members", memberToRow(target));
  return { ok: true, member: target };
}

/* ═══════════ 商機廣場（Opportunity Plaza） ═══════════ */

/**
 * 依交流卡「正在開放的合作或專案」自動同步商機廣場卡片。
 * 每位會員一張自動卡（id = auto-${memberId}）：有內容就建立／更新為開放中，
 * 清空則關閉（不刪除，保留歷史）。
 */
async function syncAutoOpportunity(memberId: string, answers: ExchangeCard["answers"]): Promise<void> {
  const store = await getStore();
  const raw = answers.s6_open_projects;
  const text = typeof raw === "string" ? raw.trim() : "";
  const id = `auto-${memberId}`;
  const existing = store.opportunities.find((o) => o.id === id);
  const now = new Date().toISOString();

  if (text) {
    const firstLine = text.split(/\r?\n/)[0].trim();
    const title = firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine || "開放合作徵求";
    if (existing) {
      existing.title = title;
      existing.content = text;
      existing.status = "open";
      existing.updatedAt = now;
      await persist("opportunities", opportunityToRow(existing));
    } else {
      const opp: Opportunity = {
        id,
        memberId,
        title,
        content: text,
        type: "其他",
        status: "open",
        createdAt: now,
        updatedAt: now,
        isTemplate: false,
      };
      store.opportunities.push(opp);
      await persist("opportunities", opportunityToRow(opp));
    }
  } else if (existing && existing.status === "open") {
    // 交流卡清空 → 關閉自動卡（保留不刪）
    existing.status = "closed";
    existing.updatedAt = now;
    await persist("opportunities", opportunityToRow(existing));
  }
}

export async function getOpportunities(): Promise<(Opportunity & { member: Member })[]> {
  const store = await getStore();
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
  const store = await getStore();
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
    await persist("opportunities", opportunityToRow(opp));
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
    await persist("opportunities", opportunityToRow(opp));
    const who = nameOf(store.members, input.memberId);
    // 新增商機 → AI 立即重新計算媒合
    await recomputeAlerts(input.memberId, `${who}發布了引薦/合作「${opp.title}」`);
  }
  return opp;
}

export async function setOpportunityStatus(id: string, status: OpportunityStatus): Promise<Opportunity | undefined> {
  const store = await getStore();
  const o = store.opportunities.find((x) => x.id === id);
  if (!o) return undefined;
  o.status = status;
  o.updatedAt = new Date().toISOString();
  await persist("opportunities", opportunityToRow(o));
  return o;
}

/** 刪除合作：僅發布者本人或管理員可刪除 */
export async function deleteOpportunity(
  id: string,
  requesterId: string
): Promise<{ ok: boolean; error?: string }> {
  const store = await getStore();
  const idx = store.opportunities.findIndex((o) => o.id === id);
  if (idx < 0) return { ok: false, error: "找不到這筆合作" };
  const requester = store.members.find((m) => m.id === requesterId);
  const isOwner = store.opportunities[idx].memberId === requesterId;
  const isAdmin = requester?.role === "admin";
  if (!isOwner && !isAdmin) {
    return { ok: false, error: "只有發布者本人或管理員可以刪除" };
  }
  store.opportunities.splice(idx, 1);
  await removeRows("opportunities", "id", [id]);
  return { ok: true };
}

/** 我要合作：通知商機發布者 */
export async function expressInterest(oppId: string, fromMemberId: string): Promise<boolean> {
  const store = await getStore();
  const opp = store.opportunities.find((o) => o.id === oppId);
  const from = store.members.find((m) => m.id === fromMemberId);
  const owner = opp && store.members.find((m) => m.id === opp.memberId);
  if (!opp || !from || !owner || from.id === owner.id) return false;
  const alert: BizAlert = {
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
    trigger: `想要引薦或合作：${from.name}點擊了「我要合作」`,
    createdAt: new Date().toISOString(),
  };
  store.alerts.unshift(alert);
  await persist("biz_alerts", alertToRow(alert));
  return true;
}
