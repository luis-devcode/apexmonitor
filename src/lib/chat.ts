/**
 * O chat da comunidade é um só — todo mundo conversa sobre tudo no mesmo lugar.
 * A única distinção é o relato de problema: quem manda pode marcar a mensagem
 * como "problema no site", e aí ela entra numa fila que o admin acompanha.
 */
export const STATUS_BUG = [
  { id: "ABERTO", label: "Aberto", cls: "bg-warning/15 text-warning" },
  { id: "EM_ANALISE", label: "Analisando", cls: "bg-info/15 text-info" },
  { id: "RESOLVIDO", label: "Resolvido", cls: "bg-positive/15 text-positive" },
];

export const statusValido = (s: string) => STATUS_BUG.some((x) => x.id === s);
export const statusBug = (s: string | null) => STATUS_BUG.find((x) => x.id === s) ?? null;
