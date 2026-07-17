"use client";

import { useState } from "react";
import { iniciarCheckoutAction } from "./actions";

type PlanoView = {
  id: string; nome: string; meses: number; economia: number;
  valorFmt: string; valorCheioFmt: string; porMesFmt: string;
};

export default function AssinarWorkspace({ planos, planoInicial }: { planos: PlanoView[]; planoInicial?: string }) {
  const [plano, setPlano] = useState(planoInicial && planos.some((p) => p.id === planoInicial) ? planoInicial : "anual");
  const [metodo, setMetodo] = useState<"CARTAO" | "PIX">("CARTAO");
  const [enviando, setEnviando] = useState(false);

  return (
    <form action={iniciarCheckoutAction} onSubmit={() => setEnviando(true)} className="space-y-6">
      <input type="hidden" name="plano" value={plano} />
      <input type="hidden" name="metodo" value={metodo} />

      {/* PLANOS */}
      <div className="grid gap-3 sm:grid-cols-3">
        {planos.map((p) => {
          const sel = p.id === plano;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => setPlano(p.id)}
              className={`relative rounded-2xl border p-5 text-left transition ${sel ? "border-accent bg-accent/[0.06] ring-2 ring-accent/30" : "border-border bg-surface-2/45 hover:border-border-strong"}`}
            >
              {p.economia > 0 && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-black text-white">-{p.economia}%</span>
              )}
              <p className="text-sm font-extrabold text-text">{p.nome}</p>
              <p className="mt-2 text-[11px] text-muted">Mercado: <span className="line-through">{p.valorCheioFmt}</span></p>
              <p className="text-2xl font-black text-text">{p.valorFmt}</p>
              <p className="text-[11px] text-muted">{p.porMesFmt}/mês</p>
              <span className={`mt-3 flex h-5 w-5 items-center justify-center rounded-full border ${sel ? "border-accent bg-accent text-white" : "border-border"}`}>
                {sel && <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
            </button>
          );
        })}
      </div>

      {/* METODO */}
      <div>
        <p className="mono-label mb-2 text-muted">Forma de pagamento</p>
        <div className="grid grid-cols-2 gap-3">
          {(["CARTAO", "PIX"] as const).map((m) => {
            const sel = metodo === m;
            return (
              <button type="button" key={m} onClick={() => setMetodo(m)}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${sel ? "border-accent bg-accent/[0.06] text-accent" : "border-border bg-surface-2/45 text-text-2 hover:border-border-strong"}`}>
                {m === "CARTAO" ? "Cartão (renova automático)" : "Pix (por período)"}
              </button>
            );
          })}
        </div>
      </div>

      {/* CUPOM */}
      <label className="block space-y-1.5">
        <span className="mono-label text-muted">Cupom de desconto (opcional)</span>
        <input name="cupom" placeholder="Digite seu cupom" className="h-11 w-full rounded-xl border border-border bg-bg/45 px-3.5 text-sm text-text uppercase outline-none transition placeholder:normal-case placeholder:text-muted/80 hover:border-border-strong focus:border-accent/70 focus:bg-surface-2 focus:ring-4 focus:ring-accent/10" />
      </label>

      <button disabled={enviando} className="h-12 w-full rounded-xl bg-gradient-to-b from-accent to-accent-deep text-sm font-black text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)] transition hover:brightness-110 disabled:opacity-60">
        {enviando ? "Abrindo pagamento…" : "Assinar agora"}
      </button>
    </form>
  );
}
