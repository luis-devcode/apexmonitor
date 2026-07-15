"use client";

import { useActionState, useState } from "react";
import { BrandMark } from "@/components/Brand";
import { criarAdminAction, loginAction } from "./actions";

const inputClass = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} title={show ? "Ocultar" : "Mostrar"} tabIndex={-1}
      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:text-text">
      {show ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A9.8 9.8 0 0 1 12 4c6 0 10 8 10 8a17 17 0 0 1-2.2 3.1M6.1 6.1A17 17 0 0 0 2 12s4 8 10 8a9.6 9.6 0 0 0 4.2-.9" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );
}

export default function LoginForm({ primeiroAcesso }: { primeiroAcesso: boolean }) {
  const [show, setShow] = useState(false);
  const [error, action, pending] = useActionState(
    primeiroAcesso ? criarAdminAction : loginAction,
    undefined,
  );

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      {/* O horizonte de luz: um arco fino aceso + o brilho que ele projeta. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
        <div className="absolute left-1/2 top-[-320px] h-[420px] w-[1200px] max-w-none -translate-x-1/2 rounded-[100%] border-b border-accent/50 shadow-[0_20px_80px_rgba(59,130,246,0.3)]" />
        <div className="absolute left-1/2 top-[-260px] h-[420px] w-[1000px] max-w-none -translate-x-1/2 rounded-[100%] bg-[radial-gradient(50%_60%_at_50%_100%,rgba(59,130,246,0.24),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Marca */}
        <div className="mb-6 flex flex-col items-center gap-4">
          <BrandMark className="h-14 w-14 rounded-2xl" />
          <div className="flex flex-col items-center gap-2.5 text-center">
            <span className="badge-pill mono-label text-[9px] text-accent">Odds &amp; Gestão</span>
            <h1 className="text-3xl font-black tracking-tight">
              Apex<span className="bg-gradient-to-r from-accent to-warning bg-clip-text text-transparent">Monitor</span>
            </h1>
            <p className="max-w-[260px] text-xs leading-relaxed text-muted">Odds em tempo real e controle da sua operação, num só lugar.</p>
          </div>
        </div>

        {/* Cartão */}
        <div className="panel rounded-2xl border border-border bg-surface p-6">
          {primeiroAcesso && (
            <div className="mb-4 rounded-xl border border-accent/25 bg-accent/[0.07] px-3.5 py-3">
              <p className="text-sm font-bold text-accent">Primeiro acesso</p>
              <p className="mt-0.5 text-xs text-text-2">Nenhuma conta existe ainda. Crie a conta de administrador.</p>
            </div>
          )}

          <form action={action} className="space-y-4">
            {primeiroAcesso && (
              <label className="block space-y-1.5">
                <span className="mono-label text-muted">Nome</span>
                <input name="nome" placeholder="Seu nome" className={inputClass} required autoFocus />
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="mono-label text-muted">{primeiroAcesso ? "Email" : "Email ou usuário"}</span>
              <input
                name="email"
                type={primeiroAcesso ? "email" : "text"}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={primeiroAcesso ? "voce@email.com" : "voce@email.com"}
                className={inputClass}
                required
                autoFocus={!primeiroAcesso}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="mono-label text-muted">Senha</span>
              <div className="relative">
                <input
                  name="senha"
                  type={show ? "text" : "password"}
                  autoComplete={primeiroAcesso ? "new-password" : "current-password"}
                  placeholder={primeiroAcesso ? "Mínimo 8 caracteres" : "••••••••"}
                  className={`${inputClass} pr-11`}
                  required
                />
                <EyeToggle show={show} onToggle={() => setShow((v) => !v)} />
              </div>
            </label>

            {error && (
              <p className="rounded-xl bg-negative/10 px-3.5 py-2.5 text-xs font-semibold text-negative" aria-live="polite">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-xl bg-gradient-to-b from-accent to-accent-deep text-sm font-black text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_32px_rgba(59,130,246,0.38)] transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Entrando…" : primeiroAcesso ? "Criar conta e entrar" : "Entrar"}
            </button>
          </form>

          {!primeiroAcesso && (
            <div className="mt-5 space-y-2 text-center">
              <p className="text-xs text-muted">
                Não tem conta? <span className="font-bold text-accent">Fale conosco</span>
              </p>
              <p className="text-xs text-muted">Esqueceu a senha? Fale com o suporte.</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted">
          Acesso exclusivo para assinantes.
        </p>
      </div>
    </div>
  );
}
