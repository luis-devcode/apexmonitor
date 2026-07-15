"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveData, type LiveHealth } from "@/hooks/useLiveData";
import MatchDetail from "@/components/MatchDetail";

type Leg = {
  outcome: string;
  label: string;
  bookmaker: string;
  variant: string;
  odd: number;
  stake?: number;
};

type Item = {
  id: string;
  sport: string;
  league: string;
  home: string;
  away: string;
  startsAt?: string;
  status?: string;
  roi: number;
  oddsCount: number;
  housesCount: number;
  kind?: "1x2" | "dc";
  legs: Leg[];
  investment?: number;
  profit?: number;
  earlySides?: number;
  score?: number;
  level?: string;
  reasons?: string[];
  homeLogo?: string | null;
  awayLogo?: string | null;
  leagueLogo?: string | null;
};

type SuperItem = {
  home_team?: string;
  away_team?: string;
  event_url?: string;
  full_description?: string;
  price?: number;
  original_price?: number | null;
  boost_pct?: number | null;
  selection_id?: string;
  match_date?: string;
  source: string;
  sport: string;
  tab: string;
};

type ApiData<T> = {
  updatedAt: string | null;
  health: LiveHealth;
  items: T[];
};

type Mode = "monitor-football" | "monitor-basketball" | "surebets" | "double-green" | "super-odds";

const MODE_COPY: Record<Mode, {
  title: string;
  subtitle: string;
  eyebrow: string;
  description: string;
  itemLabel: [string, string];
  metrics: [string, string, string, string];
}> = {
  "monitor-football": {
    title: "Monitor Futebol",
    subtitle: "Melhores odds 1X2 de todas as casas, ordenadas por ROI.",
    eyebrow: "Odds Intelligence",
    description: "Compare as melhores cotações do mercado e encontre as partidas com maior retorno potencial em poucos segundos.",
    itemLabel: ["partida", "partidas"],
    metrics: ["Partidas", "Cotações", "Casas", "Melhor ROI"],
  },
  "monitor-basketball": {
    title: "Monitor Basquete",
    subtitle: "Partidas e melhores linhas do mercado de basquete.",
    eyebrow: "Basketball Intelligence",
    description: "Acompanhe jogos, linhas e cotações de basquete em uma visão direta para identificar as melhores oportunidades.",
    itemLabel: ["partida", "partidas"],
    metrics: ["Partidas", "Cotações", "Casas", "Melhor ROI"],
  },
  surebets: {
    title: "Surebets",
    subtitle: "Arbitragens 1X2 e travas de resultado simples contra dupla chance.",
    eyebrow: "Arbitrage Intelligence",
    description: "Encontre arbitragens entre casas, compare as entradas e priorize as oportunidades com maior retorno calculado.",
    itemLabel: ["oportunidade", "oportunidades"],
    metrics: ["Oportunidades", "Cotações", "Casas", "Melhor ROI"],
  },
  "double-green": {
    title: "Duplo Green",
    subtitle: "PA nas pontas 1 e 2, com a melhor odd disponível no empate.",
    eyebrow: "Double Green Intelligence",
    description: "Visualize operações com proteção nas pontas e compare rapidamente o equilíbrio, as casas e o resultado projetado.",
    itemLabel: ["oportunidade", "oportunidades"],
    metrics: ["Oportunidades", "Cotações", "Casas", "Melhor resultado"],
  },
  "super-odds": {
    title: "Super Odds",
    subtitle: "Odds turbinadas e mercados especiais das casas monitoradas.",
    eyebrow: "Boost Intelligence",
    description: "Compare odds turbinadas e mercados especiais disponíveis nas casas monitoradas.",
    itemLabel: ["oferta", "ofertas"],
    metrics: ["Ofertas", "Mercados", "Casas", "Melhor boost"],
  },
};

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pretty = (value: string) => value.replace(/\b\w/g, (character) => character.toUpperCase());
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const initials = (s: string) => s.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
const OUTCOME_LABEL: Record<string, string> = { home: "Casa", draw: "Empate", away: "Fora" };
const OUT_ORDER: Record<string, number> = { home: 0, draw: 1, away: 2 };

function dateLabel(value?: string) {
  if (!value) return "Horário indisponível";
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Status({ health }: { health?: LiveHealth }) {
  const live = health?.live;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
      live ? "border-positive/25 bg-positive/10 text-positive" : "border-warning/25 bg-warning/10 text-warning"
    }`}>
      <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-positive" : "bg-warning"}`} />
      {live ? "Ao vivo" : "Aguardando atualização"}
    </span>
  );
}

export default function OddsWorkspace({ mode }: { mode: Mode }) {
  const copy = MODE_COPY[mode];
  const [selected, setSelected] = useState<{ id: string; home: string; away: string } | null>(null);
  const [search, setSearch] = useState("");
  // Sempre começa mostrando todas as oportunidades. O usuário reduz o período
  // somente quando quiser; atualizações do feed preservam a escolha atual.
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState<"roi" | "time" | "houses">("roi");
  const [onlyPositive, setOnlyPositive] = useState(false);
  const [view, setView] = useState<"cards" | "compact">("cards");
  const { data, loading, error, refresh } = useLiveData<ApiData<Item | SuperItem>>(`/api/markets?mode=${mode}`);

  // Logos das casas (diretório de clones) — mesma fonte do Super Odds / Freebet.
  const [houseLogos, setHouseLogos] = useState<Map<string, string>>(new Map());
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

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    const horizon = period === "1d" ? 86_400_000 : period === "2d" ? 172_800_000 : period === "7d" ? 604_800_000 : Infinity;
    const referenceTime = data?.updatedAt ? Date.parse(data.updatedAt) : 0;
    return (data?.items || []).filter((raw) => {
      const item = raw as Item & SuperItem;
      const text = `${item.home || item.home_team || ""} ${item.away || item.away_team || ""} ${item.league || ""} ${item.full_description || ""}`.toLowerCase();
      const startsAt = item.startsAt || item.match_date;
      const within = !startsAt || referenceTime === 0 || Date.parse(startsAt) - referenceTime <= horizon;
      return (!term || text.includes(term)) && within;
    });
  }, [data, period, search]);

  const topValue = mode === "super-odds"
      ? Math.max(0, ...items.map((item) => (item as SuperItem).boost_pct || 0))
      : items.length ? Math.max(...items.map((item) => (item as Item).roi || 0)) : 0;

  const opportunityItems = useMemo(() => {
    if (mode === "super-odds") return [];
    const filtered = (items as Item[]).filter((item) => !onlyPositive || item.roi > 0);
    return [...filtered].sort((a, b) => {
      if (sort === "time") return Date.parse(a.startsAt || "9999-12-31") - Date.parse(b.startsAt || "9999-12-31");
      if (sort === "houses") return b.housesCount - a.housesCount || b.roi - a.roi;
      return b.roi - a.roi;
    });
  }, [items, mode, onlyPositive, sort]);

  const opportunityStats = useMemo(() => {
    const all = mode !== "super-odds" ? (items as Item[]) : [];
    return {
      matches: all.length,
      odds: all.reduce((total, item) => total + item.oddsCount, 0),
      houses: Math.max(0, ...all.map((item) => item.housesCount)),
      bestRoi: all.length ? Math.max(...all.map((item) => item.roi)) : 0,
    };
  }, [items, mode]);

  if (selected) return <MatchDetail match={selected} onBack={() => setSelected(null)} />;

  if (mode !== "super-odds") {
    const updatedLabel = data?.updatedAt
      ? new Date(data.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "--:--";

    return (
      <div className="min-h-dvh">
        <div className="mx-auto w-full max-w-[1540px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <section className="relative overflow-hidden rounded-3xl border border-accent/20 bg-[linear-gradient(135deg,rgba(14,28,54,0.96),rgba(6,12,24,0.98)_58%,rgba(8,18,35,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7">
            <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

            <div className="relative flex flex-col gap-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <WorkspaceIcon mode={mode} />
                  </span>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-accent">{copy.eyebrow}</p>
                </div>
                <h1 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl">{copy.title}</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-2">{copy.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                  <span><b className="text-text">{opportunityStats.matches}</b> {opportunityStats.matches === 1 ? copy.itemLabel[0] : copy.itemLabel[1]} monitoradas</span>
                  <span className="hidden h-3 w-px bg-border sm:block" />
                  <span className="inline-flex items-center gap-2" aria-label="Status da atualização das odds">
                    <span className={`h-1.5 w-1.5 rounded-full ${data?.health?.live ? "animate-pulse bg-positive shadow-[0_0_8px_var(--positive)]" : "bg-warning"}`} />
                    Atualizado às {updatedLabel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:min-w-[620px]">
                <MonitorMetric label={copy.metrics[0]} value={String(opportunityStats.matches)} />
                <MonitorMetric label={copy.metrics[1]} value={opportunityStats.odds.toLocaleString("pt-BR")} />
                <MonitorMetric label={copy.metrics[2]} value={String(opportunityStats.houses)} />
                <MonitorMetric label={copy.metrics[3]} value={`${opportunityStats.bestRoi >= 0 ? "+" : ""}${opportunityStats.bestRoi.toFixed(2)}%`} positive={opportunityStats.bestRoi >= 0} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface/90 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.16)] sm:p-4">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
              <label className="relative min-w-0 flex-1 2xl:max-w-md">
                <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted"><SearchIcon /></span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar time, liga ou mercado..." className="h-11 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <label className="relative">
                  <span className="sr-only">Período</span>
                  <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-border bg-surface-2 px-3 pr-9 text-xs font-bold outline-none transition focus:border-accent sm:w-auto">
                    <option value="all">Todos os jogos</option>
                    <option value="1d">Próximas 24h</option>
                    <option value="2d">Próximos 2 dias</option>
                    <option value="7d">Próximos 7 dias</option>
                  </select>
                  <ChevronIcon />
                </label>

                <label className="relative">
                  <span className="sr-only">Ordenar</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value as "roi" | "time" | "houses")} className="h-11 w-full appearance-none rounded-xl border border-border bg-surface-2 px-3 pr-9 text-xs font-bold outline-none transition focus:border-accent sm:w-auto">
                    <option value="roi">Maior ROI</option>
                    <option value="time">Horário mais próximo</option>
                    <option value="houses">Mais casas</option>
                  </select>
                  <ChevronIcon />
                </label>

                <button type="button" aria-pressed={onlyPositive} onClick={() => setOnlyPositive((current) => !current)} className={`col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition sm:col-span-1 ${onlyPositive ? "border-positive/35 bg-positive/10 text-positive" : "border-border bg-surface-2 text-text-2 hover:border-border-strong hover:text-text"}`}>
                  <span className={`h-2 w-2 rounded-full ${onlyPositive ? "bg-positive shadow-[0_0_7px_var(--positive)]" : "bg-muted/50"}`} />
                  Somente ROI positivo
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-3 2xl:ml-auto 2xl:border-l 2xl:border-t-0 2xl:pl-3 2xl:pt-0">
                <div className="flex rounded-xl border border-border bg-surface-2 p-1">
                  <ViewButton active={view === "cards"} label="Cards" onClick={() => setView("cards")} icon="grid" />
                  <ViewButton active={view === "compact"} label="Compacto" onClick={() => setView("compact")} icon="list" />
                </div>
                <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Atualizar odds" className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2 text-text-2 transition hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-50">
                  <RefreshIcon spinning={loading} />
                </button>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-sm text-muted"><b className="text-text">{opportunityItems.length}</b> {opportunityItems.length === 1 ? `${copy.itemLabel[0]} encontrada` : `${copy.itemLabel[1]} encontradas`}</p>
            {(search || period !== "all" || onlyPositive) && <button type="button" onClick={() => { setSearch(""); setPeriod("all"); setOnlyPositive(false); }} className="text-xs font-bold text-accent hover:text-accent-hover">Limpar filtros</button>}
          </div>

          {error && <div className="rounded-xl border border-negative/30 bg-negative/10 p-4 text-sm text-negative">Não foi possível atualizar as odds agora. Tente novamente em instantes.</div>}
          {loading ? (
            <MonitorLoading />
          ) : opportunityItems.length === 0 ? (
            <Empty>Nenhuma {copy.itemLabel[0]} encontrada com os filtros selecionados.</Empty>
          ) : view === "cards" ? (
            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">{opportunityItems.map((item, index) => <OddsCard key={`${item.id}-${item.kind}-${index}`} item={item} mode={mode} logoFor={houseLogo} onOpen={() => setSelected({ id: item.id, home: item.home, away: item.away })} />)}</div>
          ) : (
            <div className="space-y-2.5">{opportunityItems.map((item, index) => <OddsCompactRow key={`${item.id}-${item.kind}-${index}`} item={item} logoFor={houseLogo} onOpen={() => setSelected({ id: item.id, home: item.home, away: item.away })} />)}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/85 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">{copy.title}</h1>
          <p className="hidden text-xs text-muted sm:block">{copy.subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Status health={data?.health} />
          <button onClick={() => void refresh()} className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-ink shadow-[0_4px_16px_rgba(59,130,246,0.28)] transition-colors hover:bg-accent-hover">
            Atualizar
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-5 py-6 md:px-7">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Oportunidades" value={String(items.length)} featured />
          <Metric
            label="Melhor boost"
            value={`${topValue.toFixed(2)}%`}
            tone="positive"
          />
          <Metric label="Atualização" value={data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString("pt-BR") : "—"} />
          <Metric label="Estado" value={data?.health?.live ? "Tempo real" : "Sem coleta"} />
        </section>

        <section className="flex flex-wrap gap-3 rounded-2xl border border-border bg-surface p-4">
          <Field label="Buscar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Time, liga ou mercado..." className="w-64 max-w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent" />
          </Field>
        </section>

        {error && <div className="rounded-xl border border-negative/30 bg-negative/10 p-4 text-sm text-negative">{error}</div>}
        {loading ? (
          <Empty>Conectando ao feed…</Empty>
        ) : items.length === 0 ? (
          <Empty>Nenhuma oportunidade encontrada com os filtros atuais.</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item, index) => <SuperCard key={`${(item as SuperItem).source}-${(item as SuperItem).selection_id}-${index}`} item={item as SuperItem} />)}</div>
        )}
      </div>
    </div>
  );
}

function WorkspaceIcon({ mode }: { mode: Mode }) {
  if (mode === "monitor-basketball") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" /><path d="M4 10.5c4.2.2 7.5-2 9.1-6.8M20 13.5c-4.2-.2-7.5 2-9.1 6.8M8.2 4.5c4.2 3.7 6.8 8.8 7.6 15M4.6 15.8c3.7-3.4 8.8-5.9 14.8-7.6" strokeLinecap="round" /></svg>;
  }
  if (mode === "surebets") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
  }
  if (mode === "double-green") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v18M12 7 7 4 3 7v8l4 3 5-3M12 7l5-3 4 3v8l-4 3-5-3" strokeLinecap="round" strokeLinejoin="round" /><path d="m5.5 11 1.2 1.2L9 9.8M15 11.2l1.4 1.4 2.4-2.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  return <MonitorIcon />;
}

function MonitorIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 18V8m5 10V5m5 13v-7m5 7V3" strokeLinecap="round" /><path d="M3 21h18" strokeLinecap="round" /></svg>;
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" strokeLinecap="round" /></svg>;
}

function ChevronIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 9 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11a8 8 0 1 0-2.3 5.7" strokeLinecap="round" /><path d="M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MonitorMetric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/15 px-3 py-3 backdrop-blur-sm sm:px-4">
      <p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-1.5 text-lg font-black tabular-nums sm:text-xl ${positive ? "text-positive" : "text-text"}`}>{value}</p>
    </div>
  );
}

function ViewButton({ active, label, onClick, icon }: { active: boolean; label: string; onClick: () => void; icon: "grid" | "list" }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition ${active ? "bg-accent text-accent-ink shadow-[0_5px_14px_rgba(59,130,246,0.22)]" : "text-muted hover:text-text"}`}>
      {icon === "grid"
        ? <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
        : <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" /></svg>}
      <span className={label === "Compacto" ? "hidden sm:inline" : ""}>{label}</span>
    </button>
  );
}

function MonitorLoading() {
  return (
    <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3" aria-label="Carregando partidas">
      {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl border border-border bg-surface"><div className="h-24 border-b border-border bg-surface-2/30" /><div className="m-4 h-24 rounded-xl bg-surface-2" /></div>)}
    </div>
  );
}

function OddsCompactRow({ item, logoFor, onOpen }: { item: Item; logoFor: (src: string) => string | null; onOpen: () => void }) {
  const positive = item.roi >= 0;
  const legs = [...item.legs].sort((a, b) => (OUT_ORDER[a.outcome] ?? 9) - (OUT_ORDER[b.outcome] ?? 9));
  return (
    <button type="button" onClick={onOpen} className="group flex w-full flex-col gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-accent/40 hover:bg-surface-2/40 lg:flex-row lg:items-center">
      <div className="min-w-0 lg:w-[310px] lg:shrink-0">
        <div className="flex items-center gap-2">
          {item.leagueLogo && <img src={item.leagueLogo} alt="" className="h-4 w-4 shrink-0 object-contain" />}
          <span className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-muted">{item.league}</span>
          <span className="ml-auto shrink-0 text-[10px] text-muted lg:hidden">{dateLabel(item.startsAt)}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm font-bold"><TeamLogo src={item.homeLogo} name={item.home} /><span className="truncate">{item.home}</span></span>
          <span className="flex min-w-0 items-center gap-2 text-sm font-bold"><TeamLogo src={item.awayLogo} name={item.away} /><span className="truncate">{item.away}</span></span>
        </div>
      </div>

      <div className={`grid min-w-0 flex-1 gap-2 ${legs.length >= 3 ? "grid-cols-3" : legs.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {legs.map((leg, index) => {
          const logo = logoFor(leg.bookmaker);
          return (
            <span key={`${leg.outcome}-${index}`} className="min-w-0 rounded-xl border border-border bg-surface-2/70 px-3 py-2">
              <span className="flex items-center justify-between gap-2"><span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-muted">{OUTCOME_LABEL[leg.outcome] ?? leg.label}</span><b className="text-base tabular-nums">{leg.odd.toFixed(2)}</b></span>
              <span className="mt-1 flex min-w-0 items-center gap-1.5">{logo && <img src={logo} alt="" className="h-3.5 w-3.5 shrink-0 rounded object-contain" />}<span className="truncate text-[10px] text-text-2">{pretty(leg.bookmaker)}</span></span>
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-4 border-t border-border pt-3 lg:w-[225px] lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        <span className="hidden text-[11px] text-muted lg:block">{dateLabel(item.startsAt)}</span>
        <span className="ml-auto text-right">
          <span className={`block text-lg font-black tabular-nums ${positive ? "text-positive" : "text-negative"}`}>{positive ? "+" : ""}{item.roi.toFixed(2)}%</span>
          <span className="block text-[9px] text-muted">{item.oddsCount} odds · {item.housesCount} casas</span>
        </span>
        <span className="text-accent transition-transform group-hover:translate-x-0.5">→</span>
      </div>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1"><span className="mono-label block text-muted">{label}</span>{children}</label>;
}

function Metric({ label, value, tone = "default", featured = false }: { label: string; value: string; tone?: "default" | "positive" | "negative"; featured?: boolean }) {
  if (featured) {
    return <div className="card-featured rounded-xl border p-4"><p className="mono-label">{label}</p><p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p></div>;
  }
  const color = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "";
  return <div className="rounded-xl border border-border bg-surface p-4"><p className="mono-label text-muted">{label}</p><p className={`mt-1 text-xl font-extrabold tabular-nums ${color}`}>{value}</p></div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface px-6 py-20 text-center text-sm text-muted">{children}</div>;
}

function TeamLogo({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return <img src={src} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[9px] font-bold text-muted">
      {initials(name)}
    </span>
  );
}

function OutcomeBox({ leg, logo }: { leg: Leg; logo: string | null }) {
  const isPA = leg.variant.startsWith("PA");
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-surface-2/50 px-2 py-2.5 text-center transition-colors group-hover:border-border-strong">
      <span className="mono-label text-muted">{OUTCOME_LABEL[leg.outcome] ?? leg.label}</span>
      <span className="mt-1.5 text-xl font-black leading-none tabular-nums">{leg.odd.toFixed(2)}</span>
      <div className="mt-2 flex max-w-full items-center gap-1">
        {logo && (
          <img src={logo} alt="" className="h-4 w-4 shrink-0 rounded bg-surface-3 object-contain" />
        )}
        <span className="truncate text-[11px] font-medium text-text-2">{pretty(leg.bookmaker)}</span>
        <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold ${isPA ? "bg-warning/15 text-warning" : "bg-surface-3 text-muted"}`}>{leg.variant}</span>
      </div>
      {leg.stake ? <span className="mt-1 text-[10px] font-bold tabular-nums text-accent">{brl(leg.stake)}</span> : null}
    </div>
  );
}

function OddsCard({ item, mode, logoFor, onOpen }: { item: Item; mode: Mode; logoFor: (src: string) => string | null; onOpen?: () => void }) {
  const positive = item.roi >= 0;
  const tone = positive ? "border border-positive/20 bg-positive/10 text-positive" : "border border-negative/20 bg-negative/10 text-negative";
  const legs = [...item.legs].sort((a, b) => (OUT_ORDER[a.outcome] ?? 9) - (OUT_ORDER[b.outcome] ?? 9));
  const cols = legs.length >= 3 ? "grid-cols-3" : legs.length === 2 ? "grid-cols-2" : "grid-cols-1";
  return (
    <article onClick={onOpen} className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent/40">
      <div className="space-y-2.5 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1">
            {item.leagueLogo && (
              <img src={item.leagueLogo} alt="" className="h-4 w-4 shrink-0 object-contain" />
            )}
            <span className="truncate text-[11px] font-bold uppercase tracking-wide text-text">{item.league}</span>
          </span>
          {item.kind === "dc" && <span className="rounded bg-info/10 px-2 py-0.5 text-[10px] font-bold text-info">DC</span>}
          <span className="ml-auto shrink-0 text-xs text-muted">{dateLabel(item.startsAt)}</span>
          {mode === "double-green" ? (
            <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${tone}`}>{positive ? "Lucro" : "Perda"} {item.roi > 0 ? "+" : ""}{item.roi.toFixed(2)}%</span>
          ) : (
            <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${tone}`}>{item.roi >= 0 ? "+" : ""}{item.roi.toFixed(2)}%</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm font-bold">
            <TeamLogo src={item.homeLogo} name={item.home} />
            <span className="min-w-0 truncate">{item.home}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <TeamLogo src={item.awayLogo} name={item.away} />
            <span className="min-w-0 truncate">{item.away}</span>
          </div>
        </div>
      </div>
      {item.reasons && <div className={`mx-4 mb-1 mt-3 flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl border p-3 text-[11px] ${positive ? "border-positive/15 bg-positive/[0.04]" : "border-negative/15 bg-negative/[0.04]"}`}>{item.reasons.map((reason) => <span key={reason} className="inline-flex items-center gap-1.5 text-text-2"><span className={`h-1.5 w-1.5 rounded-full ${positive ? "bg-positive" : "bg-negative"}`} />{reason}</span>)}</div>}
      <div className={`grid gap-2 p-3 ${cols}`}>
        {legs.map((leg, index) => <OutcomeBox key={`${leg.outcome}-${index}`} leg={leg} logo={logoFor(leg.bookmaker)} />)}
      </div>
      <div className="flex items-center border-t border-border px-4 py-2.5 text-xs text-muted">
        {item.investment ? <><span>Investir <b className="text-text">{brl(item.investment)}</b></span><span className="ml-auto">L/P <b className={item.profit && item.profit >= 0 ? "text-positive" : "text-negative"}>{brl(item.profit || 0)}</b></span></> : <><span><b className="text-text-2">{item.oddsCount}</b> odds</span><span className="ml-auto"><b className="text-text-2">{item.housesCount}</b> casas</span><span className="ml-3 text-muted transition-colors group-hover:text-accent">→</span></>}
      </div>
    </article>
  );
}

function SuperCard({ item }: { item: SuperItem }) {
  const boosted = item.original_price && item.price && item.price > item.original_price;
  const base = boosted ? item.original_price : item.price;
  const boostedPrice = boosted ? item.price : null;
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2"><span className="mono-label text-accent">{pretty(item.source)}</span>{item.boost_pct ? <span className="ml-auto rounded bg-positive/10 px-2 py-1 text-xs font-black text-positive">+{item.boost_pct.toFixed(0)}%</span> : null}</div>
      <p className="mt-3 text-sm font-bold">{item.home_team || "Mercado especial"}{item.away_team ? <><span className="text-muted"> vs </span>{item.away_team}</> : null}</p>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-text-2">{item.full_description || item.tab}</p>
      <div className="mt-4 flex items-end gap-2"><span className={boostedPrice ? "text-sm text-muted line-through" : "text-2xl font-black text-accent"}>{base?.toFixed(2) || "—"}</span>{boostedPrice && <span className="text-2xl font-black text-accent">{boostedPrice.toFixed(2)}</span>}<span className="ml-auto text-xs text-muted">{dateLabel(item.match_date)}</span></div>
    </article>
  );
}
