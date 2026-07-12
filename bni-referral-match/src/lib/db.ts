import { DEMO_CARDS, DEMO_INTERACTIONS, DEMO_MEMBERS } from "./demo-data";
import type { ExchangeCard, Interaction, Member } from "./types";

/**
 * 資料存取層。
 * - 設定 Supabase 環境變數時 → 走 Supabase（Postgres）
 * - 未設定時 → 走內建示範資料（記憶體儲存，可完整預覽所有功能）
 */

interface Store {
  members: Member[];
  cards: Map<string, ExchangeCard>;
  interactions: Interaction[];
}

declare global {
  // eslint-disable-next-line no-var
  var __brmStore: Store | undefined;
}

function demoStore(): Store {
  if (!globalThis.__brmStore) {
    globalThis.__brmStore = {
      members: structuredClone(DEMO_MEMBERS),
      cards: new Map(DEMO_CARDS.map((c) => [c.memberId, structuredClone(c)])),
      interactions: structuredClone(DEMO_INTERACTIONS),
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
  return Array.from(demoStore().cards.values());
}

export async function getCard(memberId: string): Promise<ExchangeCard | undefined> {
  const cards = await getCards();
  return cards.find((c) => c.memberId === memberId);
}

export async function saveCard(memberId: string, answers: ExchangeCard["answers"]): Promise<ExchangeCard> {
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
  demoStore().cards.set(memberId, card);
  return card;
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
