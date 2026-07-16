"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import DateField from "@/components/DateField";
import AppModal from "@/components/AppModal";
import { addFreebetAction, deleteFreebetAction, editarFreebetAction, setFreebetExtraidoAction, setFreebetStatusAction } from "./actions";

type Freebet = {
  id: string;
  casaNome: string;
  casaLogo: string | null;
  parceiroNome: string | null;
  // Necessário pra pré-selecionar o parceiro ao editar (o nome não serve de chave).
  parceiroId: string | null;
  valor: number;
  tipo: string | null;
  procedimento: string | null;
  requisito: string | null;
  status: string;
  valorExtraido: number | null;
  expiraEm: string | null;
  notas: string | null;
};
type ParceiroOption = { id: string; nome: string };
type HouseOption = { name: string; logoUrl: string | null };
type FilterOption = { value: string; label: string };

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const parseMoney = (raw: string) => {
  const value = raw.replace(/R\$|\s/g, "");
  if (!value) return 0;
  return Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value) || 0;
};
const inputClass = "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-text outline-none transition focus:border-accent";

const TIPOS = ["Missão", "Promoção", "Cashback", "Bônus", "Indicação", "Odds Turbinadas", "Outro"];
const STATUS_ORDER = ["PENDENTE", "EXTRAIDA", "EXPIRADA"] as const;
const STATUS_META: Record<string, { label: string; dot: string; pill: string }> = {
  PENDENTE: { label: "Disponível", dot: "bg-info", pill: "bg-info/10 text-info" },
  EXTRAIDA: { label: "Extraída", dot: "bg-positive", pill: "bg-positive/10 text-positive" },
  EXPIRADA: { label: "Expirada", dot: "bg-negative", pill: "bg-negative/10 text-negative" },
};
const DAY = 86_400_000;

function diasAteExpirar(iso: string) {
  return Math.ceil((Date.parse(iso) - Date.now()) / DAY);
}

function freebetUrgente(freebet: Freebet) {
  return freebet.status === "PENDENTE"
    && !!freebet.expiraEm
    && diasAteExpirar(freebet.expiraEm) <= 3;
}

function validadeInfo(iso: string | null, status: string) {
  if (!iso) return null;
  const date = new Date(iso);
  const label = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const days = Math.ceil((date.getTime() - Date.now()) / DAY);
  let tone = "";
  let hint = label;
  if (status === "PENDENTE") {
    if (days < 0) { tone = "text-negative"; hint = `${label} · vencida`; }
    else if (days === 0) { tone = "text-warning"; hint = `${label} · vence hoje`; }
    else if (days <= 3) { tone = "text-warning"; hint = `${label} · vence em ${days}d`; }
    else hint = `${label} · em ${days}d`;
  }
  return { tone, hint };
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return <AppModal title={title} subtitle={subtitle} eyebrow="Gestão de benefícios" onClose={onClose} size="md">{children}</AppModal>;
}

export default function FreebetsWorkspace({ freebets, parceiros, houses, procedimentos }: { freebets: Freebet[]; parceiros: ParceiroOption[]; houses: HouseOption[]; procedimentos: string[] }) {
  const [tab, setTab] = useState<"todas" | "URGENTE" | "PENDENTE" | "EXTRAIDA" | "EXPIRADA">("todas");
  const [filtroCasa, setFiltroCasa] = useState("");
  const [filtroParceiro, setFiltroParceiro] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  // Freebet sendo editada (null = ninguém). Reaproveita o mesmo modal do cadastro.
  const [editando, setEditando] = useState<Freebet | null>(null);

  const stats = useMemo(() => {
    const pendentes = freebets.filter((f) => f.status === "PENDENTE");
    const extraidas = freebets.filter((f) => f.status === "EXTRAIDA");
    const comValor = extraidas.filter((f) => f.valorExtraido != null && f.valor > 0);
    const urgentes = pendentes.filter(freebetUrgente);
    const vencidasPendentes = urgentes.filter((f) => f.expiraEm && diasAteExpirar(f.expiraEm) < 0);
    return {
      ativasValor: pendentes.reduce((s, f) => s + f.valor, 0),
      disponiveis: pendentes.length,
      extraidasCount: extraidas.length,
      extraidoValor: extraidas.reduce((s, f) => s + (f.valorExtraido ?? 0), 0),
      conversaoMedia: comValor.length ? (comValor.reduce((s, f) => s + f.valorExtraido! / f.valor, 0) / comValor.length) * 100 : 0,
      temConversao: comValor.length > 0,
      expiradas: freebets.filter((f) => f.status === "EXPIRADA").length,
      urgentes: urgentes.length,
      vencidasPendentes: vencidasPendentes.length,
      aVencer: urgentes.length - vencidasPendentes.length,
    };
  }, [freebets]);

  const alertas = useMemo(
    () => freebets
      .filter(freebetUrgente)
      .sort((a, b) => Date.parse(a.expiraEm!) - Date.parse(b.expiraEm!)),
    [freebets],
  );

  const casaOptions = useMemo<FilterOption[]>(
    () => [...new Set(freebets.map((f) => f.casaNome))].sort((a, b) => a.localeCompare(b, "pt-BR")).map((c) => ({ value: c, label: c })),
    [freebets],
  );
  const parceiroOptions = useMemo<FilterOption[]>(
    () => [...new Set(freebets.map((f) => f.parceiroNome).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, "pt-BR")).map((p) => ({ value: p, label: p })),
    [freebets],
  );

  const filtradas = useMemo(() => {
    const list = freebets.filter((f) => {
      if (tab === "URGENTE" && !freebetUrgente(f)) return false;
      if (tab !== "todas" && tab !== "URGENTE" && f.status !== tab) return false;
      if (filtroCasa && f.casaNome !== filtroCasa) return false;
      if (filtroParceiro && f.parceiroNome !== filtroParceiro) return false;
      return true;
    });
    // Pendentes primeiro, ordenadas pela validade mais próxima (urgência no topo).
    return list.sort((a, b) => {
      const wa = a.status === "PENDENTE" ? 0 : 1;
      const wb = b.status === "PENDENTE" ? 0 : 1;
      if (wa !== wb) return wa - wb;
      const ea = a.expiraEm ? Date.parse(a.expiraEm) : Infinity;
      const eb = b.expiraEm ? Date.parse(b.expiraEm) : Infinity;
      return ea - eb;
    });
  }, [freebets, tab, filtroCasa, filtroParceiro]);

  const TABS: { key: typeof tab; label: string; count: number }[] = [
    { key: "todas", label: "Todas", count: freebets.length },
    { key: "URGENTE", label: "Urgentes", count: stats.urgentes },
    { key: "PENDENTE", label: "Disponíveis", count: stats.disponiveis },
    { key: "EXTRAIDA", label: "Extraídas", count: stats.extraidasCount },
    { key: "EXPIRADA", label: "Expiradas", count: stats.expiradas },
  ];
  const temFiltro = filtroCasa || filtroParceiro;

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {alertas.length > 0 && (
        <section
          role="alert"
          className={`overflow-hidden rounded-2xl border ${stats.vencidasPendentes > 0 ? "border-negative/40 bg-negative/[0.07]" : "border-warning/40 bg-warning/[0.07]"}`}
        >
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${stats.vencidasPendentes > 0 ? "bg-negative/15 text-negative" : "bg-warning/15 text-warning"}`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className={`text-sm font-black ${stats.vencidasPendentes > 0 ? "text-negative" : "text-warning"}`}>
                {stats.vencidasPendentes > 0
                  ? `${stats.vencidasPendentes} ${stats.vencidasPendentes === 1 ? "freebet venceu" : "freebets venceram"} sem extração`
                  : `${stats.aVencer} ${stats.aVencer === 1 ? "freebet vence" : "freebets vencem"} nos próximos 3 dias`}
              </h2>
              <p className="mt-1 text-xs text-text-2">
                {stats.vencidasPendentes > 0 && stats.aVencer > 0
                  ? `Além das vencidas, ${stats.aVencer} ainda ${stats.aVencer === 1 ? "vence" : "vencem"} em até 3 dias. Extraia ou atualize o status para não perder o controle.`
                  : stats.vencidasPendentes > 0
                    ? "Atualize o status dessas freebets e confirme se o benefício ainda pode ser utilizado."
                    : "Priorize a extração dessas freebets antes que o prazo termine."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {alertas.slice(0, 4).map((freebet) => {
                  const dias = diasAteExpirar(freebet.expiraEm!);
                  const prazo = dias < 0 ? "vencida" : dias === 0 ? "vence hoje" : `vence em ${dias}d`;
                  return (
                    <span key={freebet.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface/70 px-2.5 py-1.5 text-[11px]">
                      <b className="max-w-28 truncate text-text">{freebet.casaNome}</b>
                      <span className="text-muted">{brl(freebet.valor)}</span>
                      <span className={dias < 0 ? "font-bold text-negative" : "font-bold text-warning"}>{prazo}</span>
                    </span>
                  );
                })}
                {alertas.length > 4 && <span className="px-2 py-1.5 text-[11px] font-bold text-muted">+{alertas.length - 4} outras</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setTab("URGENTE"); setFiltroCasa(""); setFiltroParceiro(""); }}
              className={`h-10 shrink-0 rounded-xl px-4 text-xs font-black transition ${stats.vencidasPendentes > 0 ? "bg-negative text-white hover:brightness-110" : "bg-warning text-black hover:brightness-110"}`}
            >
              Ver urgentes
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="card-featured rounded-2xl border p-4">
          <p className="mono-label">Freebets ativas</p>
          <p className="mt-3 text-2xl font-black tabular-nums">{brl(stats.ativasValor)}</p>
          <p className="mt-1 text-[11px] text-white/75">{stats.disponiveis} disponíveis</p>
        </article>
        <Metric label="Extraído" value={brl(stats.extraidoValor)} tone="positive" detail={`${stats.extraidasCount} extraídas`} />
        <Metric label="Conversão média" value={stats.temConversao ? `${stats.conversaoMedia.toFixed(0)}%` : "—"} tone="info" detail="Do valor em dinheiro" />
        <Metric
          label="A vencer (3 dias)"
          value={String(stats.aVencer)}
          tone={stats.urgentes > 0 ? "warning" : "positive"}
          detail={stats.vencidasPendentes > 0 ? `${stats.vencidasPendentes} vencidas pendentes` : "Freebets a extrair logo"}
        />
      </section>

      {/* Filtros + Nova */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${tab === t.key ? "bg-accent text-accent-ink" : "text-text-2 hover:text-text"}`}>
              {t.label} <span className={tab === t.key ? "opacity-80" : "text-muted"}>{t.count}</span>
            </button>
          ))}
        </div>
        <FilterCombo key={`casa-${filtroCasa}`} options={casaOptions} value={filtroCasa} onChange={setFiltroCasa} allLabel="Todas as casas" placeholder="Todas as casas" />
        <FilterCombo key={`parceiro-${filtroParceiro}`} options={parceiroOptions} value={filtroParceiro} onChange={setFiltroParceiro} allLabel="Todos os parceiros" placeholder="Todos os parceiros" />
        {temFiltro ? <button onClick={() => { setFiltroCasa(""); setFiltroParceiro(""); }} className="h-9 rounded-lg border border-border px-3 text-xs font-semibold text-text-2 hover:border-border-strong hover:text-text">Limpar</button> : null}
        <button onClick={() => setAddOpen(true)} className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-black text-accent-ink transition hover:bg-accent-hover"><PlusIcon /> Nova Freebet</button>
      </div>

      {freebets.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-2xl">🎁</span>
            <h3 className="mt-4 text-base font-extrabold">Nenhuma freebet registrada</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">Toda vez que ganhar uma freebet numa missão ou promoção, registre aqui com a casa, o valor, o procedimento e a validade — assim você nunca perde o prazo.</p>
          </div>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center text-sm text-muted">Nenhuma freebet com esses filtros.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((f) => <FreebetCard key={f.id} freebet={f} onEditar={setEditando} />)}
        </div>
      )}

      {addOpen && <NovaFreebetModal parceiros={parceiros} houses={houses} procedimentos={procedimentos} onClose={() => setAddOpen(false)} />}
      {editando && (
        // A `key` força o formulário a renascer com os dados da freebet escolhida.
        <NovaFreebetModal
          key={editando.id}
          parceiros={parceiros}
          houses={houses}
          procedimentos={procedimentos}
          freebet={editando}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function FreebetCard({ freebet, onEditar }: { freebet: Freebet; onEditar: (f: Freebet) => void }) {
  const validade = validadeInfo(freebet.expiraEm, freebet.status);
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-border-strong">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1">
          {freebet.casaLogo ? (
            <img src={freebet.casaLogo} alt="" className="h-4 w-4 shrink-0 rounded object-contain" />
          ) : (
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-surface-3 text-[8px] font-bold text-muted">{freebet.casaNome.charAt(0)}</span>
          )}
          <span className="truncate text-[11px] font-bold uppercase tracking-wide text-text">{freebet.casaNome}</span>
        </span>
        <FreebetStatus key={`${freebet.id}-${freebet.status}`} id={freebet.id} value={freebet.status} className="ml-auto" />
      </div>

      <div className="flex items-end justify-between gap-2 px-4 pt-3">
        <div>
          <p className="mono-label text-muted">Valor</p>
          <p className="text-2xl font-black tabular-nums text-accent">{brl(freebet.valor)}</p>
        </div>
        {freebet.tipo && <span className="mb-1 rounded-md bg-surface-2 px-2 py-1 text-[10px] font-bold text-text-2">{freebet.tipo}</span>}
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 py-3">
        <Info label="Parceiro" value={freebet.parceiroNome ?? "—"} />
        <Info label="Procedimento" value={freebet.procedimento ?? "—"} />
        <Info label="Validade" value={validade?.hint ?? "Sem validade"} tone={validade?.tone} />
        <Info label="Requisito" value={freebet.requisito ?? "—"} />
      </div>

      {freebet.status === "EXTRAIDA" && (
        <div className="px-3 pb-3">
          <ExtraidoField key={`${freebet.id}-${freebet.valorExtraido ?? "novo"}`} id={freebet.id} valor={freebet.valor} valorExtraido={freebet.valorExtraido} />
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-border px-4 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted">{freebet.notas || "Sem observações"}</span>
        <button
          type="button"
          onClick={() => onEditar(freebet)}
          title="Editar freebet"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-bold text-text-2 transition hover:border-accent/50 hover:text-accent"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          Editar
        </button>
        <DeleteFreebet id={freebet.id} />
      </div>
    </article>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 px-3 py-2">
      <p className="mono-label text-muted">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold ${tone ?? ""}`} title={value}>{value}</p>
    </div>
  );
}

function ExtraidoField({ id, valor, valorExtraido }: { id: string; valor: number; valorExtraido: number | null }) {
  const [val, setVal] = useState(valorExtraido != null ? String(valorExtraido).replace(".", ",") : "");
  const savedRef = useRef(valorExtraido);
  const [pending, startTransition] = useTransition();

  const commit = () => {
    const num = parseMoney(val);
    if (num === (savedRef.current ?? 0)) return;
    savedRef.current = num;
    startTransition(() => setFreebetExtraidoAction(id, num));
  };

  const live = parseMoney(val);
  const pct = valor > 0 && val.trim() ? (live / valor) * 100 : null;

  return (
    <div className="rounded-xl border border-positive/25 bg-positive/[0.05] px-3 py-2 focus-within:border-positive">
      <div className="flex items-center justify-between">
        <p className="mono-label text-muted">Valor extraído</p>
        {pct != null ? <span className={`mono-label font-bold ${pct >= 70 ? "text-positive" : "text-warning"}`}>{pct.toFixed(0)}% conversão</span> : pending ? <span className="mono-label text-muted">salvando…</span> : null}
      </div>
      <div className="mt-0.5 flex items-center gap-1">
        <span className="text-sm text-muted">R$</span>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          inputMode="decimal"
          placeholder="0,00"
          className="w-full bg-transparent text-sm font-black tabular-nums outline-none placeholder:font-normal placeholder:text-muted"
        />
      </div>
    </div>
  );
}

function FreebetStatus({ id, value, className = "" }: { id: string; value: string; className?: string }) {
  const [current, setCurrent] = useState(STATUS_META[value] ? value : "PENDENTE");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const meta = STATUS_META[current];
  const pick = (key: string) => {
    setOpen(false);
    if (key === current) return;
    setCurrent(key);
    startTransition(() => setFreebetStatusAction(id, key));
  };

  return (
    <div className={`relative shrink-0 ${className}`} ref={wrapRef}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold transition ${meta.pill} ${pending ? "opacity-60" : ""}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
        <svg viewBox="0 0 24 24" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-36 rounded-lg border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          {STATUS_ORDER.map((key) => {
            const s = STATUS_META[key];
            const active = key === current;
            return (
              <button key={key} type="button" onClick={() => pick(key)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${active ? "bg-accent/12 font-semibold text-accent" : "text-text-2 hover:bg-white/5"}`}>
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

function DeleteFreebet({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button type="button" disabled={pending} onClick={() => startTransition(() => deleteFreebetAction(id))} className="rounded-md bg-negative/15 px-2 py-1 text-[11px] font-bold text-negative hover:bg-negative/25 disabled:opacity-50">Excluir</button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-1.5 py-1 text-[11px] text-muted hover:text-text">Não</button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} title="Excluir freebet" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-negative/10 hover:text-negative">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
    </button>
  );
}

/**
 * Cadastro de freebet. Serve pra CRIAR (sem `freebet`) e pra EDITAR (com
 * `freebet`) — os campos são os mesmos, então um formulário só evita duas
 * telas que precisariam ser mantidas em sincronia.
 */
function NovaFreebetModal({ parceiros, houses, procedimentos, freebet, onClose }: { parceiros: ParceiroOption[]; houses: HouseOption[]; procedimentos: string[]; freebet?: Freebet; onClose: () => void }) {
  const editando = !!freebet;
  const formRef = useRef<HTMLFormElement>(null);
  // A validade vem como ISO do servidor; o DateField trabalha com "aaaa-mm-dd".
  const [expiraEm, setExpiraEm] = useState(freebet?.expiraEm ? freebet.expiraEm.slice(0, 10) : "");
  const [error, action, pending] = useActionState(
    async (_previous: string | undefined, formData: FormData) => {
      const result = editando
        ? await editarFreebetAction(undefined, formData)
        : await addFreebetAction(undefined, formData);
      if (!result) onClose();
      return result;
    },
    undefined,
  );
  return (
    <Modal
      title={editando ? "Editar freebet" : "Nova Freebet"}
      subtitle={editando ? "Corrija o que estiver errado e salve." : "Preencha os dados da freebet. Campos com * são obrigatórios."}
      onClose={onClose}
    >
      <form ref={formRef} action={action} className="space-y-3 p-5">
        {editando && <input type="hidden" name="id" value={freebet.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1"><span className="mono-label text-muted">Casa *</span>
            <HouseCombobox houses={houses} inicial={freebet?.casaNome ?? ""} />
          </label>
          <label className="block space-y-1"><span className="mono-label text-muted">Parceiro</span>
            <select name="parceiroId" className={inputClass} defaultValue={freebet?.parceiroId ?? ""}>
              <option value="">Sem parceiro</option>
              {parceiros.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1"><span className="mono-label text-muted">Valor *</span>
            <input name="valor" inputMode="decimal" placeholder="R$ 0,00" className={inputClass} required defaultValue={freebet ? String(freebet.valor).replace(".", ",") : ""} />
          </label>
          <label className="block space-y-1"><span className="mono-label text-muted">Tipo</span>
            <select name="tipo" defaultValue={freebet?.tipo ?? "Missão"} className={inputClass}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <label className="block space-y-1"><span className="mono-label text-muted">Procedimento (como ganhou)</span>
          <input name="procedimento" list="procedimentos-list" placeholder="Ex.: Aposta ganha, Missão da rodada, Depósito…" autoComplete="off" className={inputClass} defaultValue={freebet?.procedimento ?? ""} />
          <datalist id="procedimentos-list">
            {procedimentos.map((p) => <option key={p} value={p} />)}
          </datalist>
        </label>

        <label className="block space-y-1"><span className="mono-label text-muted">Requisito / condição</span>
          <input name="requisito" placeholder="Ex.: odd mín. 1.80, rollover 1x, só em Aviator…" className={inputClass} defaultValue={freebet?.requisito ?? ""} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="block space-y-1"><span className="mono-label text-muted">Validade</span>
            <DateField name="expiraEm" value={expiraEm} onChange={setExpiraEm} className="w-full" />
          </div>
          <label className="block space-y-1"><span className="mono-label text-muted">Observações</span>
            <input name="notas" placeholder="Opcional" className={inputClass} defaultValue={freebet?.notas ?? ""} />
          </label>
        </div>

        {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative" aria-live="polite">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-bold text-muted hover:text-text">Cancelar</button>
          <button type="submit" disabled={pending} className="h-9 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink hover:bg-accent-hover disabled:opacity-50">{pending ? "Salvando…" : editando ? "Salvar alterações" : "Salvar freebet"}</button>
        </div>
      </form>
    </Modal>
  );
}

function HouseCombobox({ houses, inicial = "" }: { houses: HouseOption[]; inicial?: string }) {
  // `inicial` preenche o campo ao editar uma freebet existente.
  const [query, setQuery] = useState(inicial);
  const [selected, setSelected] = useState(inicial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = q ? houses.filter((h) => normalize(h.name).includes(q)) : houses;
    return list.slice(0, 60);
  }, [houses, query]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false); };
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
            <button key={h.name} type="button" onClick={() => pick(h.name)} onMouseEnter={() => setActive(i)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${i === active ? "bg-accent/12 text-accent" : "text-text-2 hover:bg-white/5"}`}>
              {h.logoUrl ? <img src={h.logoUrl} alt="" className="h-5 w-5 shrink-0 rounded bg-surface-3 object-contain" /> : <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-surface-3 text-[8px] font-bold text-muted">{h.name.charAt(0)}</span>}
              <span className="truncate">{h.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterCombo({ options, value, onChange, allLabel, placeholder }: { options: FilterOption[]; value: string; onChange: (v: string) => void; allLabel: string; placeholder: string }) {
  const [query, setQuery] = useState(() => options.find((option) => option.value === value)?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return (q ? options.filter((o) => normalize(o.label).includes(q)) : options).slice(0, 60);
  }, [options, query]);

  const pick = (option: FilterOption) => { onChange(option.value); setQuery(option.label); setOpen(false); };
  const clear = () => { onChange(""); setQuery(""); setOpen(false); };

  return (
    <div className="relative w-44" ref={wrapRef}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
          else if (e.key === "Enter") { e.preventDefault(); if (active >= 0 && results[active]) pick(results[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none transition focus:border-accent"
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <button type="button" onClick={clear} className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors ${!value ? "bg-accent/12 font-semibold text-accent" : "text-text-2 hover:bg-white/5"}`}>{allLabel}</button>
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">Nada encontrado.</p>
          ) : results.map((option, i) => (
            <button key={option.value} type="button" onClick={() => pick(option)} onMouseEnter={() => setActive(i)} className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors ${i === active ? "bg-accent/12 text-accent" : value === option.value ? "text-accent" : "text-text-2 hover:bg-white/5"}`}>
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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
