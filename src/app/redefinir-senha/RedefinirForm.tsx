"use client";

import { useActionState, useState } from "react";
import { BrandMark } from "@/components/Brand";
import { redefinirAction } from "./actions";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

export default function RedefinirForm({ token }: { token: string }) {
  const [show, setShow] = useState(false);
  const [error, action, pending] = useActionState(redefinirAction, undefined);

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark className="h-14 w-14 rounded-2xl" />
          <div>
            <h1 className="text-xl font-black tracking-tight">Apex<span className="text-accent">Monitor</span></h1>
            <p className="mono-label text-muted">Odds &amp; Gestão</p>
          </div>
        </div>

        <div className="panel rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-extrabold">Criar nova senha</h2>
          <p className="mt-1 text-sm leading-relaxed text-text-2">Escolha uma senha nova para sua conta.</p>

          <form action={action} className="mt-5 space-y-4">
            <input type="hidden" name="token" value={token} />

            <label className="block space-y-1.5">
              <span className="mono-label text-muted">Nova senha</span>
              <div className="relative">
                <input
                  name="novaSenha"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className={`${inputClass} pr-11`}
                  required
                  minLength={8}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  tabIndex={-1}
                  title={show ? "Ocultar" : "Mostrar"}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:text-text"
                >
                  {show ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A9.8 9.8 0 0 1 12 4c6 0 10 8 10 8a17 17 0 0 1-2.2 3.1M6.1 6.1A17 17 0 0 0 2 12s4 8 10 8a9.6 9.6 0 0 0 4.2-.9" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="mono-label text-muted">Confirmar nova senha</span>
              <input
                name="confirmaSenha"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repita a senha"
                className={inputClass}
                required
                minLength={8}
              />
            </label>

            {error && (
              <p className="rounded-xl bg-negative/10 px-3.5 py-2.5 text-xs font-semibold text-negative" aria-live="polite">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-xl bg-gradient-to-b from-accent to-accent-deep text-sm font-black text-accent-ink shadow-[0_10px_32px_rgba(59,130,246,0.38)] transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
