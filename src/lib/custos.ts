/** As categorias de custo da operação. Fonte única — servidor e tela leem daqui. */
export const CATEGORIAS_CUSTO = [
  { id: "FERRAMENTA", label: "Ferramenta", hint: "Monitor de odds, planilha, calculadora", icon: "🛠️" },
  { id: "ASSINATURA", label: "Assinatura", hint: "Grupo, curso, mentoria", icon: "📦" },
  { id: "INFRA", label: "Infraestrutura", hint: "Internet, VPN, celular, chip", icon: "🌐" },
  { id: "TAXA", label: "Taxa", hint: "Saque, transferência, IOF", icon: "🏦" },
  { id: "OUTRO", label: "Outro", hint: "Qualquer outro custo fixo", icon: "•" },
];

export const categoriaValida = (id: string) => CATEGORIAS_CUSTO.some((c) => c.id === id);
export const categoriaCusto = (id: string) => CATEGORIAS_CUSTO.find((c) => c.id === id) ?? CATEGORIAS_CUSTO.at(-1)!;

/** A categoria dos pagamentos de CPF. Não é editável aqui — vem de Parceiros. */
export const CATEGORIA_CPF = { id: "CPF", label: "CPF / Parceiro", hint: "Pagamento pelo uso do CPF", icon: "🪪" };

export const PERIODOS_CUSTO = [
  { id: "SEMANA", label: "Por semana" },
  { id: "MES", label: "Por mês" },
  { id: "ANO", label: "Por ano" },
];
export const periodoValido = (id: string) => PERIODOS_CUSTO.some((p) => p.id === id);

/**
 * Traz qualquer custo para a base MENSAL — é a única forma de somar coisas com
 * ciclos diferentes (um custo semanal e um anual não se somam direto).
 * A semana usa 365/12/7 ≈ 4,345 semanas por mês, não 4: usar 4 subestimaria o
 * custo em quase um mês inteiro por ano.
 */
const SEMANAS_POR_MES = 365 / 12 / 7;
export function porMes(valor: number, periodo: string): number {
  if (periodo === "SEMANA") return valor * SEMANAS_POR_MES;
  if (periodo === "ANO") return valor / 12;
  if (periodo === "DIA") return (valor * 365) / 12;
  return valor; // MES
}
