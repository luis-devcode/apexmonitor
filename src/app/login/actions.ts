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

/** Primeiro acesso: cria a conta de administrador (só funciona se não houver usuários). */
export async function criarAdminAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  if (!(await semUsuarios())) return "Já existe uma conta. Faça login.";

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
