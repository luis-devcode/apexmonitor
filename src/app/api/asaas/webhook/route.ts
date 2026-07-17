import { NextResponse } from "next/server";
import { EVENTOS_PAGO, webhookTokenValido } from "@/lib/asaas";
import { processarPagamentoAsaas } from "@/lib/assinatura";

export const dynamic = "force-dynamic";

/**
 * Endpoint que o Asaas chama a cada evento de cobrança. É público (o Asaas
 * precisa alcançá-lo), então a PRIMEIRA coisa é validar o token — sem isso,
 * qualquer um poderia forjar um "paguei" e ganhar acesso de graça.
 */
export async function POST(request: Request) {
  // 1. TRAVA: só o Asaas conhece este token.
  if (!webhookTokenValido(request.headers.get("asaas-access-token"))) {
    return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
  }

  let evento: { event?: string; payment?: Record<string, unknown> };
  try {
    evento = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  // 2. Só nos importam eventos de pagamento efetivado. Os demais respondemos
  // 200 pra o Asaas não reenviar — ignorar de propósito não é erro.
  if (!evento.event || !EVENTOS_PAGO.has(evento.event) || !evento.payment) {
    return NextResponse.json({ ok: true, ignorado: evento.event ?? "sem-evento" });
  }

  // 3. Processa: cria/acha o cliente, estende o acesso, registra o pagamento.
  // Sempre responde 200 se não lançar — senão o Asaas fica reenviando. Erros
  // são tratados dentro de processarPagamentoAsaas e logados, não propagados.
  const r = await processarPagamentoAsaas(evento.payment);
  return NextResponse.json({ ok: true, ...r });
}
