"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EventOption } from "@/lib/event-options";

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function EventCombo({
  options,
  value,
  onChange,
  onPick,
  placeholder,
}: {
  options: EventOption[];
  value: string;
  onChange: (value: string) => void;
  onPick: (option: EventOption) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const query = normalize(value.trim());
    const filtered = query
      ? options.filter((option) => normalize(`${option.label} ${option.league} ${option.sport}`).includes(query))
      : options;
    return filtered;
  }, [options, value]);
  const pick = (option: EventOption) => {
    onPick(option);
    setOpen(false);
    setActive(-1);
  };

  // Nem todo jogo está na lista: o feed só tem partida que ainda não começou.
  // Quem digitou um nome que não bate com nada pode usar o texto do jeito que é.
  const digitado = value.trim();
  const temExato = results.some((option) => normalize(option.label) === normalize(digitado));
  const podeUsarTexto = digitado.length > 0 && !temExato;
  const usarTexto = () => { setOpen(false); setActive(-1); };

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <input
        name="evento"
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => Math.min(current + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, -1));
          } else if (event.key === "Enter") {
            event.preventDefault();
            // Enter num item da lista escolhe ele; Enter sem nada marcado
            // confirma o que a pessoa digitou e fecha.
            if (open && active >= 0 && results[active]) pick(results[active]);
            else usarTexto();
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm font-semibold outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
      />
      {open && (podeUsarTexto || results.length > 0) && (
        <div className="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-[0_18px_46px_rgba(0,0,0,0.52)]">
          {podeUsarTexto && (
            <button
              type="button"
              onClick={usarTexto}
              className="flex w-full items-center gap-3 rounded-lg border border-accent/30 bg-accent/[0.07] px-3 py-2.5 text-left transition hover:bg-accent/15"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent text-accent-ink">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-accent">Usar “{digitado}”</span>
                <span className="block text-[10px] text-muted">Jogo que já começou ou não está na lista? Pode ir assim mesmo.</span>
              </span>
            </button>
          )}
          {results.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => pick(option)}
              onMouseEnter={() => setActive(index)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${index === active ? "bg-accent/12 text-accent" : "text-text-2 hover:bg-white/5 hover:text-text"}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{option.label}</span>
                <span className="block truncate text-[10px] text-muted">{option.league || "Liga não informada"} · {option.sport || "Esporte"}</span>
              </span>
              <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold tabular-nums ${option.historico ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-surface-2 text-text-2"}`}>
                {option.startsAt ? new Date(option.startsAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "sem hora"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
