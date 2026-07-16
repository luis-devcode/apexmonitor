"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import AppModal from "@/components/AppModal";
import DateField from "@/components/DateField";
import EventCombo from "@/components/EventCombo";
import HousePicker from "@/components/HousePicker";
import type { EventOption } from "@/lib/event-options";
import { PROCEDIMENTOS, procedimentoLabel } from "@/lib/procedimentos";
import {
  criarOperacaoAction,
  deleteOperacaoAction,
  finalizarOperacaoAction,
  reabrirOperacaoAction,
  setPernaContaAction,
  vincularFreebetExtraidaAction,
} from "./actions";

type Perna = {
  id: string;
  casa: string | null;
  casaLogo: string | null;
  contaId: string | null;
  contaLabel: string | null;
  selecao: string;
  odd: number;
  stake: number;
  isLay: boolean;
  freebet: boolean;
  comissaoPct: number;
  aumentoPct: number;
  risco: number;
  resultado: string;
  retorno: number | null;
};
type Operacao = {
  id: string;
  evento: string;
  esporte: string | null;
  tipo: string;
  procedimento: string | null;
  data: string;
  createdAt: string;
  status: string;
  stakeTotal: number;
  lucroEsperado: number;
  lucroReal: number | null;
  casas: string | null;
  notas: string | null;
  pernas: Perna[];
  freebetUsada: { id: string; casaNome: string; valor: number; valorExtraido: number | null } | null;
};
type ContaOption = { id: string; casaNome: string; parceiroNome: string; label: string };
type FreebetOption = { id: string; casaNome: string; parceiroNome: string | null; valor: number };
type CasaOption = { name: string; logoUrl: string | null };
type Stats = { totalInvestido: number; lucroTotal: number; roiGeral: number; operacoes: number; taxaAcerto: number; finalizadas: number };
type FilterOption = { value: string; label: string };
type ManualLeg = { casa: string; selecao: string; odd: string; stake: string; retorno?: string };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const moneyInputValue = (raw: string) => {
  const clean = raw.trim().replace(/R\$|\s/g, "");
  if (!clean) return 0;
  const value = Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean);
  return Number.isFinite(value) ? value : 0;
};
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const monthKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const todayKey = () => dateKey(new Date().toISOString());
const relativeDayKey = (offset: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return dateKey(date.toISOString());
};
const dataLabel = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const horaLabel = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dataInputValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const datetimeLocalFromIso = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dataInputValue();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const signedBrl = (value: number) => `${value >= 0 ? "+" : ""}${brl(value)}`;
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const retornoSimplesInput = (leg: ManualLeg) =>
  round2(moneyInputValue(leg.stake) * moneyInputValue(leg.odd)).toFixed(2).replace(".", ",");

/**
 * O que volta pro bolso se esta perna vencer — mesma conta do servidor
 * (`retornoDaPerna` em actions.ts). A comissão só morde o GANHO:
 *  - BACK:    stake de volta + lucro líquido.
 *  - LAY:     responsabilidade de volta + a stake do apostador, menos comissão.
 *  - FREEBET: a stake é da casa, então volta só o lucro.
 */
function retornoDaPerna(p: Pick<Perna, "stake" | "odd" | "isLay" | "freebet" | "comissaoPct" | "aumentoPct">) {
  const comm = Math.min(Math.max(p.comissaoPct, 0), 100) / 100;
  const aumento = Math.max(p.aumentoPct, 0) / 100;
  if (p.isLay) return p.stake * Math.max(0, p.odd - 1) + p.stake * (1 - comm) * (1 + aumento);
  const lucro = p.stake * Math.max(0, p.odd - 1) * (1 + aumento) * (1 - comm);
  return p.freebet ? lucro : p.stake + lucro;
}

const TIPO_LABEL: Record<string, string> = { SUREBET: "Surebet", FREEBET: "Freebet", SUPERODD: "Super Odd", VALUEBET: "Value", OUTRO: "Outro" };
/** Sentinela do "nenhuma bateu" — não é id de perna nenhuma. */
const PERDEU = "__PERDEU__";

/** Lançamentos manuais. Operações calculadas têm um fluxo próprio na calculadora. */
type TipoRegistro = "aposta" | "cassino";
const TIPOS_REGISTRO = [
  { id: "aposta" as const, label: "Aposta simples", hint: "Registre uma aposta pronta, sem distribuir stakes.", tag: "Esportes" },
  { id: "cassino" as const, label: "Resultado de cassino", hint: "Informe o valor usado e o retorno da sessão.", tag: "Cassino" },
];
const RESULT_META: Record<string, { label: string; cls: string }> = {
  GREEN: { label: "Green", cls: "bg-positive/15 text-positive" },
  RED: { label: "Red", cls: "bg-negative/15 text-negative" },
  ANULADA: { label: "Anulada", cls: "bg-surface-3 text-muted" },
  PENDENTE: { label: "Pendente", cls: "bg-info/10 text-info" },
};

export default function PlanilhaWorkspace({ operacoes, contas, freebets, casas, stats, eventos, abrirNova = false }: { operacoes: Operacao[]; contas: ContaOption[]; freebets: FreebetOption[]; casas: CasaOption[]; stats: Stats; eventos: EventOption[]; abrirNova?: boolean }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [filtroCasa, setFiltroCasa] = useState("");
  // A planilha abre no DIA DE HOJE. O histórico não some — está a um clique no
  // calendário (ou em "Ver todas").
  const [de, setDe] = useState(todayKey);
  const [ate, setAte] = useState(todayKey);
  const [modalPreset, setModalPreset] = useState<TipoRegistro | "escolher" | null>(abrirNova ? "escolher" : null);

  const hoje = todayKey();
  const ontem = relativeDayKey(-1);
  const inicio7Dias = relativeDayKey(-6);
  const inicio30Dias = relativeDayKey(-29);
  const verPeriodo = (inicio: string, fim: string) => { setDe(inicio); setAte(fim); };
  const periodoAtivo = (inicio: string, fim: string) => de === inicio && ate === fim;

  const fecharNovaOperacao = () => {
    setModalPreset(null);
    if (abrirNova) router.replace("/operacoes", { scroll: false });
  };

  // Dia aceso no calendário: só quando o período é de um dia só.
  const diaSelecionado = de && de === ate ? de : "";
  const verDia = (dia: string) => { setDe(dia); setAte(dia); };

  // Numeração diária: a primeira operação de cada dia é sempre 1.
  // Filtrar ou reordenar a tela não muda o número; em horários iguais, vale a
  // ordem em que as operações foram cadastradas.
  const numeros = useMemo(() => {
    const cronologica = [...operacoes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const contagemPorDia = new Map<string, number>();
    const resultado = new Map<string, number>();
    for (const operacao of cronologica) {
      const dia = dateKey(operacao.createdAt);
      const numero = (contagemPorDia.get(dia) ?? 0) + 1;
      contagemPorDia.set(dia, numero);
      resultado.set(operacao.id, numero);
    }
    return resultado;
  }, [operacoes]);

  const casaOptions = useMemo<FilterOption[]>(
    () => [...new Set(operacoes.flatMap((o) => o.pernas.map((p) => p.casa).filter((c): c is string => !!c)))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((c) => ({ value: c, label: c })),
    [operacoes],
  );

  // Tudo, menos o filtro de data — é o que alimenta os pontinhos do calendário.
  const semData = useMemo(() => {
    const termo = normalize(busca.trim());
    return operacoes.filter((o) => {
      if (tipo && o.procedimento !== tipo) return false;
      if (status && o.status !== status) return false;
      if (filtroCasa && !o.pernas.some((p) => p.casa === filtroCasa)) return false;
      if (termo && !normalize(`${o.evento} ${o.casas ?? ""} ${o.notas ?? ""}`).includes(termo)) return false;
      return true;
    });
  }, [operacoes, busca, tipo, status, filtroCasa]);

  const shown = useMemo(() => {
    const filtradas = semData.filter((o) => {
      if (de && dateKey(o.createdAt) < de) return false;
      if (ate && dateKey(o.createdAt) > ate) return false;
      return true;
    });
    // O que ainda pede ação sobe; o que já foi resolvido desce. Dentro de cada
    // grupo a ordem original (mais recente primeiro) é preservada — o sort do JS
    // é estável, então basta comparar o status.
    const pendente = (o: Operacao) => (o.status === "FINALIZADA" ? 1 : 0);
    return [...filtradas].sort((a, b) => pendente(a) - pendente(b));
  }, [semData, de, ate]);

  const temFiltro = busca || tipo || status || filtroCasa || de || ate;
  const emAberto = operacoes.filter((o) => o.status !== "FINALIZADA");
  const abertas = emAberto.length;
  // Só entra aqui o que tem as pontas cobertas. Aposta de perna única não tem
  // lucro previsto — somar isso fingiria uma certeza que não existe.
  const protegidas = emAberto.filter((o) => o.pernas.length > 1);
  const lucroAberto = protegidas.reduce((sum, o) => sum + o.lucroEsperado, 0);
  const semProtecaoAbertas = abertas - protegidas.length;
  const listaLabel = diaSelecionado
    ? new Date(`${diaSelecionado}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : de || ate ? "Período selecionado" : "Todas as operações";
  // O destaque azul acompanha o período escolhido na própria planilha. Com o
  // filtro padrão (Hoje), ele é literalmente o lucro realizado do dia.
  const operacoesDoPeriodo = operacoes.filter((operacao) => {
    const dia = dateKey(operacao.createdAt);
    if (de && dia < de) return false;
    if (ate && dia > ate) return false;
    return true;
  });
  const finalizadasDoPeriodo = operacoesDoPeriodo.filter((operacao) => operacao.status === "FINALIZADA");
  const lucroDoPeriodo = finalizadasDoPeriodo.reduce((sum, operacao) => sum + (operacao.lucroReal ?? 0), 0);
  const capitalDoPeriodo = operacoesDoPeriodo.reduce((sum, operacao) => sum + operacao.stakeTotal, 0);
  const lucroDestaqueLabel = diaSelecionado ? "Lucro do dia" : "Lucro do período";
  const lucroDestaqueValor = lucroDoPeriodo === 0 ? brl(0) : signedBrl(lucroDoPeriodo);
  const lucroDestaqueDetalhe = `${finalizadasDoPeriodo.length} ${finalizadasDoPeriodo.length === 1 ? "operação finalizada" : "operações finalizadas"}${diaSelecionado ? " no dia selecionado" : " no período"}`;
  const capitalLabel = diaSelecionado ? "Capital movimentado no dia" : !de && !ate ? "Capital movimentado total" : "Capital movimentado no período";
  const capitalDetalhe = `${operacoesDoPeriodo.length} ${operacoesDoPeriodo.length === 1 ? "operação registrada" : "operações registradas"}${diaSelecionado ? " no dia selecionado" : !de && !ate ? " no total" : " no período"}`;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-accent/20 bg-[linear-gradient(135deg,rgba(14,29,56,0.97),rgba(6,13,26,0.98)_58%,rgba(8,18,35,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M3 9h18M9 9v12M14 13h3M14 17h3" /></svg>
              </span>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-accent">Controle operacional</p>
            </div>
            <h2 className="text-2xl font-black tracking-[-0.035em] text-text sm:text-3xl">Planilha de Operações</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-2">Registre, acompanhe e finalize suas operações com valores, contas e resultados organizados em um só lugar.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button onClick={() => setModalPreset("escolher")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-black text-accent-ink shadow-[0_8px_24px_rgba(59,130,246,0.28)] transition hover:-translate-y-0.5 hover:bg-accent-hover">
                <span className="text-base leading-none">+</span> Nova operação
              </button>
              <button onClick={() => exportCsv(shown, numeros)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong bg-surface/55 px-4 text-xs font-bold text-text-2 transition hover:border-accent/50 hover:text-text">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 xl:min-w-[520px]">
            <HeroMetric label="Operações" value={String(stats.operacoes)} />
            <HeroMetric label="Em aberto" value={String(abertas)} warning={abertas > 0} />
            <HeroMetric label="Taxa verde" value={`${stats.taxaAcerto.toFixed(1)}%`} positive={stats.taxaAcerto > 0} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
        <article className="card-featured relative overflow-hidden rounded-2xl border p-5">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <p className="mono-label">{lucroDestaqueLabel}</p>
          <p className={`relative mt-3 text-2xl font-black tabular-nums sm:text-3xl ${lucroDoPeriodo < 0 ? "text-red-200" : "text-white"}`}>{lucroDestaqueValor}</p>
          <p className="relative mt-1 text-[10px] text-white/75">{lucroDestaqueDetalhe}</p>
        </article>
        <Metric label={capitalLabel} value={brl(capitalDoPeriodo)} tone="info" detail={capitalDetalhe} />
        <Metric label="ROI realizado" value={`${stats.roiGeral >= 0 ? "+" : ""}${stats.roiGeral.toFixed(2)}%`} tone={stats.roiGeral < 0 ? "negative" : "positive"} detail="Calculado sobre finalizadas" />
        <Metric label="Potencial protegido" value={signedBrl(lucroAberto)} tone={lucroAberto < 0 ? "negative" : "info"} detail={semProtecaoAbertas > 0 ? `${semProtecaoAbertas} sem proteção` : `${protegidas.length} em acompanhamento`} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-[0_14px_40px_rgba(0,0,0,0.16)]">
        <div className="grid gap-2 p-3 sm:p-4 lg:grid-cols-[minmax(260px,1fr)_auto_auto_176px]">
          <label className="relative min-w-0">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" strokeLinecap="round" /></svg>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar jogo, casa ou anotação..." className="h-11 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
          </label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-11 rounded-xl border border-border bg-surface-2 px-3 text-xs font-semibold outline-none transition focus:border-accent">
            <option value="">Todos os procedimentos</option>
            {PROCEDIMENTOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-border bg-surface-2 px-3 text-xs font-semibold outline-none transition focus:border-accent">
            <option value="">Todos os status</option>
            <option value="PENDENTE">Em aberto</option>
            <option value="FINALIZADA">Finalizadas</option>
          </select>
          <FilterCombo key={filtroCasa || "todas-casas"} options={casaOptions} value={filtroCasa} onChange={setFiltroCasa} allLabel="Todas as casas" placeholder="Todas as casas" />
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-surface-2/35 px-3 py-3 sm:px-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-muted">Período</span>
            <button onClick={() => verPeriodo(hoje, hoje)} className={`h-8 rounded-lg border px-3 text-[11px] font-bold transition ${periodoAtivo(hoje, hoje) ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-text-2 hover:border-border-strong"}`}>Hoje</button>
            <button onClick={() => verPeriodo(ontem, ontem)} className={`h-8 rounded-lg border px-3 text-[11px] font-bold transition ${periodoAtivo(ontem, ontem) ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-text-2 hover:border-border-strong"}`}>Ontem</button>
            <button onClick={() => verPeriodo(inicio7Dias, hoje)} className={`h-8 rounded-lg border px-3 text-[11px] font-bold transition ${periodoAtivo(inicio7Dias, hoje) ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-text-2 hover:border-border-strong"}`}>Últimos 7 dias</button>
            <button onClick={() => verPeriodo(inicio30Dias, hoje)} className={`h-8 rounded-lg border px-3 text-[11px] font-bold transition ${periodoAtivo(inicio30Dias, hoje) ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-text-2 hover:border-border-strong"}`}>Últimos 30 dias</button>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <DateField value={de} onChange={setDe} className="min-w-0 flex-1 sm:w-[142px] sm:flex-none" />
            <span className="text-[10px] text-muted">até</span>
            <DateField value={ate} onChange={setAte} className="min-w-0 flex-1 sm:w-[142px] sm:flex-none" />
          </div>
          <div className="flex items-center justify-between gap-3 lg:ml-auto">
            <p className="text-[11px] text-muted"><b className="text-text">{shown.length}</b> {shown.length === 1 ? "operação exibida" : "operações exibidas"}</p>
            {temFiltro ? <button onClick={() => { setBusca(""); setTipo(""); setStatus(""); setFiltroCasa(""); verDia(todayKey()); }} className="h-8 rounded-lg border border-border bg-surface px-3 text-[11px] font-bold text-text-2 transition hover:border-accent hover:text-accent">Limpar filtros</button> : null}
          </div>
        </div>
      </section>

      {/* O calendário fica SEMPRE na tela — é por ele que se chega aos outros dias. */}
      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1 pb-1">
            <div>
              <p className="mono-label text-accent">Operações</p>
              <h3 className="mt-1 text-base font-black capitalize text-text">{listaLabel}</h3>
            </div>
            <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-[10px] font-bold text-muted"><b className="text-text">{shown.length}</b> registros</span>
          </div>
          {operacoes.length === 0 ? (
            <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border-strong bg-surface/60 px-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-2xl">📊</span>
                <h3 className="mt-4 text-base font-extrabold">Nenhuma operação registrada ainda</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">Registre pela calculadora ou use os atalhos acima. A planilha organiza lucro, stake, conta/CPF e resultado final.</p>
              </div>
            </div>
          ) : shown.length === 0 ? (
            <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border-strong bg-surface/60 px-6 text-center">
              <div className="max-w-sm">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-2xl">📅</span>
                <h3 className="mt-4 text-base font-extrabold">
                  {diaSelecionado === todayKey() ? "Nenhuma operação hoje" : "Nenhuma operação neste período"}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Clique num dia do calendário para ver as operações daquela data, ou use <b className="text-text-2">Ver todas</b>.
                </p>
              </div>
            </div>
          ) : (
            shown.map((o) => <OperacaoCard key={o.id} operacao={o} numero={numeros.get(o.id) ?? 0} contas={contas} freebets={freebets} casas={casas} />)
          )}
        </div>
        <PlanilhaCalendar operacoes={semData} selected={diaSelecionado} onSelect={verDia} />
      </section>

      {modalPreset && <ManualEntryModal preset={modalPreset} contas={contas} casas={casas} eventos={eventos} onClose={fecharNovaOperacao} />}
    </div>
  );
}

function OperacaoCard({ operacao, numero, contas, freebets, casas }: { operacao: Operacao; numero: number; contas: ContaOption[]; freebets: FreebetOption[]; casas: CasaOption[] }) {
  const [finalizando, setFinalizando] = useState(false);
  const finalizada = operacao.status === "FINALIZADA";
  const lucro = finalizada ? operacao.lucroReal ?? 0 : operacao.lucroEsperado;
  const roi = operacao.stakeTotal > 0 ? (lucro / operacao.stakeTotal) * 100 : 0;
  // Uma perna só = aposta simples: não há outra ponta cobrindo o risco.
  const semProtecao = operacao.pernas.length === 1;
  const candidatasFreebet = freebets.filter((freebet) => operacao.pernas.some((perna) =>
    perna.freebet
    && !!perna.casa
    && normalize(perna.casa) === normalize(freebet.casaNome)
    && Math.abs(perna.stake - freebet.valor) < 0.01,
  ));

  return (
    <article className={`relative overflow-hidden rounded-2xl border bg-surface shadow-[0_16px_42px_rgba(0,0,0,0.15)] transition-colors hover:border-border-strong ${finalizada ? "border-positive/25" : "border-warning/30"}`}>
      <span className={`absolute inset-y-0 left-0 w-0.5 ${finalizada ? "bg-positive" : "bg-warning"}`} aria-hidden="true" />
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 border-b border-border px-4 py-3.5 sm:flex sm:flex-wrap sm:px-5">
        {/* Nº da operação — a âncora pra conversar sobre ela ("a operação 3 bateu"). */}
        <span className={`grid h-8 shrink-0 place-items-center rounded-lg border px-2.5 text-xs font-black tabular-nums ${finalizada ? "border-positive/20 bg-positive/10 text-positive" : "border-warning/20 bg-warning/10 text-warning"}`}>
          #{numero}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black leading-tight sm:truncate sm:text-[15px]">Operação {numero} · {operacao.evento}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted">
            <span className="font-semibold text-text-2">Registrada {dateKey(operacao.createdAt) === todayKey() ? "hoje" : dataLabel(operacao.createdAt).split(",")[0]}{" \u00e0s "}{horaLabel(operacao.createdAt)}</span>
            <span aria-hidden="true">{"\u00b7"}</span>
            <span>Evento {dataLabel(operacao.data)}</span>
          </span>
        </span>
        <span className="col-start-2 flex flex-wrap items-center gap-2 sm:col-auto">
          <span className="rounded-lg border border-accent/15 bg-accent/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-accent">
            {procedimentoLabel(operacao.procedimento) ?? TIPO_LABEL[operacao.tipo] ?? operacao.tipo}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold ${finalizada ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${finalizada ? "bg-positive" : "bg-warning"}`} />
            {finalizada ? "Finalizada" : "Em aberto"}
          </span>
        </span>
      </div>

      <div className={`grid border-b border-border bg-surface-2/35 ${semProtecao ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
        <div className={`border-r border-border px-4 py-3 sm:px-5 ${semProtecao ? "border-b sm:border-b-0" : ""}`}>
          <p className="mono-label text-muted">Investido</p>
          <p className="mt-1 text-sm font-black tabular-nums text-text sm:text-base">{brl(operacao.stakeTotal)}</p>
        </div>
        <div className={`border-border px-4 py-3 ${semProtecao ? "border-b sm:border-b-0 sm:border-r" : "border-r"}`}>
          <p className="mono-label text-muted">{finalizada ? "Lucro real" : semProtecao ? "Se bater" : "Lucro previsto"}</p>
          <p className={`mt-1 text-sm font-black tabular-nums sm:text-base ${lucro >= 0 ? "text-positive" : "text-negative"}`}>{signedBrl(lucro)}</p>
        </div>
        {semProtecao && (
          <div className="border-r border-border px-4 py-3">
            <p className="mono-label text-muted">Se perder</p>
            <p className="mt-1 text-sm font-black tabular-nums text-negative sm:text-base">-{brl(operacao.stakeTotal)}</p>
          </div>
        )}
        <div className="px-4 py-3">
          <p className="mono-label text-muted">{semProtecao ? "ROI se bater" : "ROI"}</p>
          <p className={`mt-1 text-sm font-black tabular-nums sm:text-base ${roi >= 0 ? "text-positive" : "text-negative"}`}>{roi >= 0 ? "+" : ""}{roi.toFixed(2)}%</p>
        </div>
      </div>

      <div className="sm:overflow-x-auto">
        <table className={`block w-full text-sm sm:table ${semProtecao ? "sm:min-w-[810px]" : "sm:min-w-[720px]"}`}>
          <thead className="hidden sm:table-header-group">
            <tr className="mono-label border-b border-border bg-bg/25 text-left text-muted">
              <th className="px-4 py-2.5 font-medium">Entrada</th>
              <th className="px-3 py-2.5 font-medium">Casa</th>
              <th className="px-3 py-2.5 text-center font-medium">Odd</th>
              <th className="px-3 py-2.5 text-right font-medium">Valor</th>
              <th className="px-3 py-2.5 text-right font-medium">Se bater</th>
              {semProtecao && <th className="px-3 py-2.5 text-right font-medium">Se perder</th>}
              <th className="px-3 py-2.5 font-medium">Conta / CPF</th>
              <th className="px-3 py-2.5 text-center font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {operacao.pernas.map((p) => {
              // O que sobra no bolso se ESTA entrada bater: o retorno dela menos
              // tudo o que foi arriscado na operação inteira.
              const seBater = round2(retornoDaPerna(p) - operacao.stakeTotal);
              return (
              <tr key={p.id} className="grid grid-cols-2 gap-x-3 gap-y-4 border-b border-border/50 p-4 transition-colors last:border-0 sm:table-row sm:p-0 sm:hover:bg-surface-2/30">
                <td className="min-w-0 font-bold sm:px-4 sm:py-3">
                  <span className="mono-label mb-1 block text-muted sm:hidden">Entrada</span>
                  <span className="flex items-center gap-1.5">
                    {p.selecao}
                    {p.isLay && <span className="rounded bg-negative/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-negative">Lay</span>}
                    {p.aumentoPct > 0 && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-accent">+{p.aumentoPct.toLocaleString("pt-BR")}%</span>}
                  </span>
                </td>
                <td className="min-w-0 sm:px-3 sm:py-3">
                  <span className="mono-label mb-1 block text-muted sm:hidden">Casa</span>
                  <span className="flex items-center gap-2">
                    {p.casaLogo ? <img src={p.casaLogo} alt="" className="h-6 w-6 shrink-0 rounded bg-white object-contain p-0.5" /> : <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-surface-3 text-[9px] font-bold text-muted">{(p.casa ?? "?").charAt(0)}</span>}
                    <span className="truncate text-text-2">{p.casa ?? "Sem casa"}</span>
                  </span>
                </td>
                <td className="font-black tabular-nums sm:px-3 sm:py-3 sm:text-center">
                  <span className="mono-label mb-1 block text-muted sm:hidden">Odd</span>
                  {p.odd.toFixed(2)}
                </td>
                <td className="tabular-nums sm:px-3 sm:py-3 sm:text-right">
                  <span className="mono-label mb-1 block text-muted sm:hidden">Valor</span>
                  {/* No LAY o que se arrisca é a responsabilidade, não a stake. */}
                  <span className="block font-semibold">{brl(p.freebet ? p.stake : p.risco)}</span>
                  {p.freebet && <span className="block text-[10px] text-accent">freebet · risco próprio {brl(0)}</span>}
                  {p.isLay && <span className="block text-[10px] text-muted">stake {brl(p.stake)}</span>}
                </td>
                <td className="tabular-nums sm:px-3 sm:py-3 sm:text-right">
                  <span className="mono-label mb-1 block text-muted sm:hidden">Se bater</span>
                  <span className={`block font-bold ${seBater >= 0 ? "text-positive" : "text-negative"}`}>{signedBrl(seBater)}</span>
                  <span className="block text-[10px] text-muted">retorno {brl(retornoDaPerna(p))}</span>
                </td>
                {semProtecao && (
                  <td className="tabular-nums sm:px-3 sm:py-3 sm:text-right">
                    <span className="mono-label mb-1 block text-muted sm:hidden">Se perder</span>
                    <span className="block font-bold text-negative">-{brl(p.risco)}</span>
                    <span className="block text-[10px] text-muted">retorno {brl(0)}</span>
                  </td>
                )}
                <td className="min-w-0 sm:px-3 sm:py-3">
                  <span className="mono-label mb-1 block text-muted sm:hidden">Conta / CPF</span>
                  <ContaAssign pernaId={p.id} casa={p.casa} contaId={p.contaId} contas={contas} />
                </td>
                <td className="sm:px-3 sm:py-3 sm:text-center">
                  <span className="mono-label mb-1 block text-muted sm:hidden">Resultado</span>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${RESULT_META[p.resultado]?.cls ?? "text-muted"}`}>{RESULT_META[p.resultado]?.label ?? p.resultado}</span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2/35 px-4 py-3 sm:px-5">
        {semProtecao && !finalizada && (
          <span className="rounded-lg border border-warning/15 bg-warning/10 px-2.5 py-1 text-[10px] font-bold text-warning">Sem proteção · risco {brl(operacao.stakeTotal)}</span>
        )}
        {operacao.notas && <span className="min-w-[160px] flex-1 truncate text-[11px] text-muted">{operacao.notas}</span>}
        {finalizada && operacao.procedimento === "EXTRACAO_FREEBET" && (
          operacao.freebetUsada ? (
            <span className="rounded-lg border border-positive/20 bg-positive/10 px-2.5 py-1 text-[10px] font-bold text-positive">
              Freebet vinculada · {operacao.freebetUsada.casaNome} {brl(operacao.freebetUsada.valor)} → {brl(operacao.freebetUsada.valorExtraido ?? 0)}
            </span>
          ) : candidatasFreebet.length > 0 ? (
            <VincularFreebetBtn operacao={operacao} candidatas={candidatasFreebet} />
          ) : (
            <span className="rounded-lg border border-warning/20 bg-warning/10 px-2.5 py-1 text-[10px] font-bold text-warning">Freebet da extração não vinculada</span>
          )
        )}
        <div className="ml-auto flex items-center gap-2">
          {finalizada ? (
            <ReabrirBtn id={operacao.id} />
          ) : (
            <button onClick={() => setFinalizando(true)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-black text-accent-ink hover:bg-accent-hover">Finalizar</button>
          )}
          <DeleteBtn id={operacao.id} />
        </div>
      </div>

      {finalizando && <FinalizarModal operacao={operacao} numero={numero} casas={casas} onClose={() => setFinalizando(false)} />}
    </article>
  );
}

/**
 * O calendário manda na lista: clicar num dia filtra a planilha para ele.
 * `operacoes` aqui é a lista SEM o filtro de data — senão o calendário só
 * marcaria pontinho no dia que já está aberto.
 */
function PlanilhaCalendar({ operacoes, selected, onSelect }: {
  operacoes: Operacao[];
  selected: string;
  onSelect: (dia: string) => void;
}) {
  const [month, setMonth] = useState(() => monthKey(new Date(`${selected || todayKey()}T12:00:00`)));

  const dayStats = useMemo(() => {
    const map = new Map<string, { count: number; stake: number; lucro: number; abertas: number }>();
    for (const op of operacoes) {
      const key = dateKey(op.createdAt);
      const current = map.get(key) ?? { count: 0, stake: 0, lucro: 0, abertas: 0 };
      current.count += 1;
      current.stake += op.stakeTotal;
      current.lucro += op.status === "FINALIZADA" ? op.lucroReal ?? 0 : op.lucroEsperado;
      if (op.status !== "FINALIZADA") current.abertas += 1;
      map.set(key, current);
    }
    return map;
  }, [operacoes]);

  const days = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const startOffset = first.getDay();
    const total = new Date(year, monthNumber, 0).getDate();
    return [
      ...Array.from({ length: startOffset }, () => null),
      ...Array.from({ length: total }, (_, i) => `${year}-${pad(monthNumber)}-${pad(i + 1)}`),
    ];
  }, [month]);

  // Sem dia aceso (Ver todas / intervalo), o resumo cobre tudo o que está listado.
  const resumo = useMemo(() => {
    const alvo = selected ? operacoes.filter((o) => dateKey(o.createdAt) === selected) : operacoes;
    return {
      count: alvo.length,
      abertas: alvo.filter((o) => o.status !== "FINALIZADA").length,
      stake: alvo.reduce((s, o) => s + o.stakeTotal, 0),
      lucro: alvo.reduce((s, o) => s + (o.status === "FINALIZADA" ? o.lucroReal ?? 0 : o.lucroEsperado), 0),
    };
  }, [operacoes, selected]);

  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const shiftMonth = (delta: number) => {
    const [year, monthNumber] = month.split("-").map(Number);
    setMonth(monthKey(new Date(year, monthNumber - 1 + delta, 1)));
  };

  return (
    <aside className="min-w-0 space-y-3 xl:sticky xl:top-5 xl:self-start">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_16px_42px_rgba(0,0,0,0.14)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="mono-label text-muted">Calendário</p>
            <h3 className="mt-1 text-sm font-extrabold capitalize">{monthLabel}</h3>
          </div>
          <div className="flex gap-1">
            <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior" className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface-2 text-text-2 transition hover:border-accent/40 hover:text-accent">‹</button>
            <button onClick={() => shiftMonth(1)} aria-label="Próximo mês" className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface-2 text-text-2 transition hover:border-accent/40 hover:text-accent">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (!day) return <span key={`blank-${i}`} className="h-10" />;
            const info = dayStats.get(day);
            const isSelected = selected === day;
            const positive = (info?.lucro ?? 0) >= 0;
            return (
              <button
                key={day}
                onClick={() => onSelect(day)}
                className={`relative h-10 rounded-lg border text-xs font-bold transition ${isSelected ? "border-accent bg-accent text-accent-ink shadow-[0_6px_16px_rgba(59,130,246,0.24)]" : day === todayKey() ? "border-accent/45 bg-accent/5 text-accent hover:bg-accent/10" : "border-border bg-surface-2 text-text-2 hover:border-border-strong hover:text-text"}`}
              >
                {Number(day.slice(-2))}
                {info ? <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${positive ? "bg-positive" : "bg-negative"}`} /> : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* A lista do dia já está ao lado — aqui vale o fechamento dele. */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-[linear-gradient(145deg,var(--surface),var(--surface-2))] p-5 shadow-[0_16px_42px_rgba(0,0,0,0.12)]">
        <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-accent/8 blur-3xl" />
        <div className="relative">
        <p className="mono-label text-muted">{selected ? "Resumo do dia" : "Resumo do período"}</p>
        <h3 className="mt-1 text-sm font-extrabold">
          {selected
            ? new Date(`${selected}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
            : "Todas as operações"}
        </h3>

        {resumo.count === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted">Nenhuma operação aqui.</p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <span><span className="block font-mono text-[7px] uppercase tracking-wide text-muted">Operações</span><span className="mt-1 block text-sm font-black tabular-nums">{resumo.count}</span></span>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <span className="block font-mono text-[7px] uppercase tracking-wide text-muted">Investido</span>
              <span className="mt-1 block truncate text-sm font-black tabular-nums">{brl(resumo.stake)}</span>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <span className="block font-mono text-[7px] uppercase tracking-wide text-muted">Resultado</span>
              <span className={`mt-1 block truncate text-sm font-black tabular-nums ${resumo.lucro >= 0 ? "text-positive" : "text-negative"}`}>{signedBrl(resumo.lucro)}</span>
            </div>
            {resumo.abertas > 0 && <p className="col-span-3 mt-1 text-[10px] font-semibold text-warning">{resumo.abertas} {resumo.abertas === 1 ? "operação em aberto" : "operações em aberto"}</p>}
          </div>
        )}
        </div>
      </section>
    </aside>
  );
}

function ContaAssign({ pernaId, casa, contaId, contas }: { pernaId: string; casa: string | null; contaId: string | null; contas: ContaOption[] }) {
  const [pending, startTransition] = useTransition();
  const opts = useMemo(() => (casa ? contas.filter((c) => normalize(c.casaNome) === normalize(casa)) : contas), [contas, casa]);
  return (
    <select
      value={contaId ?? ""}
      disabled={pending}
      onChange={(e) => startTransition(() => setPernaContaAction(pernaId, e.target.value || null))}
      className={`h-8 min-w-[160px] rounded-md border border-border bg-surface-2 px-2 text-xs outline-none focus:border-accent ${pending ? "opacity-60" : ""}`}
    >
      <option value="">Quem apostou?</option>
      {opts.map((c) => <option key={c.id} value={c.id}>{c.parceiroNome}</option>)}
    </select>
  );
}

function ManualEntryModal({ preset: presetInicial, contas, casas, eventos, onClose }: { preset: TipoRegistro | "escolher"; contas: ContaOption[]; casas: CasaOption[]; eventos: EventOption[]; onClose: () => void }) {
  // A casa da entrada não depende de já existir uma conta/saldo nela. A lista
  // principal vem do mesmo diretório usado pela calculadora; casas presentes
  // apenas nas contas do usuário entram como fallback.
  const casasDisponiveis = useMemo(() => {
    const porNome = new Map(casas.map((casa) => [normalize(casa.name), casa]));
    for (const conta of contas) {
      const key = normalize(conta.casaNome);
      if (!porNome.has(key)) porNome.set(key, { name: conta.casaNome, logoUrl: null });
    }
    return [...porNome.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [casas, contas]);
  const [preset, setPreset] = useState<TipoRegistro | null>(presetInicial === "escolher" ? null : presetInicial);
  const [legs, setLegs] = useState<ManualLeg[]>([
    { casa: "", selecao: "", odd: "2,00", stake: "100,00" },
  ]);
  const [evento, setEvento] = useState("");
  const [data, setData] = useState(dataInputValue);
  const [esporte, setEsporte] = useState("Futebol");
  const [procedimento, setProcedimento] = useState("APOSTA_SIMPLES");
  const [error, action, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const entradas = JSON.parse(String(formData.get("pernas") ?? "[]")) as ManualLeg[];
      if (preset === "aposta" && entradas.some((entrada) => !entrada.casa)) return "Selecione a casa de aposta de todas as entradas.";
      const result = await criarOperacaoAction(undefined, formData);
      if (!result) onClose();
      return result;
    },
    undefined,
  );

  const pernasPayload = useMemo(() => (
    preset === "cassino"
      ? legs.map((leg, index) => ({
          casa: leg.casa,
          selecao: leg.selecao || `Ganho de cassino ${index + 1}`,
          odd: "2,00",
          stake: leg.stake || "0,00",
          retorno: leg.retorno || "0,00",
        }))
      : legs.map((leg, index) => ({
          ...leg,
          // A entrada simples não precisa de mercado: o próprio número da
          // linha identifica a aposta no histórico.
          selecao: `Entrada ${index + 1}`,
          // Começa em stake × odd, mas respeita um retorno digitado pelo usuário.
          retorno: leg.retorno?.trim() ? leg.retorno : retornoSimplesInput(leg),
        }))
  ), [legs, preset]);
  const casinoResumo = useMemo(() => {
    const gasto = legs.reduce((sum, leg) => sum + moneyInputValue(leg.stake), 0);
    const retorno = legs.reduce((sum, leg) => sum + moneyInputValue(leg.retorno ?? ""), 0);
    return { gasto, retorno, lucro: retorno - gasto };
  }, [legs]);

  // Trocar de tipo repõe os campos com o que faz sentido pra ele (cassino não
  // tem odd nem jogo; aposta tem).
  const escolherTipo = (tipo: TipoRegistro) => {
    setPreset(tipo);
    if (tipo === "cassino") {
      setLegs([{ casa: "", selecao: "Ganho de cassino", odd: "2,00", stake: "0,00", retorno: "0,00" }]);
      setEvento("Sessão de cassino");
      setEsporte("Cassino");
      setProcedimento("GIROS_GRATIS");
    } else if (tipo === "aposta") {
      setLegs([{ casa: "", selecao: "", odd: "2,00", stake: "100,00" }]);
      setEvento("");
      setEsporte("Futebol");
      setProcedimento("APOSTA_SIMPLES");
    }
  };

  const updateLeg = (index: number, patch: Partial<ManualLeg>) => setLegs((current) => current.map((leg, i) => i === index ? { ...leg, ...patch } : leg));
  const addLeg = () => setLegs((current) => [...current, preset === "cassino"
    ? { casa: "", selecao: `Ganho de cassino ${current.length + 1}`, odd: "2,00", stake: "0,00", retorno: "0,00" }
    : { casa: "", selecao: "", odd: "2,00", stake: "100,00" },
  ]);
  const removeLeg = (index: number) => setLegs((current) => current.filter((_, i) => i !== index));
  const pickEvento = (option: EventOption) => {
    setEvento(option.label);
    setEsporte(option.sport || "Futebol");
    if (option.startsAt) setData(datetimeLocalFromIso(option.startsAt));
  };

  const tipoAtual = TIPOS_REGISTRO.find((tipo) => tipo.id === preset);

  return (
    <AppModal
      title={preset ? tipoAtual?.label ?? "Nova operação" : "Como deseja registrar?"}
      subtitle={preset ? "Revise os dados da operação antes de salvar na planilha." : "Escolha somente o tipo de lançamento. O formulário será adaptado para você."}
      eyebrow="Nova operação"
      onClose={onClose}
      size={preset ? "xl" : "lg"}
    >
      {preset === null ? (
        <div>
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-text">Selecione uma opção</p>
                <p className="mt-0.5 text-xs text-muted">Você poderá alterar antes de salvar.</p>
              </div>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-accent">Etapa 1 de 2</span>
            </div>

            {/* O caminho principal: quase toda operação passa pela calculadora. */}
            <Link
              href="/calculadora"
              className="group flex items-center gap-4 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.13] via-accent/[0.05] to-transparent p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_18px_44px_rgba(59,130,246,0.22)] sm:p-6"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-deep text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_22px_rgba(59,130,246,0.4)]">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h14v16H5zM8 8h8M8 12h3M14 12h2M8 16h3M14 16h2" /></svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-black text-text">Surebet, Superodd, missão ou freebet</span>
                  <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-[0.14em] text-accent">Mais usado</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  Monte os valores na calculadora. Ao adicionar à planilha, você escolhe só o procedimento da operação.
                </span>
                <span className="mt-3 inline-block text-sm font-black text-accent">
                  Abrir calculadora <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </span>
            </Link>

            {/* Os lançamentos raros ficam compactos, sem roubar a atenção. */}
            <p className="mb-2 mt-5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-muted">Ou lance direto</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIPOS_REGISTRO.map((tipo) => (
                <button key={tipo.id} type="button" onClick={() => escolherTipo(tipo.id)} className="group flex items-center gap-3 rounded-xl border border-border bg-surface-2/50 px-3.5 py-3 text-left transition hover:border-accent/40 hover:bg-accent/[0.05]">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${tipo.id === "aposta" ? "border-info/25 bg-info/10 text-info" : "border-warning/25 bg-warning/10 text-warning"}`}>
                    {tipo.id === "aposta" ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M8 9h.01M12 9h.01M16 9h.01M8 14h8" /></svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-text">{tipo.label}</span>
                    <span className="block truncate text-[10px] text-muted">{tipo.tag}</span>
                  </span>
                  <span className="shrink-0 text-xs font-black text-muted transition group-hover:translate-x-0.5 group-hover:text-accent">→</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end border-t border-border bg-surface-2/30 px-4 py-3 sm:px-6">
            <button type="button" onClick={onClose} className="h-9 rounded-xl px-4 text-xs font-bold text-muted transition hover:bg-surface-2 hover:text-text">Cancelar</button>
          </div>
        </div>
      ) : (
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2/30 px-4 py-3 sm:px-5">
          <span className="flex items-center gap-2 text-xs font-bold text-text-2"><span className="grid h-6 w-6 place-items-center rounded-lg bg-accent/12 font-mono text-[9px] font-black text-accent">2</span> Preencha os dados</span>
          <button type="button" onClick={() => setPreset(null)} className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold text-muted transition hover:border-border-strong hover:text-text">Trocar tipo</button>
        </div>
        <form action={action} className="space-y-4 p-4 sm:p-5">
          <input type="hidden" name="pernas" value={JSON.stringify(pernasPayload)} />
          <input type="hidden" name="tipo" value={preset === "cassino" ? "OUTRO" : "SUREBET"} />
          <input type="hidden" name="somarRetornos" value={preset === "cassino" ? "1" : "0"} />
          {preset === "cassino" ? <><input type="hidden" name="evento" value={evento} /><input type="hidden" name="esporte" value={esporte} /></> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {preset !== "cassino" ? <label className="space-y-1 text-xs font-bold text-text-2">
              Evento
              <EventCombo options={eventos} value={evento} onChange={setEvento} onPick={pickEvento} placeholder="Selecione um jogo ou digite manualmente" />
            </label> : null}
            <label className="space-y-1 text-xs font-bold text-text-2">
              Objetivo da operação
              <select name="procedimento" value={procedimento} onChange={(e) => setProcedimento(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold outline-none focus:border-accent">
                {PROCEDIMENTOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
            {preset !== "cassino" ? <label className="space-y-1 text-xs font-bold text-text-2">
              Data do jogo / evento
              <input type="datetime-local" name="data" value={data} onChange={(event) => setData(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold outline-none focus:border-accent" />
              <span className="block text-[10px] font-normal leading-relaxed text-muted">A operação será registrada no dia de hoje; esta data serve apenas para o evento.</span>
            </label> : <input type="hidden" name="data" value={data} />}
            {preset !== "cassino" ? <label className="space-y-1 text-xs font-bold text-text-2">
              Esporte
              <input name="esporte" value={esporte} onChange={(event) => setEsporte(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold outline-none focus:border-accent" />
            </label> : null}
            <label className="space-y-1 text-xs font-bold text-text-2">
              Observação
              <input name="notas" placeholder="Opcional" className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold outline-none focus:border-accent" />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="mono-label text-muted">{preset === "cassino" ? "Resultado da sessão" : "Entradas da aposta"}</p>
                {preset !== "cassino" && <p className="mt-1 text-[11px] text-muted">Preencha uma linha para cada entrada realizada.</p>}
              </div>
              {preset !== "cassino" && <button type="button" onClick={addLeg} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-text-2 hover:border-accent hover:text-accent">+ Adicionar entrada</button>}
            </div>
            {preset === "cassino" ? (
              <div className="space-y-2">
                {legs.map((leg, index) => {
                  const lucro = moneyInputValue(leg.retorno ?? "") - moneyInputValue(leg.stake);
                  return (
                    <div key={index} className="grid min-w-0 gap-2 rounded-lg border border-border bg-surface-2 p-3 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(120px,0.75fr)]">
                      <label className="min-w-0 space-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Casa
                        <select value={leg.casa} onChange={(e) => updateLeg(index, { casa: e.target.value })} className="h-10 w-full min-w-0 rounded-lg border border-border bg-surface px-2 text-sm normal-case tracking-normal text-text outline-none focus:border-accent">
                          <option value="">Sem casa</option>
                          {casasDisponiveis.map((casa) => <option key={casa.name} value={casa.name}>{casa.name}</option>)}
                        </select>
                      </label>
                      <label className="min-w-0 space-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Valor utilizado / bônus
                        <input value={leg.stake} onChange={(e) => updateLeg(index, { stake: e.target.value })} placeholder="0,00" inputMode="decimal" className="h-10 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm font-bold tracking-normal text-text outline-none focus:border-accent" />
                      </label>
                      <label className="min-w-0 space-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Retorno recebido
                        <input value={leg.retorno ?? ""} onChange={(e) => updateLeg(index, { retorno: e.target.value })} placeholder="100,00" inputMode="decimal" className="h-10 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm font-bold tracking-normal text-text outline-none focus:border-accent" />
                      </label>
                      <div className="min-w-0 space-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Lucro
                        <div className={`grid h-10 min-w-0 place-items-center rounded-lg border bg-surface px-2 text-sm font-black tracking-normal tabular-nums ${lucro >= 0 ? "border-positive/25 text-positive" : "border-negative/25 text-negative"}`}>
                          {brl(lucro)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="grid gap-2 rounded-lg border border-accent/25 bg-accent/5 p-3 text-xs sm:grid-cols-3">
                  <span className="text-muted">Gasto <b className="ml-1 text-text tabular-nums">{brl(casinoResumo.gasto)}</b></span>
                  <span className="text-muted">Retorno <b className="ml-1 text-text tabular-nums">{brl(casinoResumo.retorno)}</b></span>
                  <span className="text-muted">Lucro <b className={`ml-1 tabular-nums ${casinoResumo.lucro >= 0 ? "text-positive" : "text-negative"}`}>{signedBrl(casinoResumo.lucro)}</b></span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {legs.map((leg, index) => {
                  const casaSelecionada = casasDisponiveis.find((casa) => casa.name === leg.casa);
                  return (
                    <div key={index} className="rounded-xl border border-border bg-surface-2/60 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-xs font-black text-text">
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-accent/12 font-mono text-[9px] text-accent">{index + 1}</span>
                          Entrada {index + 1}
                        </span>
                        <button type="button" onClick={() => removeLeg(index)} disabled={legs.length === 1} className="rounded-lg px-2 py-1 text-[11px] font-bold text-muted transition hover:bg-negative/10 hover:text-negative disabled:cursor-not-allowed disabled:opacity-35">Remover</button>
                      </div>

                      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(230px,1.35fr)_minmax(90px,0.48fr)_minmax(125px,0.68fr)_minmax(135px,0.72fr)]">
                        <label className="min-w-0 space-y-1.5">
                          <span className="mono-label block text-muted">Casa de aposta</span>
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-3 text-[10px] font-black text-muted shadow-sm">
                              {casaSelecionada?.logoUrl
                                ? <img src={casaSelecionada.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                                : leg.casa ? leg.casa.charAt(0).toUpperCase() : "?"}
                            </span>
                            <HousePicker
                              value={leg.casa}
                              onChange={(casa) => updateLeg(index, { casa })}
                              houses={casasDisponiveis}
                              logoFor={(casa) => casasDisponiveis.find((option) => option.name === casa)?.logoUrl ?? null}
                              placement="top"
                              placeholder="Busque a casa…"
                              required
                            />
                          </span>
                        </label>

                        <label className="min-w-0 space-y-1.5">
                          <span className="mono-label block text-muted">Odd</span>
                          <input required value={leg.odd} onChange={(e) => updateLeg(index, { odd: e.target.value })} placeholder="2,00" inputMode="decimal" className="h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-center text-sm font-black tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
                        </label>

                        <label className="min-w-0 space-y-1.5">
                          <span className="mono-label block text-muted">Valor apostado</span>
                          <span className="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10">
                            <span className="text-xs font-bold text-muted">R$</span>
                            <input required value={leg.stake} onChange={(e) => updateLeg(index, { stake: e.target.value })} placeholder="100,00" inputMode="decimal" className="h-full w-full min-w-0 bg-transparent text-right text-sm font-black tabular-nums outline-none" />
                          </span>
                        </label>

                        <label className="min-w-0 space-y-1.5">
                          <span className="mono-label block text-muted">Valor que volta</span>
                          <span className="flex h-11 items-center gap-1.5 rounded-xl border border-positive/25 bg-positive/[0.05] px-3 transition focus-within:border-positive/60 focus-within:ring-2 focus-within:ring-positive/10">
                            <span className="text-xs font-bold text-positive/70">R$</span>
                            <input
                              required
                              value={leg.retorno ?? retornoSimplesInput(leg)}
                              onChange={(e) => updateLeg(index, { retorno: e.target.value })}
                              onFocus={(e) => e.target.select()}
                              placeholder="200,00"
                              inputMode="decimal"
                              title="Calculado automaticamente por valor apostado × odd; você pode ajustar."
                              className="h-full w-full min-w-0 bg-transparent text-right text-sm font-black tabular-nums text-positive outline-none"
                            />
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-bold text-muted hover:text-text">Cancelar</button>
            <button type="submit" disabled={pending} className="h-9 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink hover:bg-accent-hover disabled:opacity-50">{pending ? "Salvando..." : "Salvar na planilha"}</button>
          </div>
        </form>
      </div>
      )}
    </AppModal>
  );
}

/**
 * Fechamento da operação: você vê as apostas, clica em qual BATEU (as outras
 * viram red) e diz se a operação gerou freebet — que já nasce cadastrada.
 */
function FinalizarModal({ operacao, numero, casas, onClose }: { operacao: Operacao; numero: number; casas: CasaOption[]; onClose: () => void }) {
  const [vencedora, setVencedora] = useState("");
  const [anuladas, setAnuladas] = useState<string[]>([]);
  const [gerouFreebet, setGerouFreebet] = useState(false);
  const [fbCasa, setFbCasa] = useState("");
  const [fbExpira, setFbExpira] = useState("");
  const [error, action, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await finalizarOperacaoAction(undefined, formData);
      if (!result) onClose();
      return result;
    },
    undefined,
  );

  // Perna sem conta não tem de onde debitar — a banca fica parada.
  const semConta = operacao.pernas.filter((p) => !p.contaId).length;

  const toggleAnulada = (id: string) =>
    setAnuladas((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      if (next.includes(id) && vencedora === id) setVencedora("");
      return next;
    });

  // Prévia do lucro — mesma conta do servidor (comissão sai do ganho; anulada
  // devolve o que foi arriscado). Com PERDEU, nenhuma perna paga.
  const previa = useMemo(() => {
    if (!vencedora) return null;
    const retorno = operacao.pernas.reduce((sum, p) => {
      if (anuladas.includes(p.id)) return sum + p.risco;
      return p.id === vencedora ? sum + retornoDaPerna(p) : sum;
    }, 0);
    return round2(retorno - operacao.stakeTotal);
  }, [vencedora, anuladas, operacao]);

  return (
    <AppModal title={operacao.evento} subtitle={operacao.pernas.length === 1 ? "Informe se a aposta bateu e confira o resultado antes de concluir." : "Selecione a aposta que bateu. As demais serão registradas como red."} eyebrow={`Finalizar operação ${numero}`} onClose={onClose} size="md" scroll={false}>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <input type="hidden" name="operacaoId" value={operacao.id} />
            <input type="hidden" name="vencedoraId" value={vencedora === PERDEU ? "" : vencedora} />
            <input type="hidden" name="perdeu" value={vencedora === PERDEU ? "1" : "0"} />
            <input type="hidden" name="anuladas" value={JSON.stringify(anuladas)} />
            <input type="hidden" name="geraFreebet" value={gerouFreebet ? "1" : "0"} />
            <input type="hidden" name="freebetCasa" value={fbCasa} />

            <div className="space-y-2">
              <p className="mono-label text-muted">{operacao.pernas.length === 1 ? "Resultado" : "Onde bateu?"}</p>
              {operacao.pernas.map((p) => {
                const anulada = anuladas.includes(p.id);
                const vencedor = vencedora === p.id;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                      vencedor ? "border-positive bg-positive/10" : anulada ? "border-border bg-surface-3 opacity-60" : "border-border bg-surface-2"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => !anulada && setVencedora(p.id)}
                      disabled={anulada}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${vencedor ? "border-positive bg-positive text-white" : "border-border-strong"}`}>
                        {vencedor && <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                      </span>
                      {p.casaLogo ? <img src={p.casaLogo} alt="" className="h-7 w-7 shrink-0 rounded bg-white object-contain p-0.5" /> : null}
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-bold">
                          {p.selecao}
                          {p.isLay && <span className="rounded bg-negative/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-negative">Lay</span>}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {p.casa ?? "Sem casa"} · @{p.odd.toFixed(2)} · {p.isLay ? `resp. ${brl(p.risco)}` : brl(p.stake)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAnulada(p.id)}
                      title="Aposta cancelada/anulada pela casa (devolve o valor)"
                      className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold transition ${anulada ? "border-warning/50 bg-warning/15 text-warning" : "border-border text-muted hover:text-text"}`}
                    >
                      Anulada
                    </button>
                  </div>
                );
              })}

              {/* Aposta sem proteção pode simplesmente não bater — e numa operação
                  com pernas, a casa pode anular tudo. Sem esta saída, não dá pra fechar. */}
              <button
                type="button"
                onClick={() => setVencedora(vencedora === PERDEU ? "" : PERDEU)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  vencedora === PERDEU ? "border-negative bg-negative/10" : "border-dashed border-border text-muted hover:border-negative/50 hover:text-text"
                }`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${vencedora === PERDEU ? "border-negative bg-negative text-white" : "border-border-strong"}`}>
                  {vencedora === PERDEU && <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">Nenhuma bateu — perdi a aposta</span>
                  <span className="block text-[11px] text-muted">Fecha no vermelho: sai todo o valor arriscado.</span>
                </span>
              </button>

              {previa !== null && (
                <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
                  Lucro real: <b className={`tabular-nums ${previa >= 0 ? "text-positive" : "text-negative"}`}>{signedBrl(previa)}</b>
                  <span className="text-muted"> · investido {brl(operacao.stakeTotal)}</span>
                </p>
              )}
              {semConta > 0 && (
                <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-warning">
                  {semConta === 1 ? "1 entrada está" : `${semConta} entradas estão`} sem conta/CPF — o saldo da casa não vai ser atualizado.
                  Escolha quem apostou na coluna “Conta / CPF” antes de finalizar pra banca ficar certa.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-surface-2/60 p-3">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" checked={gerouFreebet} onChange={(e) => setGerouFreebet(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                <span className="text-sm font-bold">Essa operação gerou freebet?</span>
              </label>
              {gerouFreebet && (
                <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
                  <label className="space-y-1 text-[11px] font-bold text-text-2">
                    Casa da freebet
                    <CasaPicker casas={casas} value={fbCasa} onChange={setFbCasa} />
                  </label>
                  <label className="space-y-1 text-[11px] font-bold text-text-2">
                    Valor
                    <input name="freebetValor" placeholder="0,00" inputMode="decimal" autoComplete="off" className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm font-bold outline-none focus:border-accent" />
                  </label>
                  <div className="space-y-1 text-[11px] font-bold text-text-2 sm:col-span-2">
                    Validade (opcional)
                    <DateField name="freebetExpira" value={fbExpira} onChange={setFbExpira} className="w-full" />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-bold text-muted hover:text-text">Cancelar</button>
            <button type="submit" disabled={pending || !vencedora} className="h-9 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink hover:bg-accent-hover disabled:opacity-50">{pending ? "Salvando..." : "Finalizar"}</button>
          </div>
        </form>
    </AppModal>
  );
}

/** Busca de casa por digitação, com logo. */
function CasaPicker({ casas, value, onChange }: { casas: CasaOption[]; value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return (q ? casas.filter((c) => normalize(c.name).includes(q)) : casas).slice(0, 40);
  }, [casas, query]);

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Digite a casa..."
        autoComplete="off"
        className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm font-semibold outline-none focus:border-accent"
      />
      {open && results.length > 0 && (
        <div className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          {results.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => { onChange(c.name); setQuery(c.name); setOpen(false); }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${value === c.name ? "bg-accent/12 text-accent" : "text-text-2 hover:bg-white/5"}`}
            >
              {c.logoUrl ? <img src={c.logoUrl} alt="" className="h-5 w-5 shrink-0 rounded bg-white object-contain p-0.5" /> : <span className="h-5 w-5 shrink-0 rounded bg-surface-3" />}
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReabrirBtn({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return <button disabled={pending} onClick={() => startTransition(() => reabrirOperacaoAction(id))} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-2 hover:border-border-strong hover:text-text disabled:opacity-50">Reabrir</button>;
}

function VincularFreebetBtn({ operacao, candidatas }: { operacao: Operacao; candidatas: FreebetOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [freebetId, setFreebetId] = useState(candidatas[0]?.id ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirmar = () => {
    if (!freebetId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await vincularFreebetExtraidaAction(operacao.id, freebetId);
      if (result) {
        setError(result);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-black text-accent transition hover:bg-accent/15">
        Vincular freebet usada
      </button>
      {open && (
        <AppModal
          title="Vincular freebet extraída"
          subtitle="Associe a freebet disponível à operação que fez a conversão."
          eyebrow="Conciliação de freebet"
          onClose={() => setOpen(false)}
          size="sm"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface-2/55 p-3">
              <p className="mono-label text-muted">Operação</p>
              <p className="mt-1 text-sm font-bold">{operacao.evento}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div><p className="mono-label text-muted">Freebet nominal</p><p className="mt-1 text-sm font-black">{brl(candidatas.find((f) => f.id === freebetId)?.valor ?? 0)}</p></div>
                <div><p className="mono-label text-muted">Valor convertido</p><p className="mt-1 text-sm font-black text-positive">{brl(Math.max(0, operacao.lucroReal ?? 0))}</p></div>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="mono-label text-muted">Freebet utilizada</span>
              <select value={freebetId} onChange={(e) => setFreebetId(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold outline-none focus:border-accent">
                {candidatas.map((freebet) => (
                  <option key={freebet.id} value={freebet.id}>
                    {freebet.casaNome} · {brl(freebet.valor)}{freebet.parceiroNome ? ` · ${freebet.parceiroNome}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs leading-relaxed text-muted">
              Ao confirmar, ela sairá de “Disponíveis”, aparecerá em “Extraídas” e ficará ligada permanentemente a esta operação.
            </p>
            {error && <p role="alert" className="rounded-lg border border-negative/20 bg-negative/10 px-3 py-2 text-xs font-semibold text-negative">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button type="button" disabled={pending} onClick={() => setOpen(false)} className="h-10 rounded-lg px-4 text-xs font-semibold text-muted hover:text-text disabled:opacity-50">Cancelar</button>
              <button type="button" disabled={pending || !freebetId} onClick={confirmar} className="h-10 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink hover:bg-accent-hover disabled:opacity-50">
                {pending ? "Vinculando…" : "Confirmar vínculo"}
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </>
  );
}

function DeleteBtn({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button disabled={pending} onClick={() => startTransition(() => deleteOperacaoAction(id))} className="rounded-md bg-negative/15 px-2 py-1.5 text-xs font-bold text-negative hover:bg-negative/25 disabled:opacity-50">Excluir</button>
        <button onClick={() => setConfirming(false)} className="rounded-md px-1.5 py-1.5 text-xs text-muted hover:text-text">Não</button>
      </span>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} title="Excluir operação" className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-negative/10 hover:text-negative">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
    </button>
  );
}

function HeroMetric({ label, value, positive = false, warning = false }: { label: string; value: string; positive?: boolean; warning?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/15 px-3 py-3 backdrop-blur-sm sm:px-4">
      <p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-1.5 text-lg font-black tabular-nums sm:text-xl ${positive ? "text-positive" : warning ? "text-warning" : "text-text"}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "info" | "positive" | "negative" | "warning" }) {
  const colors = { info: "text-info", positive: "text-positive", negative: "text-negative", warning: "text-warning" };
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <p className="mono-label text-muted">{label}</p>
      <p className={`mt-3 text-xl font-black tabular-nums sm:text-2xl ${colors[tone]}`}>{value}</p>
      <p className="mt-1.5 text-[10px] text-muted">{detail}</p>
    </article>
  );
}

function FilterCombo({ options, value, onChange, allLabel, placeholder }: { options: FilterOption[]; value: string; onChange: (v: string) => void; allLabel: string; placeholder: string }) {
  const [query, setQuery] = useState(() => options.find((o) => o.value === value)?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const results = useMemo(() => {
    const q = normalize(query.trim());
    return (q ? options.filter((o) => normalize(o.label).includes(q)) : options).slice(0, 60);
  }, [options, query]);
  const pick = (o: FilterOption) => { onChange(o.value); setQuery(o.label); setOpen(false); };

  return (
    <div className="relative w-full" ref={wrapRef}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
          else if (e.key === "Enter") { e.preventDefault(); if (active >= 0 && results[active]) pick(results[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-semibold outline-none focus:border-accent"
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <button type="button" onClick={() => { onChange(""); setQuery(""); setOpen(false); }} className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm ${!value ? "bg-accent/12 font-semibold text-accent" : "text-text-2 hover:bg-white/5"}`}>{allLabel}</button>
          {results.map((o, i) => (
            <button key={o.value} type="button" onClick={() => pick(o)} onMouseEnter={() => setActive(i)} className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm ${i === active ? "bg-accent/12 text-accent" : value === o.value ? "text-accent" : "text-text-2 hover:bg-white/5"}`}>
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function exportCsv(operacoes: Operacao[], numeros: Map<string, number>) {
  const rows = [
    ["Nº", "Data da operação", "Data do evento", "Procedimento", "Status", "Evento", "Casas", "Stake", "Lucro", "ROI", "Notas"],
    ...operacoes.map((op) => {
      const lucro = op.status === "FINALIZADA" ? op.lucroReal ?? 0 : op.lucroEsperado;
      const roi = op.stakeTotal > 0 ? (lucro / op.stakeTotal) * 100 : 0;
      const proc = procedimentoLabel(op.procedimento) ?? TIPO_LABEL[op.tipo] ?? op.tipo;
      return [String(numeros.get(op.id) ?? ""), dataLabel(op.createdAt), dataLabel(op.data), proc, op.status, op.evento, op.casas ?? "", String(op.stakeTotal), String(lucro), `${roi.toFixed(2)}%`, op.notas ?? ""];
    }),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `planilha-operacoes-${todayKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
