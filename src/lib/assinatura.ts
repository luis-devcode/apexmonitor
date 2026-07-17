import "server-only";

import { randomBytes } from "node:crypto";
import { asaasFetch } from "@/lib/asaas";
import { hashPassword } from "@/lib/auth";
import { enviarEmail } from "@/lib/email";
import { planoPorId } from "@/lib/planos";
import { prisma } from "@/lib/prisma";

/**
 * `externalReference` que o checkout grava na cobrança do Asaas. Carrega o que o
 * webhook não teria como saber sozinho: quantos meses aquele pagamento concede e
 * de qual cupom a venda veio. Formato compacto: "meses=1;cupom=JOAO10".
 */
export function montarReferencia(meses: number, cupom?: string | null, email?: string | null): string {
  const partes = [`meses=${meses}`];
  if (cupom) partes.push(`cupom=${cupom}`);
  // Renovação de usuário logado: gravamos o e-mail da conta (definido no servidor,
  // não pelo cliente) para o pagamento amarrar SEMPRE à conta certa — mesmo que a
  // pessoa digite outro e-mail na página do Asaas.
  if (email) partes.push(`email=${email}`);
  return partes.join(";");
}

function lerReferencia(ref: string): { meses: number; cupom: string | null; email: string | null } {
  const map = new Map(ref.split(";").map((p) => {
    const [k, v] = p.split("=");
    return [k.trim(), (v ?? "").trim()];
  }));
  const meses = Number(map.get("meses"));
  return {
    meses: Number.isInteger(meses) && meses > 0 && meses <= 24 ? meses : 1,
    cupom: map.get("cupom") || null,
    email: map.get("email") || null,
  };
}

function estende(dias: number, base: Date | null): Date {
  // A partir do maior entre hoje e o vencimento atual: renovar antes do fim não
  // faz o cliente perder os dias já pagos.
  const partida = base && base.getTime() > Date.now() ? base : new Date();
  return new Date(partida.getTime() + dias * 86_400_000);
}

type Payment = Record<string, unknown>;

/**
 * Processa um pagamento confirmado do Asaas. Opção 2: se não existe conta com
 * aquele e-mail, o pagamento CRIA a conta e manda a senha por e-mail.
 *
 * Idempotente: o Asaas reenvia o mesmo evento se achar que não recebeu resposta.
 * O `asaasId` único no Pagamento garante que reprocessar não dá acesso dobrado.
 *
 * Nunca lança: o webhook precisa responder 200 mesmo em caso de erro parcial,
 * senão o Asaas reenvia em loop. Erros são logados e viram um status de retorno.
 */
export async function processarPagamentoAsaas(payment: Payment): Promise<{ status: string }> {
  const asaasId = String(payment.id ?? "");
  if (!asaasId) return { status: "sem-id" };

  // 1. IDEMPOTÊNCIA — se já processamos este pagamento, para aqui.
  const jaFeito = await prisma.pagamento.findUnique({ where: { asaasId }, select: { id: true } });
  if (jaFeito) return { status: "ja-processado" };

  const valor = Number(payment.value) || 0;
  const billing = String(payment.billingType ?? "");
  const metodo = billing.includes("PIX") ? "PIX" : billing.includes("CREDIT") ? "CARTAO" : "OUTRO";
  const { meses, cupom, email: emailRef } = lerReferencia(String(payment.externalReference ?? ""));

  // 2. E-MAIL DO CLIENTE — o payload traz o id do cliente; buscamos nome/e-mail.
  // Se a referência trouxe um e-mail (renovação de logado), ele MANDA — amarra à
  // conta certa mesmo que a pessoa tenha digitado outro e-mail no Asaas.
  const custId = String(payment.customer ?? "");
  if (!custId) return { status: "sem-cliente" };
  const cust = await asaasFetch(`/customers/${custId}`);
  if (!cust.ok || !cust.body || typeof cust.body !== "object") {
    console.error(`[asaas] cliente ${custId} não encontrado (${cust.status})`);
    return { status: "cliente-nao-encontrado" };
  }
  const dados = cust.body as { email?: string; name?: string };
  const email = (emailRef ?? String(dados.email ?? "")).trim().toLowerCase();
  const nome = String(dados.name ?? "").trim() || email;
  if (!email) return { status: "sem-email" };

  // 3. ACHA OU CRIA A CONTA (Opção 2).
  let user = await prisma.user.findUnique({ where: { email } });
  let senhaGerada: string | null = null;

  if (!user) {
    // Senha aleatória forte — o cliente troca depois. Vai por e-mail, nunca fica
    // registrada em texto (guardamos só o hash).
    senhaGerada = randomBytes(6).toString("base64url"); // ~8 chars
    // Cupom só na PRIMEIRA assinatura: define o afiliado de forma permanente.
    const afiliado = cupom
      ? await prisma.afiliado.findUnique({ where: { cupom }, select: { id: true } })
      : null;
    user = await prisma.user.create({
      data: {
        nome,
        email,
        senhaHash: hashPassword(senhaGerada),
        role: "CLIENTE",
        status: "ATIVO",
        assinaturaAte: estende(meses * 30, null),
        afiliadoId: afiliado?.id ?? null,
      },
    });
  } else {
    // Conta existente = renovação. Não mexe no afiliado (atribuição é permanente).
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        assinaturaAte: estende(meses * 30, user.assinaturaAte),
        status: user.status === "BLOQUEADO" ? "BLOQUEADO" : "ATIVO",
      },
    });
  }

  // 4. COMISSÃO — congelada no momento do pagamento (a % do afiliado pode mudar
  // depois; o histórico não pode ser reescrito). Usa o afiliado JÁ ligado ao
  // cliente, seja da 1ª assinatura ou herdado de antes.
  let afiliadoId: string | null = user.afiliadoId ?? null;
  let comissaoPct = 0;
  let comissaoValor = 0;
  if (afiliadoId) {
    const af = await prisma.afiliado.findUnique({ where: { id: afiliadoId }, select: { comissaoPct: true, ativo: true } });
    if (af && af.ativo) {
      comissaoPct = af.comissaoPct;
      comissaoValor = Math.round(valor * comissaoPct) / 100;
    } else {
      afiliadoId = null; // afiliado sumiu/inativo: registra pagamento sem comissão
    }
  }

  // 5. REGISTRA O PAGAMENTO (com o asaasId que trava a idempotência).
  await prisma.pagamento.create({
    data: { userId: user.id, valor, meses, metodo, asaasId, afiliadoId, comissaoPct, comissaoValor },
  });

  // 6. BOAS-VINDAS (só conta nova). Falha de e-mail não derruba nada: o acesso
  // já foi liberado; no pior caso o cliente pede a senha pelo suporte.
  if (senhaGerada) {
    await enviarEmail(
      email,
      "Bem-vindo ao ApexMonitor — seus dados de acesso",
      `Olá, ${nome}!\n\nSua assinatura do ApexMonitor está ativa.\n\n` +
        `Acesse: https://apexmonitor.com.br/login\nE-mail: ${email}\nSenha: ${senhaGerada}\n\n` +
        `Troque a senha no primeiro acesso.\n\nBoas operações!`,
    );
  }

  return { status: senhaGerada ? "conta-criada" : "renovado" };
}

// Ciclo do Asaas por plano (cartão recorrente). O Pix é avulso, não usa isto.
const CICLO_ASAAS: Record<string, string> = {
  mensal: "MONTHLY",
  trimestral: "QUARTERLY",
  anual: "YEARLY",
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Cria um checkout hospedado no Asaas e devolve o link pra onde redirecionar o
 * cliente. Cartão → assinatura RECORRENTE (debita sozinho a cada ciclo). Pix →
 * cobrança AVULSA (DETACHED) do período (renova manualmente depois).
 *
 * O Asaas coleta nome/CPF/endereço na página dele — por isso não mandamos
 * customerData. Para renovação de logado, o e-mail vai na externalReference.
 */
export async function criarCheckoutAsaas(opts: {
  planoId: string;
  metodo: "CARTAO" | "PIX";
  cupom?: string | null;
  emailLogado?: string | null;
}): Promise<{ ok: boolean; link?: string; erro?: string }> {
  const plano = planoPorId(opts.planoId);
  if (!plano) return { ok: false, erro: "Plano inválido." };

  // Cupom → desconto (aplicado ao valor cobrado). Cupom inválido é ignorado.
  let desconto = 0;
  let cupomValido: string | null = null;
  if (opts.cupom?.trim()) {
    const cup = opts.cupom.trim().toUpperCase();
    const af = await prisma.afiliado.findUnique({ where: { cupom: cup }, select: { descontoPct: true, ativo: true } });
    if (af?.ativo) {
      desconto = af.descontoPct;
      cupomValido = cup;
    }
  }
  const valor = Math.round(plano.valor * (1 - desconto / 100) * 100) / 100;
  const ref = montarReferencia(plano.meses, cupomValido, opts.emailLogado ?? null);

  const hoje = new Date();
  const body: Record<string, unknown> = {
    minutesToExpire: 60,
    callback: {
      successUrl: "https://apexmonitor.com.br/assinatura/sucesso",
      cancelUrl: "https://apexmonitor.com.br/assinar",
      expiredUrl: "https://apexmonitor.com.br/assinar",
    },
    items: [{ name: `ApexMonitor ${plano.nome}`, description: `Assinatura ${plano.nome} do ApexMonitor`, quantity: 1, value: valor }],
    externalReference: ref,
  };

  if (opts.metodo === "CARTAO") {
    body.billingTypes = ["CREDIT_CARD"];
    body.chargeTypes = ["RECURRENT"];
    body.subscription = {
      cycle: CICLO_ASAAS[plano.id],
      nextDueDate: ymd(hoje),
      endDate: ymd(new Date(hoje.getTime() + 5 * 365 * 86_400_000)), // ~5 anos = "indefinido"
    };
  } else {
    body.billingTypes = ["PIX"];
    body.chargeTypes = ["DETACHED"];
  }

  const r = await asaasFetch("/checkouts", { method: "POST", body });
  if (!r.ok || !r.body || typeof r.body !== "object") {
    const errs = (r.body as { errors?: { description?: string }[] } | null)?.errors;
    const msg = errs?.[0]?.description ?? `Falha ao criar checkout (${r.status})`;
    console.error(`[asaas] checkout falhou: ${msg}`);
    return { ok: false, erro: msg };
  }
  const link = (r.body as { link?: string }).link;
  if (!link) return { ok: false, erro: "Checkout sem link de pagamento." };
  return { ok: true, link };
}
