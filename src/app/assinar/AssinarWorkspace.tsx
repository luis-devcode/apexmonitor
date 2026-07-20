"use client";

import { useState } from "react";
import { iniciarCheckoutAction } from "./actions";

type PlanoView = {
  id: string;
  nome: string;
  meses: number;
  economia: number;
  valorFmt: string;
  valorCheioFmt: string;
  porMesFmt: string;
};

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const BENEFICIOS: Record<string, string[]> = {
  mensal: [
    "Monitor de odds em 40+ casas",
    "Surebets e calculadoras integradas",
    "Super Odds, Duplo Green e freebets",
    "Gestão de banca, ROI e custos",
    "Acesso a todos os módulos",
  ],
  trimestral: [
    "Plataforma completa por 3 meses",
    "Monitor e calculadoras em tempo real",
    "Gestão financeira sem planilha solta",
    "Mais economia sem compromisso anual",
    "Melhor equilíbrio entre prazo e valor",
  ],
  anual: [
    "Plataforma completa por 12 meses",
    "Monitor e calculadoras em tempo real",
    "Gestão de banca, ROI e custos",
    "Menor valor mensal equivalente",
    "Maior economia entre os planos",
  ],
};

const PLANO_META: Record<string, { chamada: string; selo?: string }> = {
  mensal: { chamada: "Flexibilidade para começar" },
  trimestral: { chamada: "Mais tempo para criar consistência", selo: "● Mais escolhido" },
  anual: { chamada: "O menor valor por mês", selo: "◆ Maior economia" },
};

export default function AssinarWorkspace({ planos, planoInicial }: { planos: PlanoView[]; planoInicial?: string }) {
  const [plano, setPlano] = useState(planoInicial && planos.some((item) => item.id === planoInicial) ? planoInicial : "trimestral");
  const [metodo, setMetodo] = useState<"CARTAO" | "PIX">("CARTAO");
  const [enviando, setEnviando] = useState(false);
  const selecionado = planos.find((item) => item.id === plano) ?? planos[0];

  return (
    <form action={iniciarCheckoutAction} onSubmit={() => setEnviando(true)} className="mt-14 sm:mt-16">
      <input type="hidden" name="plano" value={plano} />
      <input type="hidden" name="metodo" value={metodo} />

      <section aria-labelledby="titulo-planos">
        <div className="sr-only">
          <h2 id="titulo-planos">Escolha seu plano</h2>
        </div>

        <div className="checkout-v2-plans">
          {planos.map((item) => {
            const ativo = item.id === plano;
            const destaque = item.id === "trimestral";
            const anual = item.id === "anual";
            const meta = PLANO_META[item.id] ?? { chamada: "Acesso completo" };

            return (
              <article key={item.id} className={`checkout-v2-plan ${destaque ? "checkout-v2-plan-featured" : ""} ${ativo ? "checkout-v2-plan-selected" : ""}`}>
                {meta.selo && <span className={`checkout-v2-badge ${anual ? "checkout-v2-badge-economy" : ""}`}>{meta.selo}</span>}

                <p className={`checkout-v2-plan-name ${destaque ? "text-positive" : ""}`}>{item.nome}</p>
                <div className="mt-7 flex items-start gap-2">
                  <span className="mt-2 text-sm text-muted">R$</span>
                  <strong className="text-[2.75rem] font-black leading-none tracking-[-0.055em] text-text sm:text-[3.35rem]">
                    {item.valorFmt.replace("R$ ", "").replace("R$ ", "")}
                  </strong>
                  {item.meses === 1 && <span className="self-end pb-1 text-xs text-muted">/mês</span>}
                </div>
                {item.meses > 1 && <p className="mt-2 text-xs text-text-2">por {item.meses === 12 ? "ano" : `${item.meses} meses`}</p>}

                <p className="mt-3 text-[10px] text-muted">Referência de mercado: <span className="line-through opacity-65">{item.valorCheioFmt}</span></p>
                <p className={`mt-4 text-sm font-black leading-5 ${destaque ? "text-positive" : "text-text-2"}`}>
                  {item.meses === 1 ? meta.chamada : `Equivale a apenas ${item.porMesFmt}/mês`}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">{item.economia}% abaixo da referência de mercado.</p>

                <div className="my-6 h-px bg-border" />
                <ul className="space-y-3.5">
                  {(BENEFICIOS[item.id] ?? BENEFICIOS.mensal).map((beneficio) => (
                    <li key={beneficio} className="flex items-start gap-2.5 text-xs font-semibold leading-5 text-text-2">
                      <Icon d="m5 12 4 4L19 6" className={`mt-0.5 h-4 w-4 shrink-0 ${destaque ? "text-positive" : "text-accent"}`} />
                      <span>{beneficio}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setPlano(item.id)}
                  className={`checkout-v2-select ${destaque ? "checkout-v2-select-featured" : ""} ${ativo ? "checkout-v2-select-active" : ""}`}
                >
                  {ativo ? "Plano selecionado" : `Escolher ${item.nome.toLowerCase()}`}
                  {ativo && <Icon d="m5 12 4 4L19 6" className="h-4 w-4" />}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="titulo-resumo" className="checkout-v2-summary" aria-live="polite">
        <div className="checkout-v2-summary-plan">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-accent">Seu plano</p>
          <h2 id="titulo-resumo" className="mt-1.5 text-lg font-black">Plano {selecionado.nome}</h2>
          <p className="mt-1 text-[10px] text-muted">{selecionado.meses === 1 ? "1 mês de acesso" : `${selecionado.meses} meses de acesso`} · {selecionado.porMesFmt}/mês</p>
        </div>

        <div>
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-muted">Pagamento</p>
          <div className="mt-2 flex gap-2">
            {([
              { id: "CARTAO" as const, label: "Cartão", icon: "M3 6h18v12H3zM3 10h18M7 15h3" },
              { id: "PIX" as const, label: "Pix", icon: "m12 3 4 4-4 4-4-4 4-4Zm0 10 4 4-4 4-4-4 4-4Zm5-5 4 4-4 4-4-4 4-4ZM7 8l4 4-4 4-4-4 4-4Z" },
            ]).map((opcao) => (
              <button
                type="button"
                key={opcao.id}
                aria-pressed={metodo === opcao.id}
                onClick={() => setMetodo(opcao.id)}
                className={`checkout-v2-payment ${metodo === opcao.id ? "checkout-v2-payment-active" : ""}`}
              >
                <Icon d={opcao.icon} className="h-4 w-4" />{opcao.label}
              </button>
            ))}
          </div>
        </div>

        <label className="checkout-v2-coupon">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-muted">Cupom</span>
          <span className="relative mt-2 block">
            <Icon d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input name="cupom" autoComplete="off" placeholder="Código opcional" className="h-11 w-full rounded-xl border border-border bg-bg/55 pl-10 pr-3 text-xs font-bold uppercase text-text outline-none transition placeholder:normal-case placeholder:font-normal placeholder:text-muted focus:border-accent/70 focus:ring-4 focus:ring-accent/10" />
          </span>
        </label>

        <div className="checkout-v2-total">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-muted">Total agora</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-text">{selecionado.valorFmt}</p>
          <p className="mt-1 text-[9px] text-muted">{metodo === "CARTAO" && selecionado.meses === 1 ? "Renovação automática" : "Cobrança única"}</p>
        </div>

        <button type="submit" disabled={enviando} className="checkout-v2-submit">
          {enviando ? "Abrindo pagamento…" : "Continuar para pagamento"}
          {!enviando && <Icon d="m9 18 6-6-6-6" className="h-4 w-4" />}
        </button>
      </section>

      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[10px] text-muted">
        {["Checkout seguro pelo Asaas", "Acesso após confirmação", "Pix ou cartão", "Sem fidelidade"].map((item) => (
          <li key={item} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-positive shadow-[0_0_10px_color-mix(in_srgb,var(--positive)_70%,transparent)]" />{item}</li>
        ))}
      </ul>
    </form>
  );
}
