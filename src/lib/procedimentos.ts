/**
 * Pra que servia a operação. É o campo que dá sentido ao histórico: sem ele a
 * planilha vira uma pilha de apostas sem contexto e não dá pra saber se o
 * prejuízo de uma qualificadora foi na verdade o custo de uma freebet.
 *
 * `tipo` é o balde grosso que a Operacao já usava (SUREBET | FREEBET | ...);
 * o procedimento é o detalhe que o usuário enxerga.
 */
export type Procedimento = {
  value: string;
  label: string;
  tipo: "SUREBET" | "FREEBET" | "SUPERODD" | "VALUEBET" | "OUTRO";
};

export const PROCEDIMENTOS: Procedimento[] = [
  { value: "APOSTA_SIMPLES", label: "Aposta simples", tipo: "OUTRO" },
  { value: "SUREBET", label: "Surebet", tipo: "SUREBET" },
  { value: "SUPERODD", label: "Superodd", tipo: "SUPERODD" },
  { value: "ATIVACAO_FREEBET", label: "Ativação freebet", tipo: "FREEBET" },
  { value: "EXTRACAO_FREEBET", label: "Extração freebet", tipo: "FREEBET" },
  { value: "DUPLO_GREEN", label: "Duplo green", tipo: "SUREBET" },
  { value: "PROTECAO_DUPLO_GREEN", label: "Proteção duplo green", tipo: "SUREBET" },
  { value: "MISSAO", label: "Missão", tipo: "OUTRO" },
  { value: "GIROS_GRATIS", label: "Giros grátis", tipo: "OUTRO" },
  // O percentual real fica em cada entrada; o procedimento só identifica a
  // categoria da operação e não deve sugerir um valor fixo.
  { value: "AUMENTO_25", label: "Aumento %", tipo: "SUPERODD" },
  { value: "PROMOCAO", label: "Promoção", tipo: "OUTRO" },
  { value: "CASHBACK", label: "Cashback", tipo: "OUTRO" },
  { value: "APOSTA_SEM_RISCO", label: "Aposta sem risco", tipo: "OUTRO" },
];

/** O único procedimento que consome uma freebet já cadastrada. */
export const PROCEDIMENTO_EXTRACAO = "EXTRACAO_FREEBET";

const BY_VALUE = new Map(PROCEDIMENTOS.map((p) => [p.value, p]));

export const procedimentoLabel = (value: string | null | undefined) =>
  (value && BY_VALUE.get(value)?.label) || null;

/** Traduz o procedimento pro tipo da operação (o balde usado nas estatísticas). */
export const tipoDoProcedimento = (value: string | null | undefined) =>
  (value && BY_VALUE.get(value)?.tipo) || "OUTRO";

export const isProcedimento = (value: string) => BY_VALUE.has(value);
