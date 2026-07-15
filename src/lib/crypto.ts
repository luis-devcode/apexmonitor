import "server-only";
import crypto from "node:crypto";

/**
 * Criptografia reversível para segredos guardados no banco (senha das contas de
 * aposta). O objetivo é LGPD: se o banco vazar, as senhas não vão em texto puro.
 * Mas o dono ainda consegue VER a senha na tela — por isso é reversível (AES-256-GCM),
 * não hash.
 *
 * A chave vem de APP_SECRET_KEY (.env do servidor). Sem a chave configurada, tudo
 * funciona em texto puro (útil em dev) — em produção a chave é obrigatória, e isso
 * está documentado no DEPLOY.md e no .env.example.
 *
 * Formato guardado: "v1:<iv b64>:<tag b64>:<cipher b64>". Qualquer valor que NÃO
 * comece com "v1:" é tratado como texto puro legado (migração preguiçosa: ao
 * editar, o valor é re-gravado já criptografado).
 */
const PREFIX = "v1:";

function chave(): Buffer | null {
  const secret = process.env.APP_SECRET_KEY?.trim();
  if (!secret) return null;
  // Deriva 32 bytes de qualquer texto — o usuário pode pôr uma frase aleatória.
  return crypto.scryptSync(secret, "apexmonitor:conta:v1", 32);
}

/** Criptografa um segredo. Sem chave, devolve o texto puro (comportamento de dev). */
export function encryptSecret(plain: string): string {
  const key = chave();
  if (!key) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/**
 * Descriptografa. Valor legado (sem prefixo) volta como está. Se estiver
 * criptografado mas a chave sumiu/mudou, devolve null (não trava a tela).
 */
export function decryptSecret(stored: string | null): string | null {
  if (stored == null) return null;
  if (!stored.startsWith(PREFIX)) return stored; // texto puro legado
  const key = chave();
  if (!key) return null;
  try {
    const [, ivB64, tagB64, dataB64] = stored.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
