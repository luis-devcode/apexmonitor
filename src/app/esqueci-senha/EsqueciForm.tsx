"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BrandMark } from "@/components/Brand";
import { pedirResetAction } from "./actions";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

export default function EsqueciForm() {
  const [estado, action, pending] = useActionState(pedirResetAction, null);

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
          <h2 className="text-lg font-extrabold">Esqueci minha senha</h2>
          <p className="mt-1 text-sm leading-relaxed text-text-2">
            Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
          </p>

          <form action={action} className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="mono-label text-muted">E-mail</span>
              <input
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="voce@email.com"
                className={inputClass}
                required
                autoFocus
              />
            </label>

            {estado && (
              <p
                className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold ${estado.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-negative/10 text-negative"}`}
                aria-live="polite"
              >
                {estado.msg}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-xl bg-gradient-to-b from-accent to-accent-deep text-sm font-black text-accent-ink shadow-[0_10px_32px_rgba(59,130,246,0.38)] transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar link de redefinição"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted">
            <Link href="/login" className="font-bold text-accent transition hover:brightness-110">Voltar para o login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
