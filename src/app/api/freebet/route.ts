import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import {
  feedHealth,
  listBookmakers,
  matchLogoFor,
  prettyBookmaker,
  readFeed,
  readMatchLogos,
} from "@/lib/odds-feed";
import { computeExtractions, type CoverMode } from "@/lib/freebet";

export const dynamic = "force-dynamic";

const COVER_MODES: CoverMode[] = ["pa2", "pa1", "free"];

export async function GET(request: Request) {
  if (!(await apiUser())) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const value = Number(searchParams.get("value")) || 0;
  const house = (searchParams.get("house") || "all").trim();
  const minPct = Number(searchParams.get("minPct")) || 0;
  const search = searchParams.get("search") || "";
  const modeParam = searchParams.get("coverMode") as CoverMode | null;
  const coverMode: CoverMode = modeParam && COVER_MODES.includes(modeParam) ? modeParam : "pa2";

  const feed = await readFeed();
  const base =
    value > 0 ? computeExtractions(feed, { value, house, coverMode, minPct, search }) : [];

  const logos = value > 0 ? await readMatchLogos() : {};
  const opportunities = base.map((o) => {
    const logo = matchLogoFor(logos, { id: o.matchId, sourceIds: o.sourceIds });
    return {
      ...o,
      homeLogo: logo?.h || null,
      awayLogo: logo?.a || null,
      leagueLogo: logo?.l || null,
    };
  });

  return NextResponse.json({
    updatedAt: feed.updatedAt,
    health: feedHealth(feed),
    bookmakers: listBookmakers(feed).map((b) => ({ id: b, label: prettyBookmaker(b) })),
    count: opportunities.length,
    opportunities,
  });
}
