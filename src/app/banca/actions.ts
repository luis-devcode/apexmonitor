"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { canonicalHouseName, normHouse } from "@/lib/houses";
import { readCloneGroups } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";

const money = (raw: FormDataEntryValue | null) =>
  Number(String(raw ?? "").replace(/\./g, "").replace(",", "."));

/** Cadastra uma casa e garante sua conta (saldo). */
export async function addCasaAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const nome = (formData.get("nome") as string | null)?.trim();
  const parceiroIdRaw = String(formData.get("parceiroId") ?? "").trim();
  const parceiroId = parceiroIdRaw || null;
  const comissao = Number(String(formData.get("comissao") ?? "").replace(",", ".")) || 0;
  const saldoInicial = money(formData.get("saldoInicial"));
  if (!nome) return "Informe o nome da casa.";
  if (!Number.isFinite(saldoInicial)) return "Saldo inicial inválido.";
  if (comissao < 0 || comissao > 100) return "A comissão deve ficar entre 0% e 100%.";

  const parceiro = parceiroId
    ? await prisma.parceiro.findFirst({ where: { id: parceiroId, userId } })
    : null;
  if (parceiroId && !parceiro) return "Parceiro não encontrado.";
  if (parceiro && !parceiro.ativo) return "Este parceiro está arquivado. Reative antes de vincular novas contas.";

  const cloneGroups = await readCloneGroups();
  const clone = cloneGroups.find((house) => normHouse(canonicalHouseName(house.name)) === normHouse(canonicalHouseName(nome)));

  const casa =
    (await prisma.casa.findFirst({ where: { userId, nome } })) ??
    (await prisma.casa.create({ data: { userId, nome, comissaoPct: comissao, logoUrl: clone?.logoUrl || null } }));

  const dono = parceiro?.nome ?? "sua banca principal";
  let conta = await prisma.conta.findFirst({ where: { userId, casaId: casa.id, parceiroId } });
  if (conta && (conta.saldo !== 0 || saldoInicial === 0)) {
    return `${casa.nome} já está cadastrada para ${dono}.`;
  }
  if (!conta) conta = await prisma.conta.create({ data: { userId, casaId: casa.id, parceiroId, saldo: 0 } });

  if (saldoInicial !== 0 && conta.saldo === 0) {
    await prisma.$transaction([
      prisma.movimento.create({ data: { userId, contaId: conta.id, tipo: "DEPOSITO", valor: saldoInicial, descricao: `Saldo inicial · ${dono}` } }),
      prisma.conta.updateMany({ where: { id: conta.id, userId }, data: { saldo: saldoInicial } }),
    ]);
  }

  revalidatePath("/banca");
  revalidatePath("/parceiros");
  revalidatePath("/operacoes");
  return undefined;
}

/** Registra um movimento de caixa e atualiza o saldo da conta. */
export async function registrarMovimentoAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const contaId = formData.get("contaId") as string | null;
  const tipo = (formData.get("tipo") as string | null) ?? "";
  const valor = money(formData.get("valor"));
  const descricao = ((formData.get("descricao") as string | null) ?? "").trim() || null;

  if (!contaId) return "Selecione a casa.";
  if (!Number.isFinite(valor)) return "Valor inválido.";

  const conta = await prisma.conta.findFirst({ where: { id: contaId, userId }, include: { casa: true } });
  if (!conta) return "Conta não encontrada.";

  // Transferência move dinheiro entre duas contas — sai de uma, entra na outra,
  // e o patrimônio total não muda. Os dois lançamentos compartilham transferId.
  if (tipo === "TRANSFERENCIA") {
    const destinoId = String(formData.get("contaDestinoId") ?? "").trim();
    const montante = Math.abs(valor);
    if (!destinoId) return "Selecione a casa de destino.";
    if (destinoId === contaId) return "A casa de destino precisa ser diferente da origem.";
    if (montante <= 0) return "Informe o valor da transferência.";

    const destino = await prisma.conta.findFirst({ where: { id: destinoId, userId }, include: { casa: true } });
    if (!destino) return "Conta de destino não encontrada.";

    const transferId = crypto.randomUUID();
    await prisma.$transaction([
      prisma.movimento.create({ data: { userId, contaId, tipo, valor: -montante, transferId, descricao: descricao ?? `Transferência para ${destino.casa.nome}` } }),
      prisma.movimento.create({ data: { userId, contaId: destinoId, tipo, valor: montante, transferId, descricao: descricao ?? `Transferência de ${conta.casa.nome}` } }),
      prisma.conta.update({ where: { id: contaId }, data: { saldo: { decrement: montante } } }),
      prisma.conta.update({ where: { id: destinoId }, data: { saldo: { increment: montante } } }),
    ]);

    revalidatePath("/banca");
    return undefined;
  }

  let delta: number;
  let novoSaldo: number;
  if (tipo === "DEPOSITO") {
    delta = Math.abs(valor);
    novoSaldo = conta.saldo + delta;
  } else if (tipo === "SAQUE") {
    delta = -Math.abs(valor);
    novoSaldo = conta.saldo + delta;
  } else if (tipo === "AJUSTE") {
    novoSaldo = valor; // ajuste define o saldo correto
    delta = valor - conta.saldo;
  } else {
    return "Tipo de movimento inválido.";
  }

  await prisma.$transaction([
    prisma.movimento.create({ data: { userId, contaId, tipo, valor: delta, descricao } }),
    prisma.conta.updateMany({ where: { id: contaId, userId }, data: { saldo: novoSaldo } }),
  ]);

  revalidatePath("/banca");
  return undefined;
}

/** Vincula ou troca o CPF/parceiro dono de uma conta jÃ¡ cadastrada. */
export async function alterarDonoContaAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const contaId = String(formData.get("contaId") ?? "").trim();
  const parceiroIdRaw = String(formData.get("parceiroId") ?? "").trim();
  const parceiroId = parceiroIdRaw || null;

  if (!contaId) return "Conta inválida.";

  const conta = await prisma.conta.findFirst({ where: { id: contaId, userId }, include: { casa: true } });
  if (!conta) return "Conta não encontrada.";

  const parceiro = parceiroId ? await prisma.parceiro.findFirst({ where: { id: parceiroId, userId } }) : null;
  if (parceiroId && !parceiro) return "Parceiro não encontrado.";
  if (parceiro && !parceiro.ativo) return "Este parceiro está arquivado.";

  const duplicate = await prisma.conta.findFirst({
    where: {
      userId,
      id: { not: conta.id },
      casaId: conta.casaId,
      parceiroId,
    },
  });
  if (duplicate) {
    const dono = parceiro?.nome ?? "sua banca principal";
    return `${conta.casa.nome} já está cadastrada para ${dono}.`;
  }

  await prisma.conta.updateMany({ where: { id: conta.id, userId }, data: { parceiroId } });

  revalidatePath("/banca");
  revalidatePath("/parceiros");
  revalidatePath("/operacoes");
  return undefined;
}
