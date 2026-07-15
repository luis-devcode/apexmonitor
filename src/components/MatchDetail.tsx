"use client";

/* Escudos e logos vêm de origens variadas do feed e possuem fallback local. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import SurebetCalculator, { type CalcMonitorEvent, type CalcSelection } from "@/components/SurebetCalculator";

type Odd = {
  bookmaker: string;
  variant: string;
  home: number | null;
  draw: number | null;
  away: number | null;
  logoUrl?: string | null;
};

type Data = {
  updatedAt: string | null;
  health?: { live: boolean };
  match: {
    id: string;
    home: string;
    away: string;
    sport?: string;
    league: string;
    startsAt?: string;
    homeLogo?: string | null;
    awayLogo?: string | null;
    leagueLogo?: string | null;
  };
  odds: Odd[];
};

type Pick = { odd: number; house: string; variant: string };
type Combo = { home: Pick; draw: Pick; away: Pick; roi: number };
type Outcome = "home" | "draw" | "away";
type ManualChoice = { bookmaker: string; variant: string };

const pretty = (value: string) => value.replace(/\b\w/g, (character) => character.toUpperCase());
const initials = (value: string) => value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const POLL_MS = 5000;

const VARIANTS = [
  { key: "PA", label: "PA", desc: "Pagamento Antecipado" },
  { key: "SO", label: "SO", desc: "Super Odds" },
];

const OUTCOMES = [
  { key: "home" as const, label: "Casa" },
  { key: "draw" as const, label: "Empate" },
  { key: "away" as const, label: "Fora" },
];

function whenLabel(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function margin(odd: Odd) {
  if (!odd.home || !odd.draw || !odd.away) return null;
  return (1 - (1 / odd.home + 1 / odd.draw + 1 / odd.away)) * 100;
}

function bestCombo(rows: Odd[]): Combo | null {
  const pick = (outcome: "home" | "draw" | "away"): Pick | null =>
    rows.reduce<Pick | null>((best, odd) => {
      const value = odd[outcome];
      return value && value > 1 && (!best || value > best.odd)
        ? { odd: value, house: odd.bookmaker, variant: odd.variant }
        : best;
    }, null);

  const home = pick("home");
  const draw = pick("draw");
  const away = pick("away");
  if (!home || !draw || !away) return null;

  const roi = (1 / (1 / home.odd + 1 / draw.odd + 1 / away.odd) - 1) * 100;
  return { home, draw, away, roi };
}

export default function MatchDetail({
  match,
  onBack,
}: {
  match: { id: string; home: string; away: string };
  onBack: () => void;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualChoices, setManualChoices] = useState<Partial<Record<Outcome, ManualChoice>>>({});
  const [lastSelectedOutcome, setLastSelectedOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/match?id=${encodeURIComponent(match.id)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Falha ao carregar (${response.status})`);
        const payload = await response.json() as Data;
        if (!cancelled) setData(payload);
      } catch {
        // Mantém a última leitura válida e tenta novamente no próximo ciclo.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [match.id]);

  const odds = useMemo(() => data?.odds ?? [], [data]);
  const groups = useMemo(
    () => VARIANTS
      .map((variant) => ({ ...variant, rows: odds.filter((odd) => odd.variant === variant.key) }))
      .filter((group) => group.rows.length > 0),
    [odds],
  );
  const overall = useMemo(() => bestCombo(odds), [odds]);
  const selectedPicks = useMemo(() => {
    if (!overall) return null;

    const selectedFor = (outcome: Outcome): Pick => {
      const choice = manualChoices[outcome];
      if (!choice) return overall[outcome];
      const row = odds.find((odd) => odd.bookmaker === choice.bookmaker && odd.variant === choice.variant);
      const value = row?.[outcome];
      return value && value > 1
        ? { odd: value, house: row.bookmaker, variant: row.variant }
        : overall[outcome];
    };

    return {
      home: selectedFor("home"),
      draw: selectedFor("draw"),
      away: selectedFor("away"),
    };
  }, [manualChoices, odds, overall]);

  const calculatorSelection: CalcSelection | null = useMemo(() => {
    if (!lastSelectedOutcome || !selectedPicks) return null;
    const row = OUTCOMES.findIndex((outcome) => outcome.key === lastSelectedOutcome);
    const pick = selectedPicks[lastSelectedOutcome];
    return { row, label: OUTCOMES[row].label, odd: pick.odd, house: pick.house };
  }, [lastSelectedOutcome, selectedPicks]);

  const calculatorEvent: CalcMonitorEvent = {
    label: `${data?.match.home ?? match.home} x ${data?.match.away ?? match.away}`,
    sport: data?.match.sport || "Futebol",
    startsAt: data?.match.startsAt,
    market: "1X2",
  };

  const selectOdd = (outcome: Outcome, odd: Odd) => {
    const value = odd[outcome];
    if (!value || value <= 1) return;
    setManualChoices((current) => ({
      ...current,
      [outcome]: { bookmaker: odd.bookmaker, variant: odd.variant },
    }));
    setLastSelectedOutcome(outcome);
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg/90 px-4 py-2.5 backdrop-blur md:px-6">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-text-2 transition hover:border-border-strong hover:text-text"
        >
          ←
        </button>

        <div className="flex min-w-0 items-center gap-2.5">
          <TeamCrest src={data?.match.homeLogo} name={match.home} />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-extrabold sm:text-base">
              {match.home} <span className="font-normal text-muted">×</span> {match.away}
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[9px] uppercase tracking-[.14em] text-muted">
              {data?.match.leagueLogo && <img src={data.match.leagueLogo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />}
              <span className="truncate">
                {data?.match.league ?? ""}{data?.match.startsAt ? ` · ${whenLabel(data.match.startsAt)}` : ""}
              </span>
            </p>
          </div>
          <TeamCrest src={data?.match.awayLogo} name={match.away} />
        </div>

        <span className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${data?.health?.live ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${data?.health?.live ? "animate-pulse bg-positive" : "bg-warning"}`} />
          {data?.health?.live ? "Ao vivo" : "Aguardando atualização"}
        </span>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-3 py-3 md:px-5">
        {loading && odds.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted">Carregando odds…</p>
        ) : odds.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted">Sem odds 1X2 para este jogo agora.</p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:items-start">
            <div className="min-w-0 space-y-3">
              <div className="space-y-3">
                {overall && <ComboBanner combo={overall} />}

                <section className="rounded-xl border border-border bg-surface p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-extrabold">Melhores odds por modalidade</h2>
                  <span className="shrink-0 text-[10px] text-muted">Comparativo automático</span>
                </div>
                <div className="space-y-2">
                  {groups.map((group) => {
                    const combo = bestCombo(group.rows);
                    if (!combo) return null;
                    return (
                      <div key={group.key}>
                        <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[.12em] text-text-2">{group.label}</span>
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {OUTCOMES.map((outcome) => (
                            <ComboCell
                              key={outcome.key}
                              house={combo[outcome.key].house}
                              odd={combo[outcome.key].odd}
                              label={outcome.label}
                              variant={combo[outcome.key].variant}
                            />
                          ))}
                          <RoiCell roi={combo.roi} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                </section>
              </div>

              <section className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-extrabold">Odds por casa de apostas</h2>
                  <span className="ml-auto text-xs text-muted">{odds.length} odds</span>
                </div>
                {groups.map((group) => (
                  <HouseTable
                    key={group.key}
                    label={group.label}
                    desc={group.desc}
                    rows={group.rows}
                    selected={selectedPicks}
                    onSelect={selectOdd}
                  />
                ))}
              </section>
            </div>

            <aside className="xl:sticky xl:top-[76px]">
              <SurebetCalculator
                variant="compact"
                monitorEvent={calculatorEvent}
                selection={calculatorSelection}
                seed={overall ? {
                  rows: [
                    { label: "Casa", odd: overall.home.odd, house: overall.home.house },
                    { label: "Empate", odd: overall.draw.odd, house: overall.draw.house },
                    { label: "Fora", odd: overall.away.odd, house: overall.away.house },
                  ],
                } : null}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function ComboBanner({ combo }: { combo: Combo }) {
  const surebet = combo.roi > 0;
  return (
    <section className={`rounded-xl border p-3 ${surebet ? "border-positive/35 bg-positive/[0.06]" : "border-border bg-surface"}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`text-sm font-extrabold ${surebet ? "text-positive" : "text-text"}`}>
          {surebet ? "⚡ Surebet detectada" : "Melhor combinação"}
        </span>
        <span className={`ml-auto rounded-md px-2 py-1 text-xs font-black ${surebet ? "bg-positive/15 text-positive" : "bg-surface-2 text-muted"}`}>
          {combo.roi >= 0 ? "+" : ""}{combo.roi.toFixed(2)}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {OUTCOMES.map((outcome) => (
          <ComboCell
            key={outcome.key}
            house={combo[outcome.key].house}
            odd={combo[outcome.key].odd}
            label={outcome.label}
            variant={combo[outcome.key].variant}
            highlight={surebet}
          />
        ))}
        <RoiCell roi={combo.roi} />
      </div>
    </section>
  );
}

function ComboCell({ house, odd, label, variant, highlight = false }: { house: string; odd: number; label: string; variant: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${highlight ? "border-positive/30 bg-positive/[0.06]" : "border-border bg-surface-2"}`}>
      <p className="truncate font-mono text-[8px] uppercase tracking-[.1em] text-muted">
        {pretty(house)} {variant.startsWith("PA") && <span className="text-warning">{variant}</span>}
      </p>
      <p className="text-lg font-black tabular-nums">{odd.toFixed(2)}</p>
      <p className="font-mono text-[8px] uppercase tracking-[.1em] text-muted">{label}</p>
    </div>
  );
}

function RoiCell({ roi }: { roi: number }) {
  const positive = roi > 0;
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-center">
      <p className="font-mono text-[8px] uppercase tracking-[.1em] text-muted">ROI</p>
      <p className={`text-lg font-black tabular-nums ${positive ? "text-positive" : "text-negative"}`}>
        {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%
      </p>
    </div>
  );
}

function HouseTable({ label, desc, rows, selected, onSelect }: { label: string; desc: string; rows: Odd[]; selected: Record<Outcome, Pick> | null; onSelect: (outcome: Outcome, odd: Odd) => void }) {
  const best = {
    home: Math.max(0, ...rows.map((row) => row.home ?? 0)),
    draw: Math.max(0, ...rows.map((row) => row.draw ?? 0)),
    away: Math.max(0, ...rows.map((row) => row.away ?? 0)),
  };
  const sorted = [...rows].sort((first, second) => (margin(second) ?? -999) - (margin(first) ?? -999));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[.12em] text-text-2">{label}</span>
        <span className="text-[11px] text-muted">{desc}</span>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[9px] font-semibold">
          <span className="inline-flex items-center gap-1 text-positive">
            <span className="h-2 w-2 rounded-sm bg-positive/80" aria-hidden="true" />
            Melhor {label}
          </span>
          <span className="inline-flex items-center gap-1 text-accent">
            <span className="grid h-3 w-3 place-items-center rounded-sm bg-accent text-[8px] leading-none text-accent-ink" aria-hidden="true">✓</span>
            Selecionada
          </span>
          <span className="font-normal text-muted">{rows.length} casas</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[8px] uppercase tracking-[.12em] text-muted">
              <th className="px-3 py-1.5 text-left font-medium">Casa de apostas</th>
              <th className="px-2 py-1.5 text-right font-medium">Margem</th>
              <th className="px-2 py-1.5 text-center font-medium">Casa</th>
              <th className="px-2 py-1.5 text-center font-medium">Empate</th>
              <th className="px-2 py-1.5 text-center font-medium">Fora</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((odd, index) => {
              const rowMargin = margin(odd);
              return (
                <tr key={`${odd.bookmaker}-${index}`} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-1 font-medium">
                    <span className="flex items-center gap-2">
                      <HouseLogo src={odd.logoUrl} name={odd.bookmaker} />
                      <span className="truncate text-[13px] font-semibold">{pretty(odd.bookmaker)}</span>
                    </span>
                  </td>
                  <td className={`px-2 py-1 text-right tabular-nums ${rowMargin !== null && rowMargin >= 0 ? "text-positive" : "text-muted"}`}>
                    {rowMargin === null ? "—" : `${rowMargin.toFixed(1)}%`}
                  </td>
                  <OddCell value={odd.home} best={best.home} outcome="home" odd={odd} selected={selected?.home} onSelect={onSelect} />
                  <OddCell value={odd.draw} best={best.draw} outcome="draw" odd={odd} selected={selected?.draw} onSelect={onSelect} />
                  <OddCell value={odd.away} best={best.away} outcome="away" odd={odd} selected={selected?.away} onSelect={onSelect} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OddCell({ value, best, outcome, odd, selected, onSelect }: { value: number | null; best: number; outcome: Outcome; odd: Odd; selected?: Pick; onSelect: (outcome: Outcome, odd: Odd) => void }) {
  if (!value) return <td className="px-2 py-1 text-center text-muted">—</td>;
  const isBest = best > 0 && Math.abs(value - best) < 0.0001;
  const isSelected = selected?.house === odd.bookmaker && selected.variant === odd.variant;
  return (
    <td className="px-2 py-1 text-center">
      <button
        type="button"
        onClick={() => onSelect(outcome, odd)}
        aria-label={`Selecionar odd ${value.toFixed(2)} da ${pretty(odd.bookmaker)} para ${OUTCOMES.find((item) => item.key === outcome)?.label}${isBest ? ", melhor desta modalidade" : ""}${isSelected ? ", selecionada" : ""}`}
        aria-pressed={isSelected}
        title="Selecionar esta odd na calculadora"
        className={`relative inline-flex min-w-[3rem] cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1 tabular-nums transition-colors ${
          isSelected
            ? "bg-accent font-black text-accent-ink ring-1 ring-accent shadow-[0_2px_10px_rgba(59,130,246,0.28)] hover:bg-accent-hover"
            : isBest
              ? "bg-positive/10 font-black text-positive ring-1 ring-positive/45 hover:bg-positive/15"
              : "text-text-2 hover:bg-accent/10 hover:text-accent"
        }`}
      >
        <span>{value.toFixed(2)}</span>
        {isSelected && <span className="text-[9px] leading-none" aria-hidden="true">✓</span>}
        {isSelected && isBest && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-positive ring-2 ring-surface" title="Também é uma das melhores odds" />
        )}
      </button>
    </td>
  );
}

function TeamCrest({ src, name }: { src?: string | null; name: string }) {
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border-strong bg-surface-2 text-[10px] font-black text-text-2 shadow-sm">
      {initials(name) || "?"}
      {src && (
        <img
          src={src}
          alt={`Escudo ${name}`}
          className="absolute inset-0 h-full w-full bg-white/[.03] object-contain p-1"
          onError={(event) => { event.currentTarget.hidden = true; }}
        />
      )}
    </span>
  );
}

function HouseLogo({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return <img src={src} alt={`Logo ${pretty(name)}`} loading="lazy" className="h-8 w-8 shrink-0 rounded-md bg-white/[.04] object-contain p-0.5" />;
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface-3 text-xs font-bold text-muted">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
