import { NextResponse } from "next/server";
import { getInteractions } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const interactions = await getInteractions();
  return NextResponse.json({ interactions });
}
