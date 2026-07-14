import { NextRequest, NextResponse } from "next/server";
import { expressInterest } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const uid = getSessionMemberId(req);
  if (!uid) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const { oppId } = (await req.json()) ?? {};
  if (!oppId) {
    return NextResponse.json({ error: "oppId 必填" }, { status: 400 });
  }
  const ok = await expressInterest(oppId, uid);
  if (!ok) return NextResponse.json({ error: "無法送出（不能對自己的合作表達意願）" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
