import "server-only";

/**
 * Envio de e-mail transacional pela API HTTP do Resend (a mesma usada pelos
 * alertas do servidor). HTTP, não SMTP: a Hetzner bloqueia as portas de e-mail
 * em conta nova, mas a 443 passa.
 *
 * Falha fechada e silenciosa: se a chave não estiver configurada ou o Resend
 * recusar, retorna false e loga — nunca lança. Um e-mail que não saiu não pode
 * derrubar o webhook (o cliente já pagou; o acesso tem que ser liberado mesmo
 * que o e-mail de boas-vindas falhe).
 */
export async function enviarEmail(para: string, assunto: string, texto: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[email] RESEND_API_KEY ausente — e-mail não enviado");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ApexMonitor <onboarding@resend.dev>",
        to: [para],
        subject: assunto,
        text: texto,
      }),
    });
    if (!res.ok) {
      console.error(`[email] Resend recusou (${res.status})`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email] falha ao enviar: ${(e as Error).message}`);
    return false;
  }
}
