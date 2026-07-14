import { NextRequest, NextResponse } from "next/server";
import { createInteraction, deleteInteraction, getInteractions, recomputeAlerts } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const noAuth = () => NextResponse.json({ error: "未登入" }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return noAuth();
  const interactions = await getInteractions();
  return NextResponse.json({ interactions });
}

/**
 * 記錄「我與某會員」的關係。
 * kind：
 *   121            已 121
 *   referral_out   單向引薦：我推薦他
 *   referral_in    單向引薦：他推薦我
 *   referral_two   雙向引薦（記兩筆）
 *   cooperation    合作
 *   potential      可能產生合作
 */
export async function POST(req: NextRequest) {
  const uid = getSessionMemberId(req);
  if (!uid) return noAuth();
  const { memberId, targetId, kind, note } = (await req.json()) ?? {};
  if (!memberId || !targetId || memberId === targetId) {
    return NextResponse.json({ error: "參數不正確" }, { status: 400 });
  }
  const mk = (type: "121" | "referral" | "cooperation" | "potential", fromId: string, toId: string) =>
    createInteraction({ type, fromId, toId, note });

  switch (kind) {
    case "121":
      await mk("121", memberId, targetId);
      break;
    case "referral_out":
      await mk("referral", memberId, targetId);
      break;
    case "referral_in":
      await mk("referral", targetId, memberId);
      break;
    case "referral_two":
      await mk("referral", memberId, targetId);
      await mk("referral", targetId, memberId);
      break;
    case "cooperation":
      await mk("cooperation", memberId, targetId);
      break;
    case "potential":
      await mk("potential", memberId, targetId);
      break;
    default:
      return NextResponse.json({ error: "未知的關係類型" }, { status: 400 });
  }

  // 關係異動 → AI 重新計算媒合（過去合作紀錄會影響配對分數）
  await recomputeAlerts(memberId, "更新了與夥伴的關係");
  const interactions = await getInteractions();
  return NextResponse.json({ ok: true, interactions });
}

export async function DELETE(req: NextRequest) {
  const uid = getSessionMemberId(req);
  if (!uid) return noAuth();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });
  const result = await deleteInteraction(id, uid);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  const interactions = await getInteractions();
  return NextResponse.json({ ok: true, interactions });
}
