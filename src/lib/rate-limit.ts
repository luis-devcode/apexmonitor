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

/**
 * Consome uma cota: checa E registra numa tacada só. Para APIs onde TODA
 * requisição conta (diferente do login, onde só a falha conta). Retorna se
 * passou e, se bloqueou, em quantos segundos libera.
 */
export function consumir(chave: string, max: number, janelaMs: number): { ok: boolean; emSegundos?: number } {
  const bloq = excedeu(chave, max, janelaMs);
  if (bloq) return { ok: false, emSegundos: bloq };
  registrar(chave);
  return { ok: true };
}

/* ---------------------------------------------------------------------------
 * Conexões simultâneas (ex.: SSE do /api/live). Um cliente legítimo mantém
 * poucas conexões abertas; um raspador que multiplexa dezenas em paralelo bate
 * no teto. Contador em memória: abre no connect, fecha no disconnect.
 * ------------------------------------------------------------------------- */
const conexoes = new Map<string, number>();

/** Tenta abrir uma conexão. Retorna false se já está no teto. */
export function abrirConexao(chave: string, max: number): boolean {
  const n = conexoes.get(chave) ?? 0;
  if (n >= max) return false;
  conexoes.set(chave, n + 1);
  return true;
}

/** Fecha uma conexão (sempre chamar no disconnect, mesmo em erro). */
export function fecharConexao(chave: string): void {
  const n = (conexoes.get(chave) ?? 1) - 1;
  if (n <= 0) conexoes.delete(chave);
  else conexoes.set(chave, n);
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
