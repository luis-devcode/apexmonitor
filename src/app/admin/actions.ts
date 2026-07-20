"use server";

import { revalidatePath } from "next/cache";
import { asaasFetch } from "@/lib/asaas";
import { reverterPagamentoAsaas } from "@/lib/assinatura";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Toda ação daqui é de administrador. Falha fechada: quem não for ADMIN nunca
 * executa nada. Retornar (em vez de redirect) deixa o formulário mostrar o erro.
 */
async function exigirAdmin(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return "Acesso restrito ao administrador.";
  return null;
}

function fim(dias: number, base?: Date | null): Date {
  // Estende a partir de hoje OU da data atual de vencimento, o que for maior —
  // assim renovar antes do fim não faz o cliente perder os dias que já pagou.
  const partida = base && base.getTime() > Date.now() ? base : new Date();
  return new Date(partida.getTime() + dias * 86_400_000);
}

/** Cria um cliente novo já com acesso liberado por `meses`. */
export async function criarClienteAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const erro = await exigirAdmin();
  if (erro) return erro;

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const meses = Number(formData.get("meses") ?? 1);

  if (!nome) return "Informe o nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail inválido.";
  if (senha.length < 8) return "A senha precisa de ao menos 8 caracteres.";
  if (!Number.isInteger(meses) || meses < 1 || meses > 24) return "Meses deve ser entre 1 e 24.";

  const jaExiste = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (jaExiste) return "Já existe um usuário com esse e-mail.";

  await prisma.user.create({
    data: {
      nome,
      email,
      senhaHash: hashPassword(senha),
      role: "CLIENTE",
      status: "ATIVO",
      assinaturaAte: fim(meses * 30),
    },
  });

  revalidatePath("/admin");
  return undefined;
}

/** Soma dias de acesso a um cliente (renovação). */
export async function estenderAcessoAction(formData: FormData): Promise<void> {
  if (await exigirAdmin()) return;

  const userId = String(formData.get("userId") ?? "");
  const dias = Number(formData.get("dias") ?? 0);
  if (!userId || !Number.isInteger(dias) || dias <= 0) return;

  const alvo = await prisma.user.findUnique({ where: { id: userId }, select: { assinaturaAte: true, role: true } });
  if (!alvo || alvo.role === "ADMIN") return; // nunca mexe em admin

  await prisma.user.update({
    where: { id: userId },
    data: { assinaturaAte: fim(dias, alvo.assinaturaAte) },
  });
  revalidatePath("/admin");
}

/**
 * Estorna um pagamento pelo Asaas (devolve o dinheiro ao cliente) e retira o
 * acesso que ele concedeu. Vale para cartão e Pix. Idempotente: o webhook
 * PAYMENT_REFUNDED que o Asaas dispara depois reforça sem duplicar.
 */
export async function estornarPagamentoAction(formData: FormData): Promise<void> {
  if (await exigirAdmin()) return;

  const pagamentoId = String(formData.get("pagamentoId") ?? "");
  if (!pagamentoId) return;

  const pag = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    select: { asaasId: true, estornadoEm: true },
  });
  // Só dá pra estornar pagamento do Asaas ainda não estornado.
  if (!pag || pag.estornadoEm || !pag.asaasId) return;

  // 1) Pede o estorno ao Asaas.
  const r = await asaasFetch(`/payments/${pag.asaasId}/refund`, { method: "POST" });
  if (!r.ok) {
    console.error(`[admin] estorno Asaas falhou p/ ${pag.asaasId} (${r.status})`);
    return;
  }
  // 2) Retira o acesso já (o webhook reforça, idempotente).
  await reverterPagamentoAsaas({ id: pag.asaasId });
  revalidatePath("/admin");
}

/** Bloqueia ou reativa um cliente. */
export async function alternarBloqueioAction(formData: FormData): Promise<void> {
  if (await exigirAdmin()) return;

  const userId = String(formData.get("userId") ?? "");
  const alvo = await prisma.user.findUnique({ where: { id: userId }, select: { status: true, role: true } });
  if (!alvo || alvo.role === "ADMIN") return; // o admin não se bloqueia

  await prisma.user.update({
    where: { id: userId },
    data: { status: alvo.status === "BLOQUEADO" ? "ATIVO" : "BLOQUEADO" },
  });
  revalidatePath("/admin");
}
