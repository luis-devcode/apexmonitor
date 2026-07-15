"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import AppModal from "@/components/AppModal";
import { addCasaAction, alterarDonoContaAction, registrarMovimentoAction } from "./actions";

type Conta = { id: string; casa: string; saldo: number; parceiro?: string | null };
type HouseOption = { name: string; logoUrl: string | null };
type PartnerOption = { id: string; nome: string; documento: string | null };

const inputClass = "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-text outline-none transition focus:border-accent";

function PlusIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return <AppModal title={title} subtitle={subtitle} eyebrow="Movimentação financeira" onClose={onClose} size="md">{children}</AppModal>;
}

export function MovimentoForm({ contas }: { contas: Conta[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("DEPOSITO");
  const [error, action, pending] = useActionState(
    async (_previous: string | undefined, formData: FormData) => {
      const result = await registrarMovimentoAction(undefined, formData);
      if (!result) {
        formRef.current?.reset();
        setTipo("DEPOSITO");
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <>
      <button type="button" disabled={contas.length === 0} onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-bold text-text-2 transition hover:border-border-strong hover:text-text disabled:cursor-not-allowed disabled:opacity-40"><PlusIcon /> Movimento</button>
      {open && (
        <Modal title="Registrar movimento" subtitle="Atualize o saldo de uma conta, seja sua ou de um parceiro." onClose={() => setOpen(false)}>
          <form ref={formRef} action={action} className="space-y-4 p-5">
            <label className="block space-y-1.5">
              <span className="mono-label text-muted">{tipo === "TRANSFERENCIA" ? "De qual conta" : "Conta"}</span>
              <select name="contaId" className={inputClass} required>
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.casa} · {conta.parceiro || "Minha banca"} · {conta.saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="mono-label text-muted">Tipo</span>
                <select name="tipo" value={tipo} onChange={(event) => setTipo(event.target.value)} className={inputClass}>
                  <option value="DEPOSITO">Depósito</option>
                  <option value="SAQUE">Saque</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="AJUSTE">Ajustar saldo</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="mono-label text-muted">{tipo === "AJUSTE" ? "Novo saldo" : "Valor"}</span>
                <input name="valor" inputMode="decimal" placeholder="0,00" className={inputClass} required />
              </label>
            </div>
            {tipo === "TRANSFERENCIA" && (
              <label className="block space-y-1.5">
                <span className="mono-label text-muted">Para qual conta</span>
                <select name="contaDestinoId" className={inputClass} required>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.casa} · {conta.parceiro || "Minha banca"} · {conta.saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block space-y-1.5"><span className="mono-label text-muted">Descrição opcional</span><input name="descricao" placeholder="Ex.: depósito via PIX" className={inputClass} /></label>
            {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative" aria-live="polite">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg px-4 text-xs font-bold text-muted hover:text-text">Cancelar</button>
              <button type="submit" disabled={pending} className="h-9 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink hover:bg-accent-hover disabled:opacity-50">{pending ? "Registrando…" : "Registrar movimento"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function CasaForm({ houses, parceiros }: { houses: HouseOption[]; parceiros: PartnerOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, action, pending] = useActionState(
    async (_previous: string | undefined, formData: FormData) => {
      const result = await addCasaAction(undefined, formData);
      if (!result) {
        formRef.current?.reset();
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-black text-accent-ink transition hover:bg-accent-hover"><PlusIcon /> Adicionar casa</button>
      {open && (
        <Modal title="Adicionar casa" subtitle="Cadastre a casa e escolha em qual CPF essa conta está aberta." onClose={() => setOpen(false)}>
          <form ref={formRef} action={action} className="space-y-4 p-5">
            <label className="block space-y-1.5">
              <span className="mono-label text-muted">Dono da conta</span>
              <select name="parceiroId" className={inputClass}>
                <option value="">Minha banca principal</option>
                {parceiros.map((parceiro) => <option key={parceiro.id} value={parceiro.id}>{parceiro.nome}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="mono-label text-muted">Casa de apostas</span>
              <select name="nome" className={inputClass} required>
                <option value="">Selecione uma casa</option>
                {houses.map((house) => <option key={house.name} value={house.name}>{house.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5"><span className="mono-label text-muted">Saldo atual</span><input name="saldoInicial" inputMode="decimal" placeholder="0,00" className={inputClass} /></label>
              <label className="block space-y-1.5"><span className="mono-label text-muted">Comissão %</span><input name="comissao" inputMode="decimal" placeholder="0" className={inputClass} /></label>
            </div>
            <p className="text-xs leading-relaxed text-muted">Cada CPF pode ter uma conta própria na mesma casa. O saldo inicial gera o primeiro registro do extrato.</p>
            {houses.length === 0 && <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">Nenhuma casa disponível no diretório de clones.</p>}
            {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative" aria-live="polite">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg px-4 text-xs font-bold text-muted hover:text-text">Cancelar</button>
              <button type="submit" disabled={pending || houses.length === 0} className="h-9 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink hover:bg-accent-hover disabled:opacity-50">{pending ? "Adicionando…" : "Adicionar à banca"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function ContaOwnerForm({
  contaId,
  casa,
  donoAtual,
  donoAtualId,
  parceiros,
}: {
  contaId: string;
  casa: string;
  donoAtual: string | null;
  donoAtualId: string | null;
  parceiros: PartnerOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, action, pending] = useActionState(
    async (_previous: string | undefined, formData: FormData) => {
      const result = await alterarDonoContaAction(undefined, formData);
      if (!result) setOpen(false);
      return result;
    },
    undefined,
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text-2 transition hover:border-border-strong hover:text-text">
        Alterar dono
      </button>
      {open && (
        <Modal title="Alterar dono da conta" subtitle={`Escolha em qual CPF a conta da ${casa} está aberta.`} onClose={() => setOpen(false)}>
          <form action={action} className="space-y-4 p-5">
            <input type="hidden" name="contaId" value={contaId} />
            <label className="block space-y-1.5">
              <span className="mono-label text-muted">Dono atual</span>
              <input value={donoAtual || "Minha banca principal"} readOnly className={`${inputClass} opacity-70`} />
            </label>
            <label className="block space-y-1.5">
              <span className="mono-label text-muted">Novo dono</span>
              <select name="parceiroId" className={inputClass} defaultValue={donoAtualId || ""}>
                <option value="">Minha banca principal</option>
                {parceiros.map((parceiro) => <option key={parceiro.id} value={parceiro.id}>{parceiro.nome}</option>)}
              </select>
            </label>
            <p className="text-xs leading-relaxed text-muted">A troca preserva saldo, extrato e operações da conta. Ela só muda quem é o dono/CPF vinculado.</p>
            {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative" aria-live="polite">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg px-4 text-xs font-bold text-muted hover:text-text">Cancelar</button>
              <button type="submit" disabled={pending} className="h-9 rounded-lg bg-accent px-4 text-xs font-black text-accent-ink hover:bg-accent-hover disabled:opacity-50">{pending ? "Salvando…" : "Salvar dono"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
