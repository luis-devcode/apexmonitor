"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function exigirAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && user.role === "ADMIN";
}

/**
 * Marca como pagas TODAS as comissões pendentes de um afiliado — o repasse é
 * feito em lote (você manda um Pix só com o total). Usa updateMany com o filtro
 * de afiliado + não-paga: nunca mexe em comissão de outro afiliado nem reescreve
 * uma que já estava paga.
 */
export async function marcarComissoesPagasAction(formData: FormData): Promise<void> {
  if (!(await exigirAdmin())) return;

  const afiliadoId = String(formData.get("afiliadoId") ?? "");
  if (!afiliadoId) return;

  await prisma.pagamento.updateMany({
    where: { afiliadoId, comissaoPaga: false },
    data: { comissaoPaga: true, comissaoPagaEm: new Date() },
  });

  revalidatePath("/admin/comissoes");
}
