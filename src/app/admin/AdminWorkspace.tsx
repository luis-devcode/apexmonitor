"use client";

import { useActionState, useRef, useState } from "react";
import { alternarBloqueioAction, criarClienteAction, estenderAcessoAction } from "./actions";

const inputClass = "h-11 w-full rounded-xl border border-border bg-bg/45 px-3.5 text-sm text-text outline-none transition placeholder:text-muted/80 hover:border-border-strong focus:border-accent/70 focus:bg-surface-2 focus:ring-4 focus:ring-accent/10";

type Cliente = {
  id: string;
  nome: string;
  email: string;
  bloqueado: boolean;
  assinaturaAte: string | null;
  ativa: boolean;
  criadoEm: string;
  afiliado: string | null;
};

const dataBR = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

function diasRestantes(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function AdminWorkspace({ clientes }: { clientes: Cliente[] }) {
  const [aberto, setAberto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [erro, criar, criando] = useActionState(
    async (_prev: string | undefined, fd: FormData) => {
      const r = await criarClienteAction(_prev, fd);
      if (!r) {
        formRef.current?.reset();
        setAberto(false);
      }
      return r;
    },
    undefined,
  );

  return (
    <div className="space-y-5 p-5 md:p-7">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Cadastre clientes e controle o acesso. O acesso cai sozinho quando a assinatura vence.</p>
        <button onClick={() => setAberto((v) => !v)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-black text-accent-ink transition hover:bg-accent-hover">
          {aberto ? "Fechar" : "+ Novo cliente"}
        </button>
      </div>

      {aberto && (
        <form ref={formRef} action={criar} className="grid gap-3 rounded-2xl border border-border bg-surface-2/45 p-4 sm:grid-cols-2 sm:p-5">
          <label className="block space-y-1.5">
            <span className="mono-label text-muted">Nome</span>
            <input name="nome" required className={inputClass} placeholder="Nome do cliente" />
          </label>
          <label className="block space-y-1.5">
            <span className="mono-label text-muted">E-mail</span>
            <input name="email" type="email" required className={inputClass} placeholder="cliente@email.com" />
          </label>
          <label className="block space-y-1.5">
            <span className="mono-label text-muted">Senha inicial</span>
            <input name="senha" required minLength={8} className={inputClass} placeholder="mínimo 8 caracteres" />
          </label>
          <label className="block space-y-1.5">
            <span className="mono-label text-muted">Acesso por</span>
            <select name="meses" defaultValue="1" className={inputClass}>
              <option value="1">1 mês</option>
              <option value="2">2 meses</option>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">1 ano</option>
            </select>
          </label>
          {erro && <p className="rounded-xl border border-negative/20 bg-negative/10 px-3.5 py-3 text-xs font-semibold text-negative sm:col-span-2" aria-live="polite">{erro}</p>}
          <div className="sm:col-span-2">
            <button disabled={criando} className="h-11 rounded-xl bg-accent px-5 text-sm font-black text-accent-ink transition hover:bg-accent-hover disabled:opacity-60">
              {criando ? "Criando…" : "Criar cliente"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2/60 text-[10px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Vence em</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clientes.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Nenhum cliente ainda. Cadastre o primeiro acima.</td></tr>
            )}
            {clientes.map((c) => {
              const dias = diasRestantes(c.assinaturaAte);
              return (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text">{c.nome}</p>
                    <p className="text-xs text-muted">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {c.bloqueado ? (
                      <span className="rounded-md bg-negative/15 px-2 py-1 text-[11px] font-bold text-negative">Bloqueado</span>
                    ) : c.ativa ? (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-400">Ativo</span>
                    ) : (
                      <span className="rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-400">Vencido</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-text">{dataBR(c.assinaturaAte)}</p>
                    {dias !== null && (
                      <p className={`text-xs ${dias < 0 ? "text-negative" : dias <= 5 ? "text-amber-400" : "text-muted"}`}>
                        {dias < 0 ? `venceu há ${-dias}d` : `faltam ${dias}d`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{c.afiliado ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {[30, 60, 365].map((d) => (
                        <form key={d} action={estenderAcessoAction}>
                          <input type="hidden" name="userId" value={c.id} />
                          <input type="hidden" name="dias" value={d} />
                          <button className="rounded-md border border-border bg-bg/45 px-2 py-1 text-[11px] font-bold text-text-2 transition hover:border-accent/40 hover:text-accent">
                            +{d === 365 ? "1 ano" : `${d}d`}
                          </button>
                        </form>
                      ))}
                      <form action={alternarBloqueioAction}>
                        <input type="hidden" name="userId" value={c.id} />
                        <button className={`rounded-md border px-2 py-1 text-[11px] font-bold transition ${c.bloqueado ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" : "border-negative/30 text-negative hover:bg-negative/10"}`}>
                          {c.bloqueado ? "Desbloquear" : "Bloquear"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
