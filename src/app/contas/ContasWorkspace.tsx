"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import AppModal from "@/components/AppModal";
import { addContaParceiroAction, deleteContaParceiroAction, setContaStatusAction, updateContaCampoAction } from "./actions";

type Conta = { id: string; casaNome: string; casaLogo: string | null; parceiroId: string; parceiroNome: string; saldo: number; status: string; login: string | null; senha: string | null; notas: string | null; podeExcluir: boolean };

const STATUS_OPTIONS = ["disponivel", "verificacao", "limitada"] as const;
const STATUS_META: Record<string, { label: string; dot: string; pill: string }> = {
  disponivel: { label: "Disponível", dot: "bg-positive", pill: "bg-positive/10 text-positive" },
  verificacao: { label: "Verificação", dot: "bg-warning", pill: "bg-warning/10 text-warning" },
  limitada: { label: "Limitada", dot: "bg-negative", pill: "bg-negative/10 text-negative" },
};
type ParceiroOption = { id: string; nome: string };
type HouseOption = { name: string; logoUrl: string | null };

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const inputClass = "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-text outline-none transition focus:border-accent";
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

function PlusIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return <AppModal title={title} subtitle={subtitle} eyebrow="Gestão de contas" onClose={onClose} size="md">{children}</AppModal>;
}

export default function ContasWorkspace({ contas, parceiros, houses }: { contas: Conta[]; parceiros: ParceiroOption[]; houses: HouseOption[] }) {
  const [filtroCasa, setFiltroCasa] = useState("");
  const [filtroParceiro, setFiltroParceiro] = useState("");
  const [busca, setBusca] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const casasDisponiveis = useMemo(
    () => [...new Set(contas.map((c) => c.casaNome))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [contas],
  );
  const casaOptions = useMemo(() => casasDisponiveis.map((c) => ({ value: c, label: c })), [casasDisponiveis]);
  const parceiroOptions = useMemo(() => parceiros.map((p) => ({ value: p.id, label: p.nome })), [parceiros]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return contas.filter((c) => {
      if (filtroCasa && c.casaNome !== filtroCasa) return false;
      if (filtroParceiro && c.parceiroId !== filtroParceiro) return false;
      if (termo && !`${c.parceiroNome} ${c.casaNome}`.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [contas, filtroCasa, filtroParceiro, busca]);

  const saldoTotal = filtradas.reduce((s, c) => s + c.saldo, 0);
  const temFiltro = filtroCasa || filtroParceiro || busca.trim();

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="card-featured rounded-2xl border p-4">
          <p className="mono-label">Contas exibidas</p>
          <p className="mt-3 text-2xl font-black tabular-nums">{filtradas.length}</p>
          <p className="mt-1 text-[11px] text-white/75">de {contas.length} no total</p>
        </article>
        <Metric label="Saldo somado" value={brl(saldoTotal)} tone="warning" detail="Nas contas exibidas" />
        <Metric label="Parceiros" value={String(new Set(filtradas.map((c) => c.parceiroId)).size)} tone="info" detail="Com conta nesta lista" />
        <Metric label="Casas" value={String(new Set(filtradas.map((c) => c.casaNome)).size)} tone="positive" detail="Casas distintas" />
      </section>

      {/* Filtros */}
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-1.5"><span className="mono-label text-muted">Casa de apostas</span>
          <FilterCombo options={casaOptions} value={filtroCasa} onChange={setFiltroCasa} allLabel="Todas as casas" placeholder="Todas as casas" />
        </label>
        <label className="flex flex-col gap-1.5"><span className="mono-label text-muted">Parceiro</span>
          <FilterCombo options={parceiroOptions} value={filtroParceiro} onChange={setFiltroParceiro} allLabel="Todos os parceiros" placeholder="Todos os parceiros" />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5"><span className="mono-label text-muted">Buscar</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Parceiro ou casa…" className={inputClass} />
        </label>
        {temFiltro ? (
          <button onClick={() => { setFiltroCasa(""); setFiltroParceiro(""); setBusca(""); }} className="h-10 rounded-lg border border-border px-3 text-xs font-semibold text-text-2 transition hover:border-border-strong hover:text-text">Limpar</button>
        ) : null}
        <button
          onClick={() => setAddOpen(true)}
          disabled={parceiros.length === 0}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusIcon /> Adicionar conta
        </button>
      </section>

      {/* Lista */}
      {contas.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 text-center">
          <div className="max-w-md">
            <h3 className="text-base font-extrabold">Nenhuma conta cadastrada</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{parceiros.length === 0 ? "Cadastre um parceiro primeiro em Parceiros (CPF), depois volte aqui para registrar as contas dele nas casas." : "Use “Adicionar conta” para registrar em quais casas cada parceiro tem conta."}</p>
          </div>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center text-sm text-muted">Nenhuma conta com esses filtros.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((conta) => <ContaCard key={conta.id} conta={conta} />)}
        </div>
      )}

      {addOpen && <AddContaModal parceiros={parceiros} houses={houses} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddContaModal({ parceiros, houses, onClose }: { parceiros: ParceiroOption[]; houses: HouseOption[]; onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showSenha, setShowSenha] = useState(false);
  const [error, action, pending] = useActionState(
    async (_previous: string | undefined, formData: FormData) => {
      const result = await addContaParceiroAction(undefined, formData);
      if (!result) onClose();
      return result;
    },
    undefined,
  );
  return (
    <Modal title="Adicionar conta" subtitle="Registre a conta do parceiro na casa." onClose={onClose}>
      <form ref={formRef} action={action} className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1"><span className="mono-label text-muted">Parceiro</span>
            <select name="parceiroId" className={inputClass} required defaultValue="">
              <option value="" disabled>Selecione</option>
              {parceiros.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <label className="block space-y-1"><span className="mono-label text-muted">Casa de apostas</span>
            <HouseCombobox houses={houses} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1"><span className="mono-label text-muted">Login</span>
            <input name="login" autoComplete="off" placeholder="CPF, email…" className={inputClass} />
          </label>
          <label className="block space-y-1"><span className="mono-label text-muted">Senha</span>
            <div className="relative">
              <input name="senha" type={showSenha ? "text" : "password"} autoComplete="new-password" placeholder="••••••" className={`${inputClass} pr-9`} />
              <button type="button" onClick={() => setShowSenha((v) => !v)} title={showSenha ? "Ocultar" : "Mostrar"} className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-text">
                {showSenha ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A9.8 9.8 0 0 1 12 4c6 0 10 8 10 8a17 17 0 0 1-2.2 3.1M6.1 6.1A17 17 0 0 0 2 12s4 8 10 8a9.6 9.6 0 0 0 4.2-.9" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1"><span className="mono-label text-muted">Saldo (opcional)</span>
            <input name="saldoInicial" inputMode="decimal" placeholder="0,00" className={inputClass} />
          </label>
          <label className="block space-y-1"><span className="mono-label text-muted">Status</span>
            <select name="status" defaultValue="disponivel" className={inputClass}>
              {STATUS_OPTIONS.map((key) => <option key={key} value={key}>{STATUS_META[key].label}</option>)}
            </select>
          </label>
        </div>
        <label className="block space-y-1"><span className="mono-label text-muted">Observações (opcional)</span>
          <input name="notas" placeholder="Ex.: conta verificada, limite, PIX…" className={inputClass} />
        </label>

        {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative" aria-live="polite">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-bold text-muted hover:text-text">Cancelar</button>
          <button type="submit" disabled={pending} className="h-9 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink hover:bg-accent-hover disabled:opacity-50">{pending ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ContaStatus({ id, value }: { id: string; value: string }) {
  const [current, setCurrent] = useState(STATUS_META[value] ? value : "disponivel");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const meta = STATUS_META[current];
  const pick = (key: string) => {
    setOpen(false);
    if (key === current) return;
    setCurrent(key);
    startTransition(() => setContaStatusAction(id, key));
  };

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold transition ${meta.pill} ${pending ? "opacity-60" : ""}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
        <svg viewBox="0 0 24 24" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 rounded-lg border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          {STATUS_OPTIONS.map((key) => {
            const s = STATUS_META[key];
            const active = key === current;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pick(key)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${active ? "bg-accent/12 font-semibold text-accent" : "text-text-2 hover:bg-white/5"}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <span className="flex-1">{s.label}</span>
                {active && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditableField({ id, field, label, value }: { id: string; field: "login" | "senha" | "notas"; label: string; value: string | null }) {
  const [val, setVal] = useState(value ?? "");
  const savedRef = useRef(value ?? "");
  const [pending, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const commit = () => {
    if (val === savedRef.current) return;
    savedRef.current = val;
    startTransition(() => updateContaCampoAction(id, field, val));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  return (
    <div className="rounded-xl border border-border bg-surface-2/50 px-3 py-2 transition-colors focus-within:border-accent">
      <div className="flex items-center justify-between">
        <p className="mono-label text-muted">{label}</p>
        {pending ? <span className="mono-label text-muted">salvando…</span> : savedFlash ? <span className="mono-label text-positive">salvo ✓</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <input
          type={field === "senha" && !mostrarSenha ? "password" : "text"}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          placeholder="Clique para preencher"
          autoComplete="off"
          spellCheck={false}
          className="mt-0.5 min-w-0 flex-1 break-all bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted"
        />
        {field === "senha" && val && (
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setMostrarSenha((atual) => !atual)} className="text-[10px] font-semibold text-muted hover:text-text">
            {mostrarSenha ? "Ocultar" : "Mostrar"}
          </button>
        )}
      </div>
    </div>
  );
}

function ContaNotas({ id, value }: { id: string; value: string | null }) {
  const [val, setVal] = useState(value ?? "");
  const savedRef = useRef(value ?? "");
  const [pending, startTransition] = useTransition();

  const commit = () => {
    if (val === savedRef.current) return;
    savedRef.current = val;
    startTransition(() => updateContaCampoAction(id, "notas", val));
  };

  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      placeholder="Clique para adicionar observação…"
      autoComplete="off"
      spellCheck={false}
      className={`w-full truncate rounded-md bg-transparent px-1.5 py-1 text-[11px] outline-none transition-colors placeholder:text-muted hover:bg-surface-2 focus:bg-surface-2 focus:ring-1 focus:ring-accent ${pending ? "opacity-60" : "text-muted"}`}
    />
  );
}

function ContaCard({ conta }: { conta: Conta }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-border-strong">
      {/* Cabeçalho: casa + saldo */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1">
          {conta.casaLogo ? (
            <img src={conta.casaLogo} alt="" className="h-4 w-4 shrink-0 rounded object-contain" />
          ) : (
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-surface-3 text-[8px] font-bold text-muted">{conta.casaNome.charAt(0)}</span>
          )}
          <span className="truncate text-[11px] font-bold uppercase tracking-wide text-text">{conta.casaNome}</span>
        </span>
        <span className={`ml-auto shrink-0 rounded-md px-2 py-1 text-xs font-black ${conta.saldo < 0 ? "bg-negative/10 text-negative" : "bg-positive/10 text-positive"}`}>{brl(conta.saldo)}</span>
      </div>

      {/* Parceiro + status */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/12 text-[11px] font-black text-accent">{initials(conta.parceiroNome)}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{conta.parceiroNome}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="mono-label text-muted">Status</span>
          <ContaStatus id={conta.id} value={conta.status} />
        </span>
      </div>

      {/* Login / Senha (editáveis) */}
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <EditableField key={`${conta.id}-login-${conta.login ?? ""}`} id={conta.id} field="login" label="Login" value={conta.login} />
        <EditableField key={`${conta.id}-senha-${conta.senha ?? ""}`} id={conta.id} field="senha" label="Senha" value={conta.senha} />
      </div>

      {/* Rodapé: observações (editável) + excluir */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <ContaNotas key={`${conta.id}-notas-${conta.notas ?? ""}`} id={conta.id} value={conta.notas} />
        </div>
        <DeleteConta id={conta.id} podeExcluir={conta.podeExcluir} />
      </div>
    </article>
  );
}

type FilterOption = { value: string; label: string };

function FilterCombo({ options, value, onChange, allLabel, placeholder }: { options: FilterOption[]; value: string; onChange: (v: string) => void; allLabel: string; placeholder: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const base = q ? options.filter((o) => normalize(o.label).includes(q)) : options;
    return base.slice(0, 60);
  }, [options, query]);

  const pick = (option: FilterOption) => { onChange(option.value); setQuery(option.label); setOpen(false); };
  const clear = () => { onChange(""); setQuery(""); setOpen(false); };
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";

  return (
    <div className="relative w-48" ref={wrapRef}>
      <input
        value={open ? query : selectedLabel}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => { setQuery(selectedLabel); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
          else if (e.key === "Enter") { e.preventDefault(); if (active >= 0 && results[active]) pick(results[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <button type="button" onClick={clear} className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors ${!value ? "bg-accent/12 font-semibold text-accent" : "text-text-2 hover:bg-white/5"}`}>{allLabel}</button>
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">Nada encontrado.</p>
          ) : results.map((option, i) => (
            <button
              key={option.value}
              type="button"
              onClick={() => pick(option)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors ${i === active ? "bg-accent/12 text-accent" : value === option.value ? "text-accent" : "text-text-2 hover:bg-white/5"}`}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HouseCombobox({ houses }: { houses: HouseOption[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = q ? houses.filter((h) => normalize(h.name).includes(q)) : houses;
    return list.slice(0, 60);
  }, [houses, query]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (name: string) => { setSelected(name); setQuery(name); setOpen(false); };

  return (
    <div className="relative" ref={wrapRef}>
      <input type="hidden" name="casaNome" value={selected} />
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelected(""); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && open && results[active]) { e.preventDefault(); pick(results[active].name); }
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Digite o nome da casa…"
        autoComplete="off"
        className={inputClass}
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted">Nenhuma casa encontrada.</p>
          ) : results.map((h, i) => (
            <button
              key={h.name}
              type="button"
              onClick={() => pick(h.name)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${i === active ? "bg-accent/12 text-accent" : "text-text-2 hover:bg-white/5"}`}
            >
              {h.logoUrl ? (
                <img src={h.logoUrl} alt="" className="h-5 w-5 shrink-0 rounded bg-surface-3 object-contain" />
              ) : (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-surface-3 text-[8px] font-bold text-muted">{h.name.charAt(0)}</span>
              )}
              <span className="truncate">{h.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteConta({ id, podeExcluir }: { id: string; podeExcluir: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  if (!podeExcluir) {
    return (
      <span title="Conta com movimentações ou operações não pode ser excluída; preserve o histórico." className="grid h-7 w-7 place-items-center rounded-md text-muted/45">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
      </span>
    );
  }
  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button type="button" disabled={pending} onClick={() => startTransition(() => deleteContaParceiroAction(id))} className="rounded-md bg-negative/15 px-2 py-1 text-[11px] font-bold text-negative hover:bg-negative/25 disabled:opacity-50">Excluir</button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-1.5 py-1 text-[11px] text-muted hover:text-text">Não</button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} title="Excluir conta" className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-negative/10 hover:text-negative">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
    </button>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "info" | "positive" | "negative" | "warning" }) {
  const colors = { info: "text-info", positive: "text-positive", negative: "text-negative", warning: "text-warning" };
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <p className="mono-label text-muted">{label}</p>
      <p className={`mt-3 text-lg font-black tabular-nums ${colors[tone]}`}>{value}</p>
      <p className="mt-1 text-[10px] text-muted">{detail}</p>
    </article>
  );
}
