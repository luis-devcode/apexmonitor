import Link from "next/link";
import { BrandMark, BrandName } from "@/components/Brand";
import { PLANOS, brl, economiaPct } from "@/lib/planos";
import AssinarWorkspace from "./AssinarWorkspace";

export const dynamic = "force-dynamic";

export default async function AssinarPage({ searchParams }: { searchParams: Promise<{ erro?: string; plano?: string }> }) {
  const sp = await searchParams;
  const planos = PLANOS.map((plano) => ({
    id: plano.id,
    nome: plano.nome,
    meses: plano.meses,
    economia: economiaPct(plano),
    valorFmt: brl(plano.valor),
    valorCheioFmt: brl(plano.valorCheio),
    porMesFmt: brl(plano.valor / plano.meses),
  }));

  return (
    <div className="checkout-shell relative min-h-dvh overflow-hidden bg-bg text-text">
      <div className="checkout-wordmark" aria-hidden="true">APEX</div>

      <header className="relative z-10 border-b border-border bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="ApexMonitor — página inicial" className="flex min-h-11 items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <BrandName className="text-[12px] sm:text-[13px]" />
          </Link>
          <Link href="/" className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold text-text-2 transition-colors hover:text-text">
            <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Plataforma completa em todos os planos
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.045em] sm:text-5xl lg:text-6xl">Um plano para cada fase<br /><span className="bg-gradient-to-r from-accent via-[#7eb5ff] to-info bg-clip-text text-transparent">da sua operação.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-2">Todos os planos liberam a plataforma completa. Você escolhe apenas o período — e quanto deseja economizar.</p>
        </div>

        {sp.erro && (
          <p role="alert" className="mx-auto mt-8 max-w-2xl rounded-xl border border-negative/25 bg-negative/10 px-4 py-3 text-center text-sm font-semibold text-negative">{sp.erro}</p>
        )}

        <AssinarWorkspace planos={planos} planoInicial={sp.plano} />
      </main>

      <footer className="relative z-10 border-t border-border px-4 py-7 text-center text-[10px] leading-5 text-muted sm:px-6">
        Pagamento processado com segurança pelo Asaas. Só o plano mensal no cartão renova automaticamente; trimestral e anual são cobrança única.<br />
        Ferramenta de análise e gestão. Apostas envolvem risco. Jogue com responsabilidade. +18.
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-bold text-text-2">
          <Link href="/privacidade" className="hover:text-text">Privacidade</Link>
          <Link href="/cookies" className="hover:text-text">Cookies</Link>
          <Link href="/termos" className="hover:text-text">Termos de Uso</Link>
        </div>
      </footer>
    </div>
  );
}
