/**
 * Planos de assinatura — valores fixos do site. Descontos adicionais vêm dos
 * cupons de afiliado (Afiliado.descontoPct), aplicados por cima destes preços.
 *
 * `valorCheio` é a âncora = **preço de mercado** (o que os concorrentes cobram,
 * R$200/mês). Publicidade comparativa é legal quando verdadeira — por isso o
 * display deve deixar claro que R$200 é referência de mercado, não um "de" nosso
 * inventado (ex.: "Mercado: R$200 · ApexMonitor: R$149,90").
 */
export type PlanoId = "mensal" | "trimestral" | "anual";

export type Plano = {
  id: PlanoId;
  nome: string;
  meses: number;
  valor: number; // preço realmente cobrado
  valorCheio: number; // âncora = meses × preço de mercado (R$200/mês)
};

const MERCADO_MES = 200;

export const PLANOS: Plano[] = [
  { id: "mensal", nome: "Mensal", meses: 1, valor: 149.9, valorCheio: MERCADO_MES * 1 },
  { id: "trimestral", nome: "Trimestral", meses: 3, valor: 399.9, valorCheio: MERCADO_MES * 3 },
  { id: "anual", nome: "Anual", meses: 12, valor: 999.9, valorCheio: MERCADO_MES * 12 },
];

export function planoPorId(id: string): Plano | undefined {
  return PLANOS.find((p) => p.id === id);
}

/** % de economia do plano frente a pagar mês a mês (0 no mensal). */
export function economiaPct(p: Plano): number {
  if (p.valorCheio <= 0 || p.valor >= p.valorCheio) return 0;
  return Math.round((1 - p.valor / p.valorCheio) * 100);
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
