"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { alterarSenhaAction, atualizarNomeAction } from "./actions";

const inputClass = "h-11 w-full rounded-xl border border-border bg-bg/55 px-3.5 text-sm text-text outline-none transition placeholder:text-muted/70 hover:border-border-strong focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-60";

type PlanoView = {
  id: string; nome: string; meses: number; economia: number;
  valorFmt: string; valorCheioFmt: string; porMesFmt: string;
};

type Props = {
  nome: string;
  email: string;
  role: string;
  plano: string | null;
  diasRestantes: number | null;
  vencimento: string | null;
  planos: PlanoView[];
};

const dataBR = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const planoLabel = (plano: string | null) =>
  plano ? plano.charAt(0).toUpperCase() + plano.slice(1).toLowerCase() : "Sem plano definido";

const beneficios = (id: string) => {
  const comuns = ["Monitores de odds em tempo real", "Calculadoras e gestão financeira"];
  if (id === "mensal") return [...comuns, "Liberdade para renovar mês a mês"];
  if (id === "trimestral") return [...comuns, "3 meses de acesso sem interrupções"];
  return [...comuns, "12 meses com o menor custo mensal"];
};

function Icon({ children, className = "h-5 w-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function ContaWorkspace({ nome, email, role, plano, diasRestantes, vencimento, planos }: Props) {
  const [erroNome, salvarNome, salvandoNome] = useActionState(atualizarNomeAction, undefined);
  const [msgSenha, salvarSenha, salvandoSenha] = useActionState(
    async (_p: string | undefined, fd: FormData) => alterarSenhaAction(_p, fd),
    undefined,
  );
  const [abrirSenha, setAbrirSenha] = useState(false);

  const isAdmin = role === "ADMIN";
  const acessoAtivo = isAdmin || (diasRestantes !== null && diasRestantes > 0);
  const urgente = !isAdmin && diasRestantes !== null && diasRestantes <= 5;
  const inicial = nome.trim().charAt(0).toUpperCase() || "A";

  return (
    <main className="mx-auto w-full max-w-[1180px] space-y-6 p-4 sm:p-5 md:p-7 lg:p-8">
      <section className="relative isolate overflow-hidden rounded-[30px] border border-white/[0.07] bg-[#080b10] px-4 pb-5 pt-12 shadow-[0_32px_100px_rgba(0,0,0,0.34)] sm:px-7 sm:pb-7 sm:pt-14 lg:px-10 lg:pb-10">
        <div className="pointer-events-none absolute -left-24 -top-28 -z-10 h-80 w-80 rounded-full bg-blue-500/30 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 -z-10 h-96 w-96 rounded-full bg-blue-600/25 blur-[100px]" />
        <div className="pointer-events-none absolute left-0 top-0 -z-10 h-32 w-32 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.22),transparent_66%)]" />
        <div className="pointer-events-none absolute -left-3 top-1/3 h-8 w-8 rotate-45 rounded-[7px] bg-blue-400/15 shadow-[0_0_30px_rgba(96,165,250,0.28)]" />
        <div className="pointer-events-none absolute -right-3 top-24 h-8 w-8 rotate-45 rounded-[7px] bg-blue-400/10" />

        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-400/[0.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.9)]" />
            Assinatura ApexMonitor
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">O plano perfeito para a sua operação</h2>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-slate-400 sm:text-sm">Escolha o período que faz sentido para você. Todos os planos liberam a experiência completa, sem limitar ferramentas.</p>
        </div>

        <div className="relative mx-auto mt-9 grid max-w-[970px] items-start gap-3 md:grid-cols-3 md:gap-4">
          {planos.map((p) => {
            const destaque = p.id === "trimestral";
            const melhorEconomia = p.id === "anual";
            return (
              <article
                key={p.id}
                className={`relative flex min-h-[390px] flex-col rounded-[24px] border p-5 transition duration-300 hover:-translate-y-1 sm:p-6 ${destaque ? "border-blue-400/45 bg-[linear-gradient(160deg,rgba(22,32,48,0.98),rgba(10,14,20,0.98))] shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_24px_70px_rgba(11,61,147,0.22)] md:min-h-[430px]" : "border-white/[0.055] bg-[#101318]/95 md:mt-5"}`}
              >
                {destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_rgba(37,99,235,0.4)]">Mais escolhido</span>
                )}

                <div className="flex min-h-8 items-start justify-between gap-2">
                  <p className={`text-xs font-black ${destaque ? "text-blue-400" : "text-slate-200"}`}>{p.nome}</p>
                  {melhorEconomia && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-400">Maior economia</span>}
                </div>

                <div className="mt-5 flex items-end gap-1.5">
                  <strong className="text-[34px] font-black tracking-[-0.05em] text-white sm:text-[38px]">{p.porMesFmt}</strong>
                  <span className="mb-1.5 text-[11px] font-semibold text-slate-500">/mês</span>
                </div>
                <p className="mt-1 text-[10px] leading-5 text-slate-500">Cobrança de {p.valorFmt} por {p.meses === 1 ? "mês" : `${p.meses} meses`}.</p>

                <div className="my-5 h-px bg-white/[0.06]" />

                <p className="text-[10px] font-bold text-slate-300">Tudo que você precisa:</p>
                <ul className="mt-3 space-y-3">
                  {beneficios(p.id).map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[10px] leading-4 text-slate-400">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/[0.06] text-blue-400">
                        <Icon className="h-2.5 w-2.5"><path d="m5 12 4 4L19 6" /></Icon>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  {p.economia > 0 && <p className="mb-3 text-center text-[9px] font-bold text-emerald-400">Você economiza {p.economia}% frente ao mercado</p>}
                  <Link
                    href={`/assinar?plano=${p.id}`}
                    className={`flex h-11 w-full items-center justify-center rounded-xl text-[10px] font-black transition ${destaque ? "bg-blue-500 text-white shadow-[0_12px_30px_rgba(37,99,235,0.3)] hover:bg-blue-400" : "border border-white/[0.08] bg-white/[0.04] text-slate-200 hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-blue-300"}`}
                  >
                    {acessoAtivo ? "Renovar neste plano" : "Escolher este plano"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-5 flex max-w-[970px] flex-col items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.035] px-4 py-3 sm:flex-row sm:px-5">
          <p className="flex items-center gap-2 text-[10px] text-slate-400">
            <Icon className="h-3.5 w-3.5 text-blue-400"><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></Icon>
            Checkout seguro por Pix ou cartão de crédito
          </p>
          <p className="text-[10px] font-semibold text-slate-500">Renovar agora preserva todos os seus dias restantes.</p>
        </div>
      </section>

      {urgente && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-xs font-semibold text-amber-400">
          <Icon className="mt-0.5 h-4 w-4 shrink-0"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4M12 17h.01" /></Icon>
          Sua assinatura está perto de vencer. Ao renovar, o novo período será somado aos dias atuais.
        </div>
      )}

      <section className="overflow-hidden rounded-[26px] border border-border bg-surface/65 shadow-[0_20px_70px_rgba(0,0,0,0.14)]">
        <div className="flex flex-col justify-between gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 text-sm font-black text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)]">{inicial}</div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-extrabold text-text">{nome}</h3>
              <p className="truncate text-[11px] text-muted">{email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[9px] font-bold text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Acesso ativo</span>
            <span className="rounded-full border border-border bg-bg/40 px-2.5 py-1 text-[9px] font-bold text-text-2">{isAdmin ? "Administrativo · permanente" : `${planoLabel(plano)} · ${diasRestantes ?? 0} dias`}</span>
            {!isAdmin && vencimento && <span className="text-[9px] text-muted">vence em {dataBR(vencimento)}</span>}
          </div>
        </div>

        <div className="grid lg:grid-cols-2">
          <div className="border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-accent"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" /></Icon>
              <div>
                <h3 className="text-sm font-extrabold text-text">Dados da conta</h3>
                <p className="text-[10px] text-muted">Informações usadas no seu acesso.</p>
              </div>
            </div>
            <form action={salvarNome} className="mt-5 space-y-3">
              <label className="block space-y-1.5">
                <span className="mono-label text-muted">Nome de exibição</span>
                <input name="nome" defaultValue={nome} required className={inputClass} />
              </label>
              <label className="block space-y-1.5">
                <span className="mono-label text-muted">E-mail protegido</span>
                <input value={email} disabled className={inputClass} />
              </label>
              {erroNome && <p className="text-xs font-semibold text-negative">{erroNome}</p>}
              <button disabled={salvandoNome} className="h-10 rounded-xl bg-accent px-4 text-[10px] font-black text-white transition hover:bg-accent-hover disabled:opacity-60">
                {salvandoNome ? "Salvando…" : "Salvar alterações"}
              </button>
            </form>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-accent"><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6l-7-3Z" /></Icon>
              <div>
                <h3 className="text-sm font-extrabold text-text">Senha e segurança</h3>
                <p className="text-[10px] text-muted">Credenciais protegidas e sessão individual.</p>
              </div>
            </div>

            {!abrirSenha ? (
              <div className="mt-5">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-bg/35 px-4 py-4">
                  <div>
                    <p className="text-xs font-bold text-text">Senha da conta</p>
                    <p className="mt-1 text-[10px] text-muted">Última proteção disponível</p>
                  </div>
                  <span className="font-mono tracking-[0.22em] text-text-2">••••••••</span>
                </div>
                <button onClick={() => setAbrirSenha(true)} className="mt-3 h-10 w-full rounded-xl border border-border-strong text-[10px] font-black text-text-2 transition hover:border-accent/35 hover:bg-accent/[0.05] hover:text-accent">Alterar minha senha</button>
              </div>
            ) : (
              <form action={salvarSenha} className="mt-5 space-y-3">
                <input name="senhaAtual" type="password" placeholder="Senha atual" required className={inputClass} />
                <input name="novaSenha" type="password" placeholder="Nova senha (mín. 8 caracteres)" required minLength={8} className={inputClass} />
                <input name="confirmaSenha" type="password" placeholder="Confirme a nova senha" required className={inputClass} />
                {msgSenha && msgSenha !== "ok" && <p className="text-xs font-semibold text-negative">{msgSenha}</p>}
                {msgSenha === "ok" && <p className="text-xs font-semibold text-emerald-400">Senha alterada com sucesso.</p>}
                <div className="flex gap-2">
                  <button disabled={salvandoSenha} className="h-10 flex-1 rounded-xl bg-accent px-4 text-[10px] font-black text-white disabled:opacity-60">{salvandoSenha ? "Salvando…" : "Atualizar senha"}</button>
                  <button type="button" onClick={() => setAbrirSenha(false)} className="h-10 rounded-xl border border-border px-4 text-[10px] font-bold text-text-2">Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
