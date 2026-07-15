"use client";

import { useState } from "react";

export type DiaResultado = { iso: string; lucro: number; operacoes: number };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const sinal = (v: number) => `${v >= 0 ? "+" : ""}${brl(v)}`;
const curto = (v: number) => {
  const abs = Math.abs(v);
  const txt = abs >= 1000 ? `${(abs / 1000).toFixed(abs >= 10_000 ? 0 : 1)}k` : abs.toFixed(0);
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}R$ ${txt}`;
};
const dataCurta = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const diaSemana = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").slice(0, 3);

const PERIODOS = [7, 14, 30];
// O SVG escala junto com a largura (altura automática pelo viewBox). Os rótulos
// dos dias vivem DENTRO dele: fora, numa linha de HTML, eles nunca alinhariam
// com os pontos — o SVG é centralizado e sobra margem nas laterais.
const W = 1100;
const H = 320;
const PAD = { top: 36, right: 24, bottom: 28, left: 24 };

/**
 * Curva suave que NÃO ultrapassa os pontos (interpolação monotônica). A curva de
 * Bézier ingênua "estoura" nos vales e desenha um lucro que nunca existiu — num
 * gráfico de dinheiro isso é mentira, não enfeite.
 */
function curvaSuave(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  const d: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    // Tangentes achatadas quando o ponto é um pico ou vale local: sem isso a
    // curva sobe acima do máximo real.
    const plano1 = (p2.y - p1.y) * (p1.y - p0.y) <= 0;
    const plano2 = (p3.y - p2.y) * (p2.y - p1.y) <= 0;
    const c1 = { x: p1.x + (p2.x - p1.x) / 3, y: plano1 ? p1.y : p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p2.x - p1.x) / 3, y: plano2 ? p2.y : p2.y - (p3.y - p1.y) / 6 };
    d.push(`C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

export default function ResultadosChart({ dias }: { dias: DiaResultado[] }) {
  const [periodo, setPeriodo] = useState(14);
  const [modo, setModo] = useState<"dia" | "acumulado">("dia");
  const [tabela, setTabela] = useState(false);
  const [ativo, setAtivo] = useState<number | null>(null);

  const dados = dias.slice(-periodo);
  const comOperacao = dados.filter((d) => d.operacoes > 0);
  const vazio = comOperacao.length === 0;

  // No acumulado, cada ponto é o saldo somado até ali — a curva do seu bolso.
  const serie = dados.map((d, i) =>
    modo === "acumulado"
      ? dados.slice(0, i + 1).reduce((s, x) => s + x.lucro, 0)
      : d.lucro,
  );

  const total = dados.reduce((s, d) => s + d.lucro, 0);
  const maxV = Math.max(0, ...serie);
  const minV = Math.min(0, ...serie);
  const span = maxV - minV || 1;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (dados.length === 1 ? plotW / 2 : (i / (dados.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - minV) / span) * plotH;
  const yZero = y(0);

  const pontos = serie.map((v, i) => ({ x: x(i), y: y(v) }));
  const linha = curvaSuave(pontos);
  const area = `${linha} L ${pontos.at(-1)!.x} ${yZero} L ${pontos[0].x} ${yZero} Z`;

  const iMelhor = serie.reduce((best, v, i) => (dados[i].operacoes > 0 && v > serie[best] ? i : best), serie.findIndex((_, i) => dados[i].operacoes > 0));
  const iPior = serie.reduce((worst, v, i) => (dados[i].operacoes > 0 && v < serie[worst] ? i : worst), serie.findIndex((_, i) => dados[i].operacoes > 0));
  const destaques = modo === "dia"
    ? Array.from(new Set([iMelhor, iPior])).filter((i) => i >= 0 && serie[i] !== 0)
    : [iMelhor].filter((i) => i >= 0);

  const aoMover = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((rel - PAD.left) / plotW) * (dados.length - 1));
    setAtivo(Math.min(dados.length - 1, Math.max(0, i)));
  };

  return (
    <section className="panel rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mono-label text-muted">Resultado por dia</p>
          <h2 className="mt-1 text-base font-extrabold">
            {vazio ? "Sem operações fechadas" : (
              <>
                <span className={total >= 0 ? "text-positive" : "text-negative"}>{sinal(total)}</span>
                <span className="text-text"> nos últimos {periodo} dias</span>
              </>
            )}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
            {(["dia", "acumulado"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setModo(m); setAtivo(null); }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${modo === m ? "bg-surface-3 text-text" : "text-muted hover:text-text"}`}
              >
                {m === "dia" ? "Por dia" : "Acumulado"}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => { setPeriodo(p); setAtivo(null); }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${periodo === p ? "bg-accent text-accent-ink" : "text-muted hover:text-text"}`}
              >
                {p}d
              </button>
            ))}
          </div>
          <button
            onClick={() => setTabela((t) => !t)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${tabela ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-text"}`}
          >
            {tabela ? "Gráfico" : "Tabela"}
          </button>
        </div>
      </div>

      {vazio ? (
        <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-border px-4 text-center">
          <div>
            <p className="text-sm font-bold">Nenhuma operação fechada nesse período</p>
            <p className="mt-1 text-xs text-muted">Finalize uma operação na planilha e o resultado dela aparece aqui.</p>
          </div>
        </div>
      ) : tabela ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="mono-label border-b border-border text-left text-muted">
                <th className="py-2 font-medium">Dia</th>
                <th className="py-2 text-center font-medium">Operações</th>
                <th className="py-2 text-right font-medium">Resultado</th>
                <th className="py-2 text-right font-medium">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((d, i) => d.operacoes === 0 ? null : (
                <tr key={d.iso} className="border-b border-border/50 last:border-0">
                  <td className="py-2 font-semibold">{dataCurta(d.iso)}</td>
                  <td className="py-2 text-center tabular-nums text-text-2">{d.operacoes}</td>
                  <td className={`py-2 text-right font-bold tabular-nums ${d.lucro >= 0 ? "text-positive" : "text-negative"}`}>{sinal(d.lucro)}</td>
                  <td className="py-2 text-right tabular-nums text-text-2">
                    {sinal(dados.slice(0, i + 1).reduce((s, x) => s + x.lucro, 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="relative" onMouseMove={aoMover} onMouseLeave={() => setAtivo(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Resultado por dia">
              <defs>
                {/* Preenchimento em degradê: forte junto à curva, some no zero. */}
                <linearGradient id="fillPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-pos)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--chart-pos)" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="fillNeg" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="var(--chart-neg)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--chart-neg)" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="fillLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0.02" />
                </linearGradient>
                {/* O brilho da curva. */}
                <filter id="brilho" x="-20%" y="-40%" width="140%" height="180%">
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {/* Cada metade recorta o seu lado: ganho pinta pra cima, perda pra baixo. */}
                <clipPath id="acimaZero"><rect x="0" y="0" width={W} height={yZero} /></clipPath>
                <clipPath id="abaixoZero"><rect x="0" y={yZero} width={W} height={H - yZero} /></clipPath>
              </defs>

              {/* Área */}
              {modo === "acumulado" ? (
                <path d={area} fill="url(#fillLine)" />
              ) : (
                <>
                  <path d={area} fill="url(#fillPos)" clipPath="url(#acimaZero)" />
                  <path d={area} fill="url(#fillNeg)" clipPath="url(#abaixoZero)" />
                </>
              )}

              {/* A linha do zero — a âncora que dá sentido ao sinal. */}
              <line x1={PAD.left} y1={yZero} x2={W - PAD.right} y2={yZero} stroke="var(--border-strong)" strokeWidth="1" />

              {/* Curva com brilho */}
              {modo === "acumulado" ? (
                <path d={linha} fill="none" stroke="var(--chart-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#brilho)" />
              ) : (
                <>
                  <path d={linha} fill="none" stroke="var(--chart-pos)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#brilho)" clipPath="url(#acimaZero)" />
                  <path d={linha} fill="none" stroke="var(--chart-neg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#brilho)" clipPath="url(#abaixoZero)" />
                </>
              )}

              {/* Guia vertical do ponto sob o cursor */}
              {ativo !== null && (
                <line x1={x(ativo)} y1={PAD.top - 10} x2={x(ativo)} y2={H - PAD.bottom} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 4" />
              )}

              {/* Marcadores: anel na cor da superfície pra não sumir sobre a curva. */}
              {pontos.map((p, i) => {
                const cor = modo === "acumulado" ? "var(--chart-line)" : serie[i] < 0 ? "var(--chart-neg)" : "var(--chart-pos)";
                const grande = ativo === i || destaques.includes(i);
                if (dados[i].operacoes === 0 && !grande) return null;
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={grande ? 5.5 : 3.5}
                    fill={dados[i].operacoes === 0 ? "var(--surface-3)" : cor}
                    stroke="var(--surface)"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Eixo dos dias, no mesmo sistema de coordenadas dos pontos. */}
              {dados.map((d, i) => {
                const mostra = dados.length <= 14 ? true : i % 5 === 0 || i === dados.length - 1;
                if (!mostra) return null;
                return (
                  <text
                    key={`dia-${d.iso}`}
                    x={x(i)}
                    y={H - 8}
                    textAnchor="middle"
                    className={ativo === i ? "fill-text" : "fill-muted"}
                    style={{ fontSize: 11, fontWeight: ativo === i ? 700 : 400 }}
                  >
                    {dados.length <= 7 ? diaSemana(d.iso) : dataCurta(d.iso).slice(0, 5)}
                  </text>
                );
              })}

              {/* Chips nos extremos — o rótulo direto vive só onde a história está. */}
              {destaques.map((i) => {
                const p = pontos[i];
                const texto = curto(serie[i]);
                const largura = texto.length * 6.4 + 16;
                // Sempre ACIMA do ponto: embaixo do vale o chip cairia em cima do
                // eixo e engoliria a data daquele dia.
                const cy = Math.max(4, p.y - 26);
                const cx = Math.min(W - PAD.right - largura / 2, Math.max(PAD.left + largura / 2, p.x));
                return (
                  <g key={`chip-${i}`}>
                    <rect x={cx - largura / 2} y={cy} width={largura} height={20} rx="6" fill="var(--surface-2)" stroke="var(--border-strong)" />
                    <text x={cx} y={cy + 14} textAnchor="middle" className="fill-text" style={{ fontSize: 11, fontWeight: 800 }}>{texto}</text>
                  </g>
                );
              })}
            </svg>

            {/* Balão do dia sob o cursor */}
            {ativo !== null && dados[ativo] && (
              <div
                className="pointer-events-none absolute top-0 z-20 w-max -translate-x-1/2 rounded-lg border border-border-strong bg-surface px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.4)]"
                style={{ left: `${Math.min(88, Math.max(12, (x(ativo) / W) * 100))}%` }}
              >
                <p className="text-[11px] font-bold text-text">{dataCurta(dados[ativo].iso)}</p>
                <p className={`text-sm font-black tabular-nums ${serie[ativo] >= 0 ? "text-positive" : "text-negative"}`}>
                  {dados[ativo].operacoes === 0 && modo === "dia" ? "—" : sinal(serie[ativo])}
                </p>
                <p className="text-[10px] text-muted">
                  {modo === "acumulado"
                    ? "acumulado no período"
                    : dados[ativo].operacoes === 0
                      ? "sem operações"
                      : `${dados[ativo].operacoes} ${dados[ativo].operacoes === 1 ? "operação" : "operações"}`}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-[11px]">
            {modo === "acumulado" ? (
              <span className="inline-flex items-center gap-1.5 text-muted">
                <span className="h-2.5 w-2.5 rounded-sm bg-chart-line" /> Lucro acumulado no período
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <span className="h-2.5 w-2.5 rounded-sm bg-chart-pos" /> Dia no verde
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <span className="h-2.5 w-2.5 rounded-sm bg-chart-neg" /> Dia no vermelho
                </span>
              </>
            )}
            <span className="ml-auto text-muted">
              {comOperacao.length} {comOperacao.length === 1 ? "dia operado" : "dias operados"}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
