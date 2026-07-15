"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, semUsuarios, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Entrar no sistema. */
export async function loginAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) return "Informe email e senha.";

  const user = await prisma.user.findUnique({ where: { email } });
  // Mensagem genérica de propósito: não revelamos se o email existe.
  if (!user || !verifyPassword(senha, user.senhaHash)) return "Email ou senha incorretos.";
  if (user.status === "BLOQUEADO") return "Seu acesso está bloqueado. Fale com o suporte.";

  await createSession(user.id);
  redirect("/");
}

/**
 * Primeiro acesso: cria a conta de administrador. Só funciona se não houver
 * nenhum usuário AINDA e — em produção — se quem preencher souber o token de
 * instalação (ADMIN_SETUP_TOKEN no .env do servidor). Sem isso, o primeiro
 * estranho a abrir o site num banco vazio viraria dono. Falha fechada.
 */
export async function criarAdminAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  if (!(await semUsuarios())) return "Já existe uma conta. Faça login.";

  // Trava de instalação. Em produção o token é obrigatório; em dev, se não houver
  // token configurado, liberamos por conveniência.
  const setupToken = process.env.ADMIN_SETUP_TOKEN?.trim();
  const tokenInformado = String(formData.get("token") ?? "").trim();
  if (setupToken) {
    if (tokenInformado !== setupToken) return "Token de instalação inválido.";
  } else if (process.env.NODE_ENV === "production") {
    return "Instalação bloqueada. Configure ADMIN_SETUP_TOKEN no servidor.";
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!nome) return "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um email válido.";
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";

  const user = await prisma.user.create({
    data: { nome, email, senhaHash: hashPassword(senha), role: "ADMIN", status: "ATIVO" },
  });

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
