"use client";

import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import AppModal from "@/components/AppModal";
import { addParceiroAction, deleteParceiroAction, setParceiroAtivoAction, updateParceiroAction } from "./actions";

export type ParceiroDefaults = {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  custoValor: number;
  custoPeriodo: string | null;
};

const inputClass = "h-11 w-full rounded-xl border border-border bg-bg/45 px-3.5 text-sm text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] outline-none transition placeholder:text-muted/80 hover:border-border-strong focus:border-accent/70 focus:bg-surface-2 focus:ring-4 focus:ring-accent/10";

const maskCpf = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

function PlusIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return <AppModal title={title} subtitle={subtitle} eyebrow="Gestão de parceiros" onClose={onClose} size="lg">{children}</AppModal>;
}

export function ParceiroForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [cpf, setCpf] = useState("");
  const [error, action, pending] = useActionState(
    async (_previous: string | undefined, formData: FormData) => {
      const result = await addParceiroAction(undefined, formData);
      if (!result) {
        formRef.current?.reset();
        setCpf("");
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-black text-accent-ink transition hover:bg-accent-hover"><PlusIcon /> Adicionar parceiro</button>
      {open && (
        <Modal title="Adicionar parceiro" subtitle="Cadastre os dados da pessoa e defina o custo recorrente do CPF." onClose={() => setOpen(false)}>
          <form ref={formRef} action={action} className="p-5 sm:p-6">
            <ParceiroFields cpf={cpf} setCpf={setCpf} />
            {error && <p className="mt-4 rounded-xl border border-negative/20 bg-negative/10 px-3.5 py-3 text-xs font-semibold text-negative" aria-live="polite">{error}</p>}
            <FormFooter onCancel={() => setOpen(false)} pending={pending} submitLabel="Salvar parceiro" pendingLabel="Salvando…" />
          </form>
        </Modal>
      )}
    </>
  );
}

function ParceiroFields({ cpf, setCpf, defaults }: { cpf: string; setCpf: (v: string) => void; defaults?: ParceiroDefaults }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-2/45 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-info/20 bg-info/10 text-info">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6h5M16 10h4" /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-text">Identificação do parceiro</h3>
              <span className="rounded-md border border-border bg-bg/45 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-muted">Dados pessoais</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">Informe quem é o titular do CPF usado nas contas das casas.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3.5">
          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 mono-label text-muted">Nome completo <span className="text-accent">*</span></span>
            <input name="nome" defaultValue={defaults?.nome ?? ""} placeholder="Ex.: João da Silva" autoComplete="name" className={inputClass} autoFocus required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="mono-label text-muted">CPF <span className="normal-case tracking-normal text-muted/70">(opcional)</span></span>
              <input name="documento" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" className={inputClass} />
            </label>
            <label className="block space-y-1.5">
              <span className="mono-label text-muted">Email <span className="normal-case tracking-normal text-muted/70">(opcional)</span></span>
              <input name="email" type="email" defaultValue={defaults?.email ?? ""} autoComplete="email" placeholder="email@exemplo.com" className={inputClass} />
            </label>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.10] via-surface-2/70 to-surface-2/45 p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent/12 text-accent">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14h2" /></svg>
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-text">Pagamento do CPF</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">Cadastre o valor combinado. Ele entra automaticamente nos custos operacionais.</p>
          </div>
        </div>

        <div className="relative mt-4 grid gap-3 sm:grid-cols-[1.2fr_.8fr]">
          <label className="block space-y-1.5">
            <span className="mono-label text-muted">Valor pago</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-2">R$</span>
              <input name="custoValor" defaultValue={defaults && defaults.custoValor > 0 ? String(defaults.custoValor).replace(".", ",") : ""} inputMode="decimal" placeholder="0,00" className={`${inputClass} pl-10 font-bold tabular-nums`} />
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="mono-label text-muted">Frequência</span>
            <select name="custoPeriodo" defaultValue={defaults?.custoPeriodo ?? "MES"} className={`${inputClass} cursor-pointer`}>
              <option value="MES">Mensal</option>
              <option value="SEMANA">Semanal</option>
              <option value="DIA">Diário</option>
            </select>
          </label>
        </div>

        <div className="relative mt-3 flex items-center gap-2 rounded-xl border border-border/70 bg-bg/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
          Não há pagamento? Deixe o valor em branco; você poderá preencher depois.
        </div>
      </section>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-bg/25 px-3.5 py-3 text-[11px] leading-relaxed text-muted">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-positive" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        Ao salvar, o parceiro ficará disponível para vincular às contas das casas, freebets e operações.
      </div>
    </div>
  );
}

function FormFooter({ onCancel, pending, submitLabel, pendingLabel }: { onCancel: () => void; pending: boolean; submitLabel: string; pendingLabel: string }) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
      <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-transparent px-4 text-xs font-bold text-muted transition hover:border-border hover:bg-surface-2 hover:text-text">Cancelar</button>
      <button type="submit" disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-accent-hover to-accent px-5 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_28px_rgba(37,99,235,0.24)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-50">
        {pending ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        )}
        {pending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}

export function ParceiroEditButton({ parceiro }: { parceiro: ParceiroDefaults }) {
  const [open, setOpen] = useState(false);
  const [cpf, setCpf] = useState(parceiro.documento ? maskCpf(parceiro.documento) : "");
  const [error, action, pending] = useActionState(
    async (_previous: string | undefined, formData: FormData) => {
      const result = await updateParceiroAction(undefined, formData);
      if (!result) setOpen(false);
      return result;
    },
    undefined,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => { setCpf(parceiro.documento ? maskCpf(parceiro.documento) : ""); setOpen(true); }}
        className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-text-2 transition hover:border-accent hover:text-accent"
      >
        Editar
      </button>
      {open && (
        <Modal title="Editar parceiro" subtitle="Atualize os dados pessoais e o custo recorrente do CPF." onClose={() => setOpen(false)}>
          <form action={action} className="p-5 sm:p-6">
            <input type="hidden" name="id" value={parceiro.id} />
            <ParceiroFields cpf={cpf} setCpf={setCpf} defaults={parceiro} />
            {error && <p className="mt-4 rounded-xl border border-negative/20 bg-negative/10 px-3.5 py-3 text-xs font-semibold text-negative" aria-live="polite">{error}</p>}
            <FormFooter onCancel={() => setOpen(false)} pending={pending} submitLabel="Salvar alterações" pendingLabel="Salvando…" />
          </form>
        </Modal>
      )}
    </>
  );
}

export function ParceiroActions({ id, ativo, podeExcluir }: { id: string; ativo: boolean; podeExcluir: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => setParceiroAtivoAction(id, !ativo))}
        className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-text-2 transition hover:border-border-strong hover:text-text disabled:opacity-50"
      >
        {ativo ? "Arquivar" : "Reativar"}
      </button>
      {podeExcluir && (confirming ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => deleteParceiroAction(id))}
            className="rounded-md bg-negative/15 px-2 py-1 text-[11px] font-bold text-negative transition hover:bg-negative/25 disabled:opacity-50"
          >
            Confirmar
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-1.5 py-1 text-[11px] text-muted hover:text-text">Não</button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          title="Excluir parceiro"
          className="grid h-[26px] w-[26px] place-items-center rounded-md text-muted transition hover:bg-negative/10 hover:text-negative"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
        </button>
      ))}
    </div>
  );
}
