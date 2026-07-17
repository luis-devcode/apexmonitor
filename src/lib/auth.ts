import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const COOKIE = "sessao";
const SESSION_DAYS = 30;

/**
 * Quantas sessões um usuário pode ter ao mesmo tempo.
 *
 * Em 1, entrar num aparelho desconecta todos os outros. É o que impede uma
 * assinatura de servir um grupo — sem isso, um cliente paga e cinco usam.
 * O custo é atrito real para o cliente legítimo: abrir no celular derruba o
 * computador. Subir para 2 (celular + computador) é só trocar este número.
 */
const MAX_SESSOES = 1;

/* ---------------------------------------------------------------------------
 * Senha: hash de MÃO ÚNICA (scrypt + salt). Nunca guardamos a senha original.
 * Formato guardado: "salt:hash" (ambos em hex).
 * ------------------------------------------------------------------------- */
export function hashPassword(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(senha: string, guardado: string): boolean {
  const [salt, hash] = guardado.split(":");
  if (!salt || !hash) return false;
  const candidato = scryptSync(senha, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (candidato.length !== original.length) return false;
  // Comparação em tempo constante (evita ataque de timing).
  return timingSafeEqual(candidato, original);
}

/* ---------------------------------------------------------------------------
 * Sessão: token aleatório no cookie httpOnly; no banco guardamos só o hash dele.
 * ------------------------------------------------------------------------- */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  // Sessão vencida não conta pro limite e ninguém a apaga sozinha: quem nunca
  // mais voltar deixaria linhas acumuladas pra sempre. Aproveita o login.
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });

  // Derruba as mais antigas até caber o login novo. Guarda as MAX_SESSOES - 1
  // mais recentes; o `skip` sobre a ordem decrescente deixa justamente o excesso.
  // O login novo SEMPRE entra — quem sai é quem estava aqui há mais tempo.
  const excedentes = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    skip: MAX_SESSOES - 1,
  });
  if (excedentes.length > 0) {
    await prisma.session.deleteMany({ where: { id: { in: excedentes.map((s) => s.id) } } });
  }

  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  nome: string;
  role: string;
  status: string;
  assinaturaAte: Date | null;
  plano: string | null;
};

/** Usuário da sessão atual (ou null). Sessão expirada é descartada. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    nome: user.nome,
    role: user.role,
    status: user.status,
    assinaturaAte: user.assinaturaAte,
    plano: user.plano,
  };
}

/**
 * O ID do dono dos dados. TODA query de dados do produto precisa filtrar por
 * ele — é o que garante o isolamento entre clientes (multi-tenant).
 * Sem sessão válida, manda pro login (falha fechada: nunca vaza dado).
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!assinaturaAtiva(user)) redirect("/assinatura");
  return user.id;
}

/** Assinatura em dia? (admin nunca é bloqueado) */
export function assinaturaAtiva(user: SessionUser): boolean {
  if (user.status === "BLOQUEADO") return false;
  if (user.role === "ADMIN") return true;
  if (!user.assinaturaAte) return false;
  return user.assinaturaAte.getTime() > Date.now();
}

/**
 * Guarda das rotas de API. As odds SÃO o produto: sem isto, qualquer um chama
 * /api/markets e leva a base inteira sem pagar nada. Devolve o usuário só se a
 * sessão for válida E a assinatura estiver em dia.
 */
export async function apiUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || !assinaturaAtiva(user)) return null;
  return user;
}

/** Ainda não existe nenhum usuário? (primeiro acesso cria o admin) */
export async function semUsuarios(): Promise<boolean> {
  return (await prisma.user.count()) === 0;
}
