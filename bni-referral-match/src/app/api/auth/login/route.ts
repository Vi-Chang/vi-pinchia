import { NextRequest, NextResponse } from "next/server";
import { verifyLogin } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) ?? {};
  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "請輸入 Email 和密碼" }, { status: 400 });
  }
  const member = await verifyLogin(email, password);
  if (!member) {
    return NextResponse.json({ error: "Email 或密碼不正確" }, { status: 401 });
  }
  return NextResponse.json({ member });
}
