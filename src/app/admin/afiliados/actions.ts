"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function exigirAdmin(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return "Acesso restrito ao administrador.";
  return null;
}

// Cupom: só letras/números, maiúsculo, sem espaço. É o que o cliente digita.
function normalizarCupom(bruto: string): string {
  return bruto.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function pct(valor: FormDataEntryValue | null): number | null {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

export async function criarAfiliadoAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const erro = await exigirAdmin();
  if (erro) return erro;

  const nome = String(formData.get("nome") ?? "").trim();
  const cupom = normalizarCupom(String(formData.get("cupom") ?? ""));
  const comissaoPct = pct(formData.get("comissaoPct"));
  const descontoPct = pct(formData.get("descontoPct"));
  const chavePix = String(formData.get("chavePix") ?? "").trim() || null;

  if (!nome) return "Informe o nome do afiliado.";
  if (cupom.length < 3) return "O cupom precisa de ao menos 3 caracteres (letras e números).";
  if (comissaoPct === null) return "Comissão deve ser entre 0 e 100.";
  if (descontoPct === null) return "Desconto deve ser entre 0 e 100.";

  const jaExiste = await prisma.afiliado.findUnique({ where: { cupom }, select: { id: true } });
  if (jaExiste) return `O cupom ${cupom} já está em uso.`;

  await prisma.afiliado.create({
    data: { nome, cupom, comissaoPct, descontoPct, chavePix },
  });

  revalidatePath("/admin/afiliados");
  return undefined;
}

export async function editarAfiliadoAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const erro = await exigirAdmin();
  if (erro) return erro;

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const cupom = normalizarCupom(String(formData.get("cupom") ?? ""));
  const comissaoPct = pct(formData.get("comissaoPct"));
  const descontoPct = pct(formData.get("descontoPct"));
  const chavePix = String(formData.get("chavePix") ?? "").trim() || null;

  if (!id) return "Afiliado não encontrado.";
  if (!nome) return "Informe o nome do afiliado.";
  if (cupom.length < 3) return "O cupom precisa de ao menos 3 caracteres.";
  if (comissaoPct === null) return "Comissão deve ser entre 0 e 100.";
  if (descontoPct === null) return "Desconto deve ser entre 0 e 100.";

  // Cupom só pode colidir com OUTRO afiliado, não com ele mesmo.
  const dono = await prisma.afiliado.findUnique({ where: { cupom }, select: { id: true } });
  if (dono && dono.id !== id) return `O cupom ${cupom} já está em uso por outro afiliado.`;

  await prisma.afiliado.update({
    where: { id },
    data: { nome, cupom, comissaoPct, descontoPct, chavePix },
  });

  revalidatePath("/admin/afiliados");
  return undefined;
}

export async function alternarAfiliadoAction(formData: FormData): Promise<void> {
  if (await exigirAdmin()) return;

  const id = String(formData.get("id") ?? "");
  const alvo = await prisma.afiliado.findUnique({ where: { id }, select: { ativo: true } });
  if (!alvo) return;

  await prisma.afiliado.update({ where: { id }, data: { ativo: !alvo.ativo } });
  revalidatePath("/admin/afiliados");
}
