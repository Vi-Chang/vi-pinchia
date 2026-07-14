import { NextRequest, NextResponse } from "next/server";
import { getMember } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 驗證目前 session 是否有效，回傳最新會員資料 */
export async function GET(req: NextRequest) {
  const uid = getSessionMemberId(req);
  if (!uid) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const member = await getMember(uid);
  if (!member) return NextResponse.json({ error: "帳號不存在" }, { status: 401 });
  return NextResponse.json({ member });
}
