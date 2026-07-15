import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { readCloneGroups } from "@/lib/odds-feed";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await apiUser())) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
  return NextResponse.json({ houses: await readCloneGroups() });
}
