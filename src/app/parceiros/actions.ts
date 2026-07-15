"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PERIODOS = new Set(["DIA", "SEMANA", "MES"]);
const onlyDigits = (value: string) => value.replace(/\D/g, "");

const money = (raw: FormDataEntryValue | null) => {
  const value = String(raw ?? "").trim().replace(/R\$|\s/g, "");
  if (!value) return 0;
  return Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value);
};

/** Cadastra uma pessoa (CPF) usada para abrir contas nas casas. */
export async function addParceiroAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const nome = (formData.get("nome") as string | null)?.trim();
  const documentoRaw = ((formData.get("documento") as string | null) ?? "").trim();
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase() || null;
  const custoValor = money(formData.get("custoValor"));
  const custoPeriodoRaw = String(formData.get("custoPeriodo") ?? "MES");
  const custoPeriodo = PERIODOS.has(custoPeriodoRaw) ? custoPeriodoRaw : "MES";
  const documento = onlyDigits(documentoRaw) || null;

  if (!nome) return "Informe o nome do parceiro.";
  if (documento && documento.length !== 11) return "O CPF deve ter 11 dígitos.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um email válido ou deixe em branco.";
  if (!Number.isFinite(custoValor) || custoValor < 0) return "Informe um valor de pagamento válido.";

  const userId = await requireUserId();
  if (documento) {
    const existing = await prisma.parceiro.findFirst({ where: { userId, documento } });
    if (existing) return `Já existe um parceiro com esse CPF (${existing.nome}).`;
  }

  await prisma.parceiro.create({ data: { userId, nome, documento, email, custoValor, custoPeriodo } });
  revalidatePath("/parceiros");
  return undefined;
}

/** Edita um parceiro existente. */
export async function updateParceiroAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const id = ((formData.get("id") as string | null) ?? "").trim();
  const nome = (formData.get("nome") as string | null)?.trim();
  const documentoRaw = ((formData.get("documento") as string | null) ?? "").trim();
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase() || null;
  const custoValor = money(formData.get("custoValor"));
  const custoPeriodoRaw = String(formData.get("custoPeriodo") ?? "MES");
  const custoPeriodo = PERIODOS.has(custoPeriodoRaw) ? custoPeriodoRaw : "MES";
  const documento = onlyDigits(documentoRaw) || null;

  if (!id) return "Parceiro inválido.";
  if (!nome) return "Informe o nome do parceiro.";
  if (documento && documento.length !== 11) return "O CPF deve ter 11 dígitos.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um email válido ou deixe em branco.";
  if (!Number.isFinite(custoValor) || custoValor < 0) return "Informe um valor de pagamento válido.";

  const userId = await requireUserId();
  if (documento) {
    const existing = await prisma.parceiro.findFirst({ where: { userId, documento, NOT: { id } } });
    if (existing) return `Já existe outro parceiro com esse CPF (${existing.nome}).`;
  }

  // updateMany com userId no where: se o registro não for do dono, nada acontece.
  const { count } = await prisma.parceiro.updateMany({
    where: { id, userId },
    data: { nome, documento, email, custoValor, custoPeriodo },
  });
  if (count === 0) return "Parceiro não encontrado.";
  revalidatePath("/parceiros");
  return undefined;
}

/** Ativa ou arquiva um parceiro (não apaga histórico). */
export async function setParceiroAtivoAction(id: string, ativo: boolean): Promise<void> {
  const userId = await requireUserId();
  await prisma.parceiro.updateMany({ where: { id, userId }, data: { ativo } });
  revalidatePath("/parceiros");
}

/** Remove somente parceiro sem qualquer histórico. Os demais devem ser arquivados. */
export async function deleteParceiroAction(id: string): Promise<void> {
  const userId = await requireUserId();
  const [contas, operacoes, freebets] = await Promise.all([
    prisma.conta.count({ where: { userId, parceiroId: id } }),
    prisma.operacao.count({ where: { userId, parceiroId: id } }),
    prisma.freebet.count({ where: { userId, parceiroId: id } }),
  ]);
  if (contas > 0 || operacoes > 0 || freebets > 0) return;

  await prisma.parceiro.deleteMany({ where: { id, userId } });
  revalidatePath("/parceiros");
  revalidatePath("/banca");
}
