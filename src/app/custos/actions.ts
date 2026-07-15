"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { categoriaValida, periodoValido } from "@/lib/custos";
import { prisma } from "@/lib/prisma";

const money = (raw: FormDataEntryValue | null) => {
  const value = String(raw ?? "").trim().replace(/R\$|\s/g, "");
  if (!value) return NaN;
  return Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value);
};

/** Cadastra um custo fixo da operação (monitor, planilha, internet…). */
export async function addCustoAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const categoriaRaw = String(formData.get("categoria") ?? "OUTRO");
  const periodoRaw = String(formData.get("periodo") ?? "MES");
  const valor = money(formData.get("valor"));
  const diaRaw = String(formData.get("diaVencimento") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!descricao) return "Diga o que é esse custo.";
  if (!Number.isFinite(valor) || valor <= 0) return "Informe um valor maior que zero.";

  const dia = diaRaw ? Number(diaRaw) : null;
  if (dia !== null && (!Number.isInteger(dia) || dia < 1 || dia > 31)) return "O dia de vencimento vai de 1 a 31.";

  await prisma.custo.create({
    data: {
      userId,
      descricao,
      categoria: categoriaValida(categoriaRaw) ? categoriaRaw : "OUTRO",
      periodo: periodoValido(periodoRaw) ? periodoRaw : "MES",
      valor,
      diaVencimento: dia,
      notas,
    },
  });

  revalidatePath("/custos");
  return undefined;
}

/** Pausa ou reativa um custo — serve pra "cancelei esse mês" sem perder o histórico. */
export async function toggleCustoAction(id: string, ativo: boolean): Promise<void> {
  const userId = await requireUserId();
  await prisma.custo.updateMany({ where: { id, userId }, data: { ativo } });
  revalidatePath("/custos");
}

export async function deleteCustoAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.custo.deleteMany({ where: { id, userId } });
  revalidatePath("/custos");
}
