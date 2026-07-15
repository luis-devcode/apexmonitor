/**
 * Casas de aposta — nome canônico, lista pra seleção e logo.
 *
 * O diretório de clones traz variantes SUJAS da mesma casa:
 *   "BOLSA DE APOSTA - SPORTBOOK"  +  "BOLSA EXCHANGE E TRADEBALL"
 *   "BETBRA - SPORTBOOK"           +  "BETBRA EXCHANGE E TRADEBALL"
 * Isso fazia a mesma casa aparecer duas vezes em todo seletor do site.
 *
 * Este arquivo é a ÚNICA fonte da verdade: qualquer tela que liste casas usa
 * `housesForSelect()`, e qualquer logo é resolvido por `logoForHouse()`.
 * (É puro — serve tanto no servidor quanto no cliente.)
 */

export type HouseOption = { name: string; logoUrl: string | null };

/** Comparação de nomes ignorando acento, caixa e pontuação. */
export const normHouse = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Reduz as variantes do diretório a uma marca só. */
export function canonicalHouseName(raw: string): string {
  const clean = raw
    .replace(/\s*-\s*sportbook\b/i, "")
    .replace(/\s+exchange\s+e\s+tradeball\b/i, "")
    .replace(/\s*-\s*exchange\b/i, "")
    .replace(/\s+tradeball\b/i, "")
    .trim();

  const n = normHouse(clean);
  if (n.startsWith("bolsa")) return "Bolsa de Aposta";
  if (n.startsWith("betbra")) return "BetBra";
  if (n.startsWith("betfair")) return "Betfair";
  return clean;
}

/** Lista de casas para SELEÇÃO: canônica, sem duplicata, em ordem alfabética. */
export function housesForSelect(list: { name: string; logoUrl?: string | null }[]): HouseOption[] {
  const porMarca = new Map<string, HouseOption>();
  for (const house of list) {
    if (!house?.name) continue;
    const name = canonicalHouseName(house.name);
    const key = normHouse(name);
    const found = porMarca.get(key);
    if (!found) porMarca.set(key, { name, logoUrl: house.logoUrl ?? null });
    else if (!found.logoUrl && house.logoUrl) found.logoUrl = house.logoUrl;
  }
  return [...porMarca.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Mapa de logos indexado pela marca canônica. */
export function houseLogoMap(list: { name: string; logoUrl?: string | null }[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const house of list) {
    if (!house?.name) continue;
    const key = normHouse(canonicalHouseName(house.name));
    if (!map.get(key) && house.logoUrl) map.set(key, house.logoUrl);
    else if (!map.has(key)) map.set(key, house.logoUrl ?? null);
  }
  return map;
}

/** Logo de uma casa, aceitando qualquer variante do nome. */
export function logoForHouse(map: Map<string, string | null>, name: string | null | undefined): string | null {
  if (!name) return null;
  return map.get(normHouse(canonicalHouseName(name))) ?? null;
}
