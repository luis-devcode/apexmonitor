"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { criarCheckoutAsaas } from "@/lib/assinatura";
import { planoPorId } from "@/lib/planos";

/**
 * Inicia o checkout: cria a sessão no Asaas e manda o cliente pro link de
 * pagamento. Se houver alguém logado, amarra o pagamento ao e-mail da conta
 * (renovação segura). Erro volta como querystring pra página exibir.
 */
export async function iniciarCheckoutAction(formData: FormData): Promise<void> {
  const planoId = String(formData.get("plano") ?? "");
  const metodoRaw = String(formData.get("metodo") ?? "CARTAO");
  const metodo = metodoRaw === "PIX" ? "PIX" : "CARTAO";
  const cupom = String(formData.get("cupom") ?? "").trim() || null;

  if (!planoPorId(planoId)) redirect("/assinar?erro=" + encodeURIComponent("Escolha um plano válido."));

  // Logado renovando → amarra ao e-mail da conta (definido no servidor).
  const user = await getCurrentUser();

  const r = await criarCheckoutAsaas({ planoId, metodo, cupom, emailLogado: user?.email ?? null });
  if (!r.ok || !r.link) {
    redirect("/assinar?erro=" + encodeURIComponent(r.erro ?? "Não foi possível iniciar o pagamento."));
  }
  redirect(r.link!);
}
