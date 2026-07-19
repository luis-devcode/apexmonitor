"use server";

import { redirect } from "next/navigation";
import { redefinirComToken } from "@/lib/reset-senha";

/** Define a nova senha a partir do link. Sucesso → manda pro login. */
export async function redefinirAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const token = String(formData.get("token") ?? "");
  const nova = String(formData.get("novaSenha") ?? "");
  const confirma = String(formData.get("confirmaSenha") ?? "");

  if (nova.length < 8) return "A nova senha precisa de ao menos 8 caracteres.";
  if (nova !== confirma) return "A confirmação não bate com a nova senha.";

  const erro = await redefinirComToken(token, nova);
  if (erro) return erro;

  redirect("/login?redefinida=1");
}
