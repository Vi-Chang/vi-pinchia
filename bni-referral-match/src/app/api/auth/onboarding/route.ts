import { NextRequest, NextResponse } from "next/server";
import { completeOnboarding } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { memberId, answers } = (await req.json()) ?? {};
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  const member = await completeOnboarding(memberId, answers ?? {});
  if (!member) return NextResponse.json({ error: "member not found" }, { status: 404 });
  return NextResponse.json({ member });
}
