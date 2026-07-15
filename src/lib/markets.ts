import "server-only";

import type { Feed, Match, Odd, SuperOddsPayload } from "@/lib/odds-feed";
import { mergeMatches } from "@/lib/odds-feed";

export type Outcome = "home" | "draw" | "away";
export type MarketLeg = {
  outcome: string;
  label: string;
  bookmaker: string;
  variant: string;
  odd: number;
  stake?: number;
};

export type MarketCard = {
  id: string;
  sourceIds?: string[];
  sport: string;
  league: string;
  country?: string;
  home: string;
  away: string;
  startsAt?: string;
  status?: string;
  roi: number;
  oddsCount: number;
  housesCount: number;
  kind?: "1x2" | "dc";
  legs: MarketLeg[];
};

const OUTCOMES: Outcome[] = ["home", "draw", "away"];
const LABEL: Record<Outcome, string> = { home: "1", draw: "X", away: "2" };

function valueFor(odd: Odd, outcome: Outcome) {
  return outcome === "home" ? odd.home : outcome === "draw" ? odd.draw : odd.away;
}

function valid(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 1;
}

function best1x2(match: Match, variant?: "PA" | "SO") {
  const rows = match.odds.filter((odd) => odd.market === "1x2" && (!variant || odd.variant.startsWith(variant)));
  const legs: MarketLeg[] = [];
  for (const outcome of OUTCOMES) {
    let best: MarketLeg | null = null;
    for (const odd of rows) {
      const value = valueFor(odd, outcome);
      if (valid(value) && (!best || value > best.odd)) {
        best = {
          outcome,
          label: LABEL[outcome],
          bookmaker: odd.bookmaker,
          variant: odd.variant,
          odd: value,
        };
      }
    }
    if (!best) return null;
    legs.push(best);
  }
  return legs;
}

function roiFor(legs: MarketLeg[]) {
  const inverse = legs.reduce((sum, leg) => sum + 1 / leg.odd, 0);
  return inverse > 0 ? (1 / inverse - 1) * 100 : -100;
}

function card(match: Match, legs: MarketLeg[], kind: "1x2" | "dc" = "1x2"): MarketCard {
  return {
    id: match.id,
    sourceIds: match.sourceIds,
    sport: match.sport,
    league: match.league,
    country: match.country,
    home: match.home,
    away: match.away,
    startsAt: match.startsAt,
    status: match.status,
    roi: roiFor(legs),
    oddsCount: match.odds.length,
    housesCount: new Set(match.odds.map((odd) => odd.bookmaker)).size,
    kind,
    legs,
  };
}

export function buildMonitor(feed: Feed, sport: string, variant?: "PA" | "SO") {
  return mergeMatches(feed, sport)
    .map((match) => {
      const legs = best1x2(match, variant);
      return legs ? card(match, legs) : null;
    })
    .filter((item): item is MarketCard => item !== null)
    .sort((a, b) => b.roi - a.roi);
}

// Surebets 1X2 clássicas (3 resultados, melhor odd de cada), igual ao painel de
// referência. Arbitragens envolvendo dupla chance ficam de fora de propósito —
// são menos padronizadas e não aparecem na lista deles.
export function buildSurebets(feed: Feed) {
  const opportunities: MarketCard[] = [];
  for (const match of mergeMatches(feed)) {
    const legs = best1x2(match);
    if (!legs) continue;
    const opportunity = card(match, legs, "1x2");
    if (opportunity.roi > 0) opportunities.push(opportunity);
  }
  return opportunities.sort((a, b) => b.roi - a.roi);
}

/**
 * Escolhe a melhor perna: sempre a maior odd. Empatando, prefere a versão SEM PA
 * (SO) — o pagamento antecipado só vale a pena quando ele é, de fato, a maior
 * odd disponível.
 */
function betterLeg(current: MarketLeg | null, candidate: MarketLeg): MarketLeg {
  if (!current) return candidate;
  if (candidate.odd > current.odd) return candidate;
  if (candidate.odd === current.odd && current.variant.startsWith("PA") && !candidate.variant.startsWith("PA")) {
    return candidate;
  }
  return current;
}

export function buildDoubleGreen(feed: Feed) {
  return mergeMatches(feed, "football")
    .map((match) => {
      const rows = match.odds.filter((odd) => odd.market === "1x2");
      const legs: MarketLeg[] = [];
      for (const outcome of OUTCOMES) {
        let best: MarketLeg | null = null;
        for (const odd of rows) {
          // Duplo Green exige PA somente nas pontas 1 e 2. No empate usamos a
          // maior odd disponível, seja ela PA ou SO.
          if (outcome !== "draw" && !odd.variant.startsWith("PA")) continue;
          const value = valueFor(odd, outcome);
          if (!valid(value)) continue;
          best = betterLeg(best, { outcome, label: LABEL[outcome], bookmaker: odd.bookmaker, variant: odd.variant, odd: value });
        }
        if (!best) return null;
        legs.push(best);
      }
      const result = roiFor(legs);
      const draw = legs.find((leg) => leg.outcome === "draw")!;
      const reasons = [
        "PA nas duas pontas (1 e 2)",
        `Empate na melhor odd disponível (${draw.variant})`,
        result >= 0 ? `Lucro combinado de ${result.toFixed(2)}%` : `Perda combinada de ${Math.abs(result).toFixed(2)}%`,
      ];
      return { ...card(match, legs), reasons };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.roi - a.roi);
}

type RawSuperMarket = {
  home_team?: string;
  away_team?: string;
  event_id?: string;
  event_url?: string;
  full_description?: string;
  price?: number;
  original_price?: number | null;
  boost_pct?: number | null;
  selection_id?: string;
  match_date?: string;
  bookmaker?: string;
};

export function buildSuperOdds(superOdds: SuperOddsPayload | null | undefined) {
  const output: Array<RawSuperMarket & { source: string; sport: string; tab: string }> = [];
  for (const source of superOdds?.sources || []) {
    const sourceName = String(source.source || "");
    const tabs = Array.isArray(source.tabs) ? source.tabs as Array<Record<string, unknown>> : [];
    for (const tab of tabs) {
      const markets = Array.isArray(tab.markets) ? tab.markets as RawSuperMarket[] : [];
      for (const market of markets) {
        output.push({
          ...market,
          source: market.bookmaker || sourceName,
          sport: String(tab.sport_name || ""),
          tab: String(tab.title || ""),
        });
      }
    }
  }
  return output.sort((a, b) => (b.boost_pct || 0) - (a.boost_pct || 0));
}
