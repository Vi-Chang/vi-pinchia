import { NextRequest, NextResponse } from "next/server";
import { deleteMember, getFilledCount, getMembers, setMemberRole, updateMember } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [members, filled] = await Promise.all([getMembers(), getFilledCount()]);
  return NextResponse.json({ members, filled });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body?.id) return NextResponse.json({ error: "member id required" }, { status: 400 });
  const member = await updateMember(body);
  return NextResponse.json({ member });
}

/** 管理員開通／收回管理員權限 */
export async function PATCH(req: NextRequest) {
  const { id, role, requesterId } = (await req.json()) ?? {};
  if (!id || !requesterId || !["member", "admin"].includes(role)) {
    return NextResponse.json({ error: "id、role（member/admin）與 requesterId 必填" }, { status: 400 });
  }
  const result = await setMemberRole(id, role, requesterId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ member: result.member });
}

/** 管理員刪除會員 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const requesterId = req.nextUrl.searchParams.get("requesterId");
  if (!id || !requesterId) {
    return NextResponse.json({ error: "id 與 requesterId 必填" }, { status: 400 });
  }
  const result = await deleteMember(id, requesterId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ ok: true });
}
