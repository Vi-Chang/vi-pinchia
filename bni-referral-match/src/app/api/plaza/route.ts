import { NextRequest, NextResponse } from "next/server";
import {
  deleteOpportunity,
  getOpportunities,
  saveOpportunity,
  setOpportunityStatus,
} from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const noAuth = () => NextResponse.json({ error: "未登入" }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return noAuth();
  return NextResponse.json({ opportunities: await getOpportunities() });
}

export async function POST(req: NextRequest) {
  if (!getSessionMemberId(req)) return noAuth();
  const b = (await req.json()) ?? {};
  if (!b.memberId || !b.title?.trim() || !b.content?.trim() || !b.type?.trim()) {
    return NextResponse.json({ error: "標題、內容與合作類型必填" }, { status: 400 });
  }
  const opportunity = await saveOpportunity({
    id: b.id,
    memberId: b.memberId,
    title: b.title.trim(),
    content: b.content.trim(),
    type: b.type.trim(),
  });
  return NextResponse.json({ opportunity });
}

export async function PATCH(req: NextRequest) {
  if (!getSessionMemberId(req)) return noAuth();
  const { id, status } = (await req.json()) ?? {};
  if (!id || !["open", "closed"].includes(status)) {
    return NextResponse.json({ error: "id 與 status（open/closed）必填" }, { status: 400 });
  }
  const opportunity = await setOpportunityStatus(id, status);
  if (!opportunity) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ opportunity });
}

export async function DELETE(req: NextRequest) {
  const uid = getSessionMemberId(req);
  if (!uid) return noAuth();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });
  const result = await deleteOpportunity(id, uid);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ ok: true });
}
