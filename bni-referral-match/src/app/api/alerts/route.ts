import { NextRequest, NextResponse } from "next/server";
import { getAlerts, getReminders } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  const [reminders, alerts] = await Promise.all([getReminders(memberId), getAlerts(memberId)]);
  return NextResponse.json({ reminders, alerts });
}
