"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Atualiza o nome do próprio usuário logado. E-mail nunca muda por aqui. */
export async function atualizarNomeAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await getCurrentUser();
  if (!user) return "Sessão expirada. Entre novamente.";

  const nome = String(formData.get("nome") ?? "").trim();
  if (nome.length < 2) return "Informe um nome válido.";

  await prisma.user.update({ where: { id: user.id }, data: { nome } });
  revalidatePath("/conta");
  return undefined;
}

/** Troca a senha do próprio usuário, exigindo a senha atual. */
export async function alterarSenhaAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await getCurrentUser();
  if (!user) return "Sessão expirada. Entre novamente.";

  const atual = String(formData.get("senhaAtual") ?? "");
  const nova = String(formData.get("novaSenha") ?? "");
  const confirma = String(formData.get("confirmaSenha") ?? "");

  if (nova.length < 8) return "A nova senha precisa de ao menos 8 caracteres.";
  if (nova !== confirma) return "A confirmação não bate com a nova senha.";

  // Confere a senha atual — sem isso, quem pegasse a sessão trocaria a senha.
  const dono = await prisma.user.findUnique({ where: { id: user.id }, select: { senhaHash: true } });
  if (!dono || !verifyPassword(atual, dono.senhaHash)) return "Senha atual incorreta.";

  await prisma.user.update({ where: { id: user.id }, data: { senhaHash: hashPassword(nova) } });
  revalidatePath("/conta");
  return "ok"; // sinaliza sucesso pro formulário limpar
}
