"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type House = { id: string; label: string };
type CoverMode = "pa2" | "pa1" | "free";
type Period = "1d" | "2d" | "5d" | "7d" | "all";
type Leg = {
  role: "freebet" | "cobertura";
  outcome: "home" | "draw" | "away";
  bookmaker: string;
  variant: string;
  odd: number;
  stake: number;
};
type Opportunity = {
  matchId: string;
  home: string;
  away: string;
  league: string;
  startsAt?: string;
  extractionPct: number;
  investment: number;
  profit: number;
  freebetHouse: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  leagueLogo?: string | null;
  legs: Leg[];
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pretty = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const OUT_ORDER = { home: 0, draw: 1, away: 2 } as const;
const OUT_LABEL = { home: "Casa", draw: "Empate", away: "Fora" } as const;
const POLL_MS = 8000;
const DAY = 864e5;
const HORIZON: Record<Period, number> = { "1d": DAY, "2d": 2 * DAY, "5d": 5 * DAY, "7d": 7 * DAY, all: Infinity };
const MODES: { id: CoverMode; label: string; hint: string }[] = [
  { id: "pa2", label: "PA nos 2 lados", hint: "Pontas com pagamento antecipado — busca o duplo verde." },
  { id: "pa1", label: "PA em 1 lado", hint: "Uma ponta com PA, a outra na maior odd." },
  { id: "free", label: "Livre", hint: "Maior odd nas pontas (deixa aparecer SO quando for melhor)." },
];

function whenLabel(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function ConverterFreebet() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [houses, setHouses] = useState<House[]>([]);
  const [house, setHouse] = useState<string>("");
  // O que a pessoa DIGITOU é a fonte da verdade; o número vem daí. Guardar o
  // número direto fazia o campo vazio virar 0 — e aí o zero grudava na frente
  // do que ela digitasse depois ("0100").
  const [valorTexto, setValorTexto] = useState("100");
  const value = Number(valorTexto.replace(",", ".")) || 0;
  const [houseSearch, setHouseSearch] = useState("");

  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [houseLogos, setHouseLogos] = useState<Map<string, string>>(new Map());

  // Filtros do passo 3
  const [coverMode, setCoverMode] = useState<CoverMode>("pa2");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [sort, setSort] = useState<"conv" | "lucro">("conv");
  const [minPct, setMinPct] = useState<string>("");

  // Carrega a lista das NOSSAS casas (do feed).
  useEffect(() => {
    fetch("/api/freebet")
      .then((r) => r.json())
      .then((d) => setHouses(d.bookmakers ?? []))
      .catch(() => {});
  }, []);

  // Logos das casas (diretório de clones) — reutiliza o mesmo do Super Odds.
  useEffect(() => {
    fetch("/api/clones")
      .then((r) => r.json())
      .then((d: { houses: { name: string; logoUrl?: string | null }[] }) => {
        const m = new Map<string, string>();
        for (const c of d.houses ?? []) if (c.logoUrl) {
          m.set(norm(c.name), c.logoUrl);
          m.set(norm(c.name).replace(/(bet|br)$/, ""), c.logoUrl);
        }
        setHouseLogos(m);
      })
      .catch(() => {});
  }, []);

  const houseLogo = useCallback(
    (src: string) => houseLogos.get(norm(src)) ?? houseLogos.get(norm(src).replace(/(bet|br)$/, "")) ?? null,
    [houseLogos],
  );

  const loadOpps = useCallback(async () => {
    if (!house || !value) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        value: String(value),
        house,
        coverMode,
        search: search.trim(),
      });
      const r = await fetch(`/api/freebet?${params}`, { cache: "no-store" });
      const d = await r.json();
      setOpps(d.opportunities ?? []);
    } catch {
      /* tenta no próximo ciclo */
    } finally {
      setNow(Date.now());
      setLoading(false);
    }
  }, [house, value, coverMode, search]);

  // No passo 3, busca (com debounce p/ digitação) e mantém ao vivo.
  useEffect(() => {
    if (step !== 3) return;
    const debounce = setTimeout(loadOpps, 300);
    const poll = setInterval(loadOpps, POLL_MS);
    return () => { clearTimeout(debounce); clearInterval(poll); };
  }, [step, loadOpps]);

  const houseLabel = house === "all" ? "Todas as casas" : houses.find((h) => h.id === house)?.label ?? pretty(house);

  const shown = useMemo(() => {
    const horizon = HORIZON[period];
    const min = Number(minPct) || 0;
    return [...opps]
      .filter((o) => o.extractionPct >= min)
      .filter((o) => !o.startsAt || Date.parse(o.startsAt) - now <= horizon)
      .sort((a, b) => (sort === "conv" ? b.extractionPct - a.extractionPct : b.profit - a.profit));
  }, [opps, period, sort, minPct, now]);

  const stats = useMemo(() => {
    const best = shown.reduce((m, o) => Math.max(m, o.extractionPct), 0);
    const avg = shown.length ? shown.reduce((s, o) => s + o.extractionPct, 0) / shown.length : 0;
    return { total: shown.length, best, avg };
  }, [shown]);

  // ---- Passos 1 e 2 (wizard) ----
  if (step === 1 || step === 2) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-7">
        <Stepper step={step} house={house ? houseLabel : ""} value={value} onGo={setStep} />

        {step === 1 && (
          <section className="mt-8">
            <h2 className="text-center text-xl font-bold">Em qual casa você tem a freebet?</h2>
            <p className="mt-1 text-center text-sm text-muted">Selecione a casa onde você recebeu o bônus.</p>
            <div className="mx-auto mt-5 flex max-w-md items-center gap-2">
              <input
                value={houseSearch}
                onChange={(e) => setHouseSearch(e.target.value)}
                placeholder="Buscar casa…"
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={() => { setHouse("all"); setStep(2); }}
                className="whitespace-nowrap rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-2 hover:border-accent hover:text-accent"
              >
                Ver todas
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {houses
                .filter((h) => h.label.toLowerCase().includes(houseSearch.toLowerCase()))
                .map((h) => {
                  const active = h.id === house;
                  return (
                    <button
                      key={h.id}
                      onClick={() => setHouse(h.id)}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-surface text-text-2 hover:border-border-strong hover:text-text"
                      }`}
                    >
                      {h.label}
                    </button>
                  );
                })}
              {houses.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted">Carregando casas…</p>
              )}
            </div>
            <div className="mt-6 flex justify-center">
              <button
                disabled={!house}
                onClick={() => setStep(2)}
                className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-ink hover:bg-accent-hover disabled:opacity-40"
              >
                Próximo →
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="mx-auto mt-10 max-w-md text-center">
            <h2 className="text-xl font-bold">
              Quanto de freebet você tem na <span className="text-accent">{houseLabel}</span>?
            </h2>
            <p className="mt-1 text-sm text-muted">Informe o valor do bônus para calcular a extração.</p>
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
              <span className="text-lg text-muted">R$</span>
              <input
                inputMode="decimal"
                value={valorTexto}
                autoFocus
                placeholder="0"
                onChange={(e) => setValorTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && value > 0) setStep(3); }}
                className="w-40 bg-transparent text-center text-2xl font-black tabular-nums outline-none placeholder:text-muted"
              />
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={() => setStep(1)} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text-2 hover:text-text">
                ← Voltar
              </button>
              <button
                disabled={!value || value <= 0}
                onClick={() => setStep(3)}
                className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-ink hover:bg-accent-hover disabled:opacity-40"
              >
                Ver extrações →
              </button>
            </div>
          </section>
        )}
      </div>
    );
  }

  // ---- Passo 3 (resultados) ----
  const modeHint = MODES.find((m) => m.id === coverMode)?.hint ?? "";
  const ctl = "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-text outline-none transition-colors focus:border-accent";
  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-5 py-6 md:px-7">
        {/* Banner */}
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/[0.08] to-transparent p-5">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-2xl">🎁</span>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight">Converter Freebet</h1>
            <p className="text-sm text-text-2">
              {brl(value)} · <span className="text-text">{houseLabel}</span> · transforme o bônus em dinheiro real
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Stat label="Extrações" value={String(stats.total)} />
            <Stat label="Melhor conversão" value={stats.best ? `${stats.best.toFixed(1)}%` : "—"} accent />
            <Stat label="Conversão média" value={stats.avg ? `${stats.avg.toFixed(1)}%` : "—"} />
          </div>
        </section>

        {/* Filtros */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          {/* Linha 1: valor · casa · busca · ordenação */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[8rem_15rem_minmax(0,1fr)_13rem]">
            <Field label="Valor da freebet">
              <div className="flex h-10 w-full items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 transition-colors focus-within:border-accent">
                <span className="text-sm text-muted">R$</span>
                <input
                  inputMode="decimal"
                  value={valorTexto}
                  placeholder="0"
                  onChange={(e) => setValorTexto(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold tabular-nums outline-none placeholder:text-muted"
                />
              </div>
            </Field>
            <Field label="Casa da freebet">
              <select value={house} onChange={(e) => setHouse(e.target.value)} className={ctl}>
                <option value="all">Todas as casas</option>
                {houses.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            </Field>
            <Field label="Buscar">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Time ou liga…"
                className={`${ctl} placeholder:text-muted`}
              />
            </Field>
            <Field label="Ordenar por">
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={ctl}>
                <option value="conv">Maior conversão</option>
                <option value="lucro">Maior lucro</option>
              </select>
            </Field>
          </div>

          {/* Linha 2: estratégia · período · extração mínima */}
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-4 border-t border-border pt-4">
            <Field label="Pontas (casa e fora)">
              <Segmented options={MODES} value={coverMode} onChange={setCoverMode} />
            </Field>
            <Field label="Período">
              <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={`${ctl} w-48`}>
                <option value="1d">Próximas 24h</option>
                <option value="2d">Próximos 2 dias</option>
                <option value="5d">Próximos 5 dias</option>
                <option value="7d">Próximos 7 dias</option>
                <option value="all">Todo o período</option>
              </select>
            </Field>
            <Field label="Extração mín.">
              <div className="flex h-10 w-28 items-center gap-1 rounded-lg border border-border bg-surface-2 px-3 transition-colors focus-within:border-accent">
                <input
                  type="number"
                  min={0}
                  value={minPct}
                  onChange={(e) => setMinPct(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-sm tabular-nums outline-none placeholder:text-muted"
                />
                <span className="text-sm text-muted">%</span>
              </div>
            </Field>
            <button
              onClick={() => setStep(1)}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-3.5 text-sm font-semibold text-text-2 transition-colors hover:border-accent hover:text-accent"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></svg>
              Trocar casa/valor
            </button>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            {modeHint}
          </p>
        </section>

        {/* Lista */}
        <p className="text-sm text-text-2">
          <b className="text-text">{shown.length}</b> extrações encontradas
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" /> ao vivo
          </span>
        </p>

        {loading && opps.length === 0 ? (
          <Empty>Calculando as melhores extrações…</Empty>
        ) : shown.length === 0 ? (
          <Empty>Nenhuma extração encontrada com esses filtros. Tente ampliar o período ou mudar a estratégia.</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((o) => <Card key={o.matchId} o={o} showHouse={house === "all"} logoFor={houseLogo} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="mono-label text-muted">{label}</span>
      {children}
    </div>
  );
}

function Segmented({ options, value, onChange }: {
  options: { id: CoverMode; label: string }[];
  value: CoverMode;
  onChange: (v: CoverMode) => void;
}) {
  return (
    <div className="inline-flex h-10 items-center rounded-lg border border-border bg-surface-2 p-1">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`h-full rounded-md px-3.5 text-xs font-bold transition-colors ${
              on ? "bg-accent text-accent-ink shadow-sm" : "text-text-2 hover:text-text"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ step, house, value, onGo }: { step: number; house: string; value: number; onGo: (s: 1 | 2 | 3) => void }) {
  const steps = [
    { n: 1, label: "Casa", done: !!house },
    { n: 2, label: "Valor", done: value > 0 && step > 2 },
    { n: 3, label: "Extrações", done: false },
  ];
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <button
            onClick={() => { if (s.n < step) onGo(s.n as 1 | 2 | 3); }}
            disabled={s.n > step}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              s.n === step ? "bg-accent/15 text-accent" : s.n < step ? "text-text-2 hover:text-text" : "text-muted"
            }`}
          >
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
              s.n <= step ? "bg-accent text-accent-ink" : "border border-border text-muted"
            }`}>{s.n}</span>
            {s.label}
          </button>
          {i < steps.length - 1 && <span className="h-px w-6 bg-border sm:w-10" />}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center">
      <p className="mono-label text-muted">{label}</p>
      <p className={`text-lg font-black tabular-nums ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center text-sm text-muted">{children}</div>;
}

const initials = (s: string) => s.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();

function TeamLogo({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[9px] font-bold text-muted">
      {initials(name)}
    </span>
  );
}

function HouseLogo({ src, name }: { src: string | null; name: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-surface-3 object-contain p-0.5" />;
  }
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-3 text-sm font-bold text-muted">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Card({ o, showHouse, logoFor }: { o: Opportunity; showHouse: boolean; logoFor: (src: string) => string | null }) {
  const legs = [...o.legs].sort((a, b) => OUT_ORDER[a.outcome] - OUT_ORDER[b.outcome]);
  const good = o.extractionPct >= 70;
  // Duplo verde: as duas pontas cobertas com pagamento antecipado.
  const pontaCovers = o.legs.filter((l) => l.role === "cobertura" && l.outcome !== "draw");
  const duplo = pontaCovers.length === 2 && pontaCovers.every((l) => l.variant.startsWith("PA"));
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="mono-label text-muted">Investir</span>
        <span className="text-sm font-bold tabular-nums">{brl(o.investment)}</span>
        {duplo && (
          <span className="mono-label rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent">⚡ duplo</span>
        )}
        <span className="ml-auto mono-label text-muted">{whenLabel(o.startsAt)}</span>
      </div>

      <div className="space-y-2 px-4 py-2.5">
        {/* Liga em cima, destacada */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1">
            {o.leagueLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.leagueLogo} alt="" className="h-4 w-4 shrink-0 object-contain" />
            )}
            <span className="text-[11px] font-bold uppercase tracking-wide text-text">{o.league}</span>
          </span>
          {showHouse && <span className="mono-label text-accent">freebet {pretty(o.freebetHouse)}</span>}
        </div>
        {/* Times lado a lado */}
        <div className="flex items-center gap-2 text-sm font-bold">
          <TeamLogo src={o.homeLogo} name={o.home} />
          <span className="min-w-0 truncate">{o.home}</span>
          <span className="shrink-0 font-normal text-muted">×</span>
          <TeamLogo src={o.awayLogo} name={o.away} />
          <span className="min-w-0 truncate">{o.away}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-3 pb-2">
        {legs.map((l, i) => {
          const fb = l.role === "freebet";
          return (
            <div key={i}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                fb ? "border-accent/40 bg-accent/[0.08]" : "border-border bg-surface-2"
              }`}>
              <HouseLogo src={logoFor(l.bookmaker)} name={l.bookmaker} />
              <div className="min-w-0">
                <p className="mono-label text-muted">{OUT_LABEL[l.outcome]}</p>
                <p className="truncate font-semibold">
                  {pretty(l.bookmaker)}
                  <Variant v={l.variant} fb={fb} />
                </p>
              </div>
              <span className="ml-auto font-bold tabular-nums">{l.odd.toFixed(2)}</span>
              <span className={`w-24 text-right font-semibold tabular-nums ${fb ? "text-accent" : ""}`}>{brl(l.stake)}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="text-sm">
          <span className="mono-label text-muted">Conversão </span>
          <b className={good ? "text-positive" : "text-accent"}>{o.extractionPct.toFixed(1)}%</b>
        </span>
        <span className="text-sm">
          <span className="mono-label text-muted">Lucro </span>
          <b className="text-positive tabular-nums">{brl(o.profit)}</b>
        </span>
      </div>
    </article>
  );
}

function Variant({ v, fb }: { v: string; fb: boolean }) {
  const isPA = v.startsWith("PA");
  return (
    <>
      <span className={`mono-label ml-1.5 rounded px-1 py-0.5 text-[8px] align-middle ${isPA ? "bg-warning/15 text-warning" : "bg-surface-3 text-muted"}`}>
        {v}
      </span>
      {fb && <span className="mono-label ml-1 rounded bg-accent/20 px-1 py-0.5 text-[8px] text-accent align-middle">freebet</span>}
    </>
  );
}
