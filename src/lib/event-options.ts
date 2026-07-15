import "server-only";

import { mergeMatches, readFeed } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";

export type EventOption = {
  id: string;
  label: string;
  league: string;
  sport: string;
  startsAt: string | null;
  /** Veio do histórico da pessoa, não do feed (jogo que já começou/acabou). */
  historico?: boolean;
};

const chave = (label: string) => label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Jogos do feed — só pré-jogo: o coletor descarta partida que já começou. */
export async function readAvailableEvents(): Promise<EventOption[]> {
  const feed = await readFeed();
  return mergeMatches(feed)
    .sort((a, b) => {
      const left = a.startsAt ? Date.parse(a.startsAt) : Number.MAX_SAFE_INTEGER;
      const right = b.startsAt ? Date.parse(b.startsAt) : Number.MAX_SAFE_INTEGER;
      return left - right;
    })
    .map((match) => ({
      id: match.id,
      label: `${match.home} x ${match.away}`,
      league: match.league,
      sport: match.sport,
      startsAt: match.startsAt ?? null,
    }));
}

/**
 * O feed só enxerga o futuro. Como a pessoa costuma registrar a operação DEPOIS
 * de a bola rolar, juntamos os jogos que ela já usou na planilha — assim um
 * "Argentina x Suíça" que já começou continua a um clique, em vez de sumir.
 */
export async function readEventOptionsForUser(userId: string): Promise<EventOption[]> {
  const [doFeed, usados] = await Promise.all([
    readAvailableEvents(),
    prisma.operacao.findMany({
      where: { userId },
      select: { id: true, evento: true, esporte: true, data: true },
      orderBy: { data: "desc" },
      take: 120,
    }),
  ]);

  const vistos = new Set(doFeed.map((e) => chave(e.label)));
  const historicos: EventOption[] = [];
  for (const op of usados) {
    const k = chave(op.evento);
    if (!op.evento.trim() || vistos.has(k)) continue;
    vistos.add(k);
    historicos.push({
      id: `hist-${op.id}`,
      label: op.evento,
      league: "Já usado na sua planilha",
      sport: op.esporte ?? "",
      startsAt: op.data.toISOString(),
      historico: true,
    });
  }

  // Feed primeiro (o que ainda dá pra apostar), histórico logo abaixo.
  return [...doFeed, ...historicos];
}
