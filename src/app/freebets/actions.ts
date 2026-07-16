"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { canonicalHouseName, normHouse } from "@/lib/houses";
import { readCloneGroups } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";

const STATUS = new Set(["PENDENTE", "EXTRAIDA", "EXPIRADA"]);

const money = (raw: FormDataEntryValue | null) => {
  const value = String(raw ?? "").trim().replace(/R\$|\s/g, "");
  if (!value) return 0;
  return Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value);
};

/** Registra uma nova freebet recebida. */
export async function addFreebetAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const casaNome = ((formData.get("casaNome") as string | null) ?? "").trim();
  const parceiroId = ((formData.get("parceiroId") as string | null) ?? "").trim() || null;
  const valor = money(formData.get("valor"));
  const tipo = ((formData.get("tipo") as string | null) ?? "").trim() || null;
  const procedimento = ((formData.get("procedimento") as string | null) ?? "").trim() || null;
  const requisito = ((formData.get("requisito") as string | null) ?? "").trim() || null;
  const expiraRaw = ((formData.get("expiraEm") as string | null) ?? "").trim();
  const notas = ((formData.get("notas") as string | null) ?? "").trim() || null;

  if (!casaNome) return "Selecione a casa de apostas.";
  if (!Number.isFinite(valor) || valor <= 0) return "Informe o valor da freebet.";

  let expiraEm: Date | null = null;
  if (expiraRaw) {
    const parsed = new Date(expiraRaw);
    if (Number.isNaN(parsed.getTime())) return "Data de validade inválida.";
    expiraEm = parsed;
  }

  if (parceiroId) {
    const parceiro = await prisma.parceiro.findFirst({ where: { id: parceiroId, userId, ativo: true } });
    if (!parceiro) return "Parceiro não encontrado ou arquivado.";
  }

  // Garante a casa DESTE usuário (cria com logo do diretório se necessário).
  const cloneGroups = await readCloneGroups();
  const clone = cloneGroups.find((house) => normHouse(canonicalHouseName(house.name)) === normHouse(canonicalHouseName(casaNome)));
  const casa =
    (await prisma.casa.findFirst({ where: { userId, nome: casaNome } })) ??
    (await prisma.casa.create({ data: { userId, nome: casaNome, logoUrl: clone?.logoUrl || null } }));

  await prisma.freebet.create({
    data: { userId, casaId: casa.id, parceiroId, valor, tipo, procedimento, requisito, expiraEm, notas, status: "PENDENTE" },
  });

  revalidatePath("/freebets");
  return undefined;
}

/**
 * Edita uma freebet já cadastrada (corrigir valor, validade, parceiro…).
 * Não mexe no status nem no vínculo com a operação que a gerou/consumiu —
 * isso é histórico e tem dono próprio.
 */
export async function editarFreebetAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const id = ((formData.get("id") as string | null) ?? "").trim();
  const casaNome = ((formData.get("casaNome") as string | null) ?? "").trim();
  const parceiroId = ((formData.get("parceiroId") as string | null) ?? "").trim() || null;
  const valor = money(formData.get("valor"));
  const tipo = ((formData.get("tipo") as string | null) ?? "").trim() || null;
  const procedimento = ((formData.get("procedimento") as string | null) ?? "").trim() || null;
  const requisito = ((formData.get("requisito") as string | null) ?? "").trim() || null;
  const expiraRaw = ((formData.get("expiraEm") as string | null) ?? "").trim();
  const notas = ((formData.get("notas") as string | null) ?? "").trim() || null;

  if (!id) return "Freebet inválida.";
  if (!casaNome) return "Selecione a casa de apostas.";
  if (!Number.isFinite(valor) || valor <= 0) return "Informe o valor da freebet.";

  // Só edita o que é DESTE usuário (falha fechada).
  const atual = await prisma.freebet.findFirst({ where: { id, userId }, select: { id: true } });
  if (!atual) return "Freebet não encontrada.";

  let expiraEm: Date | null = null;
  if (expiraRaw) {
    const parsed = new Date(expiraRaw);
    if (Number.isNaN(parsed.getTime())) return "Data de validade inválida.";
    expiraEm = parsed;
  }

  if (parceiroId) {
    const parceiro = await prisma.parceiro.findFirst({ where: { id: parceiroId, userId, ativo: true } });
    if (!parceiro) return "Parceiro não encontrado ou arquivado.";
  }

  const cloneGroups = await readCloneGroups();
  const clone = cloneGroups.find((house) => normHouse(canonicalHouseName(house.name)) === normHouse(canonicalHouseName(casaNome)));
  const casa =
    (await prisma.casa.findFirst({ where: { userId, nome: casaNome } })) ??
    (await prisma.casa.create({ data: { userId, nome: casaNome, logoUrl: clone?.logoUrl || null } }));

  await prisma.freebet.updateMany({
    where: { id, userId },
    data: { casaId: casa.id, parceiroId, valor, tipo, procedimento, requisito, expiraEm, notas },
  });

  revalidatePath("/freebets");
  return undefined;
}

/** Registra o valor extraído (converte a freebet em dinheiro) e marca como extraída. */
export async function setFreebetExtraidoAction(id: string, valorExtraido: number): Promise<void> {
  const userId = await requireUserId();
  if (!Number.isFinite(valorExtraido) || valorExtraido < 0) return;
  await prisma.freebet.updateMany({ where: { id, userId }, data: { valorExtraido, status: "EXTRAIDA" } });
  revalidatePath("/freebets");
}

/** Marca a freebet como extraída (com o valor real extraído) ou volta para pendente. */
export async function extrairFreebetAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const id = ((formData.get("id") as string | null) ?? "").trim();
  const valorExtraido = money(formData.get("valorExtraido"));
  if (!id) return "Freebet inválida.";
  if (!Number.isFinite(valorExtraido) || valorExtraido < 0) return "Valor extraído inválido.";

  await prisma.freebet.updateMany({ where: { id, userId }, data: { status: "EXTRAIDA", valorExtraido } });
  revalidatePath("/freebets");
  return undefined;
}

/** Altera o status direto (PENDENTE | EXTRAIDA | EXPIRADA). */
export async function setFreebetStatusAction(id: string, status: string): Promise<void> {
  const userId = await requireUserId();
  if (!STATUS.has(status)) return;
  const data: { status: string; valorExtraido?: number | null } = { status };
  if (status !== "EXTRAIDA") data.valorExtraido = null;
  await prisma.freebet.updateMany({ where: { id, userId }, data });
  revalidatePath("/freebets");
}

export async function deleteFreebetAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.freebet.deleteMany({ where: { id, userId } });
  revalidatePath("/freebets");
}
