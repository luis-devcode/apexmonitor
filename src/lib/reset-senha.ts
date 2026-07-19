import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { enviarEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/**
 * "Esqueci minha senha". Fluxo por LINK (não reenvia senha):
 *  - pedirResetSenha: cria um token, guarda só o HASH dele, manda o link por e-mail.
 *  - tokenResetValido: confere se o link ainda vale (existe, não usado, não expirou).
 *  - redefinirComToken: consome o link e grava a nova senha.
 *
 * Por que link e não "resetar e mandar senha nova": a senha só muda quando a
 * PRÓPRIA pessoa clica e define. Assim, pedir reset do e-mail de outro não
 * tranca ninguém pra fora (só geraria um link que a vítima ignora).
 */

const RESET_TTL_MIN = 60; // o link vale 1 hora
const hashTok = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Cria o link e manda por e-mail. NÃO revela se o e-mail existe — a página
 * sempre responde a mesma coisa, então ninguém descobre quem é cliente por aqui.
 */
export async function pedirResetSenha(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, nome: true, status: true },
  });
  // Conta inexistente ou bloqueada: silêncio (sem vazar existência).
  if (!user || user.status === "BLOQUEADO") return;

  // Um link ativo por vez: invalida pedidos anteriores não usados.
  await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MIN * 60_000);
  await prisma.passwordReset.create({
    data: { tokenHash: hashTok(token), userId: user.id, expiresAt },
  });

  const link = `https://apexmonitor.com.br/redefinir-senha?token=${token}`;
  await enviarEmail(
    email,
    "Redefinir sua senha — ApexMonitor",
    `Olá, ${user.nome}!\n\n` +
      `Recebemos um pedido para redefinir a senha da sua conta no ApexMonitor.\n\n` +
      `Crie uma nova senha por aqui (o link vale ${RESET_TTL_MIN} minutos):\n${link}\n\n` +
      `Se não foi você, ignore este e-mail — sua senha continua a mesma.\n\n` +
      `— Equipe ApexMonitor`,
  );
}

/** O link ainda vale? (existe, não foi usado e não expirou) */
export async function tokenResetValido(token: string): Promise<boolean> {
  if (!token) return false;
  const r = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashTok(token) },
    select: { expiresAt: true, usedAt: true },
  });
  return !!r && !r.usedAt && r.expiresAt > new Date();
}

/**
 * Consome o link e grava a nova senha. Retorna a mensagem de erro (string) ou
 * null em caso de sucesso. Redefinir derruba TODAS as sessões abertas da conta —
 * se o motivo foi conta comprometida, o invasor é desconectado junto.
 */
export async function redefinirComToken(token: string, novaSenha: string): Promise<string | null> {
  if (novaSenha.length < 8) return "A senha precisa de ao menos 8 caracteres.";

  const r = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashTok(token) },
    include: { user: { select: { id: true, status: true } } },
  });
  if (!r || r.usedAt || r.expiresAt < new Date()) return "Link inválido ou expirado. Peça um novo.";
  if (r.user.status === "BLOQUEADO") return "Conta bloqueada. Fale com o suporte.";

  await prisma.$transaction([
    prisma.user.update({ where: { id: r.userId }, data: { senhaHash: hashPassword(novaSenha) } }),
    prisma.passwordReset.update({ where: { id: r.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: r.userId } }),
  ]);
  return null;
}
