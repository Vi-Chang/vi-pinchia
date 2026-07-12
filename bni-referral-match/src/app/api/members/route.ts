import { NextRequest, NextResponse } from "next/server";
import { getMembers, updateMember } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const members = await getMembers();
  return NextResponse.json({ members });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body?.id) return NextResponse.json({ error: "member id required" }, { status: 400 });
  const member = await updateMember(body);
  return NextResponse.json({ member });
}
