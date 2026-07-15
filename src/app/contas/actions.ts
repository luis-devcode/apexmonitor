"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { canonicalHouseName, normHouse } from "@/lib/houses";
import { readCloneGroups } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";

const STATUS = new Set(["disponivel", "verificacao", "limitada"]);

const money = (raw: FormDataEntryValue | null) => {
  const value = String(raw ?? "").trim().replace(/R\$|\s/g, "");
  if (!value) return 0;
  return Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value);
};

/** Cadastra a conta de um parceiro numa casa de apostas. */
export async function addContaParceiroAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const parceiroId = ((formData.get("parceiroId") as string | null) ?? "").trim();
  const casaNome = ((formData.get("casaNome") as string | null) ?? "").trim();
  const saldoInicial = money(formData.get("saldoInicial"));
  const login = ((formData.get("login") as string | null) ?? "").trim() || null;
  const senhaRaw = (formData.get("senha") as string | null) ?? "";
  const senha = senhaRaw === "" ? null : senhaRaw;
  const notas = ((formData.get("notas") as string | null) ?? "").trim() || null;
  const statusRaw = String(formData.get("status") ?? "disponivel");
  const status = STATUS.has(statusRaw) ? statusRaw : "disponivel";

  if (!parceiroId) return "Selecione o parceiro.";
  if (!casaNome) return "Selecione a casa de apostas.";
  if (!Number.isFinite(saldoInicial)) return "Saldo inicial inválido.";

  // O parceiro precisa ser DESTE usuário.
  const parceiro = await prisma.parceiro.findFirst({ where: { id: parceiroId, userId, ativo: true } });
  if (!parceiro) return "Parceiro não encontrado ou arquivado.";

  // Garante a casa DESTE usuário (cria com o logo do diretório se não existir).
  const cloneGroups = await readCloneGroups();
  // Compara pela marca canônica: o nome escolhido é limpo ("Bolsa de Aposta"),
  // mas no diretório ele vem sujo ("BOLSA DE APOSTA - SPORTBOOK").
  const clone = cloneGroups.find((house) => normHouse(canonicalHouseName(house.name)) === normHouse(canonicalHouseName(casaNome)));
  const casa =
    (await prisma.casa.findFirst({ where: { userId, nome: casaNome } })) ??
    (await prisma.casa.create({ data: { userId, nome: casaNome, logoUrl: clone?.logoUrl || null } }));

  const existing = await prisma.conta.findFirst({ where: { userId, casaId: casa.id, parceiroId } });
  if (existing) return `${parceiro.nome} já tem conta na ${casa.nome}.`;

  const conta = await prisma.conta.create({
    // A senha vai criptografada pro banco (LGPD). É descriptografada só na leitura.
    data: { userId, casaId: casa.id, parceiroId, saldo: saldoInicial, status, login, senha: senha ? encryptSecret(senha) : null, notas },
  });
  if (saldoInicial !== 0) {
    await prisma.movimento.create({
      data: { userId, contaId: conta.id, tipo: "DEPOSITO", valor: saldoInicial, descricao: "Saldo inicial" },
    });
  }

  revalidatePath("/contas");
  revalidatePath("/parceiros");
  revalidatePath("/banca");
  return undefined;
}

/** Atualiza o status da conta (disponivel | verificacao | limitada). */
export async function setContaStatusAction(id: string, status: string): Promise<void> {
  const userId = await requireUserId();
  if (!STATUS.has(status)) return;
  await prisma.conta.updateMany({ where: { id, userId }, data: { status } });
  revalidatePath("/contas");
}

/** Edita um campo de texto da conta (login | senha | notas) direto no card. */
export async function updateContaCampoAction(id: string, field: string, value: string): Promise<void> {
  const userId = await requireUserId();
  const v = field === "senha" ? (value === "" ? null : value) : (value.trim() || null);
  const data: { login?: string | null; senha?: string | null; notas?: string | null } = {};
  if (field === "login") data.login = v;
  else if (field === "senha") data.senha = v ? encryptSecret(v) : null;
  else if (field === "notas") data.notas = v;
  else return;
  await prisma.conta.updateMany({ where: { id, userId }, data });
  revalidatePath("/contas");
}

/** Remove apenas contas novas, sem histórico financeiro ou operacional. */
export async function deleteContaParceiroAction(id: string): Promise<void> {
  const userId = await requireUserId();
  const [movimentos, pernas] = await Promise.all([
    prisma.movimento.count({ where: { userId, contaId: id } }),
    prisma.pernaOperacao.count({ where: { userId, contaId: id } }),
  ]);
  if (movimentos > 0 || pernas > 0) return;

  await prisma.conta.deleteMany({ where: { id, userId } });
  revalidatePath("/contas");
  revalidatePath("/parceiros");
  revalidatePath("/banca");
}
