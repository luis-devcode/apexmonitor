import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { consumir } from "@/lib/rate-limit";
import {
  feedHealth,
  matchLogoFor,
  mergeMatches,
  readCloneGroups,
  readFeed,
  readMatchLogos,
} from "@/lib/odds-feed";

export const dynamic = "force-dynamic";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Distância de edição (Levenshtein) para casar nomes quase iguais. */
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[a.length];
}

/** Todas as odds 1X2 (todas as casas, com e sem PA) de um jogo específico. */
export async function GET(request: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  // O detalhe é consultado ~1×/5s por jogo aberto. 150/min por usuário cobre
  // vários jogos ao mesmo tempo e barra varredura automatizada de todos.
  const rl = consumir(`api:match:${user.id}`, 150, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "muitas requisicoes" }, { status: 429, headers: { "Retry-After": String(rl.emSegundos ?? 60) } });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const feed = await readFeed();
  const match = mergeMatches(feed).find(
    (m) => m.id === id || m.sourceIds?.includes(id),
  );
  if (!match) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Logo de cada casa, casando o nome do feed com o diretório de clones
  // (nomes divergem um pouco: "br4bet" vs "BR4", "esportivabet" vs "Esportiva"...).
  const clones = await readCloneGroups();
  const cloneNorms = clones.map((c) => ({ n: norm(c.name), logo: c.logoUrl ?? null }));
  const strip = (s: string) => s.replace(/(bet|br)$/, "");
  const logoOf = (book: string): string | null => {
    const b = norm(book);
    const bs = strip(b);
    let hit =
      cloneNorms.find((c) => c.n === b) ??
      cloneNorms.find((c) => c.n === bs || strip(c.n) === b || strip(c.n) === bs);
    if (!hit && b.length >= 5)
      hit = cloneNorms.find((c) => c.n.startsWith(b) || b.startsWith(c.n) || c.n.includes(b) || b.includes(c.n));
    if (!hit && b.length >= 6) hit = cloneNorms.find((c) => lev(c.n, b) <= 2);
    return hit?.logo ?? null;
  };

  const odds = match.odds
    .filter((o) => o.market === "1x2" && o.home && o.away)
    .map((o) => ({
      bookmaker: o.bookmaker,
      variant: o.variant,
      home: o.home,
      draw: o.draw,
      away: o.away,
      logoUrl: logoOf(o.bookmaker),
    }));

  const matchLogos = await readMatchLogos();
  const matchLogo = matchLogoFor(matchLogos, match);

  return NextResponse.json({
    updatedAt: feed.updatedAt,
    health: feedHealth(feed),
    match: {
      id: match.id,
      home: match.home,
      away: match.away,
      sport: match.sport,
      league: match.league,
      startsAt: match.startsAt,
      homeLogo: matchLogo?.h || null,
      awayLogo: matchLogo?.a || null,
      leagueLogo: matchLogo?.l || null,
    },
    odds,
  });
}
