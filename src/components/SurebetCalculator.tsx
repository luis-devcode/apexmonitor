"use client";

/* Logos das casas vêm do diretório de clones e têm fallback local. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import EventCombo from "@/components/EventCombo";
import HousePicker from "@/components/HousePicker";
import SalvarPlanilhaModal from "@/components/SalvarPlanilhaModal";
import type { EventOption } from "@/lib/event-options";
import { housesForSelect } from "@/lib/houses";

type CbType = "%" | "R$";
type Row = {
  house: string;
  label?: string;
  isLay: boolean;
  odd: string;
  comm: string;
  aumento: string;
  cashback: string;
  cbType: CbType;
  stake: string;
  freebet: boolean;
  dist: boolean;
  fixed: boolean;
};
type Toggles = { comissoes: boolean; aumento: boolean; cashback: boolean; arredondar: boolean };
export type CalcSeed = { rows: { label?: string; odd: number; house?: string }[]; total?: number };
export type CalcSelection = { row: number; label?: string; odd: number; house?: string };
export type CalcMonitorEvent = { label: string; sport?: string; startsAt?: string; market?: string };

const MAX = 10;
const num = (v: string | number, fallback = 0) => {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
  return Number.isFinite(n) ? n : fallback;
};
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normName = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const pad = (value: number) => String(value).padStart(2, "0");
const dataInputValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const datetimeLocalFromIso = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dataInputValue();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/**
 * As 3 casas de bolsa (exchange), onde dá pra apostar contra (Lay).
 * Casamos pela MARCA porque o diretório traz variantes sujas do mesmo lugar
 * ("BOLSA DE APOSTA - SPORTBOOK" e "BOLSA EXCHANGE E TRADEBALL" são a mesma casa).
 */
const LAY_HOUSES = ["betfair", "bolsa", "betbra"];
const supportsLay = (house: string) => {
  const normalized = normName(house);
  return LAY_HOUSES.some((brand) => normalized.startsWith(brand));
};


function emptyRow(i: number): Row {
  return { house: "", isLay: false, odd: "2.00", comm: "0", aumento: "0", cashback: "0", cbType: "%", stake: "500", freebet: false, dist: true, fixed: i === 0 };
}

/** Coeficientes de retorno (M) e risco (F) de uma perna, iguais ao motor original. */
function coeffs(h: Row, t: Toggles) {
  const odd = num(h.odd, 1);
  const aum = t.aumento ? num(h.aumento) / 100 : 0;
  const comm = t.comissoes ? num(h.comm) / 100 : 0;
  let M: number;
  let F: number;
  if (h.isLay) {
    M = (1 - comm) * (1 + aum) + (odd - 1);
    F = Math.max(0, odd - 1);
  } else {
    M = 1 + (odd - 1) * (1 + aum) * (1 - comm);
    F = h.freebet ? 0 : 1;
    if (h.freebet) M -= 1;
  }
  if (M < 0) M = 0;
  const cbVal = t.cashback ? num(h.cashback) : 0;
  const c = t.cashback && h.cbType === "%" ? cbVal / 100 : 0;
  const V = t.cashback && h.cbType === "R$" ? cbVal : 0;
  const Mp = Math.max(0.0001, M - c * F);
  return { M, F, c, V, Mp };
}

/** Resolve os stakes das pernas distribuídas (convergência p/ igualar o lucro). */
function solveStakes(rows: Row[], t: Toggles, total: number, n: number): number[] {
  const M: number[] = [], F: number[] = [], c: number[] = [], V: number[] = [], Mp: number[] = [];
  const s: number[] = [];
  for (let i = 0; i < n; i++) {
    const co = coeffs(rows[i], t);
    M[i] = co.M; F[i] = co.F; c[i] = co.c; V[i] = co.V; Mp[i] = co.Mp;
    s[i] = num(rows[i].stake);
  }
  const fixedIdx = rows.slice(0, n).findIndex((h) => h.fixed);
  let C = 0;
  for (let iter = 0; iter < 100; iter++) {
    let K = 0, T = 0;
    if (fixedIdx !== -1) {
      const sf = s[fixedIdx];
      if (rows[fixedIdx].dist) {
        K = sf * Mp[fixedIdx] - V[fixedIdx];
        let tTrue = 0;
        for (let i = 0; i < n; i++) if (rows[i].dist) { s[i] = Math.max(0, (K + V[i]) / Mp[i]); tTrue += s[i] * F[i]; }
        let If = 0, Vf = 0;
        for (let i = 0; i < n; i++) if (!rows[i].dist) { If += F[i] / Mp[i]; Vf += ((V[i] - C) * F[i]) / Mp[i]; }
        T = 1 - If > 0.0001 ? (tTrue + Vf) / (1 - If) : tTrue;
        for (let i = 0; i < n; i++) if (!rows[i].dist) s[i] = Math.max(0, (T - C + V[i]) / Mp[i]);
      } else {
        T = sf * Mp[fixedIdx] + C - V[fixedIdx];
        let tFalse = 0;
        for (let i = 0; i < n; i++) if (!rows[i].dist) { s[i] = i === fixedIdx ? sf : Math.max(0, (T - C + V[i]) / Mp[i]); tFalse += s[i] * F[i]; }
        const target = Math.max(0, T - tFalse);
        let It = 0, Vt = 0;
        for (let i = 0; i < n; i++) if (rows[i].dist) { It += F[i] / Mp[i]; Vt += (V[i] * F[i]) / Mp[i]; }
        K = It > 0.0001 ? (target - Vt) / It : 0;
        for (let i = 0; i < n; i++) if (rows[i].dist) s[i] = Math.max(0, (K + V[i]) / Mp[i]);
      }
    } else {
      T = num(total);
      let tFalse = 0;
      for (let i = 0; i < n; i++) if (!rows[i].dist) { s[i] = Math.max(0, (T - C + V[i]) / Mp[i]); tFalse += s[i] * F[i]; }
      const target = Math.max(0, T - tFalse);
      let It = 0, Vt = 0;
      for (let i = 0; i < n; i++) if (rows[i].dist) { It += F[i] / Mp[i]; Vt += (V[i] * F[i]) / Mp[i]; }
      K = It > 0.0001 ? (target - Vt) / It : 0;
      for (let i = 0; i < n; i++) if (rows[i].dist) s[i] = Math.max(0, (K + V[i]) / Mp[i]);
    }
    let nextC = 0;
    for (let i = 0; i < n; i++) nextC += c[i] * s[i] * F[i] + V[i];
    C = C * 0.2 + nextC * 0.8;
  }
  if (t.arredondar) for (let i = 0; i < n; i++) if (i !== fixedIdx) s[i] = Math.round(s[i]);
  return s;
}

function summary(rows: Row[], t: Toggles, n: number) {
  const co = rows.slice(0, n).map((h) => coeffs(h, t));
  let risk = 0;
  const cbs: number[] = [];
  for (let i = 0; i < n; i++) { const s = num(rows[i].stake); const r = s * co[i].F; risk += r; cbs[i] = co[i].c * r + co[i].V; }
  const cbTotal = cbs.reduce((a, b) => a + b, 0);
  const profits: number[] = [];
  let minP = Infinity;
  for (let i = 0; i < n; i++) {
    const s = num(rows[i].stake);
    const payout = s * co[i].M + (cbTotal - cbs[i]);
    const p = payout - risk;
    profits[i] = Number.isFinite(p) ? p : 0;
    if (profits[i] < minP) minP = profits[i];
  }
  const roi = risk > 0 ? (minP / risk) * 100 : 0;
  return { profits, risk, roi: Number.isFinite(roi) ? roi : 0 };
}

export default function SurebetCalculator({ seed, selection, className = "", variant = "full", eventos = [], monitorEvent }: { seed?: CalcSeed | null; selection?: CalcSelection | null; className?: string; variant?: "full" | "compact"; eventos?: EventOption[]; monitorEvent?: CalcMonitorEvent | null }) {
  const monitor = variant === "compact";
  // O monitor usa a mesma estrutura visual e os mesmos recursos da calculadora principal.
  const compact = false;
  const toggleKeys: (keyof Toggles)[] = ["comissoes", "aumento", "cashback", "arredondar"];
  const TOGGLE_LABELS: Record<keyof Toggles, string> = { comissoes: "Comissões", aumento: "Aumento %", cashback: "Cashback", arredondar: "Arredondar" };
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: MAX }, (_, i) => emptyRow(i)));
  const [numHouses, setNumHouses] = useState(2);
  const [toggles, setToggles] = useState<Toggles>({ comissoes: false, aumento: false, cashback: false, arredondar: false });
  const [total, setTotal] = useState("1000");
  const [logos, setLogos] = useState<{ name: string; logoUrl: string | null }[]>([]);
  const [evento, setEvento] = useState("");
  const [data, setData] = useState(dataInputValue);
  const [esporte, setEsporte] = useState("Futebol");
  const [mercado, setMercado] = useState("");
  const [saved, setSaved] = useState(false);
  // O salvamento não acontece mais direto: abre a janela que pergunta o
  // procedimento, as contas e (na extração) a freebet gasta.
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const seeded = useRef(false);
  const calculationContext = useRef({ toggles, total, numHouses });
  const selectedHouse = selection?.house
    ? logos.find((item) => normName(item.name) === normName(selection.house!))?.name
      ?? logos.find((item) => normName(item.name).replace(/(bet|br)$/, "") === normName(selection.house!).replace(/(bet|br)$/, ""))?.name
      ?? selection.house
    : "";
  const selectionCommand = selection
    ? JSON.stringify([selection.row, selection.label ?? "", selection.odd, selectedHouse])
    : "";

  useEffect(() => {
    calculationContext.current = { toggles, total, numHouses };
  }, [toggles, total, numHouses]);

  // Casas do diretório de clones (para o seletor e os logos).
  useEffect(() => {
    fetch("/api/clones")
      .then((r) => r.json())
      .then((d: { houses: { name: string; logoUrl?: string | null }[] }) => {
        // Lista canônica e sem duplicata (a mesma usada em todo o site).
        setLogos(housesForSelect(d.houses ?? []));
      })
      .catch(() => {});
  }, []);

  // Casa vinda do feed ("sportingbet") → nome canônico do diretório ("Sportingbet").
  useEffect(() => {
    if (!logos.length) return;
    setRows((prev) => prev.map((h) => {
      if (!h.house) return h;
      const k = normName(h.house);
      const hit = logos.find((l) => normName(l.name) === k) ?? logos.find((l) => normName(l.name).replace(/(bet|br)$/, "") === k.replace(/(bet|br)$/, ""));
      return hit && hit.name !== h.house ? { ...h, house: hit.name } : h;
    }));
  }, [logos]);

  const logoFor = useCallback(
    (name: string) => {
      if (!name) return null;
      const k = normName(name);
      const hit = logos.find((l) => normName(l.name) === k) ?? logos.find((l) => normName(l.name).replace(/(bet|br)$/, "") === k.replace(/(bet|br)$/, ""));
      return hit?.logoUrl ?? null;
    },
    [logos],
  );

  // Resolve os stakes e grava nas linhas (menos na fixa). Chamado nas mudanças estruturais.
  const resolve = useCallback((base: Row[], tg: Toggles, tot: string, n: number) => {
    const s = solveStakes(base, tg, num(tot), n);
    const fixedIdx = base.slice(0, n).findIndex((h) => h.fixed);
    return base.map((h, i) => (i < n && i !== fixedIdx ? { ...h, stake: s[i].toFixed(2) } : h));
  }, []);

  // Pré-preenche a partir de um jogo (odds + casas), uma única vez.
  useEffect(() => {
    if (seeded.current || !seed?.rows?.length) return;
    seeded.current = true;
    const n = Math.min(MAX, Math.max(2, seed.rows.length));
    setNumHouses(n);
    setTotal(seed.total ? String(seed.total) : "1000");
    setRows((prev) => {
      const next = prev.map((h, i) => {
        if (i >= n) return h;
        const r = seed.rows[i];
        return { ...emptyRow(i), odd: r?.odd ? r.odd.toFixed(2) : "2.00", house: r?.house ?? "", label: r?.label };
      });
      return resolve(next, toggles, seed.total ? String(seed.total) : "1000", n);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, resolve]);

  // No monitor, um clique na tabela troca somente a perna correspondente.
  // As demais configurações são preservadas e as stakes são recalculadas.
  useEffect(() => {
    if (!selectionCommand) return;
    const [row, label, odd, house] = JSON.parse(selectionCommand) as [number, string, number, string];
    const context = calculationContext.current;
    if (row < 0 || row >= context.numHouses || odd <= 1) return;
    setRows((prev) => {
      const next = prev.map((row) => ({ ...row }));
      next[row] = {
        ...next[row],
        odd: odd.toFixed(2),
        house,
        isLay: supportsLay(house) ? next[row].isLay : false,
        label: label || next[row].label,
      };
      return resolve(next, context.toggles, context.total, context.numHouses);
    });
  }, [selectionCommand, resolve]);

  const { profits, risk, roi } = useMemo(() => summary(rows, toggles, numHouses), [rows, toggles, numHouses]);

  // --- Handlers ---
  const patch = (i: number, field: keyof Row, value: Row[keyof Row], restructure: boolean) => {
    setRows((prev) => {
      const next = prev.map((h) => ({ ...h }));
      (next[i][field] as unknown) = value;
      return restructure ? resolve(next, toggles, total, numHouses) : next;
    });
  };
  const changeHouse = (i: number, house: string) => {
    setRows((prev) => {
      const next = prev.map((row) => ({ ...row }));
      const resetLay = next[i].isLay && !supportsLay(house);
      next[i] = { ...next[i], house, isLay: resetLay ? false : next[i].isLay };
      return resetLay ? resolve(next, toggles, total, numHouses) : next;
    });
  };
  const setFixed = (i: number) => setRows((prev) => resolve(prev.map((h, idx) => ({ ...h, fixed: idx === i })), toggles, total, numHouses));
  const setTotalFixed = () => setRows((prev) => resolve(prev.map((h) => ({ ...h, fixed: false })), toggles, total, numHouses));
  const changeToggle = (key: keyof Toggles, value: boolean) => {
    const tg = { ...toggles, [key]: value };
    setToggles(tg);
    setRows((prev) => resolve(prev, tg, total, numHouses));
  };
  const changeNum = (n: number) => { setNumHouses(n); setRows((prev) => resolve(prev, toggles, total, n)); };
  const changeTotal = (v: string) => { setTotal(v); setRows((prev) => resolve(prev.map((h) => ({ ...h, fixed: false })), toggles, v, numHouses)); };
  // Stake digitado: na fixa redistribui; nas outras é só simulação (não redistribui).
  const changeStake = (i: number, v: string) => patch(i, "stake", v, rows[i].fixed);
  const changeResp = (i: number, v: string) => {
    const odd = num(rows[i].odd, 1);
    const stake = odd > 1 ? num(v) / (odd - 1) : 0;
    patch(i, "stake", stake.toFixed(2), rows[i].fixed);
  };

  const anyFixed = rows.slice(0, numHouses).some((h) => h.fixed);
  const hasLayRows = rows.slice(0, numHouses).some((row) => supportsLay(row.house));
  const cols = 2 + (hasLayRows ? 1 : 0) + (toggles.comissoes ? 1 : 0) + (toggles.aumento ? 1 : 0) + (toggles.cashback ? 1 : 0);
  const inputCls = `${monitor ? "h-10 px-2 text-sm" : "h-11 px-3 text-base"} w-full rounded-xl border border-border bg-surface-2 text-center tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10`;
  const planilhaLegs = useMemo(() => rows.slice(0, numHouses).map((row, index) => ({
    casa: row.house,
    selecao: row.label || `${row.isLay ? "Lay" : "Entrada"} ${index + 1}`,
    odd: row.odd,
    stake: row.stake,
    // Sem isto a planilha trataria o Lay como Back e erraria o investido/lucro.
    isLay: row.isLay,
    freebet: row.freebet,
    // A comissão só conta se o toggle estiver ligado — igual ao solver.
    comissao: toggles.comissoes ? row.comm : "0",
    // O aumento também precisa seguir o toggle. Sem enviá-lo, a planilha
    // recalcula pela odd pura e transforma um cenário positivo em negativo.
    aumento: toggles.aumento ? row.aumento : "0",
  })), [rows, numHouses, toggles.comissoes, toggles.aumento]);
  const pickEvento = (option: EventOption) => {
    setEvento(option.label);
    setEsporte(option.sport || "Futebol");
    if (option.startsAt) setData(datetimeLocalFromIso(option.startsAt));
  };
  /**
   * Só abre a janela com o mínimo pra planilha fazer sentido: evento e apostas
   * válidas. Melhor barrar aqui do que deixar a pessoa preencher tudo e tomar
   * erro do servidor no fim.
   */
  const abrirJanelaSalvar = () => {
    const eventoAtual = monitor && monitorEvent ? monitorEvent.label : evento;
    if (!eventoAtual.trim()) {
      setErroSalvar("Informe o jogo antes de salvar na planilha.");
      return;
    }
    if (planilhaLegs.some((leg) => num(leg.odd) <= 1 || num(leg.stake) <= 0)) {
      setErroSalvar("Revise a odd e o valor de todas as apostas.");
      return;
    }
    setErroSalvar(null);
    setSaved(false);
    setSalvando(true);
  };

  const clearCalculator = () => {
    setRows(Array.from({ length: MAX }, (_, i) => emptyRow(i)));
    setNumHouses(2);
    setToggles({ comissoes: false, aumento: false, cashback: false, arredondar: false });
    setTotal("1000");
    setEvento("");
    setData(dataInputValue());
    setEsporte("Futebol");
    setMercado("");
    setSaved(false);
    seeded.current = false;
  };

  return (
    <section className={`overflow-hidden border bg-surface ${compact ? "rounded-xl border-border" : "rounded-3xl border-border-strong"} ${className}`}>
      {/* Cabeçalho: resultados + toggles */}
      <div className={`flex flex-wrap items-center border-b border-border bg-gradient-to-r from-surface-2/80 to-surface gap-y-3 ${monitor ? "gap-x-5 px-4 py-4" : "gap-x-7 px-5 py-5 md:px-7"}`}>
        {!compact && (
          <div className="mr-auto min-w-[180px]">
            <p className="text-base font-black">Configuração</p>
            <p className="mt-0.5 text-xs text-muted">Ajuste os cenários do cálculo</p>
          </div>
        )}
        <label className="flex items-center gap-2">
          <span className="mono-label text-muted">Resultados</span>
          {/* 1 resultado = aposta simples, sem proteção — também entra na planilha. */}
          <select value={numHouses} onChange={(e) => changeNum(Number(e.target.value))} className={`${compact ? "rounded-md px-2 py-1 text-sm" : "h-11 rounded-xl px-4 text-base"} border border-border bg-surface-2 font-black outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10`}>
            {Array.from({ length: MAX }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {toggleKeys.map((k) => (
            <Toggle key={k} label={TOGGLE_LABELS[k]} on={toggles[k]} onChange={(v) => changeToggle(k, v)} />
          ))}
        </div>
      </div>

      {/* ===== Variante compacta (Monitor): cards empilhados ===== */}
      {compact ? (
        <div className="space-y-2.5 p-3">
          {Array.from({ length: numHouses }).map((_, i) => {
            const h = rows[i];
            const profit = profits[i] ?? 0;
            const pClass = profit > 0.01 ? "text-positive" : profit < -0.01 ? "text-negative" : "text-text-2";
            return (
              <div key={i} className={`rounded-xl border p-3 transition-colors ${h.fixed ? "border-accent/40 bg-accent/[0.05]" : "border-border bg-surface-2/40"}`}>
                {/* Casa + resultado */}
                <div className="mb-2.5 flex items-center gap-2">
                  {h.label && <span className="shrink-0 rounded-md bg-surface-3 px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[.12em] text-text-2">{h.label}</span>}
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-3 text-[9px] font-bold text-muted">
                    {logoFor(h.house) ? <img src={logoFor(h.house)!} alt="" className="h-full w-full object-contain p-0.5" /> : (h.house ? h.house.charAt(0).toUpperCase() : "?")}
                  </span>
                  <HousePicker
                    value={h.house}
                    onChange={(name) => changeHouse(i, name)}
                    houses={logos}
                    logoFor={logoFor}
                    size="sm"
                  />
                </div>

                {/* Back/Lay + odd + comissão + valor + lucro */}
                <div className="flex items-end gap-2">
                  {supportsLay(h.house) && <BackLayControl isLay={h.isLay} onChange={(isLay) => patch(i, "isLay", isLay, true)} compact />}
                  <NumField label="Odd" value={h.odd} step="0.01" onChange={(v) => patch(i, "odd", v, true)} width="w-16" bold />
                  {toggles.comissoes && <NumField label="Com. %" value={h.comm} step="0.1" onChange={(v) => patch(i, "comm", v, true)} width="w-16" />}
                  <NumField label={h.isLay ? "Aposta a favor" : "Valor"} value={h.stake} step="0.01" onChange={(v) => changeStake(i, v)} prefix="R$" grow bold />
                  <div className="shrink-0 text-right">
                    <p className="mono-label text-muted">Lucro</p>
                    <p className={`text-[15px] font-black leading-tight tabular-nums ${pClass}`}>{profit.toFixed(2)}</p>
                  </div>
                </div>
                {h.isLay && (
                  <p className="mt-1.5 flex items-center justify-end gap-1.5 text-right text-[10px]">
                    <span className="mono-label text-negative">Responsabilidade</span>
                    <b className="tabular-nums text-negative">{brl(num(h.stake) * Math.max(0, num(h.odd, 1) - 1))}</b>
                    <span className="text-muted">(o que você arrisca)</span>
                  </p>
                )}

                {/* Opções */}
                <div className="mt-2.5 flex items-center gap-4 border-t border-border/60 pt-2 text-[11px]">
                  <MiniCheck label="Freebet" checked={h.freebet} onChange={(v) => patch(i, "freebet", v, true)} />
                  <MiniCheck label="Distribuir" checked={h.dist} onChange={(v) => patch(i, "dist", v, true)} />
                  <label className="ml-auto flex cursor-pointer items-center gap-1.5">
                    <input type="radio" name="fixed-row-c" checked={h.fixed} onChange={() => setFixed(i)} className="h-3.5 w-3.5 accent-[var(--accent)]" />
                    <span className="font-semibold text-text-2">Fixar stake</span>
                  </label>
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-3">
            <div className="min-w-0 flex-1">
              <p className="mono-label text-muted">Investimento total</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted">R$</span>
                <LiveNumberInput
                  value={risk.toFixed(2)}
                  onChange={changeTotal}
                  readOnly={anyFixed}
                  title="Soma real dos valores arriscados nesta operação"
                  className={`w-full bg-transparent text-lg font-black tabular-nums outline-none ${anyFixed ? "text-text-2" : ""}`}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="mono-label text-muted">ROI</p>
              <p className={`text-lg font-black tabular-nums ${roi > 0.01 ? "text-positive" : roi < -0.01 ? "text-negative" : "text-text-2"}`}>{roi.toFixed(2)}%</p>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 border-l border-accent/20 pl-3">
              <input type="radio" name="fixed-row-c" checked={!anyFixed} onChange={setTotalFixed} className="h-3.5 w-3.5 accent-[var(--accent)]" />
              <span className="text-[11px] font-semibold text-text-2">Distribuir</span>
            </label>
          </div>
        </div>
      ) : (

      /* ===== Variante completa: tabela ===== */
      <div className={`overflow-x-auto ${monitor ? "p-3" : "p-3 sm:p-5"}`}>
        <table className={`w-full overflow-hidden rounded-2xl border-separate border-spacing-0 text-center ${monitor ? "min-w-[760px]" : "min-w-[900px]"}`}>
          <thead className="bg-surface-2/80">
            <tr className="mono-label text-muted">
              <th className={`rounded-l-xl border-y border-l border-border text-left ${monitor ? "w-[32%] px-2 py-3" : "px-4 py-4"}`}>Casa de aposta</th>
              {hasLayRows && <th className={`border-y border-border ${monitor ? "px-1.5 py-3" : "px-3 py-4"}`}>Back / Lay</th>}
              <th className={`border-y border-border ${monitor ? "px-2 py-3" : "px-3 py-4"}`}>Odd</th>
              {toggles.comissoes && <th className={`border-y border-border ${monitor ? "px-2 py-3" : "px-3 py-4"}`}>Comis. %</th>}
              {toggles.aumento && <th className={`border-y border-border ${monitor ? "px-2 py-3" : "px-3 py-4"}`}>Aum. %</th>}
              {toggles.cashback && <th className={`border-y border-border ${monitor ? "px-2 py-3" : "px-3 py-4"}`}>Cashback</th>}
              <th className={`border-y border-border ${monitor ? "px-2 py-3" : "px-3 py-4"}`}>{hasLayRows ? "Valor / Lay" : "Valor"}</th>
              <th className={`border-y border-border ${monitor ? "px-2 py-3" : "px-3 py-4"}`}>Lucro</th>
              <th className={`border-y border-border ${monitor ? "px-1.5 py-3 text-[8px]" : "px-3 py-4"}`}>Freebet</th>
              <th className={`border-y border-border ${monitor ? "px-1.5 py-3" : "px-3 py-4"}`}>Dist.</th>
              <th className={`rounded-r-xl border-y border-r border-border ${monitor ? "px-1.5 py-3" : "px-3 py-4"}`}>Fixo</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numHouses }).map((_, i) => {
              const h = rows[i];
              const profit = profits[i] ?? 0;
              const pClass = profit > 0.01 ? "text-positive" : profit < -0.01 ? "text-negative" : "text-text-2";
              return (
                <tr key={i} className="group transition-colors hover:bg-surface-2/40">
                  {/* Casa */}
                  <td className={`border-b border-border/60 text-left ${monitor ? "px-2 py-2.5" : "px-4 py-3"}`}>
                    {h.label && <p className="mono-label mb-0.5 text-muted">{h.label}</p>}
                    <div className="flex items-center gap-1.5">
                      <span className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-3 font-bold text-muted shadow-sm ${monitor ? "h-9 w-9 text-[10px]" : "h-11 w-11 text-xs"}`}>
                        {logoFor(h.house) ? <img src={logoFor(h.house)!} alt="" className="h-full w-full object-contain p-0.5" /> : (h.house ? h.house.charAt(0).toUpperCase() : "?")}
                      </span>
                      <HousePicker
                        value={h.house}
                        onChange={(name) => changeHouse(i, name)}
                        houses={logos}
                        logoFor={logoFor}
                        size={monitor ? "sm" : "lg"}
                      />
                    </div>
                  </td>
                  {/* Back / Lay */}
                  {hasLayRows && (
                    <td className={`border-b border-border/60 ${monitor ? "px-1.5 py-2.5" : "px-3 py-3"}`}>
                      {supportsLay(h.house)
                        ? <BackLayControl isLay={h.isLay} onChange={(isLay) => patch(i, "isLay", isLay, true)} compact={monitor} />
                        : <span className="text-muted">—</span>}
                    </td>
                  )}
                  {/* Odd */}
                  <td className={`border-b border-border/60 ${monitor ? "px-2 py-2.5" : "px-3 py-3"}`}><input type="number" step="0.01" value={h.odd} onChange={(e) => patch(i, "odd", e.target.value, true)} className={`${inputCls} font-black`} /></td>
                  {toggles.comissoes && <td className="border-b border-border/60 px-3 py-3"><input type="number" step="0.1" value={h.comm} onChange={(e) => patch(i, "comm", e.target.value, true)} className={inputCls} /></td>}
                  {toggles.aumento && <td className="border-b border-border/60 px-3 py-3"><input type="number" step="0.1" value={h.aumento} onChange={(e) => patch(i, "aumento", e.target.value, true)} className={inputCls} /></td>}
                  {toggles.cashback && (
                    <td className="border-b border-border/60 px-3 py-3">
                      <div className="flex h-11 overflow-hidden rounded-xl border border-border">
                        <select value={h.cbType} onChange={(e) => patch(i, "cbType", e.target.value as CbType, true)} className="border-r border-border bg-surface-3 px-2 text-xs font-bold outline-none">
                          <option value="%">%</option><option value="R$">R$</option>
                        </select>
                        <input type="number" step="0.1" value={h.cashback} onChange={(e) => patch(i, "cashback", e.target.value, true)} className="w-full bg-surface-2 px-2 text-center text-base outline-none" />
                      </div>
                    </td>
                  )}
                  {/* Valor (stake) — Lay mostra Resp. + Aposta */}
                  <td className={`border-b border-border/60 ${monitor ? "px-2 py-2.5" : "px-3 py-3"}`}>
                    {h.isLay ? (
                      /* No LAY são dois valores diferentes — precisam ficar claros. */
                      <div className="space-y-1.5">
                        <label className="block">
                          <span className="mono-label mb-0.5 block text-negative">Responsabilidade</span>
                          <LiveNumberInput
                            value={(num(h.stake) * Math.max(0, num(h.odd, 1) - 1)).toFixed(2)}
                            onChange={(raw) => changeResp(i, raw)}
                            className={`${inputCls} border-negative/35 bg-negative/[0.06] font-bold text-negative`}
                            title="O quanto você arrisca (o que a casa segura)"
                          />
                        </label>
                        <label className="block">
                          <span className="mono-label mb-0.5 block text-info">Aposta a favor (stake)</span>
                          <LiveNumberInput
                            value={h.stake}
                            onChange={(raw) => changeStake(i, raw)}
                            className={`${inputCls} border-info/35 bg-info/[0.06] font-bold text-info`}
                            title="O quanto você ganha se o lay der certo"
                          />
                        </label>
                      </div>
                    ) : (
                      <LiveNumberInput value={h.stake} onChange={(raw) => changeStake(i, raw)} className={`${inputCls} font-black`} />
                    )}
                  </td>
                  {/* Lucro */}
                  <td className={`border-b border-border/60 font-black tabular-nums ${monitor ? "px-2 py-2.5 text-sm" : "px-3 py-3 text-base"} ${pClass}`}>{profit.toFixed(2)}</td>
                  {/* Freebet */}
                  <td className={`border-b border-border/60 ${monitor ? "px-1.5 py-2.5" : "px-3 py-3"}`}><input type="checkbox" checked={h.freebet} onChange={(e) => patch(i, "freebet", e.target.checked, true)} className="h-5 w-5 accent-[var(--accent)]" /></td>
                  {/* Dist */}
                  <td className={`border-b border-border/60 ${monitor ? "px-1.5 py-2.5" : "px-3 py-3"}`}><input type="checkbox" checked={h.dist} onChange={(e) => patch(i, "dist", e.target.checked, true)} className="h-5 w-5 accent-[var(--accent)]" /></td>
                  {/* Fixo */}
                  <td className={`border-b border-border/60 ${monitor ? "px-1.5 py-2.5" : "px-3 py-3"}`}><input type="radio" name="fixed-row" checked={h.fixed} onChange={() => setFixed(i)} className="h-5 w-5 accent-[var(--accent)]" /></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-accent/[0.07]">
            <tr>
              <td colSpan={cols} className="rounded-bl-xl border-b border-l border-accent/20 px-4 py-5 text-right text-sm font-black uppercase tracking-wide text-accent">Investimento total</td>
              <td className="border-b border-accent/20 px-3 py-4">
                <LiveNumberInput
                  value={risk.toFixed(2)}
                  onChange={changeTotal}
                  readOnly={anyFixed}
                  title="Soma real dos valores arriscados nesta operação"
                  className={`${inputCls} border-accent/20 bg-surface font-black ${anyFixed ? "opacity-70" : ""}`}
                />
              </td>
              <td className={`border-b border-accent/20 px-3 py-4 text-lg font-black tabular-nums ${roi > 0.01 ? "text-positive" : roi < -0.01 ? "text-negative" : "text-text-2"}`}>{roi.toFixed(2)}%</td>
              <td className="border-b border-accent/20 px-3 py-4" />
              <td className="border-b border-accent/20 px-3 py-4" />
              <td className="rounded-br-xl border-b border-r border-accent/20 px-3 py-4"><input type="radio" name="fixed-row" checked={!anyFixed} onChange={setTotalFixed} className="h-5 w-5 accent-[var(--accent)]" /></td>
            </tr>
          </tfoot>
        </table>
      </div>
      )}

      {monitor && monitorEvent && (
        <div className="border-t border-border bg-surface px-5 py-5 md:px-7">
          {erroSalvar && <p className="mb-3 rounded-lg bg-negative/10 px-3 py-2 text-xs font-semibold text-negative">{erroSalvar}</p>}
          {saved && <PlanilhaSuccess evento={monitorEvent.label} investido={risk} roi={roi} onDismiss={() => setSaved(false)} className="mb-4" />}
          <button type="button" onClick={abrirJanelaSalvar} className="h-14 w-full rounded-xl bg-positive px-4 text-sm font-black text-black transition hover:brightness-110">
            Adicionar à planilha
          </button>
        </div>
      )}

      {!monitor && (
        <div className="border-t border-border bg-surface px-5 py-5 md:px-7">
          <section className="overflow-visible rounded-2xl border border-border bg-surface-2/60">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-extrabold">Detalhes do Evento</h2>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_240px]">
              <label className="space-y-2 text-xs font-bold text-text-2">
                <span className="mono-label text-muted">Jogo *</span>
                <EventCombo options={eventos} value={evento} onChange={setEvento} onPick={pickEvento} placeholder="Nome do jogo ou buscar na lista..." />
              </label>
              <label className="space-y-2 text-xs font-bold text-text-2">
                <span className="mono-label text-muted">Mercado</span>
                <input value={mercado} onChange={(event) => setMercado(event.target.value)} placeholder="Ex: 1X2" className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm font-semibold outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>
              <label className="space-y-2 text-xs font-bold text-text-2">
                <span className="mono-label text-muted">Data / hora do jogo</span>
                <input type="datetime-local" value={data} onChange={(event) => setData(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm font-semibold outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
                <span className="block text-[10px] font-normal leading-relaxed text-muted">A operação entra na planilha no dia em que você salvar.</span>
              </label>
              <label className="space-y-2 text-xs font-bold text-text-2">
                <span className="mono-label text-muted">Esporte</span>
                <input value={esporte} onChange={(event) => setEsporte(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm font-semibold outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>
            </div>
          </section>

          {erroSalvar && <p className="mt-3 rounded-lg bg-negative/10 px-3 py-2 text-xs font-semibold text-negative">{erroSalvar}</p>}
          {saved && <PlanilhaSuccess evento={evento} investido={risk} roi={roi} onDismiss={() => setSaved(false)} className="mt-4" />}
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
            <button type="button" onClick={abrirJanelaSalvar} className="h-14 rounded-xl bg-positive px-4 text-sm font-black text-black transition hover:brightness-110">
              Adicionar à planilha
            </button>
            <button type="button" onClick={clearCalculator} className="h-14 rounded-xl border border-border bg-surface px-4 text-sm font-bold text-muted transition hover:border-border-strong hover:text-text">
              Limpar calculadora
            </button>
          </div>
        </div>
      )}

      {salvando && (
        <SalvarPlanilhaModal
          legs={planilhaLegs}
          evento={monitor && monitorEvent ? monitorEvent.label : evento}
          data={monitor && monitorEvent ? (monitorEvent.startsAt ?? "") : data}
          esporte={monitor && monitorEvent ? (monitorEvent.sport || "Futebol") : esporte}
          notas={monitor && monitorEvent ? `Monitoramento de Odds · Mercado: ${monitorEvent.market || "1X2"}` : (mercado ? `Mercado: ${mercado}` : "")}
          onClose={() => setSalvando(false)}
          onSaved={() => setSaved(true)}
        />
      )}

      <p className={`border-t border-border text-muted ${compact ? "px-3 py-2 text-[11px]" : "bg-surface-2/35 px-6 py-4 text-xs leading-relaxed"}`}>
        Marque <b className="text-text-2">{compact ? "Fixar stake" : "Fixo"}</b> numa casa para ancorar a stake dela, ou deixe no <b className="text-text-2">{compact ? "Distribuir" : "Total"}</b> para dividir o investimento. O <b className="text-text-2">Lucro</b> mostra o resultado se aquela linha vencer.
      </p>
    </section>
  );
}

function PlanilhaSuccess({ evento, investido, roi, onDismiss, className = "" }: { evento: string; investido: number; roi: number; onDismiss: () => void; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`animate-menu-in relative overflow-hidden rounded-2xl border border-positive/30 bg-gradient-to-r from-positive/[0.15] via-positive/[0.08] to-surface px-4 py-4 shadow-[0_16px_40px_rgba(16,185,129,0.10)] sm:px-5 ${className}`}>
      <span className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-positive/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-positive/30 bg-positive/15 text-positive shadow-[0_8px_24px_rgba(16,185,129,0.14)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-black text-positive sm:text-lg">Operação adicionada com sucesso!</p>
            <span className="rounded-full border border-positive/20 bg-positive/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-positive">Salva</span>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-text-2 sm:text-sm">{evento || "Sua operação"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
            <span>Investido <b className="ml-1 tabular-nums text-text">{brl(investido)}</b></span>
            <span>ROI previsto <b className={`ml-1 tabular-nums ${roi >= 0 ? "text-positive" : "text-negative"}`}>{roi >= 0 ? "+" : ""}{roi.toFixed(2)}%</b></span>
            <span>Já disponível na sua planilha</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/operacoes" className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-positive px-4 text-xs font-black text-black transition hover:brightness-110 sm:flex-none">Ver na planilha <span className="ml-1.5">→</span></Link>
          <button type="button" onClick={onDismiss} aria-label="Fechar confirmação" title="Fechar" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-positive/20 text-positive transition hover:bg-positive/10">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Input de dinheiro que NÃO briga com quem está digitando.
 *
 * O problema: campos calculados (ex.: Responsabilidade) são reformatados a cada
 * tecla (.toFixed(2)). O React reescreve o value e o cursor pula pro fim —
 * fica impossível apagar e redigitar.
 *
 * A solução: enquanto o campo está FOCADO, mandamos no texto local (o que a
 * pessoa digitou). Ao sair do campo, voltamos a mostrar o valor formatado.
 */
function LiveNumberInput({
  value,
  onChange,
  className,
  title,
  step = "0.01",
  readOnly = false,
}: {
  value: string;
  onChange: (raw: string) => void;
  className?: string;
  title?: string;
  step?: string;
  readOnly?: boolean;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);

  return (
    <input
      type="number"
      step={step}
      readOnly={readOnly}
      value={focused ? text : value}
      onFocus={(e) => { setFocused(true); setText(value); e.target.select(); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => { setText(e.target.value); onChange(e.target.value); }}
      className={className}
      title={title}
    />
  );
}

function BackLayControl({ isLay, onChange, compact = false }: { isLay: boolean; onChange: (isLay: boolean) => void; compact?: boolean }) {
  return (
    <div className={`grid shrink-0 grid-cols-2 overflow-hidden rounded-xl border border-border-strong bg-bg/50 p-1 shadow-inner ${compact ? "h-9 w-[104px]" : "h-11 min-w-[132px]"}`} aria-label="Tipo de aposta">
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!isLay}
        className={`rounded-lg font-black uppercase tracking-wider transition-all ${compact ? "text-[9px]" : "text-[10px]"} ${
          !isLay ? "bg-info text-white shadow-[0_3px_10px_rgba(85,184,240,0.3)]" : "text-muted hover:text-info"
        }`}
      >
        Back
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        aria-pressed={isLay}
        className={`rounded-lg font-black uppercase tracking-wider transition-all ${compact ? "text-[9px]" : "text-[10px]"} ${
          isLay ? "bg-negative text-white shadow-[0_3px_10px_rgba(255,95,87,0.28)]" : "text-muted hover:text-negative"
        }`}
      >
        Lay
      </button>
    </div>
  );
}

function NumField({ label, value, onChange, step = "0.01", width, grow = false, bold = false, prefix }: {
  label: string; value: string; onChange: (v: string) => void; step?: string; width?: string; grow?: boolean; bold?: boolean; prefix?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${grow ? "min-w-0 flex-1" : "shrink-0"}`}>
      <span className="mono-label text-muted">{label}</span>
      <div className={`flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-2 focus-within:border-accent ${width ?? ""}`}>
        {prefix && <span className="shrink-0 text-[11px] text-muted">{prefix}</span>}
        <input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} className={`w-full min-w-0 bg-transparent text-center text-sm tabular-nums outline-none ${bold ? "font-black" : "font-medium"}`} />
      </div>
    </label>
  );
}

function MiniCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 rounded accent-[var(--accent)]" />
      <span className="font-semibold text-text-2">{label}</span>
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <span className={`relative h-4 w-7 rounded-full transition-colors ${on ? "bg-accent" : "bg-border-strong"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-bg transition-all ${on ? "left-3.5" : "left-0.5"}`} />
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      </span>
      <span className="mono-label text-text-2">{label}</span>
    </label>
  );
}
