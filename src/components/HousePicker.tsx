"use client";

/* Logos das casas vêm do diretório de clones. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useId, useMemo, useRef, useState } from "react";

type HouseOption = { name: string; logoUrl: string | null };

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const pretty = (value: string) => value.replace(/\b\w/g, (char) => char.toUpperCase());

/** Seletor pesquisável e estilizado usado em toda escolha de casa de aposta. */
export default function HousePicker({
  value,
  onChange,
  houses,
  logoFor,
  size = "md",
  placement = "bottom",
  placeholder = "Busque uma casa…",
  required = false,
}: {
  value: string;
  onChange: (name: string) => void;
  houses: HouseOption[];
  logoFor: (name: string) => string | null;
  size?: "sm" | "md" | "lg";
  placement?: "top" | "bottom";
  placeholder?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = `house-list-${useId().replace(/:/g, "")}`;
  const selectedLabel = value ? pretty(value) : "";

  useEffect(() => {
    const onDocumentPointer = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentPointer);
    return () => document.removeEventListener("mousedown", onDocumentPointer);
  }, []);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    const isSearching = term && term !== normalize(value);
    const list = isSearching ? houses.filter((house) => normalize(house.name).includes(term)) : houses;
    return list.slice(0, 80);
  }, [houses, query, value]);

  const pick = (name: string) => {
    onChange(name);
    setQuery(pretty(name));
    setOpen(false);
  };

  const height = size === "sm" ? "h-10 text-xs" : size === "lg" ? "h-11 text-sm" : "h-11 text-[13px]";
  const dropdownPosition = placement === "top" ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top";

  return (
    <div className="relative min-w-0 flex-1" ref={wrapRef}>
      <span className="pointer-events-none absolute inset-y-0 left-3 z-10 grid place-items-center text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
        </svg>
      </span>
      <input
        value={open ? query : selectedLabel}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setOpen(true);
          setActive(0);
          if (normalize(nextQuery) !== normalize(value)) onChange("");
        }}
        onFocus={(event) => {
          setQuery(selectedLabel);
          setOpen(true);
          setActive(0);
          event.target.select();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => Math.min(current + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && open && results[active]) {
            event.preventDefault();
            pick(results[active].name);
          } else if (event.key === "Escape" || event.key === "Tab") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        className={`${height} w-full min-w-0 rounded-xl border border-border bg-surface px-9 font-semibold outline-none transition placeholder:text-muted/70 hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/10`}
      />
      <span className={`pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-muted transition-transform ${open ? "rotate-180 text-accent" : ""}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
      </span>

      {open && (
        <div id={listId} role="listbox" className={`absolute z-[80] max-h-64 w-full min-w-[230px] animate-menu-in overflow-y-auto rounded-2xl border border-border-strong bg-surface/98 p-1.5 shadow-[0_22px_60px_rgba(0,0,0,0.58),0_0_0_1px_rgba(59,130,246,0.08)] backdrop-blur-xl ${dropdownPosition}`}>
          <div className="sticky top-0 z-10 mb-1 flex items-center justify-between rounded-xl bg-surface-2/95 px-2.5 py-2 backdrop-blur">
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-muted">Casas de aposta</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-black text-accent">{results.length}</span>
          </div>
          {results.length === 0 ? (
            <div className="px-3 py-5 text-center">
              <p className="text-xs font-bold text-text-2">Nenhuma casa encontrada</p>
              <p className="mt-1 text-[10px] text-muted">Tente buscar por outro nome.</p>
            </div>
          ) : results.map((house, index) => {
            const logo = logoFor(house.name);
            const selected = value === house.name;
            return (
              <button
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                key={house.name}
                type="button"
                onClick={() => pick(house.name)}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                  index === active ? "bg-accent/12 text-accent" : selected ? "bg-accent/[0.06] text-accent" : "text-text-2 hover:bg-white/5"
                }`}
              >
                {logo
                  ? <img src={logo} alt="" className="h-7 w-7 shrink-0 rounded-lg border border-border bg-white object-contain p-0.5" />
                  : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-surface-3 text-[9px] font-black text-muted">{house.name.charAt(0).toUpperCase()}</span>}
                <span className="min-w-0 flex-1 truncate font-semibold">{pretty(house.name)}</span>
                {selected && (
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 12 4 4 8-8" /></svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
