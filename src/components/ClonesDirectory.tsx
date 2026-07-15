"use client";

import { useEffect, useMemo, useState } from "react";

type House = {
  id: string;
  groupId: string;
  name: string;
  provider?: string;
  url?: string;
  logoUrl?: string;
  riskWarning?: boolean;
  betterOdds?: boolean;
  liquidityType?: string | null;
  earlyPayment?: boolean;
  estadual?: string | null;
  groupColor?: string | null;
  groupOrder?: number;
  houseOrder?: number;
};

function groupTitle(id: string) {
  if (!id || id.toUpperCase() === "SEM CLONES") return "Sem clones";
  return id.toUpperCase();
}

export default function ClonesDirectory() {
  const [houses, setHouses] = useState<House[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clones")
      .then((r) => r.json())
      .then((d) => setHouses(d.houses ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const term = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const m = new Map<string, { id: string; color: string | null; order: number; provider: string; items: House[] }>();
    for (const h of houses) {
      if (!m.has(h.groupId)) {
        m.set(h.groupId, { id: h.groupId, color: h.groupColor ?? null, order: h.groupOrder ?? 999, provider: (h.provider ?? "").trim(), items: [] });
      }
      m.get(h.groupId)!.items.push(h);
    }
    const arr = [...m.values()];
    for (const g of arr) g.items.sort((a, b) => (a.houseOrder ?? 0) - (b.houseOrder ?? 0));
    arr.sort((a, b) => a.order - b.order);
    return arr;
  }, [houses]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg/85 px-6 py-4 backdrop-blur">
        <div>
          <h1 className="text-[15px] font-bold">Clones de Casas</h1>
          <p className="text-xs text-muted">Casas agrupadas por plataforma — clones do mesmo sistema de odds.</p>
        </div>
        <span className="ml-auto rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-2">
          {houses.length} casas
        </span>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-5 px-6 py-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar casa…"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
        />

        {/* Legenda + propósito */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs">
          <span className="text-text-2">
            Casas do mesmo grupo compartilham as odds — <b className="text-text">evite montar surebet entre clones.</b>
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-3 text-muted">
            <span className="flex items-center gap-1.5"><Tag cls="bg-positive/15 text-positive">PA</Tag> pagamento antecipado</span>
            <span className="flex items-center gap-1.5"><Tag cls="bg-info/15 text-info">EST</Tag> estadual</span>
            <span className="flex items-center gap-1.5"><Tag cls="bg-warning/15 text-warning">⚠</Tag> risco de limitação</span>
          </span>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted">Carregando casas…</p>
        ) : (
          groups.map((g) => {
            const items = g.items.filter((h) => !term || h.name.toLowerCase().includes(term));
            if (items.length === 0) return null;
            const paCount = g.items.filter((h) => h.earlyPayment).length;
            const riskCount = g.items.filter((h) => h.riskWarning).length;
            return (
              <section key={g.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="flex items-center gap-2.5 px-5 py-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color ?? "#6d6a62" }} />
                  <h2 className="text-base font-extrabold">{groupTitle(g.id)}</h2>
                  {g.provider && g.provider !== "-" && <span className="mono-label text-muted">{g.provider}</span>}
                  <span className="ml-auto flex items-center gap-2 text-xs text-muted">
                    {paCount > 0 && <span className="rounded bg-positive/10 px-1.5 py-0.5 text-positive">{paCount} PA</span>}
                    {riskCount > 0 && <span className="rounded bg-warning/10 px-1.5 py-0.5 text-warning">{riskCount} risco</span>}
                    <span>{g.items.length} casas</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 border-t border-border p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {items.map((h) => <HouseCard key={h.id} h={h} />)}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

function Tag({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`mono-label rounded px-1 py-0.5 text-[8px] ${cls}`}>{children}</span>;
}

function HouseCard({ h }: { h: House }) {
  const inner = (
    <>
      {h.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={h.logoUrl} alt={h.name} loading="lazy" className="max-h-9 max-w-[85%] object-contain" />
      ) : (
        <span className="text-sm font-bold text-text-2">{h.name}</span>
      )}
      <div className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap gap-1">
        {h.earlyPayment && <span className="mono-label rounded bg-positive/15 px-1 py-0.5 text-[7px] text-positive">PA</span>}
        {h.estadual && <span className="mono-label rounded bg-info/15 px-1 py-0.5 text-[7px] text-info">EST</span>}
        {h.riskWarning && <span className="mono-label rounded bg-warning/15 px-1 py-0.5 text-[7px] text-warning">⚠</span>}
      </div>
    </>
  );
  const cls = "group relative flex h-20 items-center justify-center rounded-xl border border-border bg-surface-2 p-3";
  if (!h.url) return <div className={cls} title={h.name}>{inner}</div>;
  return (
    <a href={h.url} target="_blank" rel="noopener noreferrer" title={`Abrir ${h.name}`} className={`${cls} transition-colors hover:border-accent/60`}>
      {inner}
      <span className="absolute right-1.5 top-1.5 text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">↗</span>
    </a>
  );
}
