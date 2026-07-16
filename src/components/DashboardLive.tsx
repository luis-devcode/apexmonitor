"use client";

/* Os escudos vêm de origens variadas do feed e mantêm fallback local por time. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useLiveData, type LiveHealth } from "@/hooks/useLiveData";

type Highlight = {
  id: string;
  home: string;
  away: string;
  league: string;
  startsAt?: string;
  roi: number;
  kind?: string;
  homeLogo: string | null;
  awayLogo: string | null;
  leagueLogo: string | null;
};

type DashboardData = {
  updatedAt: string | null;
  health: LiveHealth;
  stats: {
    matches: number;
    football: number;
    basketball: number;
    surebets: number;
    bookmakers: number;
    bestRoi: number;
    superOdds: number;
    footballSurebets: number;
    basketballSurebets: number;
    footballOddsPerMatch: number;
    basketballOddsPerMatch: number;
  };
  highlights: Highlight[];
};

type IconName = "match" | "target" | "house" | "chart" | "football" | "basketball" | "spark" | "wallet" | "ticket";

const iconPaths: Record<IconName, React.ReactNode> = {
  match: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 7h8M8 11h5M8 15h8" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="m15 9 5-5" /></>,
  house: <><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M9 21v-7h6v7" /></>,
  chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
  football: <><circle cx="12" cy="12" r="9" /><path d="m9 10 3-2 3 2-1 4h-4l-1-4ZM5 9l4 1M15 10l4-1M10 14l-2 5M14 14l2 5" /></>,
  basketball: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9M12 3C9 6 8 9 8 12s1 6 4 9" /></>,
  spark: <><path d="m13 2-2 8H5l6 4-2 8 10-12h-6l0-8Z" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M17 15h.01" /></>,
  ticket: <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

/** O retrato do MERCADO (não da sua banca): odds, surebets e super odds agora. */
export default function DashboardLive() {
  const { data, loading, error } = useLiveData<DashboardData>("/api/markets?mode=dashboard");
  const stats = data?.stats;

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px w-6 bg-accent" />
            <p className="mono-label text-accent">Monitores</p>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Panorama de Odds <FeedStatus health={data?.health} loading={loading} />
          </h1>
          <p className="mt-1.5 text-sm text-text-2">O retrato do mercado agora — odds, arbitragens e boosts, atualizados enquanto o mercado se move.</p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-negative/25 bg-negative/10 px-4 py-3 text-sm text-negative">
          Não foi possível atualizar o painel agora: {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon="target" label="Surebets ativas" value={loading ? null : stats?.surebets || 0} tone="accent" detail="Arbitragens 1X2 agora" featured />
        <StatCard icon="match" label="Partidas monitoradas" value={loading ? null : stats?.matches || 0} tone="positive" detail={`${stats?.football || 0} no futebol`} />
        <StatCard icon="house" label="Casas no radar" value={loading ? null : stats?.bookmakers || 0} tone="info" detail="Comparação simultânea" />
        <StatCard icon="chart" label="Melhor ROI" value={loading ? null : `${(stats?.bestRoi || 0).toFixed(2)}%`} tone="warning" detail="Maior margem agora" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.22fr_.78fr]">
        <SportPanel
          icon="football"
          title="Futebol"
          eyebrow={`${stats?.football || 0} partidas monitoradas`}
          href="/monitor-futebol"
          metrics={[
            ["Partidas", stats?.football || 0],
            ["Surebets", stats?.footballSurebets || 0],
            ["Odds / jogo", (stats?.footballOddsPerMatch || 0).toFixed(0)],
          ]}
        >
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" /><span className="relative h-2 w-2 rounded-full bg-positive" /></span>
              <h3 className="text-sm font-extrabold">Melhores surebets agora</h3>
            </div>
            <Link href="/surebets" className="text-xs font-bold text-muted transition-colors hover:text-accent">Ver todas →</Link>
          </div>
          <div className="mt-2.5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-bg/35">
            {loading ? <HighlightSkeleton /> : data?.highlights.length ? data.highlights.slice(0, 4).map((item) => <SurebetRow key={`${item.id}-${item.kind}`} item={item} />) : <EmptyHighlights />}
          </div>
        </SportPanel>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <SportPanel
            compact
            icon="basketball"
            title="NBA / Basquete"
            eyebrow={`${stats?.basketball || 0} partidas monitoradas`}
            href="/monitor-basquete"
            metrics={[
              ["Partidas", stats?.basketball || 0],
              ["Surebets", stats?.basketballSurebets || 0],
              ["Odds / jogo", (stats?.basketballOddsPerMatch || 0).toFixed(0)],
            ]}
          >
            <div className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border border-dashed border-border-strong bg-bg/25 px-4 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted"><Icon name="basketball" className="h-4 w-4" /></span>
              <p className="text-xs leading-relaxed text-muted">O painel ganha vida automaticamente assim que houver mercados de basquete disponíveis.</p>
            </div>
          </SportPanel>

          <article className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/12 via-surface to-surface p-5">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent"><Icon name="spark" /></span>
              <div className="min-w-0">
                <p className="mono-label text-accent">Mercado turbinado</p>
                <p className="mt-1 text-2xl font-black tabular-nums">{loading ? "—" : stats?.superOdds || 0}</p>
                <p className="mt-1 text-xs text-text-2">Super Odds disponíveis nas casas parceiras.</p>
              </div>
              <Link href="/super-odds" className="ml-auto rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-extrabold text-accent transition hover:bg-accent hover:text-accent-ink">Explorar →</Link>
            </div>
          </article>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div><p className="mono-label text-muted">Atalhos inteligentes</p><h2 className="mt-1 text-base font-extrabold">Continue sua operação</h2></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickAction href="/freebet" icon="ticket" title="Converter Freebet" description="Encontre a menor perda na conversão." />
          <QuickAction href="/banca" icon="wallet" title="Minha Banca" description="Acompanhe saldos e movimentações." />
          <QuickAction href="/super-odds" icon="spark" title="Caçar Super Odds" description="Veja boosts e preços especiais." />
        </div>
      </section>
    </div>
  );
}

/**
 * Sinal operacional propositalmente discreto: verde = normal, âmbar = feed
 * atrasado, azul = primeira carga. Para o cliente, funciona como o ponto da marca.
 */
function FeedStatus({ health, loading }: { health?: LiveHealth; loading: boolean }) {
  const state = loading ? "loading" : health?.live ? "live" : "stale";
  const color = state === "live"
    ? "bg-positive/70 shadow-[0_0_7px_rgba(52,211,153,0.45)]"
    : state === "stale"
      ? "bg-warning/55 shadow-[0_0_6px_rgba(245,158,11,0.28)]"
      : "bg-accent/55";
  return (
    <span aria-hidden="true" data-feed-state={state} className="ml-1 inline-flex h-3 w-3 translate-y-[-1px] items-center justify-center align-middle">
      <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${color}`} />
    </span>
  );
}

function StatCard({ icon, label, value, tone, detail, featured = false }: { icon: IconName; label: string; value: string | number | null; tone: "positive" | "accent" | "info" | "warning"; detail: string; featured?: boolean }) {
  const colors = { positive: "bg-positive/10 text-positive", accent: "bg-accent/10 text-accent", info: "bg-info/10 text-info", warning: "bg-warning/10 text-warning" };
  if (featured) {
    return (
      <article className="card-featured group relative min-h-32 overflow-hidden rounded-2xl border p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2"><p className="mono-label max-w-[12rem]">{label}</p><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/20 text-white"><Icon name={icon} className="h-[18px] w-[18px]" /></span></div>
        {value === null ? <div className="mt-4 h-8 w-20 animate-pulse rounded bg-white/25" /> : <p className="mt-3 text-2xl font-black tabular-nums sm:text-3xl">{value}</p>}
        <p className="mt-1 text-[11px] text-white/75">{detail}</p>
      </article>
    );
  }
  return (
    <article className="group relative min-h-32 overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:p-5">
      <div className="flex items-start justify-between gap-2"><p className="mono-label max-w-[12rem] text-muted">{label}</p><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${colors[tone]}`}><Icon name={icon} className="h-[18px] w-[18px]" /></span></div>
      {value === null ? <div className="mt-4 h-8 w-20 animate-pulse rounded bg-surface-3" /> : <p className="mt-3 text-2xl font-black tabular-nums sm:text-3xl">{value}</p>}
      <p className="mt-1 text-[11px] text-muted">{detail}</p>
    </article>
  );
}

function SportPanel({ icon, title, eyebrow, href, metrics, compact = false, children }: { icon: IconName; title: string; eyebrow: string; href: string; metrics: Array<[string, string | number]>; compact?: boolean; children: React.ReactNode }) {
  return (
    <article className={`rounded-2xl border border-border bg-surface ${compact ? "p-4 sm:p-5" : "p-4 sm:p-5"}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-positive/10 text-positive"><Icon name={icon} /></span>
        <div className="min-w-0"><h2 className="text-base font-extrabold">{title}</h2><p className="mt-0.5 text-xs text-muted">{eyebrow}</p></div>
        <Link href={href} className="ml-auto shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-bold text-text-2 transition hover:border-accent/30 hover:text-accent">Ver monitor →</Link>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface-2 px-3 py-3"><p className="mono-label truncate text-[8px] text-muted">{label}</p><p className={`mt-1.5 text-lg font-black tabular-nums ${label === "Surebets" && Number(value) > 0 ? "text-positive" : ""}`}>{value}</p></div>)}
      </div>
      {children}
    </article>
  );
}

function TeamLogo({ name, src }: { name: string; src: string | null }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-border-strong bg-surface-3 text-[8px] font-black text-text-2">
      {initials || "?"}
      {src && <img src={src} alt={`Escudo ${name}`} className="absolute inset-0 h-full w-full bg-white/5 object-contain p-0.5" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
    </span>
  );
}

function SurebetRow({ item }: { item: Highlight }) {
  return (
    <Link href="/surebets" className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition-colors hover:bg-white/[.035] sm:px-4">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex -space-x-1"><TeamLogo name={item.home} src={item.homeLogo} /><TeamLogo name={item.away} src={item.awayLogo} /></div>
          <p className="min-w-0 truncate text-xs font-semibold sm:text-[13px]"><span>{item.home}</span><span className="mx-1.5 text-muted">vs</span><span>{item.away}</span></p>
        </div>
        <div className="mt-1.5 flex items-center gap-2 pl-1 text-[10px] text-muted"><span className="max-w-[16rem] truncate">{item.league || "Liga não informada"}</span>{item.startsAt && <><span>•</span><span>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.startsAt))}</span></>}</div>
      </div>
      <div className="text-right"><span className="inline-flex rounded-md bg-positive px-2 py-1 font-mono text-[10px] font-black text-[#08160b]">ROI {item.roi.toFixed(2)}%</span><p className="mt-1 text-[9px] font-semibold text-muted transition-colors group-hover:text-text-2">Abrir oportunidade →</p></div>
    </Link>
  );
}

function HighlightSkeleton() {
  return <>{[0, 1, 2].map((item) => <div key={item} className="flex items-center gap-3 px-4 py-3"><div className="h-7 w-12 animate-pulse rounded-full bg-surface-3" /><div className="flex-1"><div className="h-3 w-1/2 animate-pulse rounded bg-surface-3" /><div className="mt-2 h-2 w-1/3 animate-pulse rounded bg-surface-3" /></div><div className="h-6 w-16 animate-pulse rounded bg-surface-3" /></div>)}</>;
}

function EmptyHighlights() {
  return <div className="px-5 py-8 text-center"><p className="text-sm font-semibold text-text-2">Nenhuma surebet positiva neste instante</p><p className="mt-1 text-xs text-muted">O monitor continua procurando a cada atualização.</p></div>;
}

function QuickAction({ href, icon, title, description }: { href: string; icon: IconName; title: string; description: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition hover:border-accent/25 hover:bg-surface-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-text-2 transition-colors group-hover:bg-accent/10 group-hover:text-accent"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
      <div className="min-w-0"><p className="text-sm font-bold">{title}</p><p className="mt-0.5 truncate text-[11px] text-muted">{description}</p></div><span className="ml-auto text-muted transition group-hover:translate-x-0.5 group-hover:text-accent">→</span>
    </Link>
  );
}
