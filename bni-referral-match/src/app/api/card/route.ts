import { NextRequest, NextResponse } from "next/server";
import { getCard, getCardVersion, saveCard } from "@/lib/db";
import { cardProgress } from "@/lib/stats";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const memberId = req.nextUrl.searchParams.get("memberId");
  const versionId = req.nextUrl.searchParams.get("versionId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  if (versionId) {
    const version = await getCardVersion(versionId);
    if (!version || version.memberId !== memberId) {
      return NextResponse.json({ error: "version not found" }, { status: 404 });
    }
    const card = { memberId, answers: version.answers, updatedAt: version.updatedAt };
    return NextResponse.json({ card, version, progress: cardProgress(card) });
  }

  const card = await getCard(memberId);
  return NextResponse.json({ card: card ?? null, progress: cardProgress(card) });
}

export async function PUT(req: NextRequest) {
  if (!getSessionMemberId(req)) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const body = await req.json();
  const { memberId, answers, versionId } = body ?? {};
  if (!memberId || typeof answers !== "object") {
    return NextResponse.json({ error: "memberId and answers required" }, { status: 400 });
  }
  const card = await saveCard(memberId, answers, versionId ?? undefined);
  return NextResponse.json({ card, progress: cardProgress(card) });
}
