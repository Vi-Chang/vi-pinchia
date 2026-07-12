import { NextRequest, NextResponse } from "next/server";
import { getCard, saveCard } from "@/lib/db";
import { cardProgress } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  const card = await getCard(memberId);
  return NextResponse.json({ card: card ?? null, progress: cardProgress(card) });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { memberId, answers } = body ?? {};
  if (!memberId || typeof answers !== "object") {
    return NextResponse.json({ error: "memberId and answers required" }, { status: 400 });
  }
  const card = await saveCard(memberId, answers);
  return NextResponse.json({ card, progress: cardProgress(card) });
}
