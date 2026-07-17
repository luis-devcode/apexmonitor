import Link from "next/link";
import { BrandMark } from "@/components/Brand";

export const dynamic = "force-dynamic";

// Página de retorno após o pagamento no Asaas (callback successUrl). O acesso em
// si é liberado pelo WEBHOOK — esta tela só confirma pro cliente e o orienta.
export default function SucessoPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <BrandMark className="h-14 w-14 rounded-2xl" />
          <h1 className="text-xl font-black tracking-tight">Apex<span className="text-accent">Monitor</span></h1>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <h2 className="mt-4 text-lg font-extrabold">Pagamento recebido!</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-2">
            Assim que o pagamento for confirmado, você recebe no e-mail os dados de acesso
            (se for sua primeira assinatura) ou seu acesso já é renovado.
          </p>
          <p className="mt-1 text-xs text-muted">Pode levar alguns instantes. Confira também a caixa de spam.</p>
          <Link href="/login" className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-black text-accent-ink transition hover:bg-accent-hover">
            Ir para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
