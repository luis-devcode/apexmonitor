import { NextResponse } from "next/server";
import { EVENTOS_ESTORNO, EVENTOS_PAGO, webhookTokenValido } from "@/lib/asaas";
import { processarPagamentoAsaas, reverterPagamentoAsaas } from "@/lib/assinatura";

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

  // 2. Roteia por tipo de evento. Sempre responde 200 se não lançar — senão o
  // Asaas fica reenviando. Os handlers tratam e logam erros, não propagam.
  const nome = evento.event ?? "";

  // Pagamento entrou → cria/acha o cliente, estende o acesso, registra.
  if (evento.payment && EVENTOS_PAGO.has(nome)) {
    const r = await processarPagamentoAsaas(evento.payment);
    return NextResponse.json({ ok: true, ...r });
  }

  // Estorno/chargeback → retira o acesso que aquele pagamento concedeu.
  if (evento.payment && EVENTOS_ESTORNO.has(nome)) {
    const r = await reverterPagamentoAsaas(evento.payment);
    return NextResponse.json({ ok: true, ...r });
  }

  // Qualquer outro evento: ignorar de propósito não é erro.
  return NextResponse.json({ ok: true, ignorado: nome || "sem-evento" });
}
