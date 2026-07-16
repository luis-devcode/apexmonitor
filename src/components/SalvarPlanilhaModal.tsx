"use client";

/* Logos das casas e das freebets vêm do diretório de clones. */
/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useMemo, useState } from "react";
import AppModal from "@/components/AppModal";
import { criarOperacaoAction } from "@/app/operacoes/actions";
import { PROCEDIMENTO_EXTRACAO, PROCEDIMENTOS } from "@/lib/procedimentos";

export type PlanilhaLeg = {
  casa: string;
  selecao: string;
  odd: string;
  stake: string;
  isLay: boolean;
  freebet: boolean;
  comissao: string;
  aumento: string;
};
type ContaOption = { id: string; casa: string; parceiro: string; saldo: number };
type FreebetOption = { id: string; casa: string; casaLogo: string | null; parceiro: string | null; valor: number; expiraEm: string | null };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const num = (v: string) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };

/** Quantos dias faltam pra freebet virar pó. */
function diasPara(iso: string | null) {
  if (!iso) return null;
  const dias = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return Number.isFinite(dias) ? dias : null;
}

/**
 * A janela que abre ao mandar a operação da calculadora pra planilha.
 * Pergunta o que a planilha não tem como adivinhar: pra que era a operação,
 * de quem é cada conta e — se for extração — qual freebet está sendo gasta.
 */
export default function SalvarPlanilhaModal({
  legs,
  evento,
  data,
  esporte,
  notas,
  onClose,
  onSaved,
}: {
  legs: PlanilhaLeg[];
  evento: string;
  data: string;
  esporte: string;
  notas: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [procedimento, setProcedimento] = useState("SUREBET");
  const [contas, setContas] = useState<(string | null)[]>(() => legs.map(() => null));
  const [freebetId, setFreebetId] = useState("");
  const [opcoes, setOpcoes] = useState<{ contas: ContaOption[]; freebets: FreebetOption[] } | null>(null);

  const [error, action, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await criarOperacaoAction(undefined, formData);
      if (!result) { onSaved?.(); onClose(); }
      return result;
    },
    undefined,
  );

  // Contas e freebets disponíveis são do servidor — buscamos ao abrir.
  useEffect(() => {
    let vivo = true;
    fetch("/api/planilha-opcoes")
      .then((r) => (r.ok ? r.json() : { contas: [], freebets: [] }))
      .then((d) => { if (vivo) setOpcoes(d); })
      .catch(() => { if (vivo) setOpcoes({ contas: [], freebets: [] }); });
    return () => { vivo = false; };
  }, []);

  const extracao = procedimento === PROCEDIMENTO_EXTRACAO;
  const freebets = opcoes?.freebets ?? [];
  const dataEventoLabel = data
    ? new Date(data).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "não informada";
  const investido = useMemo(
    () => legs.reduce((sum, l) => {
      if (l.freebet) return sum;
      const stake = num(l.stake);
      const odd = num(l.odd);
      return sum + (l.isLay ? stake * Math.max(0, odd - 1) : stake);
    }, 0),
    [legs],
  );

  // Fora da extração, a freebet escolhida deixa de fazer sentido.
  const escolherProcedimento = (value: string) => {
    setProcedimento(value);
    if (value !== PROCEDIMENTO_EXTRACAO) setFreebetId("");
  };

  return (
    <AppModal title={evento || "Operação sem evento"} subtitle={`${legs.length} entradas · ${brl(investido)} investidos`} eyebrow="Adicionar à planilha" onClose={onClose} size="lg" scroll={false}>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="pernas" value={JSON.stringify(legs)} />
          <input type="hidden" name="evento" value={evento} />
          <input type="hidden" name="data" value={data} />
          <input type="hidden" name="esporte" value={esporte} />
          <input type="hidden" name="notas" value={notas} />
          <input type="hidden" name="procedimento" value={procedimento} />
          <input type="hidden" name="contas" value={JSON.stringify(contas)} />
          <input type="hidden" name="freebetId" value={freebetId} />

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <section className="flex items-start gap-3 rounded-xl border border-info/25 bg-info/[0.07] px-3.5 py-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-info/12 text-info">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black text-text">Esta operação será contabilizada hoje</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">O evento está marcado para {dataEventoLabel}. Ela continuará em aberto até você informar o resultado, sem mudar de dia na planilha.</span>
              </span>
            </section>

            <section className="space-y-2">
              <div>
                <p className="mono-label text-muted">Qual foi o procedimento?</p>
                <p className="mt-1 text-[11px] text-muted">Escolha como essa operação foi gerada para manter o resultado organizado no histórico.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROCEDIMENTOS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => escolherProcedimento(p.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                      procedimento === p.value
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-border bg-surface-2 text-text-2 hover:border-border-strong hover:text-text"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </section>

            {extracao && (
              <section className="space-y-2 rounded-xl border border-accent/25 bg-accent/[0.05] p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="mono-label text-accent">Qual freebet está extraindo?</p>
                  {opcoes && <span className="text-[11px] text-muted">{freebets.length} disponíveis</span>}
                </div>

                {!opcoes ? (
                  <p className="px-1 py-3 text-xs text-muted">Carregando freebets…</p>
                ) : (
                  <>
                    <div className="max-h-52 space-y-1.5 overflow-y-auto">
                      {freebets.map((f) => {
                        const dias = diasPara(f.expiraEm);
                        const selecionada = freebetId === f.id;
                        // A freebet só faz sentido se a casa dela estiver na operação.
                        const naOperacao = legs.some((l) => l.casa && norm(l.casa) === norm(f.casa));
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setFreebetId(selecionada ? "" : f.id)}
                            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                              selecionada ? "border-accent bg-accent/12" : "border-border bg-surface hover:border-border-strong"
                            }`}
                          >
                            {f.casaLogo
                              ? <img src={f.casaLogo} alt="" className="h-7 w-7 shrink-0 rounded bg-white object-contain p-0.5" />
                              : <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-surface-3 text-[10px] font-bold text-muted">{f.casa.charAt(0)}</span>}
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-sm font-bold">
                                {f.casa}
                                {!naOperacao && <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-warning">Fora da operação</span>}
                              </span>
                              <span className="block truncate text-[11px] text-muted">
                                {f.parceiro ?? "Sem parceiro"}
                                {dias !== null && ` · ${dias <= 0 ? "vence hoje" : `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`}`}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-black tabular-nums text-accent">{brl(f.valor)}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-muted">
                      {freebets.length === 0
                        ? "Nenhuma freebet cadastrada. Tudo bem — pode salvar a extração assim mesmo, ela só não vai ficar vinculada a nenhuma freebet."
                        : freebetId
                          ? "Ao finalizar a operação, essa freebet vira “extraída” e o valor extraído passa a ser o lucro real."
                          : "Não precisa escolher: se a freebet não estiver cadastrada, salve assim mesmo."}
                    </p>
                  </>
                )}
              </section>
            )}

            <section className="space-y-2">
              <div>
                <p className="mono-label text-muted">De quem é cada conta? <span className="font-normal normal-case tracking-normal text-muted">(opcional)</span></p>
                <p className="mt-1 text-[11px] text-muted">Sem conta, a operação entra na planilha mas o saldo da casa não se mexe no fechamento. Dá pra escolher depois.</p>
              </div>
              <div className="space-y-1.5">
                {legs.map((leg, i) => {
                  const doCasa = (opcoes?.contas ?? []).filter((c) => leg.casa && norm(c.casa) === norm(leg.casa));
                  const stake = num(leg.stake);
                  const odd = num(leg.odd);
                  const risco = leg.freebet ? 0 : leg.isLay ? stake * Math.max(0, odd - 1) : stake;
                  return (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-bold">
                          {leg.casa || "Sem casa"}
                          {leg.isLay && <span className="rounded bg-negative/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-negative">Lay</span>}
                          {leg.freebet && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-accent">Freebet</span>}
                          {num(leg.aumento) > 0 && <span className="rounded bg-info/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-info">+{num(leg.aumento).toLocaleString("pt-BR")}%</span>}
                        </span>
                        <span className="block truncate text-[11px] text-muted">{leg.selecao} · @{leg.odd} · {brl(risco)}</span>
                      </span>
                      <select
                        value={contas[i] ?? ""}
                        onChange={(e) => setContas((c) => c.map((v, j) => (j === i ? e.target.value || null : v)))}
                        className="h-9 min-w-[180px] rounded-lg border border-border bg-surface px-2 text-xs outline-none focus:border-accent"
                      >
                        <option value="">Quem apostou?</option>
                        {doCasa.map((c) => <option key={c.id} value={c.id}>{c.parceiro} · {brl(c.saldo)}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
              {opcoes && opcoes.contas.length === 0 && (
                <p className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] text-muted">Nenhuma conta cadastrada ainda. Cadastre em Gestão → Contas por Casa para ligar a planilha à banca.</p>
              )}
            </section>

            {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs font-semibold text-negative">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-xs font-bold text-muted hover:text-text">Cancelar</button>
            <button type="submit" disabled={pending} className="h-10 rounded-xl bg-accent px-5 text-xs font-black text-accent-ink transition hover:bg-accent-hover disabled:opacity-50">
              {pending ? "Salvando…" : "Salvar na planilha"}
            </button>
          </div>
        </form>
    </AppModal>
  );
}
