"use server";

import { excedeu, ipCliente, registrar } from "@/lib/rate-limit";
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

  // Throttle: por IP (não spammar vários e-mails) e por e-mail alvo (não lotar a
  // caixa de uma vítima). Se bloqueado, responde o MESMO genérico sem enviar —
  // não revela o limite nem se a conta existe.
  const ip = await ipCliente();
  const bloq = excedeu(`reset:ip:${ip}`, 6, 60 * 60_000) ?? excedeu(`reset:email:${email}`, 4, 60 * 60_000);
  if (bloq) return { ok: true, msg: GENERICA };
  registrar(`reset:ip:${ip}`);
  registrar(`reset:email:${email}`);

  await pedirResetSenha(email);
  return { ok: true, msg: GENERICA };
}
