import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import {
  feedHealth,
  listBookmakers,
  matchLogoFor,
  prettyBookmaker,
  readFeed,
  readMatchLogos,
  readSuperOdds,
} from "@/lib/odds-feed";
import {
  buildDoubleGreen,
  buildMonitor,
  buildSuperOdds,
  buildSurebets,
} from "@/lib/markets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // As odds são o produto: sem assinatura em dia, não sai nada daqui.
  if (!(await apiUser())) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") || "dashboard";
  const feed = await readFeed();
  const meta = {
    updatedAt: feed.updatedAt,
    health: feedHealth(feed),
    bookmakers: listBookmakers(feed).map((id) => ({ id, label: prettyBookmaker(id) })),
  };

  // Escudos dos times e logo da liga para os cards (mesma fonte do dashboard).
  const logos = await readMatchLogos();
  const withLogos = <T extends { id: string; sourceIds?: string[] }>(items: T[]) =>
    items.map((item) => {
      const logo = matchLogoFor(logos, item);
      return { ...item, homeLogo: logo?.h || null, awayLogo: logo?.a || null, leagueLogo: logo?.l || null };
    });

  if (mode === "monitor-football") {
    return NextResponse.json({ ...meta, items: withLogos(buildMonitor(feed, "football")) });
  }
  if (mode === "monitor-basketball") {
    return NextResponse.json({ ...meta, items: withLogos(buildMonitor(feed, "basketball")) });
  }
  if (mode === "surebets") {
    return NextResponse.json({ ...meta, items: withLogos(buildSurebets(feed)) });
  }
  if (mode === "double-green") {
    return NextResponse.json({ ...meta, items: withLogos(buildDoubleGreen(feed)) });
  }
  if (mode === "super-odds") {
    return NextResponse.json({ ...meta, items: buildSuperOdds(await readSuperOdds()) });
  }

  const football = buildMonitor(feed, "football");
  const basketball = buildMonitor(feed, "basketball");
  const surebets = buildSurebets(feed);
  const superOdds = buildSuperOdds(await readSuperOdds());
  const footballSurebets = surebets.filter((item) => item.sport === "football");
  const basketballSurebets = surebets.filter((item) => item.sport === "basketball");
  const footballOdds = football.reduce((total, item) => total + item.oddsCount, 0);
  const basketballOdds = basketball.reduce((total, item) => total + item.oddsCount, 0);
  return NextResponse.json({
    ...meta,
    stats: {
      matches: football.length + basketball.length,
      football: football.length,
      basketball: basketball.length,
      surebets: surebets.length,
      bookmakers: meta.bookmakers.length,
      bestRoi: surebets[0]?.roi || 0,
      superOdds: superOdds.length,
      footballSurebets: footballSurebets.length,
      basketballSurebets: basketballSurebets.length,
      footballOddsPerMatch: football.length ? footballOdds / football.length : 0,
      basketballOddsPerMatch: basketball.length ? basketballOdds / basketball.length : 0,
    },
    highlights: surebets.slice(0, 5).map((item) => {
      const logo = matchLogoFor(logos, item);
      return {
        ...item,
        homeLogo: logo?.h || null,
        awayLogo: logo?.a || null,
        leagueLogo: logo?.l || null,
      };
    }),
  });
}
