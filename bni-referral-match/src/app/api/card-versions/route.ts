import { NextRequest, NextResponse } from "next/server";
import {
  createCardVersion,
  deleteCardVersion,
  getCardVersions,
  updateCardVersion,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  return NextResponse.json({ versions: await getCardVersions(memberId) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { memberId, title, fromVersionId } = body ?? {};
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  const version = await createCardVersion(memberId, { title, fromVersionId });
  return NextResponse.json({ version }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, title, status } = body ?? {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const version = await updateCardVersion(id, { title, status });
  if (!version) return NextResponse.json({ error: "version not found" }, { status: 404 });
  return NextResponse.json({ version });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await deleteCardVersion(id);
  if (!ok) return NextResponse.json({ error: "version not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
