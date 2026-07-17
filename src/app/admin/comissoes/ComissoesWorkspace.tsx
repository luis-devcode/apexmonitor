"use client";

import { useState } from "react";
import { marcarComissoesPagasAction } from "./actions";

type Grupo = {
  id: string;
  nome: string;
  cupom: string;
  chavePix: string | null;
  aPagar: number;
  jaPago: number;
  pendentes: { cliente: string; valor: number; comissao: number; data: string }[];
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export default function ComissoesWorkspace({ grupos }: { grupos: Grupo[] }) {
  const [aberto, setAberto] = useState<string | null>(null);

  if (grupos.length === 0) {
    return (
      <div className="p-5 md:p-7">
        <div className="rounded-2xl border border-border bg-surface-2/30 px-4 py-12 text-center text-muted">
          Ainda não há comissões. Elas aparecem quando um cliente que usou um cupom paga a assinatura.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5 md:p-7">
      {grupos.map((g) => (
        <div key={g.id} className="rounded-2xl border border-border bg-surface-2/45 p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold text-text">{g.nome}</h3>
                <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-accent">{g.cupom}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                <span>A pagar: <b className={g.aPagar > 0 ? "text-amber-400" : "text-text-2"}>{brl(g.aPagar)}</b></span>
                <span>Já repassado: <b className="text-text-2">{brl(g.jaPago)}</b></span>
                {g.chavePix && <span>Pix: <b className="text-text-2">{g.chavePix}</b></span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {g.pendentes.length > 0 && (
                <button onClick={() => setAberto(aberto === g.id ? null : g.id)} className="rounded-md border border-border bg-bg/45 px-2.5 py-1 text-[11px] font-bold text-text-2 transition hover:border-accent/40 hover:text-accent">
                  {aberto === g.id ? "Ocultar" : `Ver ${g.pendentes.length} pagamento${g.pendentes.length > 1 ? "s" : ""}`}
                </button>
              )}
              {g.aPagar > 0 && (
                <form
                  action={marcarComissoesPagasAction}
                  onSubmit={(e) => { if (!confirm(`Confirmar repasse de ${brl(g.aPagar)} para ${g.nome}? Isso marca as comissões como pagas.`)) e.preventDefault(); }}
                >
                  <input type="hidden" name="afiliadoId" value={g.id} />
                  <button className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-500/20">
                    Marcar pago ({brl(g.aPagar)})
                  </button>
                </form>
              )}
            </div>
          </div>

          {aberto === g.id && g.pendentes.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg/40 text-[10px] uppercase tracking-wider text-muted">
                  <tr><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Pagamento</th><th className="px-3 py-2 text-right">Comissão</th><th className="px-3 py-2 text-right">Data</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {g.pendentes.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-text-2">{p.cliente}</td>
                      <td className="px-3 py-2 text-muted">{brl(p.valor)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-amber-400">{brl(p.comissao)}</td>
                      <td className="px-3 py-2 text-right text-muted">{dataBR(p.data)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
