import { NextRequest, NextResponse } from "next/server";
import { getAlerts, getReminders } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  const [reminders, alerts] = await Promise.all([getReminders(memberId), getAlerts(memberId)]);
  return NextResponse.json({ reminders, alerts });
}
