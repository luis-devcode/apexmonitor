"use server";

import { pedirResetSenha } from "@/lib/reset-senha";

// Resposta SEMPRE igual, exista ou não a conta — assim ninguém descobre quem é
// cliente testando e-mails aqui.
const GENERICA =
  "Se existir uma conta com esse e-mail, enviamos o link de redefinição. Confira sua caixa de entrada (e o spam).";

export type ResetView = { ok: boolean; msg: string } | null;

export async function pedirResetAction(_prev: ResetView, formData: FormData): Promise<ResetView> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, msg: "Informe um e-mail válido." };
  }
  await pedirResetSenha(email);
  return { ok: true, msg: GENERICA };
}
