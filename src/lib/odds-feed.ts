import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type OutcomeMap = Record<string, number>;

export type Odd = {
  bookmaker: string;
  market: string;
  variant: string;
  home: number | null;
  draw: number | null;
  away: number | null;
  outcomes?: OutcomeMap;
  updatedAt: string;
  eventRef?: Record<string, unknown> | null;
};

export type Match = {
  id: string;
  sourceIds?: string[];
  sport: string;
  league: string;
  country?: string;
  home: string;
  away: string;
  startsAt?: string;
  status?: string;
  marketType?: string;
  sourceMetrics?: Record<string, number | null>;
  odds: Odd[];
};

export type BookmakerMeta = {
  id: string;
  name: string;
  websiteUrl?: string;
  status?: string;
  priority?: number;
};

export type FeedSource = {
  connected: boolean;
  lastEventAt: string | null;
  lastSnapshotAt: string | null;
};

export type SuperOddsPayload = {
  sources?: Array<Record<string, unknown>>;
  total_markets?: number;
  updated_at?: string;
};

export type Feed = {
  updatedAt: string | null;
  count: number;
  matches: Match[];
  bookmakers?: BookmakerMeta[];
  source?: FeedSource;
};

export type MatchLogo = {
  h: string | null;
  a: string | null;
  l: string | null;
};

export type MatchLogoMap = Record<string, MatchLogo>;

const FEED_PATH = path.join(
  process.cwd(),
  "integrations",
  "monitorodds",
  "data",
  "odds.json",
);

const MATCH_LOGOS_PATH = path.join(
  process.cwd(),
  "integrations",
  "monitorodds",
  "data",
  "match-logos.json",
);

const SUPER_ODDS_PATH = path.join(
  process.cwd(),
  "integrations",
  "monitorodds",
  "data",
  "super-odds.json",
);

let cache: Feed | null = null;
let cacheAt = 0;
let logoCache: MatchLogoMap | null = null;
let logoCacheAt = 0;
let superCache: SuperOddsPayload | null = null;
let superCacheAt = 0;

export async function readFeed(): Promise<Feed> {
  if (cache && Date.now() - cacheAt < 500) return cache;
  try {
    const raw = await readFile(FEED_PATH, "utf8");
    cache = JSON.parse(raw) as Feed;
    // PA+1 não é usado no site — descartado em toda a leitura do feed.
    for (const m of cache.matches) m.odds = m.odds.filter((o) => o.variant !== "PA+1");
  } catch {
    cache = { updatedAt: null, count: 0, matches: [] };
  }
  cacheAt = Date.now();
  return cache;
}

/**
 * Super Odds (mercados turbinados, com escudos base64 pesados). Fica em arquivo
 * separado para não inchar o odds.json — só a página Super Odds e a contagem do
 * dashboard leem isto.
 */
export async function readSuperOdds(): Promise<SuperOddsPayload | null> {
  if (superCache && Date.now() - superCacheAt < 5_000) return superCache;
  try {
    superCache = JSON.parse(await readFile(SUPER_ODDS_PATH, "utf8")) as SuperOddsPayload;
  } catch {
    superCache = null;
  }
  superCacheAt = Date.now();
  return superCache;
}

/** Escudos dos times e logo da liga indexados pelo ID original do jogo. */
export async function readMatchLogos(): Promise<MatchLogoMap> {
  if (logoCache && Date.now() - logoCacheAt < 10_000) return logoCache;
  try {
    const parsed = JSON.parse(await readFile(MATCH_LOGOS_PATH, "utf8")) as MatchLogoMap;
    logoCache = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    logoCache = {};
  }
  logoCacheAt = Date.now();
  return logoCache;
}

/** Resolve também IDs unidos pelo merge de mercados da mesma partida. */
export function matchLogoFor(
  logos: MatchLogoMap,
  match: Pick<Match, "id" | "sourceIds">,
): MatchLogo | null {
  for (const id of [match.id, ...(match.sourceIds || [])]) {
    if (logos[id]) return logos[id];
  }
  return null;
}

function canonical(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function fixtureKey(match: Match) {
  return [canonical(match.sport), canonical(match.home), canonical(match.away), match.startsAt || ""]
    .join("|");
}

/**
 * Jogo já começou? O MonitorOdds só tem odds de PRÉ-JOGO — depois do apito
 * inicial as odds param e o que sobra é lixo velho (gera surebet falsa). Então
 * qualquer jogo cujo horário de início já passou é descartado.
 */
export function isStarted(match: Match, now = Date.now()) {
  return !!match.startsAt && Date.parse(match.startsAt) <= now;
}

/** Une os IDs separados por mercado que representam o mesmo confronto. */
export function mergeMatches(feed: Feed, sport?: string): Match[] {
  const groups = new Map<string, Match>();
  for (const match of feed.matches) {
    if (sport && canonical(match.sport) !== canonical(sport)) continue;
    if (isStarted(match)) continue;
    const key = fixtureKey(match);
    const found = groups.get(key);
    if (!found) {
      groups.set(key, { ...match, sourceIds: [match.id], odds: [...match.odds] });
      continue;
    }
    found.sourceIds?.push(match.id);
    if (!found.league && match.league) found.league = match.league;
    if (!found.country && match.country) found.country = match.country;
    if (!found.status && match.status) found.status = match.status;
    if (!found.sourceMetrics && match.sourceMetrics) found.sourceMetrics = match.sourceMetrics;
    found.odds.push(...match.odds);
  }

  for (const match of groups.values()) {
    const unique = new Map<string, Odd>();
    for (const odd of match.odds) {
      const key = `${odd.bookmaker}|${odd.market}|${odd.variant}`;
      const previous = unique.get(key);
      if (!previous || Date.parse(odd.updatedAt) >= Date.parse(previous.updatedAt)) unique.set(key, odd);
    }
    match.odds = [...unique.values()];
  }
  return [...groups.values()];
}

/** Casa no diretório de clones (todas as 151, agrupadas por plataforma). */
export type CloneHouse = {
  id: string;
  groupId: string;
  name: string;
  provider?: string;
  url?: string;
  logoUrl?: string;
  isCloneGroup?: boolean;
  riskWarning?: boolean;
  betterOdds?: boolean;
  liquidityType?: string | null;
  earlyPayment?: boolean;
  estadual?: string | null;
  groupColor?: string | null;
  groupOrder?: number;
  houseOrder?: number;
};

const CLONES_PATH = path.join(
  process.cwd(),
  "integrations",
  "monitorodds",
  "data",
  "bookmaker-groups.json",
);

let cloneCache: CloneHouse[] | null = null;
let cloneAt = 0;

/** Diretório completo de casas (com logo, link, grupo e flags). Muda raramente. */
export async function readCloneGroups(): Promise<CloneHouse[]> {
  if (cloneCache && Date.now() - cloneAt < 30_000) return cloneCache;
  try {
    cloneCache = JSON.parse(await readFile(CLONES_PATH, "utf8")) as CloneHouse[];
  } catch {
    cloneCache = [];
  }
  cloneAt = Date.now();
  return cloneCache;
}

export function listBookmakers(feed: Feed): string[] {
  const set = new Set<string>();
  for (const match of feed.matches) for (const odd of match.odds) set.add(odd.bookmaker);
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function prettyBookmaker(name: string): string {
  return name.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function feedHealth(feed: Feed) {
  const reference = feed.source?.lastEventAt || feed.updatedAt;
  const ageMs = reference ? Math.max(0, Date.now() - Date.parse(reference)) : Number.POSITIVE_INFINITY;
  const live = feed.source ? feed.source.connected && ageMs < 30_000 : ageMs < 15_000;
  return { live, ageMs, lastEventAt: reference || null };
}
