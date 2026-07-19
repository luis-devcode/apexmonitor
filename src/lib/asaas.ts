import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Integração com o Asaas. Duas coisas moram aqui:
 *  1. A validação do webhook (a trava que impede um "paguei" forjado).
 *  2. Um cliente mínimo da API REST do Asaas (criar cliente, assinatura).
 *
 * Ambiente controlado por ASAAS_ENV: "sandbox" (teste, dinheiro falso) ou
 * "producao". A URL base muda junto — nunca cobrar de verdade no sandbox nem
 * testar na produção por engano.
 */

const SANDBOX = "https://api-sandbox.asaas.com/v3";
const PRODUCAO = "https://api.asaas.com/v3";

export function asaasBaseUrl(): string {
  return process.env.ASAAS_ENV === "producao" ? PRODUCAO : SANDBOX;
}

/**
 * Confere o header `asaas-access-token` contra o nosso segredo. Só o Asaas
 * conhece esse token (foi definido por nós na configuração do webhook), então
 * quem acerta o header é o Asaas. Comparação em tempo constante: evita que um
 * atacante descubra o token medindo o tempo de resposta.
 *
 * Falha fechada: sem segredo configurado, NADA é aceito — melhor o webhook não
 * funcionar do que aceitar qualquer requisição.
 */
export function webhookTokenValido(headerRecebido: string | null): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado || !headerRecebido) return false;

  const a = Buffer.from(headerRecebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type AsaasResposta = { ok: boolean; status: number; body: unknown };

/** Chamada autenticada à API do Asaas. A chave vai no header `access_token`. */
export async function asaasFetch(
  caminho: string,
  init?: { method?: string; body?: unknown },
): Promise<AsaasResposta> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY ausente");

  const res = await fetch(`${asaasBaseUrl()}${caminho}`, {
    method: init?.method ?? "GET",
    headers: {
      access_token: key,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

/** Eventos do Asaas que liberam acesso (pagamento entrou). */
export const EVENTOS_PAGO = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

/**
 * Eventos em que o dinheiro VOLTA pro cliente (estorno, reversão de Pix,
 * chargeback aberto). O acesso que aquele pagamento concedeu tem que ser
 * retirado — senão a pessoa dá chargeback e continua usando de graça.
 */
export const EVENTOS_ESTORNO = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_REVERSED",
  "PAYMENT_CHARGEBACK_REQUESTED",
]);
