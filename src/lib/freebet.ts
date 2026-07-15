import type { Feed, Match, Odd } from "@/lib/odds-feed";
import { mergeMatches } from "@/lib/odds-feed";

type Outcome = "home" | "draw" | "away";
const OUTCOMES: Outcome[] = ["home", "draw", "away"];
const LABEL: Record<Outcome, string> = { home: "1", draw: "X", away: "2" };

export type Leg = {
  role: "freebet" | "cobertura";
  outcome: Outcome;
  outcomeLabel: string;
  bookmaker: string;
  variant: string;
  odd: number;
  stake: number;
};

export type Opportunity = {
  matchId: string;
  sourceIds?: string[];
  home: string;
  away: string;
  league: string;
  startsAt?: string;
  extractionPct: number;
  investment: number;
  profit: number;
  freebetHouse: string;
  legs: Leg[];
};

/**
 * Estratégia de variante nas PONTAS (casa/fora), seja a perna da freebet ou de
 * cobertura. A freebet pode cair em qualquer resultado — inclusive no empate.
 *   pa2  — PA nas duas pontas (padrão, para buscar duplo verde)
 *   pa1  — PA em apenas uma ponta, a outra pega a maior odd
 *   free — livre: pega a maior odd (deixa aparecer SO quando for a melhor)
 * O EMPATE nunca é forçado: sempre pega a maior odd (PA ou SO), independente do
 * resultado escolhido para a freebet.
 */
export type CoverMode = "pa2" | "pa1" | "free";
type Prefer = "pa" | "any";

export type ExtractionParams = {
  value: number;
  house: string;
  coverMode?: CoverMode;
  minPct?: number;
  search?: string;
  limit?: number;
};

function oddFor(odd: Odd, outcome: Outcome) {
  return outcome === "home" ? odd.home : outcome === "draw" ? odd.draw : odd.away;
}

const isPA = (variant: string) => variant.startsWith("PA");

/**
 * Melhor cobertura respeitando a variante preferida. Se não houver odd na
 * variante pedida (ex.: casa sem PA nesse mercado), cai para a maior odd
 * disponível — assim nunca perdemos a oportunidade, só sinalizamos a variante real.
 */
function bestCover(odds: Odd[], outcome: Outcome, excludeHouse: string, prefer: Prefer) {
  const pick = (match: (odd: Odd) => boolean) => {
    let best: { odd: number; bookmaker: string; variant: string } | null = null;
    for (const odd of odds) {
      if (odd.bookmaker === excludeHouse || !match(odd)) continue;
      const value = oddFor(odd, outcome);
      if (value !== null && value > 1 && (!best || value > best.odd)) {
        best = { odd: value, bookmaker: odd.bookmaker, variant: odd.variant };
      }
    }
    return best;
  };
  // PA nas pontas: prioriza a melhor odd PA; se a casa não tiver PA nesse
  // mercado, cai para a maior odd (não deixamos a oportunidade escapar).
  if (prefer === "pa") return pick((o) => isPA(o.variant)) ?? pick(() => true);
  return pick(() => true);
}

/**
 * Preferência de variante por resultado, conforme a estratégia. O empate é
 * sempre "any" (maior odd). Retorna 1+ planos (pa1 tenta PA em cada ponta).
 */
function coverPlans(outcomes: Outcome[], mode: CoverMode): Array<Record<Outcome, Prefer>> {
  const build = (ponta: (o: Outcome) => Prefer): Record<Outcome, Prefer> => {
    const map = {} as Record<Outcome, Prefer>;
    for (const o of outcomes) map[o] = o === "draw" ? "any" : ponta(o);
    return map;
  };
  if (mode === "free") return [build(() => "any")];
  if (mode === "pa2") return [build(() => "pa")];
  // pa1: PA em exatamente uma ponta. Com duas pontas cobertas, tenta cada uma.
  const pontas = outcomes.filter((o) => o !== "draw");
  if (pontas.length <= 1) return [build(() => "pa")];
  return pontas.map((paSide) => build((o) => (o === paSide ? "pa" : "any")));
}

function houseOdd(odds: Odd[], house: string, outcome: Outcome) {
  let best: { odd: number; variant: string } | null = null;
  for (const odd of odds) {
    if (odd.bookmaker !== house) continue;
    const value = oddFor(odd, outcome);
    if (value !== null && value > 1 && (!best || value > best.odd)) {
      best = { odd: value, variant: odd.variant };
    }
  }
  return best;
}

function evaluateMatch(match: Match, value: number, requestedHouse: string, mode: CoverMode) {
  const odds = match.odds.filter((odd) => odd.market === "1x2");
  if (odds.length === 0) return null;
  const houses = requestedHouse && requestedHouse !== "all"
    ? [requestedHouse]
    : [...new Set(odds.map((odd) => odd.bookmaker))];
  let bestOpportunity: Opportunity | null = null;

  for (const house of houses) {
    // A freebet pode cair em qualquer resultado (inclusive empate).
    for (const freebetOutcome of OUTCOMES) {
      const freebetOdd = houseOdd(odds, house, freebetOutcome);
      if (!freebetOdd) continue;
      const coverOutcomes = OUTCOMES.filter((outcome) => outcome !== freebetOutcome);

      for (const plan of coverPlans(coverOutcomes, mode)) {
        const covers = coverOutcomes.map((outcome) => ({
          outcome,
          best: bestCover(odds, outcome, house, plan[outcome]),
        }));
        if (covers.some((cover) => !cover.best)) continue;

        const payout = value * (freebetOdd.odd - 1);
        const coverLegs: Leg[] = covers.map(({ outcome, best }) => ({
          role: "cobertura",
          outcome,
          outcomeLabel: LABEL[outcome],
          bookmaker: best!.bookmaker,
          variant: best!.variant,
          odd: best!.odd,
          stake: payout / best!.odd,
        }));
        const investment = coverLegs.reduce((sum, leg) => sum + leg.stake, 0);
        const profit = payout - investment;
        if (profit <= 0) continue;

        const opportunity: Opportunity = {
          matchId: match.id,
          sourceIds: match.sourceIds,
          home: match.home,
          away: match.away,
          league: match.league,
          startsAt: match.startsAt,
          extractionPct: (profit / value) * 100,
          investment,
          profit,
          freebetHouse: house,
          legs: [
            {
              role: "freebet",
              outcome: freebetOutcome,
              outcomeLabel: LABEL[freebetOutcome],
              bookmaker: house,
              variant: freebetOdd.variant,
              odd: freebetOdd.odd,
              stake: value,
            },
            ...coverLegs,
          ],
        };
        if (!bestOpportunity || opportunity.extractionPct > bestOpportunity.extractionPct) {
          bestOpportunity = opportunity;
        }
      }
    }
  }
  return bestOpportunity;
}

export function computeExtractions(feed: Feed, params: ExtractionParams): Opportunity[] {
  const { value, house = "all", coverMode = "pa2", minPct = 0, search, limit = 200 } = params;
  if (!value || value <= 0) return [];
  const term = search?.trim().toLowerCase();
  const output: Opportunity[] = [];
  for (const match of mergeMatches(feed, "football")) {
    if (term && !`${match.home} ${match.away} ${match.league}`.toLowerCase().includes(term)) continue;
    const opportunity = evaluateMatch(match, value, house, coverMode);
    if (opportunity && opportunity.extractionPct >= minPct) output.push(opportunity);
  }
  return output.sort((a, b) => b.extractionPct - a.extractionPct).slice(0, limit);
}
