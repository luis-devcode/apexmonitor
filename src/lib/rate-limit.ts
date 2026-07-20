import "server-only";

import { headers } from "next/headers";

/**
 * Rate limit em memória (janela deslizante). Suficiente pra frear força-bruta de
 * login e spam de "esqueci a senha" num app de instância única — sem tocar no
 * banco a cada tentativa. Some no restart (aceitável: reinício é raro).
 *
 * Uso típico:
 *   const bloq = excedeu(`login:${ip}`, 10, 15*60_000);
 *   if (bloq) return "Muitas tentativas...";   // já passou do limite
 *   ... tenta ...
 *   if (falhou) registrar(`login:${ip}`);       // só a falha conta
 */

const store = new Map<string, number[]>();

// Limpeza preguiçosa: impede o Map de crescer pra sempre com chaves velhas.
let ultimaLimpeza = Date.now();
function limpar(agora: number): void {
  if (agora - ultimaLimpeza < 5 * 60_000) return;
  ultimaLimpeza = agora;
  for (const [k, hits] of store) {
    if (hits.every((t) => agora - t > 60 * 60_000)) store.delete(k);
  }
}

/**
 * Já estourou o limite? Retorna quantos SEGUNDOS faltam para liberar, ou null se
 * ainda pode tentar. NÃO registra a tentativa (use `registrar` para isso).
 */
export function excedeu(chave: string, max: number, janelaMs: number): number | null {
  const agora = Date.now();
  limpar(agora);
  const hits = (store.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  store.set(chave, hits);
  if (hits.length >= max) return Math.ceil((janelaMs - (agora - hits[0])) / 1000);
  return null;
}

/** Registra uma tentativa (uma falha de login, uma solicitação de reset...). */
export function registrar(chave: string): void {
  const hits = store.get(chave) ?? [];
  hits.push(Date.now());
  store.set(chave, hits);
}

/** IP real do cliente (atrás da Cloudflare/Caddy). Falha fechada num rótulo fixo. */
export async function ipCliente(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "desconhecido"
  );
}
