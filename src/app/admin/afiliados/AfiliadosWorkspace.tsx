"use client";

import { useActionState, useState } from "react";
import { alternarAfiliadoAction, criarAfiliadoAction, editarAfiliadoAction } from "./actions";

const inputClass = "h-11 w-full rounded-xl border border-border bg-bg/45 px-3.5 text-sm text-text outline-none transition placeholder:text-muted/80 hover:border-border-strong focus:border-accent/70 focus:bg-surface-2 focus:ring-4 focus:ring-accent/10";

type Afiliado = {
  id: string;
  nome: string;
  cupom: string;
  comissaoPct: number;
  descontoPct: number;
  chavePix: string | null;
  ativo: boolean;
  clientes: number;
  aReceber: number;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Formulário de criar/editar. `inicial` presente = modo edição. */
function AfiliadoForm({ inicial, onDone }: { inicial?: Afiliado; onDone: () => void }) {
  const editando = !!inicial;
  const [erro, action, pending] = useActionState(
    async (_prev: string | undefined, fd: FormData) => {
      const r = editando ? await editarAfiliadoAction(_prev, fd) : await criarAfiliadoAction(_prev, fd);
      if (!r) onDone();
      return r;
    },
    undefined,
  );

  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-border bg-surface-2/45 p-4 sm:grid-cols-2 sm:p-5">
      {editando && <input type="hidden" name="id" value={inicial.id} />}
      <label className="block space-y-1.5">
        <span className="mono-label text-muted">Nome do afiliado</span>
        <input name="nome" required defaultValue={inicial?.nome} className={inputClass} placeholder="Ex: João da Silva" />
      </label>
      <label className="block space-y-1.5">
        <span className="mono-label text-muted">Cupom</span>
        <input name="cupom" required defaultValue={inicial?.cupom} className={`${inputClass} uppercase`} placeholder="JOAO10" />
      </label>
      <label className="block space-y-1.5">
        <span className="mono-label text-muted">Comissão do afiliado (%)</span>
        <input name="comissaoPct" type="number" min="0" max="100" step="0.5" required defaultValue={inicial?.comissaoPct ?? 10} className={inputClass} />
      </label>
      <label className="block space-y-1.5">
        <span className="mono-label text-muted">Desconto ao cliente (%)</span>
        <input name="descontoPct" type="number" min="0" max="100" step="0.5" required defaultValue={inicial?.descontoPct ?? 10} className={inputClass} />
      </label>
      <label className="block space-y-1.5 sm:col-span-2">
        <span className="mono-label text-muted">Chave Pix (para o repasse)</span>
        <input name="chavePix" defaultValue={inicial?.chavePix ?? ""} className={inputClass} placeholder="CPF, e-mail, telefone ou chave aleatória" />
      </label>
      {erro && <p className="rounded-xl border border-negative/20 bg-negative/10 px-3.5 py-3 text-xs font-semibold text-negative sm:col-span-2" aria-live="polite">{erro}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={pending} className="h-11 rounded-xl bg-accent px-5 text-sm font-black text-accent-ink transition hover:bg-accent-hover disabled:opacity-60">
          {pending ? "Salvando…" : editando ? "Salvar alterações" : "Criar afiliado"}
        </button>
        <button type="button" onClick={onDone} className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-text-2 transition hover:border-border-strong">Cancelar</button>
      </div>
    </form>
  );
}

export default function AfiliadosWorkspace({ afiliados }: { afiliados: Afiliado[] }) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div className="space-y-5 p-5 md:p-7">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">O cupom dá desconto ao cliente e marca de qual afiliado a venda veio — para sempre.</p>
        {!criando && !editando && (
          <button onClick={() => setCriando(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-black text-accent-ink transition hover:bg-accent-hover">+ Novo afiliado</button>
        )}
      </div>

      {criando && <AfiliadoForm onDone={() => setCriando(false)} />}

      <div className="grid gap-3">
        {afiliados.length === 0 && !criando && (
          <div className="rounded-2xl border border-border bg-surface-2/30 px-4 py-10 text-center text-muted">Nenhum afiliado ainda. Cadastre o primeiro para começar a rastrear indicações.</div>
        )}
        {afiliados.map((a) =>
          editando === a.id ? (
            <AfiliadoForm key={a.id} inicial={a} onDone={() => setEditando(null)} />
          ) : (
            <div key={a.id} className={`rounded-2xl border p-4 transition ${a.ativo ? "border-border bg-surface-2/45" : "border-border/50 bg-surface-2/20 opacity-70"}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-extrabold text-text">{a.nome}</h3>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(a.cupom); }}
                      title="Copiar cupom"
                      className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-accent transition hover:bg-accent/20"
                    >{a.cupom}</button>
                    {!a.ativo && <span className="rounded-md bg-muted/15 px-2 py-0.5 text-[10px] font-bold uppercase text-muted">inativo</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                    <span>Comissão: <b className="text-text-2">{a.comissaoPct}%</b></span>
                    <span>Desconto: <b className="text-text-2">{a.descontoPct}%</b></span>
                    <span>Clientes: <b className="text-text-2">{a.clientes}</b></span>
                    <span>A repassar: <b className={a.aReceber > 0 ? "text-amber-400" : "text-text-2"}>{brl(a.aReceber)}</b></span>
                    {a.chavePix && <span>Pix: <b className="text-text-2">{a.chavePix}</b></span>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditando(a.id)} className="rounded-md border border-border bg-bg/45 px-2.5 py-1 text-[11px] font-bold text-text-2 transition hover:border-accent/40 hover:text-accent">Editar</button>
                  <form action={alternarAfiliadoAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className={`rounded-md border px-2.5 py-1 text-[11px] font-bold transition ${a.ativo ? "border-negative/30 text-negative hover:bg-negative/10" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}>
                      {a.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
