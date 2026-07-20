import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark, BrandName } from "@/components/Brand";
import { CookiePreferencesButton } from "@/components/CookiePreferences";

type LegalShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-black tracking-tight text-text sm:text-2xl">{title}</h2>
      <div className="legal-copy mt-4 space-y-4 text-sm leading-7 text-text-2">{children}</div>
    </section>
  );
}

export default function LegalShell({ eyebrow, title, description, updatedAt, children }: LegalShellProps) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="ApexMonitor — início" className="flex min-h-11 items-center gap-2.5"><BrandMark className="h-8 w-8" /><BrandName className="text-[12px] sm:text-[13px]" /></Link>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-text-2 transition hover:text-text">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="rounded-3xl border border-border bg-surface/55 p-6 sm:p-10">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-2">{description}</p>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-muted">Última atualização: {updatedAt}</p>
        </div>

        <nav aria-label="Documentos legais" className="my-6 grid gap-2 sm:grid-cols-3">
          <Link href="/privacidade" className="min-h-11 content-center rounded-xl border border-border bg-surface/45 px-4 text-center text-xs font-black text-text-2 transition hover:border-accent/35 hover:text-text">Privacidade</Link>
          <Link href="/cookies" className="min-h-11 content-center rounded-xl border border-border bg-surface/45 px-4 text-center text-xs font-black text-text-2 transition hover:border-accent/35 hover:text-text">Cookies</Link>
          <Link href="/termos" className="min-h-11 content-center rounded-xl border border-border bg-surface/45 px-4 text-center text-xs font-black text-text-2 transition hover:border-accent/35 hover:text-text">Termos de Uso</Link>
        </nav>

        <article className="space-y-8 rounded-3xl border border-border bg-surface/38 p-6 sm:p-10">{children}</article>
      </main>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/privacidade" className="hover:text-text">Privacidade</Link>
          <Link href="/cookies" className="hover:text-text">Cookies</Link>
          <Link href="/termos" className="hover:text-text">Termos</Link>
          <CookiePreferencesButton className="hover:text-text" />
        </div>
        <p className="mt-4">© {new Date().getFullYear()} ApexMonitor</p>
      </footer>
    </div>
  );
}
