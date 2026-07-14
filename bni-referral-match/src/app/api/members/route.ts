import { NextRequest, NextResponse } from "next/server";
import { deleteMember, getFilledCount, getMembers, setMemberRole, updateMember } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const noAuth = () => NextResponse.json({ error: "未登入" }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return noAuth();
  const [members, filled] = await Promise.all([getMembers(), getFilledCount()]);
  return NextResponse.json({ members, filled });
}

export async function PUT(req: NextRequest) {
  if (!getSessionMemberId(req)) return noAuth();
  const body = await req.json();
  if (!body?.id) return NextResponse.json({ error: "member id required" }, { status: 400 });
  const member = await updateMember(body);
  return NextResponse.json({ member });
}

/** 管理員開通／收回管理員權限（操作者以 session 身分為準） */
export async function PATCH(req: NextRequest) {
  const uid = getSessionMemberId(req);
  if (!uid) return noAuth();
  const { id, role } = (await req.json()) ?? {};
  if (!id || !["member", "admin"].includes(role)) {
    return NextResponse.json({ error: "id 與 role（member/admin）必填" }, { status: 400 });
  }
  const result = await setMemberRole(id, role, uid);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ member: result.member });
}

/** 管理員刪除會員（操作者以 session 身分為準） */
export async function DELETE(req: NextRequest) {
  const uid = getSessionMemberId(req);
  if (!uid) return noAuth();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });
  const result = await deleteMember(id, uid);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ ok: true });
}
