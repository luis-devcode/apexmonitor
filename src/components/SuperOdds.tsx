"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveData, type LiveHealth } from "@/hooks/useLiveData";

type Selection = { marketName?: string; selectionName?: string };
type Item = {
  home_team?: string;
  away_team?: string;
  home_team_logo?: string;
  away_team_logo?: string;
  league_name?: string;
  event_url?: string;
  description?: Selection[];
  full_description?: string;
  price?: number;
  original_price?: number | null;
  boost_pct?: number | null;
  match_date?: string;
  source: string;
  sport?: string;
};
type ApiData = { updatedAt: string | null; health: LiveHealth; items: Item[] };
type Clone = { name: string; logoUrl?: string | null };

const pretty = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const initials = (s: string) => s.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();

function whenLabel(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function SuperOdds() {
  const { data, loading } = useLiveData<ApiData>("/api/markets?mode=super-odds");
  const [houseLogos, setHouseLogos] = useState<Map<string, string>>(new Map());

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"boost" | "odd">("boost");
  const [onlyBoost, setOnlyBoost] = useState(false);
  const [houses, setHouses] = useState<Set<string>>(new Set());

  // logos das casas (do diretório de clones)
  useEffect(() => {
    fetch("/api/clones")
      .then((r) => r.json())
      .then((d: { houses: Clone[] }) => {
        const m = new Map<string, string>();
        for (const c of d.houses ?? []) if (c.logoUrl) {
          m.set(norm(c.name), c.logoUrl);
          m.set(norm(c.name).replace(/(bet|br)$/, ""), c.logoUrl);
        }
        setHouseLogos(m);
      })
      .catch(() => {});
  }, []);

  const items = useMemo(() => data?.items ?? [], [data]);
  const allHouses = useMemo(() => [...new Set(items.map((i) => i.source))].sort(), [items]);
  const houseLogo = (src: string) => houseLogos.get(norm(src)) ?? houseLogos.get(norm(src).replace(/(bet|br)$/, "")) ?? null;

  const stats = useMemo(() => {
    const turbinadas = items.filter((i) => i.boost_pct);
    return {
      total: items.length,
      turbinadas: turbinadas.length,
      melhor: Math.max(0, ...turbinadas.map((i) => i.boost_pct ?? 0)),
    };
  }, [items]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((i) => {
        if (onlyBoost && !i.boost_pct) return false;
        if (houses.size > 0 && !houses.has(i.source)) return false;
        if (term) {
          const text = `${i.home_team ?? ""} ${i.away_team ?? ""} ${i.league_name ?? ""} ${i.full_description ?? ""}`.toLowerCase();
          if (!text.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        sort === "boost" ? (b.boost_pct ?? 0) - (a.boost_pct ?? 0) : (b.price ?? 0) - (a.price ?? 0),
      );
  }, [items, search, sort, onlyBoost, houses]);

  const toggleHouse = (h: string) =>
    setHouses((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });

  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-5 py-6 md:px-7">
        {/* Banner */}
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/[0.08] to-transparent p-5">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-2xl">🔥</span>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Super Odds</h1>
            <p className="text-sm text-text-2">Odds turbinadas e mercados especiais · {allHouses.length} casas</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Stat label="Oportunidades" value={String(stats.total)} />
            <Stat label="Turbinadas" value={String(stats.turbinadas)} />
            <Stat label="Melhor boost" value={stats.melhor ? `+${stats.melhor.toFixed(0)}%` : "—"} accent />
          </div>
        </section>

        {/* Filtros */}
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar time, liga ou mercado…"
              className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent">
              <option value="boost">Maior boost</option>
              <option value="odd">Maior odd</option>
            </select>
            <button
              onClick={() => setOnlyBoost((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                onlyBoost ? "border-accent bg-accent/10 text-accent" : "border-border text-text-2 hover:text-text"
              }`}>
              <span className={`h-3.5 w-6 rounded-full transition-colors ${onlyBoost ? "bg-accent" : "bg-border-strong"} relative`}>
                <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-bg transition-all ${onlyBoost ? "left-3" : "left-0.5"}`} />
              </span>
              Só turbinadas
            </button>
          </div>
          {allHouses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-label mr-1 text-muted">Casas</span>
              {allHouses.map((h) => {
                const on = houses.has(h);
                const logo = houseLogo(h);
                return (
                  <button key={h} onClick={() => toggleHouse(h)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      on ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface-2 text-text-2 hover:text-text"
                    }`}>
                    {logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="h-4 w-4 rounded object-contain" />
                    )}
                    {pretty(h)}
                  </button>
                );
              })}
              {houses.size > 0 && (
                <button onClick={() => setHouses(new Set())} className="text-xs text-muted hover:text-text">limpar</button>
              )}
            </div>
          )}
        </section>

        {/* Cards */}
        <p className="text-sm text-text-2">
          <b className="text-text">{shown.length}</b> super odds
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" /> ao vivo
          </span>
        </p>

        {loading && items.length === 0 ? (
          <Empty>Carregando super odds…</Empty>
        ) : shown.length === 0 ? (
          <Empty>Nenhuma super odd com esses filtros agora.</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((it, i) => <Card key={`${it.source}-${it.event_url}-${i}`} it={it} logo={houseLogo(it.source)} />)}
          </div>
        )}
      </div>
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
  return <div className="rounded-2xl border border-border bg-surface px-6 py-20 text-center text-sm text-muted">{children}</div>;
}

function TeamLogo({ src, name }: { src?: string; name?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[9px] font-bold text-muted">
      {name ? initials(name) : "?"}
    </span>
  );
}

function Card({ it, logo }: { it: Item; logo: string | null }) {
  const boosted = !!it.boost_pct && !!it.original_price;
  const selections = it.description?.length
    ? it.description
    : it.full_description
      ? [{ selectionName: it.full_description }]
      : [];
  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl border bg-surface transition-colors ${boosted ? "border-accent/40 shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_10px_32px_rgba(0,8,24,0.42)]" : "border-border"}`}>
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <TeamLogo src={it.home_team_logo} name={it.home_team} />
            <span className="truncate text-sm font-bold">{it.home_team ?? "Mercado especial"}</span>
          </div>
          {it.away_team && (
            <div className="flex items-center gap-2">
              <TeamLogo src={it.away_team_logo} name={it.away_team} />
              <span className="truncate text-sm font-bold">{it.away_team}</span>
            </div>
          )}
          <p className="mono-label text-muted">{it.league_name}{it.match_date ? ` · ${whenLabel(it.match_date)}` : ""}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-5 w-5 rounded object-contain" />
          )}
          <span className="mono-label text-text-2">{pretty(it.source)}</span>
        </span>
      </div>

      <div className="flex-1 space-y-1.5 px-4 py-3">
        {selections.map((s, i) => (
          <p key={i} className="flex gap-1.5 text-sm">
            <span className="text-accent">+</span>
            <span className="text-text-2">
              {s.marketName ? <>{s.marketName}: </> : null}
              <b className="text-text">{s.selectionName}</b>
            </span>
          </p>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-border px-4 py-3">
        <div className="flex items-baseline gap-2">
          {boosted && <span className="text-sm text-muted line-through tabular-nums">{it.original_price!.toFixed(2)}</span>}
          <span className="text-2xl font-black tabular-nums text-accent">{it.price?.toFixed(2) ?? "—"}</span>
          {it.boost_pct ? (
            <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-xs font-black text-accent">+{it.boost_pct.toFixed(0)}%</span>
          ) : null}
        </div>
        {it.event_url && (
          <a href={it.event_url} target="_blank" rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-bold text-accent-ink hover:bg-accent-hover">
            Apostar
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
          </a>
        )}
      </div>
    </article>
  );
}
