import { NextRequest, NextResponse } from "next/server";
import { resetPasswordByPhone } from "@/lib/db";
import { RESET_CODE, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 忘記密碼重設（免登入）：
 * Email + 登記手機號 + 重設碼(0000) → 驗證本人 → 設定新密碼並自動登入。
 */
export async function POST(req: NextRequest) {
  const { email, phone, code, newPassword, confirmPassword } = (await req.json()) ?? {};

  if (!email?.toString().trim() || !phone?.toString().trim() || !newPassword) {
    return NextResponse.json({ error: "請填寫 Email、手機號碼與新密碼" }, { status: 400 });
  }
  if (code !== RESET_CODE) {
    return NextResponse.json({ error: "重設碼不正確，請洽分會管理員" }, { status: 403 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "新密碼至少 6 個字元" }, { status: 400 });
  }
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return NextResponse.json({ error: "兩次輸入的新密碼不一致" }, { status: 400 });
  }

  const { member, error } = await resetPasswordByPhone(email, phone, newPassword);
  if (error || !member) {
    return NextResponse.json({ error: error ?? "重設失敗" }, { status: 400 });
  }

  // 重設成功即自動登入（發 session cookie），與註冊流程一致
  const res = NextResponse.json({ member });
  res.cookies.set(SESSION_COOKIE, signSession(member.id), sessionCookieOptions());
  return res;
}
