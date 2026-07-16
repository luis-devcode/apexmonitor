"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { canonicalHouseName, normHouse } from "@/lib/houses";
import { readCloneGroups } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";
import { isProcedimento, procedimentoLabel, tipoDoProcedimento } from "@/lib/procedimentos";

type RawLeg = { casa?: unknown; selecao?: unknown; odd?: unknown; stake?: unknown; retorno?: unknown; isLay?: unknown; freebet?: unknown; comissao?: unknown; aumento?: unknown };
type Perna = { stake: number; odd: number; isLay: boolean; freebet: boolean; comissaoPct: number; aumentoPct: number; risco: number };

/**
 * O quanto a perna realmente ARRISCA (o que sai do bolso).
 *  - BACK: é a própria stake.
 *  - LAY:  é a RESPONSABILIDADE = stake * (odd - 1). A stake do lay é o que você
 *          GANHA se der certo, não o que arrisca. Confundir os dois inflava o
 *          lucro esperado de forma absurda.
 *  - FREEBET: não sai dinheiro do bolso → risco zero.
 */
function riscoDaPerna(stake: number, odd: number, isLay: boolean, freebet: boolean) {
  if (freebet) return 0;
  return isLay ? stake * Math.max(0, odd - 1) : stake;
}

/**
 * O que volta pro bolso se ESTA perna vencer. A comissão incide só sobre o
 * GANHO, nunca sobre o dinheiro que já era seu:
 *  - BACK:    stake de volta + lucro líquido de comissão.
 *  - LAY:     responsabilidade de volta + a stake do apostador, menos comissão.
 *  - FREEBET: a stake é da casa, então volta só o lucro líquido.
 */
function retornoDaPerna(perna: Pick<Perna, "stake" | "odd" | "isLay" | "freebet" | "comissaoPct" | "aumentoPct">) {
  const { stake, odd, isLay, freebet } = perna;
  const comm = Math.min(Math.max(perna.comissaoPct, 0), 100) / 100;
  const aumento = Math.max(perna.aumentoPct, 0) / 100;
  if (isLay) return stake * Math.max(0, odd - 1) + stake * (1 - comm) * (1 + aumento);
  const lucro = stake * Math.max(0, odd - 1) * (1 + aumento) * (1 - comm);
  return freebet ? lucro : stake + lucro;
}

const OPERATION_TYPES = new Set(["SUREBET", "FREEBET", "SUPERODD", "VALUEBET", "OUTRO"]);
const FREEBET_INDISPONIVEL = "FREEBET_INDISPONIVEL";
const OPERACAO_JA_LIQUIDADA = "OPERACAO_JA_LIQUIDADA";

function localizedNumber(raw: unknown) {
  const value = String(raw ?? "").trim().replace(/R\$|\s/g, "");
  if (!value) return 0;
  return Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value);
}
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function parseJson<T>(raw: FormDataEntryValue | null): T | null {
  try { return JSON.parse(String(raw ?? "")) as T; } catch { return null; }
}

/**
 * Cria uma operação a partir da calculadora (ou manual). A conta/CPF de cada
 * perna é OPCIONAL — quem não souber na hora atribui depois na planilha. O
 * saldo da banca só se move no fechamento.
 */
export async function criarOperacaoAction(
  _previous: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const evento = String(formData.get("evento") ?? "").trim();
  const esporte = String(formData.get("esporte") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const dateRaw = String(formData.get("data") ?? "").trim();
  const data = dateRaw ? new Date(dateRaw) : new Date();
  const rawLegs = parseJson<RawLeg[]>(formData.get("pernas"));

  // O procedimento manda no tipo. Só caímos no campo `tipo` cru quando a
  // operação veio de um caminho antigo, sem procedimento.
  const procedimentoRaw = String(formData.get("procedimento") ?? "").trim();
  const procedimento = isProcedimento(procedimentoRaw) ? procedimentoRaw : null;
  const tipoRaw = String(formData.get("tipo") ?? "OUTRO");
  const tipo = procedimento ? tipoDoProcedimento(procedimento) : OPERATION_TYPES.has(tipoRaw) ? tipoRaw : "OUTRO";

  // Conta/CPF escolhida na janela, por índice de perna. Freebet extraída, se houver.
  const contaPorPerna = parseJson<(string | null)[]>(formData.get("contas")) ?? [];
  const freebetId = String(formData.get("freebetId") ?? "").trim() || null;
  const somarRetornos = String(formData.get("somarRetornos") ?? "") === "1";

  if (!evento) return "Informe o evento da operação.";
  if (Number.isNaN(data.getTime())) return "Data do evento inválida.";
  if (!Array.isArray(rawLegs) || rawLegs.length < 1) return "Adicione pelo menos uma aposta.";

  const legs = rawLegs.map((leg) => {
    const odd = localizedNumber(leg.odd);
    const stake = round(localizedNumber(leg.stake));
    const retornoManual = leg.retorno === undefined || leg.retorno === null || String(leg.retorno).trim() === ""
      ? null
      : round(localizedNumber(leg.retorno));
    const isLay = leg.isLay === true || leg.isLay === "true";
    const freebet = leg.freebet === true || leg.freebet === "true";
    const comissaoPct = Math.min(Math.max(localizedNumber(leg.comissao) || 0, 0), 100);
    const aumentoPct = Math.max(localizedNumber(leg.aumento) || 0, 0);
    return {
      casa: String(leg.casa ?? "").trim() || null,
      selecao: String(leg.selecao ?? "").trim() || "—",
      odd,
      stake,
      isLay,
      freebet,
      comissaoPct,
      aumentoPct,
      risco: round(riscoDaPerna(stake, odd, isLay, freebet)),
      retorno: retornoManual ?? retornoDaPerna({ stake, odd, isLay, freebet, comissaoPct, aumentoPct }),
      retornoManual,
    };
  });

  if (legs.some((leg) => !Number.isFinite(leg.odd) || leg.odd <= 1 || !Number.isFinite(leg.stake) || leg.stake < 0)) {
    return "Revise a odd e o valor de todas as apostas.";
  }
  if (legs.some((leg) => leg.retornoManual !== null && (!Number.isFinite(leg.retornoManual) || leg.retornoManual < 0))) {
    return "Revise o retorno informado.";
  }
  if (legs.some((leg) => leg.stake <= 0 && leg.retornoManual === null)) {
    return "Informe um valor maior que zero ou um retorno manual.";
  }

  // O "investido" é a soma do RISCO (não das stakes) — no lay é a responsabilidade.
  const stakeTotal = round(legs.reduce((sum, leg) => sum + leg.risco, 0));
  const retornoEsperado = somarRetornos && legs.every((leg) => leg.retornoManual !== null)
    ? legs.reduce((sum, leg) => sum + leg.retorno, 0)
    : Math.min(...legs.map((leg) => leg.retorno));
  const lucroEsperado = round(retornoEsperado - stakeTotal);
  const casas = [...new Set(legs.map((leg) => leg.casa).filter((c): c is string => !!c))].join(", ") || null;

  // Só aceitamos contas que são mesmo deste usuário.
  const contasValidas = new Set(
    (await prisma.conta.findMany({
      where: { userId, id: { in: contaPorPerna.filter((id): id is string => !!id) } },
      select: { id: true },
    })).map((c) => c.id),
  );

  try {
    await prisma.$transaction(async (tx) => {
      const operacao = await tx.operacao.create({
        data: { userId, tipo, procedimento, evento, esporte, data, stakeTotal, lucroEsperado, status: "PENDENTE", casas, notas },
      });
      await tx.pernaOperacao.createMany({
        data: legs.map((leg, index) => {
          const contaId = contaPorPerna[index];
          return {
            userId,
            operacaoId: operacao.id,
            casa: leg.casa,
            contaId: contaId && contasValidas.has(contaId) ? contaId : null,
            selecao: leg.selecao,
            odd: leg.odd,
            stake: leg.stake,
            isLay: leg.isLay,
            freebet: leg.freebet,
            comissaoPct: leg.comissaoPct,
            aumentoPct: leg.aumentoPct,
            risco: leg.risco,
            retorno: leg.retornoManual,
          };
        }),
      });

      if (freebetId) {
        const { count } = await tx.freebet.updateMany({
          where: { id: freebetId, userId, status: "PENDENTE", usoOperacaoId: null },
          data: { usoOperacaoId: operacao.id },
        });
        if (count !== 1) throw new Error(FREEBET_INDISPONIVEL);
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === FREEBET_INDISPONIVEL) {
      return "Esta freebet não está mais disponível. Atualize a página e escolha outra.";
    }
    throw error;
  }

  if (freebetId) revalidatePath("/freebets");

  revalidatePath("/operacoes");
  return undefined;
}

/** Atribui (ou remove) a conta/CPF de uma perna. Metadado de organização. */
export async function setPernaContaAction(pernaId: string, contaId: string | null): Promise<void> {
  const userId = await requireUserId();
  // A conta também precisa ser deste usuário (evita apontar pra conta de outro).
  if (contaId) {
    const conta = await prisma.conta.findFirst({ where: { id: contaId, userId }, select: { id: true } });
    if (!conta) return;
  }
  await prisma.pernaOperacao.updateMany({ where: { id: pernaId, userId }, data: { contaId: contaId || null } });
  revalidatePath("/operacoes");
}

/**
 * Corrige operações antigas: liga a freebet já usada à sua operação de
 * extração e registra como valor convertido o lucro real daquela operação.
 */
export async function vincularFreebetExtraidaAction(operacaoId: string, freebetId: string): Promise<string | undefined> {
  const userId = await requireUserId();
  const operacao = await prisma.operacao.findFirst({
    where: { id: operacaoId, userId, status: "FINALIZADA", procedimento: "EXTRACAO_FREEBET" },
    select: {
      id: true,
      lucroReal: true,
      pernas: { select: { casa: true, stake: true, freebet: true } },
      freebetsUsadas: { select: { id: true }, take: 1 },
    },
  });
  if (!operacao) return "A operação precisa ser uma extração de freebet já finalizada.";
  if (operacao.freebetsUsadas.length > 0) return "Esta operação já possui uma freebet vinculada.";
  if (operacao.lucroReal === null) return "A operação ainda não possui lucro real calculado.";

  const freebet = await prisma.freebet.findFirst({
    where: { id: freebetId, userId, status: "PENDENTE", usoOperacaoId: null },
    include: { casa: true },
  });
  if (!freebet) return "Esta freebet não está mais disponível.";

  const corresponde = operacao.pernas.some((perna) =>
    perna.freebet
    && !!perna.casa
    && normHouse(canonicalHouseName(perna.casa)) === normHouse(canonicalHouseName(freebet.casa?.nome ?? ""))
    && Math.abs(perna.stake - freebet.valor) < 0.01,
  );
  if (!corresponde) return "A casa e o valor da freebet não correspondem à entrada promocional da operação.";

  const { count } = await prisma.freebet.updateMany({
    where: { id: freebet.id, userId, status: "PENDENTE", usoOperacaoId: null },
    data: {
      usoOperacaoId: operacao.id,
      status: "EXTRAIDA",
      valorExtraido: Math.max(0, round(operacao.lucroReal)),
    },
  });
  if (count !== 1) return "A freebet foi alterada por outra solicitação. Atualize a página.";

  revalidatePath("/operacoes");
  revalidatePath("/freebets");
  return undefined;
}

/**
 * Finaliza a operação: você escolhe QUAL entrada bateu (as outras viram RED) e,
 * se a operação gerou uma freebet, ela já é criada e vinculada aqui.
 * `anuladas` é opcional — pernas canceladas devolvem o que foi arriscado.
 * `perdeu` fecha sem vencedora: é o caso da aposta simples, sem proteção, que
 * simplesmente não bateu.
 */
export async function finalizarOperacaoAction(
  _previous: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const userId = await requireUserId();
  const operacaoId = String(formData.get("operacaoId") ?? "");
  const vencedoraId = String(formData.get("vencedoraId") ?? "");
  const perdeu = String(formData.get("perdeu") ?? "") === "1";
  const anuladas = new Set(parseJson<string[]>(formData.get("anuladas")) ?? []);

  // Freebet gerada (opcional)
  const geraFreebet = String(formData.get("geraFreebet") ?? "") === "1";
  const fbCasa = String(formData.get("freebetCasa") ?? "").trim();
  const fbValor = round(localizedNumber(formData.get("freebetValor")));
  const fbExpiraRaw = String(formData.get("freebetExpira") ?? "").trim();

  if (!operacaoId) return "Operação inválida.";
  if (!vencedoraId && !perdeu) return "Selecione qual entrada bateu.";

  if (geraFreebet) {
    if (!fbCasa) return "Selecione a casa da freebet.";
    if (!Number.isFinite(fbValor) || fbValor <= 0) return "Informe o valor da freebet.";
  }

  const operacao = await prisma.operacao.findFirst({
    where: { id: operacaoId, userId },
    include: { pernas: { include: { conta: true } } },
  });
  if (!operacao) return "Operação não encontrada.";
  if (operacao.status !== "PENDENTE") return "Esta operação já foi finalizada ou está sendo processada.";
  if (!perdeu && !operacao.pernas.some((p) => p.id === vencedoraId)) return "Entrada vencedora inválida.";
  if (!perdeu && anuladas.has(vencedoraId)) return "A entrada vencedora não pode estar marcada como anulada.";

  let expiraEm: Date | null = null;
  if (geraFreebet && fbExpiraRaw) {
    const parsed = new Date(fbExpiraRaw);
    if (Number.isNaN(parsed.getTime())) return "Data de validade da freebet inválida.";
    expiraEm = parsed;
  }

  let retornoTotal = 0;
  try {
    await prisma.$transaction(async (tx) => {
    const lock = await tx.operacao.updateMany({
      where: { id: operacao.id, userId, status: "PENDENTE" },
      data: { status: "LIQUIDANDO" },
    });
    if (lock.count !== 1) throw new Error(OPERACAO_JA_LIQUIDADA);

    // Saldo por conta: uma conta pode aparecer em mais de uma perna, então
    // acumulamos o delta e gravamos uma vez só no fim.
    const deltaPorConta = new Map<string, number>();

    for (const leg of operacao.pernas) {
      // Perna antiga (antes do campo `risco`) cai no fallback: back = stake.
      const risco = leg.risco > 0 ? leg.risco : riscoDaPerna(leg.stake, leg.odd, leg.isLay, leg.freebet);

      let resultado: string;
      let retorno: number;
      if (anuladas.has(leg.id)) {
        resultado = "ANULADA";
        retorno = round(risco); // anulada devolve o que foi arriscado
      } else if (leg.id === vencedoraId) {
        resultado = "GREEN";
        retorno = leg.retorno !== null ? round(leg.retorno) : round(retornoDaPerna(leg));
      } else {
        resultado = "RED";
        retorno = 0;
      }

      retornoTotal = round(retornoTotal + retorno);
      await tx.pernaOperacao.update({ where: { id: leg.id }, data: { resultado, retorno } });

      // Ciclo do dinheiro: a aposta só toca a banca no fechamento. Sai o que foi
      // arriscado, entra o que voltou — tudo na conta daquela perna. Perna sem
      // conta atribuída não movimenta nada (fica só como registro de L/P).
      if (!leg.contaId) continue;
      if (risco > 0) {
        await tx.movimento.create({
          data: { userId, contaId: leg.contaId, operacaoId: operacao.id, tipo: "APOSTA", valor: -risco, descricao: `${operacao.evento} · ${leg.selecao}` },
        });
      }
      if (retorno > 0) {
        await tx.movimento.create({
          data: { userId, contaId: leg.contaId, operacaoId: operacao.id, tipo: "RETORNO", valor: retorno, descricao: `${operacao.evento} · ${leg.selecao} (${resultado.toLowerCase()})` },
        });
      }
      deltaPorConta.set(leg.contaId, round((deltaPorConta.get(leg.contaId) ?? 0) + retorno - risco));
    }

    for (const [contaId, delta] of deltaPorConta) {
      if (delta === 0) continue;
      await tx.conta.update({ where: { id: contaId }, data: { saldo: { increment: delta } } });
    }

    const lucroReal = round(retornoTotal - operacao.stakeTotal);
    await tx.operacao.update({
      where: { id: operacao.id },
      data: { status: "FINALIZADA", lucroReal, liquidadaEm: new Date() },
    });

    // Era uma extração: a freebet virou dinheiro. O que ela rendeu de verdade é
    // o lucro da operação — agora sim ela sai da lista de disponíveis.
    await tx.freebet.updateMany({
      where: { userId, usoOperacaoId: operacao.id, status: "PENDENTE" },
      data: { status: "EXTRAIDA", valorExtraido: Math.max(0, lucroReal) },
    });

    // A operação gerou freebet? Cria já preenchida e vinculada à origem.
    if (geraFreebet) {
      const cloneGroups = await readCloneGroups();
      const clone = cloneGroups.find(
        (h) => normHouse(canonicalHouseName(h.name)) === normHouse(canonicalHouseName(fbCasa)),
      );
      const casa =
        (await tx.casa.findFirst({ where: { userId, nome: fbCasa } })) ??
        (await tx.casa.create({ data: { userId, nome: fbCasa, logoUrl: clone?.logoUrl || null } }));

      // Se a perna daquela casa tem conta, herdamos o parceiro (menos digitação).
      const pernaDaCasa = operacao.pernas.find(
        (p) => p.casa && normHouse(canonicalHouseName(p.casa)) === normHouse(canonicalHouseName(fbCasa)),
      );

      await tx.freebet.create({
        data: {
          userId,
          casaId: casa.id,
          parceiroId: pernaDaCasa?.conta?.parceiroId ?? null,
          operacaoId: operacao.id,
          valor: fbValor,
          tipo: "Promoção",
          // O procedimento é COMO a freebet foi ganha (Superodd, Missão…), não o
          // nome do jogo. O jogo e a data vêm da operação vinculada (operacaoId).
          procedimento: procedimentoLabel(operacao.procedimento) ?? operacao.tipo,
          expiraEm,
          status: "PENDENTE",
        },
      });
    }
    });
  } catch (error) {
    if (error instanceof Error && error.message === OPERACAO_JA_LIQUIDADA) {
      return "Esta operação já foi finalizada por outra solicitação.";
    }
    throw error;
  }

  revalidatePath("/operacoes");
  revalidatePath("/banca");
  revalidatePath("/freebets");
  return undefined;
}

/**
 * Desfaz na banca tudo o que a operação lançou: soma os movimentos dela por
 * conta, devolve o saldo e apaga os lançamentos. Sem isto, reabrir ou excluir
 * uma operação deixaria a banca torta pra sempre.
 */
async function estornarMovimentos(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], operacaoId: string, userId: string) {
  const movimentos = await tx.movimento.findMany({ where: { userId, operacaoId } });
  if (movimentos.length === 0) return;

  const deltaPorConta = new Map<string, number>();
  for (const m of movimentos) deltaPorConta.set(m.contaId, round((deltaPorConta.get(m.contaId) ?? 0) + m.valor));
  for (const [contaId, delta] of deltaPorConta) {
    if (delta !== 0) await tx.conta.update({ where: { id: contaId }, data: { saldo: { decrement: delta } } });
  }
  await tx.movimento.deleteMany({ where: { userId, operacaoId } });
}

/** Reabre uma operação finalizada (volta a pendente, limpa resultados e estorna a banca). */
export async function reabrirOperacaoAction(id: string): Promise<void> {
  const userId = await requireUserId();
  const operacao = await prisma.operacao.findFirst({ where: { id, userId }, select: { id: true } });
  if (!operacao) return;

  await prisma.$transaction(async (tx) => {
    await estornarMovimentos(tx, id, userId);
    await tx.pernaOperacao.updateMany({ where: { operacaoId: id, userId }, data: { resultado: "PENDENTE", retorno: null } });
    await tx.operacao.updateMany({ where: { id, userId }, data: { status: "PENDENTE", lucroReal: null, liquidadaEm: null } });
    // A freebet criada no fechamento perde o motivo de existir — só apagamos as
    // que ainda não foram usadas, pra não sumir com dinheiro já extraído.
    await tx.freebet.deleteMany({ where: { userId, operacaoId: id, status: "PENDENTE" } });
    // A freebet extraída por esta operação volta a ficar disponível.
    await tx.freebet.updateMany({ where: { userId, usoOperacaoId: id }, data: { status: "PENDENTE", valorExtraido: null } });
  });

  revalidatePath("/operacoes");
  revalidatePath("/banca");
  revalidatePath("/freebets");
}

export async function deleteOperacaoAction(id: string): Promise<void> {
  const userId = await requireUserId();
  const operacao = await prisma.operacao.findFirst({ where: { id, userId }, select: { id: true } });
  if (!operacao) return;

  await prisma.$transaction(async (tx) => {
    await estornarMovimentos(tx, id, userId);
    // Solta a freebet que a operação tinha consumido antes de sumir com ela.
    await tx.freebet.updateMany({ where: { userId, usoOperacaoId: id }, data: { status: "PENDENTE", valorExtraido: null } });
    await tx.operacao.deleteMany({ where: { id, userId } });
  });

  revalidatePath("/operacoes");
  revalidatePath("/banca");
  revalidatePath("/freebets");
}
