"use server";

import { apiUser } from "@/lib/auth";
import { statusValido } from "@/lib/chat";
import { prisma } from "@/lib/prisma";

const MAX = 2000;

/**
 * Manda uma mensagem no chat. Qualquer membro escreve e qualquer um responde.
 * Marcando como problema, ela nasce ABERTA e vira item da fila de correção.
 */
export async function enviarMensagemAction(
  conteudo: string,
  ehProblema = false,
  respostaAId?: string | null,
): Promise<string | undefined> {
  const user = await apiUser();
  if (!user) return "Sessão expirada. Entre novamente.";

  const texto = conteudo.trim().slice(0, MAX);
  if (!texto) return "Escreva alguma coisa.";

  const idRespondido = respostaAId?.trim() || null;
  if (idRespondido) {
    const existe = await prisma.chatMensagem.findUnique({ where: { id: idRespondido }, select: { id: true } });
    if (!existe) return "A mensagem que você tentou responder não existe mais.";
  }

  await prisma.chatMensagem.create({
    data: {
      conteudo: texto,
      authorId: user.id,
      status: ehProblema ? "ABERTO" : null,
      respostaAId: idRespondido,
    },
  });
  return undefined;
}

/** Muda o estado de um problema relatado. Só o admin fecha. */
export async function marcarStatusBugAction(id: string, status: string): Promise<string | undefined> {
  const user = await apiUser();
  if (!user) return "Sessão expirada.";
  if (user.role !== "ADMIN") return "Só o administrador muda o status de um problema.";
  if (!statusValido(status)) return "Status inválido.";

  await prisma.chatMensagem.updateMany({ where: { id, status: { not: null } }, data: { status } });
  return undefined;
}

/** Apaga a própria mensagem. O admin apaga a de qualquer um (moderação). */
export async function apagarMensagemAction(id: string): Promise<string | undefined> {
  const user = await apiUser();
  if (!user) return "Sessão expirada.";

  const where = user.role === "ADMIN" ? { id } : { id, authorId: user.id };
  const { count } = await prisma.chatMensagem.deleteMany({ where });
  return count > 0 ? undefined : "Você só pode apagar as suas mensagens.";
}
