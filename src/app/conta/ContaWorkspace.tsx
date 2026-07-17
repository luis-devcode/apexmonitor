"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { alterarSenhaAction, atualizarNomeAction } from "./actions";

const inputClass = "h-12 w-full rounded-2xl border border-border bg-bg/55 px-4 text-sm text-text outline-none transition duration-200 placeholder:text-muted/70 hover:border-border-strong focus:border-accent/60 focus:bg-surface-2 focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:text-text-2";
const panelClass = "rounded-[26px] border border-border bg-surface/70 shadow-[0_20px_70px_rgba(0,0,0,0.16)] backdrop-blur-xl";

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
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const planoLabel = (plano: string | null) =>
  plano ? plano.charAt(0).toUpperCase() + plano.slice(1).toLowerCase() : "Plano não definido";

function Icon({ children, className = "h-5 w-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const inicial = nome.trim().charAt(0).toUpperCase() || "A";
  const urgente = diasRestantes !== null && diasRestantes <= 5;
  const acessoAtivo = isAdmin || (diasRestantes !== null && diasRestantes > 0);

  return (
    <main className="mx-auto w-full max-w-[1180px] space-y-5 p-4 sm:p-5 md:p-7 lg:p-8">
      <section className="relative overflow-hidden rounded-[30px] border border-accent/20 bg-[linear-gradient(125deg,rgba(19,54,112,0.74),rgba(8,18,36,0.92)_48%,rgba(6,12,23,0.96))] p-6 shadow-[0_28px_100px_rgba(5,35,92,0.26)] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-20 -top-36 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] border border-white/15 bg-gradient-to-br from-blue-400 to-blue-700 text-2xl font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_16px_40px_rgba(20,72,183,0.4)] sm:h-[72px] sm:w-[72px]">
              {inicial}
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-blue-100/80">Conta ApexMonitor</span>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
                  {acessoAtivo ? "Acesso ativo" : "Acesso inativo"}
                </span>
              </div>
              <h2 className="truncate text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">Olá, {nome}</h2>
              <p className="mt-1 truncate text-sm text-blue-100/55">{email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-stretch">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 backdrop-blur-md sm:min-w-36">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-100/45">Seu plano</p>
              <p className="mt-1 text-sm font-extrabold text-white">{isAdmin ? "Administrativo" : planoLabel(plano)}</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 backdrop-blur-md sm:min-w-44">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-100/45">Período de acesso</p>
              {isAdmin ? (
                <p className="mt-1 text-sm font-extrabold text-white">Acesso permanente</p>
              ) : diasRestantes !== null ? (
                <p className={`mt-1 text-sm font-extrabold ${urgente ? "text-amber-300" : "text-white"}`}>
                  {diasRestantes} {diasRestantes === 1 ? "dia restante" : "dias restantes"}
                </p>
              ) : (
                <p className="mt-1 text-sm font-extrabold text-white/70">Não disponível</p>
              )}
              {!isAdmin && vencimento && <p className="mt-0.5 text-[10px] text-blue-100/45">Até {dataBR(vencimento)}</p>}
            </div>
          </div>
        </div>
      </section>

      {urgente && !isAdmin && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-xs font-semibold text-amber-300">
          <Icon className="mt-0.5 h-4 w-4 shrink-0"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4M12 17h.01" /></Icon>
          Sua assinatura está perto de vencer. Ao renovar, o novo período é somado aos dias que você já possui.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <section className={`${panelClass} p-5 sm:p-6`}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-accent/15 bg-accent/10 text-accent">
              <Icon><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" /></Icon>
            </span>
            <div>
              <h2 className="text-base font-extrabold tracking-[-0.02em] text-text">Informações pessoais</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">Mantenha seus dados de identificação atualizados.</p>
            </div>
          </div>

          <form action={salvarNome} className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="mono-label text-muted">Nome de exibição</span>
              <input name="nome" defaultValue={nome} required className={inputClass} />
            </label>
            <label className="block space-y-2">
              <span className="mono-label text-muted">E-mail da conta</span>
              <div className="relative">
                <input value={email} disabled className={`${inputClass} pr-28 opacity-70`} />
                <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-xl border border-border bg-surface-3/80 px-2.5 py-1.5 text-[10px] font-bold text-muted" title="O e-mail é a chave da sua assinatura e não pode ser alterado aqui.">
                  <Icon className="h-3 w-3"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Icon>
                  Protegido
                </span>
              </div>
            </label>
            {erroNome && <p className="text-xs font-semibold text-negative">{erroNome}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-[11px] text-muted">O e-mail é vinculado à sua assinatura.</p>
              <button disabled={salvandoNome} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-accent to-accent-deep px-5 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_10px_24px_rgba(23,73,183,0.25)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:opacity-60">
                <Icon className="h-4 w-4"><path d="M4 4h13l3 3v13H4Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></Icon>
                {salvandoNome ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </section>

        <section className={`${panelClass} p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-400">
                <Icon><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></Icon>
              </span>
              <div>
                <h2 className="text-base font-extrabold tracking-[-0.02em] text-text">Acesso e segurança</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">Sua conta está protegida.</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-400">Seguro</span>
          </div>

          {!abrirSenha ? (
            <div className="mt-6">
              <div className="rounded-2xl border border-border bg-bg/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-text">Senha da conta</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">Use uma senha exclusiva com pelo menos 8 caracteres.</p>
                  </div>
                  <span className="font-mono text-base tracking-[0.2em] text-text-2">••••••••</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-muted">
                <Icon className="h-3.5 w-3.5 text-emerald-400"><path d="m5 12 4 4L19 6" /></Icon>
                Sessão protegida e credenciais criptografadas.
              </div>
              <button onClick={() => setAbrirSenha(true)} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border-strong bg-surface-2/70 text-xs font-extrabold text-text transition hover:border-accent/35 hover:bg-accent/[0.06] hover:text-accent">
                <Icon className="h-4 w-4"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></Icon>
                Alterar minha senha
              </button>
            </div>
          ) : (
            <form action={salvarSenha} className="mt-6 space-y-3">
              <input name="senhaAtual" type="password" placeholder="Senha atual" required className={inputClass} />
              <input name="novaSenha" type="password" placeholder="Nova senha (mín. 8 caracteres)" required minLength={8} className={inputClass} />
              <input name="confirmaSenha" type="password" placeholder="Confirme a nova senha" required className={inputClass} />
              {msgSenha && msgSenha !== "ok" && <p className="text-xs font-semibold text-negative">{msgSenha}</p>}
              {msgSenha === "ok" && <p className="text-xs font-semibold text-emerald-400">Senha alterada com sucesso.</p>}
              <div className="flex gap-2 pt-1">
                <button disabled={salvandoSenha} className="h-11 flex-1 rounded-2xl bg-accent px-4 text-xs font-black text-white transition hover:bg-accent-hover disabled:opacity-60">
                  {salvandoSenha ? "Salvando…" : "Atualizar senha"}
                </button>
                <button type="button" onClick={() => setAbrirSenha(false)} className="h-11 rounded-2xl border border-border px-4 text-xs font-bold text-text-2 transition hover:bg-surface-2">Cancelar</button>
              </div>
            </form>
          )}
        </section>
      </div>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-end sm:px-6">
          <div>
            <span className="mono-label text-accent">Planos e renovação</span>
            <h2 className="mt-1.5 text-lg font-black tracking-[-0.025em] text-text">Escolha o ritmo da sua operação</h2>
            <p className="mt-1 text-xs text-muted">Ao renovar, seus dias restantes são preservados e somados ao novo período.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-muted">
            <Icon className="h-3.5 w-3.5 text-accent"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18" /></Icon>
            Pix ou cartão de crédito
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-3 md:p-6">
          {planos.map((p) => {
            const destaque = p.id === "anual";
            return (
              <article key={p.id} className={`group relative flex min-h-[250px] flex-col overflow-hidden rounded-[22px] border p-5 transition duration-300 hover:-translate-y-1 ${destaque ? "border-accent/45 bg-accent/[0.07] shadow-[0_18px_50px_rgba(20,73,183,0.16)]" : "border-border bg-bg/35 hover:border-border-strong hover:bg-surface-2/60"}`}>
                {destaque && <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-accent/15 blur-2xl" />}
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-text">{p.nome}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{p.meses} {p.meses === 1 ? "mês de acesso" : "meses de acesso"}</p>
                  </div>
                  {p.economia > 0 && (
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${destaque ? "bg-accent text-white" : "bg-emerald-400/10 text-emerald-400"}`}>Economize {p.economia}%</span>
                  )}
                </div>

                <div className="relative mt-6">
                  <p className="text-[11px] text-muted">Referência de mercado <span className="line-through decoration-muted/60">{p.valorCheioFmt}</span></p>
                  <p className="mt-1 text-[28px] font-black tracking-[-0.04em] text-text">{p.valorFmt}</p>
                  <p className="mt-0.5 text-xs font-semibold text-text-2">equivale a {p.porMesFmt}<span className="font-normal text-muted">/mês</span></p>
                </div>

                <Link href={`/assinar?plano=${p.id}`} className={`relative mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-xs font-black transition ${destaque ? "bg-gradient-to-b from-accent to-accent-deep text-white hover:brightness-110" : "border border-border bg-surface-2/70 text-text hover:border-accent/35 hover:text-accent"}`}>
                  {acessoAtivo ? "Renovar neste plano" : "Assinar"}
                  <Icon className="h-3.5 w-3.5"><path d="m9 18 6-6-6-6" /></Icon>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
