"use client";

import { useActionState, useState } from "react";
import { alterarSenhaAction, atualizarNomeAction } from "./actions";

const inputClass = "h-11 w-full rounded-xl border border-border bg-bg/45 px-3.5 text-sm text-text outline-none transition placeholder:text-muted/80 hover:border-border-strong focus:border-accent/70 focus:bg-surface-2 focus:ring-4 focus:ring-accent/10";
const cardClass = "rounded-2xl border border-border bg-surface-2/45 p-5";

type PlanoView = {
  id: string; nome: string; meses: number; economia: number;
  valorFmt: string; valorCheioFmt: string; porMesFmt: string;
};

type Props = {
  nome: string;
  email: string;
  plano: string | null;
  diasRestantes: number | null;
  vencimento: string | null;
  planos: PlanoView[];
};

const dataBR = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export default function ContaWorkspace({ nome, email, plano, diasRestantes, vencimento, planos }: Props) {
  const [erroNome, salvarNome, salvandoNome] = useActionState(atualizarNomeAction, undefined);
  const [msgSenha, salvarSenha, salvandoSenha] = useActionState(
    async (_p: string | undefined, fd: FormData) => alterarSenhaAction(_p, fd),
    undefined,
  );
  const [abrirSenha, setAbrirSenha] = useState(false);

  // Faixa de cor conforme urgência da renovação.
  const urgente = diasRestantes !== null && diasRestantes <= 5;
  const corDias = urgente ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-5 md:p-7">
      {/* ---- DADOS ---- */}
      <section className={cardClass}>
        <h2 className="text-sm font-extrabold text-text">Meus dados</h2>

        <form action={salvarNome} className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <span className="mono-label text-muted">Nome</span>
            <input name="nome" defaultValue={nome} required className={inputClass} />
          </label>
          <label className="block space-y-1.5">
            <span className="mono-label text-muted">E-mail</span>
            <div className="flex items-center gap-2">
              <input value={email} disabled className={`${inputClass} cursor-not-allowed opacity-60`} />
              <span className="shrink-0 rounded-lg border border-border bg-bg/45 px-2.5 py-2 text-[11px] font-bold text-muted" title="O e-mail é a chave da sua assinatura e não pode ser alterado aqui.">🔒 fixo</span>
            </div>
          </label>
          {erroNome && <p className="text-xs font-semibold text-negative">{erroNome}</p>}
          <button disabled={salvandoNome} className="h-10 rounded-xl bg-accent px-4 text-sm font-black text-accent-ink transition hover:bg-accent-hover disabled:opacity-60">
            {salvandoNome ? "Salvando…" : "Salvar nome"}
          </button>
        </form>

        <div className="mt-5 border-t border-border pt-4">
          {!abrirSenha ? (
            <button onClick={() => setAbrirSenha(true)} className="text-sm font-semibold text-accent transition hover:text-accent-hover">Alterar senha</button>
          ) : (
            <form action={salvarSenha} className="space-y-3">
              <p className="text-sm font-extrabold text-text">Alterar senha</p>
              <input name="senhaAtual" type="password" placeholder="Senha atual" required className={inputClass} />
              <input name="novaSenha" type="password" placeholder="Nova senha (mín. 8)" required minLength={8} className={inputClass} />
              <input name="confirmaSenha" type="password" placeholder="Confirme a nova senha" required className={inputClass} />
              {msgSenha && msgSenha !== "ok" && <p className="text-xs font-semibold text-negative">{msgSenha}</p>}
              {msgSenha === "ok" && <p className="text-xs font-semibold text-emerald-400">Senha alterada com sucesso.</p>}
              <div className="flex gap-2">
                <button disabled={salvandoSenha} className="h-10 rounded-xl bg-accent px-4 text-sm font-black text-accent-ink transition hover:bg-accent-hover disabled:opacity-60">
                  {salvandoSenha ? "Salvando…" : "Salvar senha"}
                </button>
                <button type="button" onClick={() => setAbrirSenha(false)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-text-2">Cancelar</button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ---- ASSINATURA ---- */}
      <section className={cardClass}>
        <h2 className="text-sm font-extrabold text-text">Minha assinatura</h2>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Plano atual</p>
            <p className="text-base font-bold text-text">{plano ?? "—"}</p>
          </div>
          <div className="text-right">
            {diasRestantes !== null ? (
              <>
                <p className={`text-2xl font-black ${corDias}`}>{diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}</p>
                <p className="text-xs text-muted">de acesso · vence em {dataBR(vencimento)}</p>
              </>
            ) : (
              <p className="text-sm text-muted">sem assinatura ativa</p>
            )}
          </div>
        </div>
        {urgente && (
          <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-400">
            Sua assinatura está perto de vencer. Renove abaixo para não perder o acesso — os dias restantes são somados ao novo período.
          </p>
        )}
      </section>

      {/* ---- RENOVAR ---- */}
      <section className={cardClass}>
        <h2 className="text-sm font-extrabold text-text">Renovar ou trocar de plano</h2>
        <p className="mt-1 text-xs text-muted">Renovar agora soma os dias ao que você já tem — você não perde tempo pago.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {planos.map((p) => (
            <div key={p.id} className={`relative rounded-xl border p-4 ${p.id === "anual" ? "border-accent/40 bg-accent/[0.04]" : "border-border bg-bg/40"}`}>
              {p.economia > 0 && (
                <span className="absolute -top-2 right-3 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-black text-white">-{p.economia}%</span>
              )}
              <p className="text-sm font-extrabold text-text">{p.nome}</p>
              <p className="mt-1 text-[11px] text-muted">Mercado: <span className="line-through">{p.valorCheioFmt}</span></p>
              <p className="mt-0.5 text-xl font-black text-text">{p.valorFmt}</p>
              <p className="text-[11px] text-muted">{p.porMesFmt}/mês</p>
              <button
                disabled
                title="Pagamento em configuração"
                className="mt-3 h-10 w-full rounded-xl bg-accent px-3 text-xs font-black text-accent-ink opacity-50"
              >
                Renovar
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted">Pagamento por Pix ou cartão — em configuração final.</p>
      </section>
    </div>
  );
}
