"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import AppModal from "@/components/AppModal";
import { CATEGORIAS_CUSTO, CATEGORIA_CPF, categoriaCusto, PERIODOS_CUSTO } from "@/lib/custos";
import { addCustoAction, deleteCustoAction, toggleCustoAction } from "./actions";

export type CustoItem = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  periodo: string;
  diaVencimento: number | null;
  ativo: boolean;
  notas: string | null;
  /** Já normalizado para a base mensal — é o que dá pra somar. */
  mensal: number;
  /** MANUAL = cadastrado aqui. PARCEIRO = pagamento de CPF, vem de Parceiros. */
  origem: "MANUAL" | "PARCEIRO";
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const periodoLabel = (id: string) =>
  ({ SEMANA: "por semana", MES: "por mês", ANO: "por ano", DIA: "por dia" }[id] ?? "por mês");

/** Categoria (com a de CPF, que não é editável aqui). */
const infoCategoria = (id: string) =>
  id === CATEGORIA_CPF.id ? CATEGORIA_CPF : categoriaCusto(id);

export default function CustosWorkspace({ custos, lucroMes }: { custos: CustoItem[]; lucroMes: number }) {
  const [novo, setNovo] = useState(false);
  const [filtro, setFiltro] = useState("");

  const ativos = custos.filter((c) => c.ativo);
  const totalMes = ativos.reduce((s, c) => s + c.mensal, 0);
  const totalCpf = ativos.filter((c) => c.origem === "PARCEIRO").reduce((s, c) => s + c.mensal, 0);
  const totalFerramentas = totalMes - totalCpf;
  const liquido = lucroMes - totalMes;

  // Quanto cada categoria pesa — a barra mostra pra onde o dinheiro está indo.
  const mapaCategoria = new Map<string, number>();
  for (const c of ativos) mapaCategoria.set(c.categoria, (mapaCategoria.get(c.categoria) ?? 0) + c.mensal);
  const porCategoria = [...mapaCategoria.entries()].sort((a, b) => b[1] - a[1]);

  const mostrados = filtro ? custos.filter((c) => c.categoria === filtro) : custos;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label text-accent">Gestão financeira</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Custos da operação</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Tudo que sai do bolso todo mês: pagamento dos CPFs, monitor, planilha, internet. O lucro só é lucro
            depois de descontar isso.
          </p>
        </div>
        <button
          onClick={() => setNovo(true)}
          className="h-9 rounded-lg bg-accent px-3.5 text-xs font-black text-accent-ink transition hover:bg-accent-hover"
        >
          + Novo custo
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="card-featured rounded-xl border p-4">
          <p className="mono-label">Custo mensal</p>
          <p className="mt-2 text-2xl font-black tabular-nums sm:text-3xl">{brl(totalMes)}</p>
          <p className="mt-1 text-[11px] text-white/75">{ativos.length} {ativos.length === 1 ? "custo ativo" : "custos ativos"}</p>
        </article>

        <Metric label="Pagamento de CPFs" valor={brl(totalCpf)} detalhe="Vem de Parceiros" tom="info" />
        <Metric label="Ferramentas e outros" valor={brl(totalFerramentas)} detalhe="Cadastrados aqui" tom="warning" />

        {/* O número que importa: lucro do mês menos o que a operação custou. */}
        <article className={`rounded-xl border p-4 ${liquido >= 0 ? "border-positive/30 bg-positive/[0.06]" : "border-negative/30 bg-negative/[0.06]"}`}>
          <p className="mono-label text-muted">Lucro líquido do mês</p>
          <p className={`mt-2 text-2xl font-black tabular-nums ${liquido >= 0 ? "text-positive" : "text-negative"}`}>
            {liquido >= 0 ? "+" : ""}{brl(liquido)}
          </p>
          <p className="mt-1 text-[10px] text-muted">{brl(lucroMes)} de lucro − {brl(totalMes)} de custo</p>
        </article>
      </section>

      {/* Pra onde o dinheiro vai */}
      {porCategoria.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4">
          <p className="mono-label text-muted">Distribuição</p>
          <h3 className="mt-1 text-sm font-extrabold">Pra onde vai o seu custo</h3>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-3">
            {porCategoria.map(([cat, valor], i) => (
              <span
                key={cat}
                className={`h-full ${["bg-accent", "bg-info", "bg-warning", "bg-positive", "bg-negative", "bg-muted"][i % 6]}`}
                style={{ width: `${(valor / totalMes) * 100}%` }}
                title={`${infoCategoria(cat).label}: ${brl(valor)}`}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {porCategoria.map(([cat, valor], i) => (
              <span key={cat} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                <span className={`h-2.5 w-2.5 rounded-sm ${["bg-accent", "bg-info", "bg-warning", "bg-positive", "bg-negative", "bg-muted"][i % 6]}`} />
                {infoCategoria(cat).label} <b className="text-text-2 tabular-nums">{brl(valor)}</b>
                <span className="text-muted">({((valor / totalMes) * 100).toFixed(0)}%)</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Filtros */}
      <section className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFiltro("")}
          className={`h-8 rounded-lg px-3 text-xs font-bold transition ${!filtro ? "bg-accent text-accent-ink" : "border border-border text-text-2 hover:border-border-strong hover:text-text"}`}
        >
          Todos
        </button>
        {[CATEGORIA_CPF, ...CATEGORIAS_CUSTO].map((c) => {
          const tem = custos.some((x) => x.categoria === c.id);
          if (!tem) return null;
          return (
            <button
              key={c.id}
              onClick={() => setFiltro(c.id)}
              className={`h-8 rounded-lg px-3 text-xs font-bold transition ${filtro === c.id ? "bg-accent text-accent-ink" : "border border-border text-text-2 hover:border-border-strong hover:text-text"}`}
            >
              {c.label}
            </button>
          );
        })}
      </section>

      {custos.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-border-strong bg-surface/60 px-6 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-2xl">🧾</span>
            <h3 className="mt-4 text-base font-extrabold">Nenhum custo cadastrado</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Cadastre o que você paga todo mês — monitor de odds, planilha, internet. O pagamento dos CPFs entra
              sozinho quando você preenche em <Link href="/parceiros" className="font-bold text-accent hover:underline">Parceiros</Link>.
            </p>
          </div>
        </div>
      ) : (
        <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {mostrados.map((c) => <CustoCard key={c.id} custo={c} />)}
        </section>
      )}

      {novo && <NovoCustoModal onClose={() => setNovo(false)} />}
    </div>
  );
}

function CustoCard({ custo: c }: { custo: CustoItem }) {
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const info = infoCategoria(c.categoria);
  const doParceiro = c.origem === "PARCEIRO";

  return (
    <article className={`rounded-xl border bg-surface p-4 transition ${c.ativo ? "border-border" : "border-dashed border-border opacity-60"}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-base">{info.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{c.descricao}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {info.label}
            {c.diaVencimento ? ` · vence dia ${c.diaVencimento}` : ""}
          </p>
        </div>
        {!c.ativo && <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-[9px] font-black uppercase text-muted">Pausado</span>}
      </div>

      <p className="mt-3 text-xl font-black tabular-nums">{brl(c.valor)}</p>
      <p className="text-[11px] text-muted">
        {periodoLabel(c.periodo)}
        {c.periodo !== "MES" && <span className="text-text-2"> · {brl(c.mensal)}/mês</span>}
      </p>

      {c.notas && <p className="mt-2 line-clamp-2 text-[11px] text-muted">{c.notas}</p>}

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        {doParceiro ? (
          // O custo do CPF é do Parceiro — mudar aqui e lá deixaria dois donos do mesmo número.
          <Link href="/parceiros" className="text-[11px] font-bold text-accent hover:underline">
            Editar em Parceiros →
          </Link>
        ) : (
          <>
            <button
              disabled={pending}
              onClick={() => startTransition(() => toggleCustoAction(c.id, !c.ativo))}
              className="rounded-md border border-border px-2 py-1 text-[11px] font-bold text-text-2 transition hover:border-border-strong hover:text-text disabled:opacity-50"
            >
              {c.ativo ? "Pausar" : "Reativar"}
            </button>
            {confirmando ? (
              <span className="ml-auto inline-flex items-center gap-1">
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => deleteCustoAction(c.id))}
                  className="rounded-md bg-negative/15 px-2 py-1 text-[11px] font-bold text-negative hover:bg-negative/25"
                >
                  Excluir
                </button>
                <button onClick={() => setConfirmando(false)} className="px-1.5 py-1 text-[11px] text-muted hover:text-text">Não</button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmando(true)}
                className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-negative/10 hover:text-negative"
                title="Excluir custo"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function NovoCustoModal({ onClose }: { onClose: () => void }) {
  const [categoria, setCategoria] = useState("FERRAMENTA");
  const [erro, action, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const falha = await addCustoAction(undefined, formData);
      if (!falha) onClose();
      return falha;
    },
    undefined,
  );

  const campo = "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none transition focus:border-accent";

  return (
    <AppModal title="O que você paga todo mês?" subtitle="Registre ferramentas, serviços e despesas recorrentes para acompanhar seu custo operacional real." eyebrow="Novo custo" onClose={onClose} size="md">
      <form action={action} className="space-y-4 p-5">
          <input type="hidden" name="categoria" value={categoria} />

          <div className="space-y-2">
            <p className="mono-label text-muted">Categoria</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS_CUSTO.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoria(c.id)}
                  title={c.hint}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                    categoria === c.id ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface-2 text-text-2 hover:border-border-strong hover:text-text"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted">{categoriaCusto(categoria).hint}</p>
          </div>

          <label className="block space-y-1 text-xs font-bold text-text-2">
            O que é *
            <input name="descricao" placeholder="Ex.: Monitor de odds, planilha, internet…" className={campo} autoFocus />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1 text-xs font-bold text-text-2">
              Valor *
              <input name="valor" inputMode="decimal" placeholder="0,00" className={`${campo} font-bold`} />
            </label>
            <label className="block space-y-1 text-xs font-bold text-text-2">
              A cada
              <select name="periodo" defaultValue="MES" className={campo}>
                {PERIODOS_CUSTO.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-bold text-text-2">
              Vence dia
              <input name="diaVencimento" inputMode="numeric" placeholder="Opcional" className={campo} />
            </label>
          </div>

          <label className="block space-y-1 text-xs font-bold text-text-2">
            Observação
            <input name="notas" placeholder="Opcional" className={campo} />
          </label>

          <p className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-muted">
            O pagamento dos CPFs não se cadastra aqui: preencha em{" "}
            <Link href="/parceiros" className="font-bold text-accent hover:underline">Parceiros</Link> que ele entra
            sozinho nesta conta.
          </p>

          {erro && <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative">{erro}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-bold text-muted hover:text-text">Cancelar</button>
            <button type="submit" disabled={pending} className="h-9 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink hover:bg-accent-hover disabled:opacity-50">
              {pending ? "Salvando…" : "Salvar custo"}
            </button>
          </div>
      </form>
    </AppModal>
  );
}

function Metric({ label, valor, detalhe, tom }: { label: string; valor: string; detalhe: string; tom: "info" | "warning" }) {
  const cor = { info: "text-info", warning: "text-warning" }[tom];
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <p className="mono-label text-muted">{label}</p>
      <p className={`mt-2 text-xl font-black tabular-nums ${cor}`}>{valor}</p>
      <p className="mt-1 text-[10px] text-muted">{detalhe}</p>
    </article>
  );
}
