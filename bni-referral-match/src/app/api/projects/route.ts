import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProjects, saveProject } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const noAuth = () => NextResponse.json({ error: "未登入" }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!getSessionMemberId(req)) return noAuth();
  const memberId = req.nextUrl.searchParams.get("memberId") ?? undefined;
  return NextResponse.json({ projects: await getProjects(memberId) });
}

export async function POST(req: NextRequest) {
  if (!getSessionMemberId(req)) return noAuth();
  const body = await req.json();
  const { memberId, name } = body ?? {};
  if (!memberId || !name?.trim()) {
    return NextResponse.json({ error: "memberId 與專案名稱必填" }, { status: 400 });
  }
  const project = await saveProject({
    id: body.id,
    memberId,
    name: name.trim(),
    intro: body.intro ?? "",
    idealReferrals: body.idealReferrals ?? "",
    industriesNeeded: Array.isArray(body.industriesNeeded) ? body.industriesNeeded : [],
    resourcesOffered: body.resourcesOffered ?? "",
    expectedClose: body.expectedClose ?? "",
    startDate: body.startDate ?? "",
    endDate: body.endDate ?? "",
    isMain: Boolean(body.isMain),
    importance: Math.max(1, Math.min(5, Number(body.importance) || 3)),
  });
  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest) {
  if (!getSessionMemberId(req)) return noAuth();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await deleteProject(id);
  if (!ok) return NextResponse.json({ error: "project not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
