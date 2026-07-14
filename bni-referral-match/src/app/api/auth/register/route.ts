import { NextRequest, NextResponse } from "next/server";
import { registerMember } from "@/lib/db";
import { ACCESS_CODE, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const b = (await req.json()) ?? {};
  // 伺服器端驗證分會通行密碼（不再只靠前端）
  if (b.accessCode !== ACCESS_CODE) {
    return NextResponse.json({ error: "通行密碼不正確，請洽分會管理員" }, { status: 403 });
  }
  const required: [string, string][] = [
    ["name", "姓名"],
    ["chapter", "分會"],
    ["email", "Email"],
    ["phone", "手機號碼"],
    ["industry", "職業／產業"],
    ["password", "密碼"],
  ];
  for (const [key, label] of required) {
    if (!b[key]?.toString().trim()) {
      return NextResponse.json({ error: `請填寫${label}` }, { status: 400 });
    }
  }
  if (!EMAIL_RE.test(b.email.trim())) {
    return NextResponse.json({ error: "Email 格式不正確" }, { status: 400 });
  }
  if (b.password.length < 6) {
    return NextResponse.json({ error: "密碼至少 6 個字元" }, { status: 400 });
  }
  if (b.password !== b.confirmPassword) {
    return NextResponse.json({ error: "兩次輸入的密碼不一致" }, { status: 400 });
  }
  if (!b.agreed) {
    return NextResponse.json({ error: "請先閱讀並同意服務條款與隱私政策" }, { status: 400 });
  }
  const { member, error } = await registerMember({
    name: b.name,
    chapter: b.chapter,
    email: b.email,
    phone: b.phone,
    industry: b.industry,
    password: b.password,
    company: b.company,
    line: b.line,
  });
  if (error) return NextResponse.json({ error }, { status: 409 });
  const res = NextResponse.json({ member }, { status: 201 });
  if (member) res.cookies.set(SESSION_COOKIE, signSession(member.id), sessionCookieOptions());
  return res;
}
