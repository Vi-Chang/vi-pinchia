import { NextRequest, NextResponse } from "next/server";
import { expressInterest } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { oppId, memberId } = (await req.json()) ?? {};
  if (!oppId || !memberId) {
    return NextResponse.json({ error: "oppId 與 memberId 必填" }, { status: 400 });
  }
  const ok = await expressInterest(oppId, memberId);
  if (!ok) return NextResponse.json({ error: "無法送出（不能對自己的合作表達意願）" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
