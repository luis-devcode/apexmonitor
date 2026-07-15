"use client";

import { useMemo, useRef, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = () => iso(new Date());

/** "2026-07-11" → "11/07/2026". Vazio vira vazio. */
const paraBr = (value: string) => {
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};

/** "11/07/2026" → "2026-07-11", só se a data existir de verdade (31/02 não passa). */
const paraIso = (texto: string) => {
  const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, a] = m;
  const data = new Date(Number(a), Number(mes) - 1, Number(d));
  if (data.getMonth() !== Number(mes) - 1 || data.getDate() !== Number(d)) return null;
  return iso(data);
};

/** Vai formatando enquanto digita: 1107 → 11/07. */
const mascara = (bruto: string) => {
  const digitos = bruto.replace(/\D/g, "").slice(0, 8);
  const partes = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean);
  return partes.join("/");
};

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Campo de data com calendário. Substitui o `<input type="date">` do navegador,
 * que no Windows vira aquele "dd/mm/aaaa" com setinha e não combina com o resto
 * do site. Aqui dá pra digitar (com máscara) ou clicar no dia.
 */
export default function DateField({
  value,
  onChange,
  name,
  placeholder = "dd/mm/aaaa",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Se vier, o valor (ISO) vai junto no submit do formulário. */
  name?: string;
  placeholder?: string;
  className?: string;
}) {
  // O texto é DERIVADO do valor. O rascunho só existe enquanto a pessoa digita
  // (pra ela poder passar por estados incompletos como "11/0"); ao sair do
  // campo ele é jogado fora e o valor volta a mandar. Assim os botões "Hoje" e
  // "Limpar" do pai refletem aqui sem effect nenhum.
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(() => new Date(`${value || hoje()}T12:00:00`));
  const wrapRef = useRef<HTMLDivElement>(null);

  const texto = rascunho ?? paraBr(value);
  const fechar = () => setAberto(false);

  const digitar = (bruto: string) => {
    const formatado = mascara(bruto);
    setRascunho(formatado);
    if (!formatado) { onChange(""); return; }
    const data = paraIso(formatado);
    if (data) {
      onChange(data);
      setMes(new Date(`${data}T12:00:00`));
    }
  };

  // Texto pela metade some ao sair (senão fica um lixo tipo "11/0" na tela).
  const sair = () => setRascunho(null);

  const dias = useMemo(() => {
    const ano = mes.getFullYear();
    const m = mes.getMonth();
    const vazios = new Date(ano, m, 1).getDay();
    const total = new Date(ano, m + 1, 0).getDate();
    return [
      ...Array.from({ length: vazios }, () => null),
      ...Array.from({ length: total }, (_, i) => `${ano}-${pad(m + 1)}-${pad(i + 1)}`),
    ];
  }, [mes]);

  const escolher = (dia: string) => {
    onChange(dia);
    setRascunho(null);
    fechar();
  };

  const mudarMes = (delta: number) => setMes((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1));

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) fechar(); }}
    >
      {name && <input type="hidden" name={name} value={value} />}
      <div className="flex h-9 items-center rounded-lg border border-border bg-surface-2 pr-1 transition focus-within:border-accent">
        <input
          value={texto}
          onChange={(e) => digitar(e.target.value)}
          onBlur={sair}
          onFocus={() => setAberto(true)}
          onKeyDown={(e) => { if (e.key === "Escape") fechar(); }}
          placeholder={placeholder}
          inputMode="numeric"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-label="Abrir calendário"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-surface-3 hover:text-text"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
        </button>
      </div>

      {aberto && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-[248px] rounded-xl border border-border-strong bg-surface p-3 shadow-[0_16px_44px_rgba(0,0,0,0.5)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="grid h-7 w-7 place-items-center rounded-md border border-border text-text-2 transition hover:border-border-strong hover:text-text">‹</button>
            <span className="text-xs font-extrabold">{MESES[mes.getMonth()]} {mes.getFullYear()}</span>
            <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" className="grid h-7 w-7 place-items-center rounded-md border border-border text-text-2 transition hover:border-border-strong hover:text-text">›</button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-muted">
            {SEMANA.map((d, i) => <span key={i}>{d}</span>)}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {dias.map((dia, i) => {
              if (!dia) return <span key={`v${i}`} className="h-8" />;
              const selecionado = value === dia;
              const eHoje = dia === hoje();
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => escolher(dia)}
                  className={`h-8 rounded-md text-xs font-bold tabular-nums transition ${
                    selecionado
                      ? "bg-accent text-accent-ink"
                      : eHoje
                        ? "border border-accent/40 text-accent hover:bg-accent/10"
                        : "text-text-2 hover:bg-surface-2 hover:text-text"
                  }`}
                >
                  {Number(dia.slice(-2))}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button type="button" onClick={() => escolher(hoje())} className="rounded-md px-2 py-1 text-[11px] font-bold text-accent transition hover:bg-accent/10">Hoje</button>
            {value && (
              <button type="button" onClick={() => { onChange(""); setRascunho(null); fechar(); }} className="rounded-md px-2 py-1 text-[11px] font-bold text-muted transition hover:text-text">Limpar</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
