import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { PLANOS, brl, economiaPct } from "@/lib/planos";
import ContaWorkspace from "./ContaWorkspace";

export const dynamic = "force-dynamic";

export default async function ContaPage() {
  // AppShell já garante sessão + assinatura ativa; aqui só lemos o usuário.
  const user = (await getCurrentUser())!;

  const agora = new Date();
  const diasRestantes = user.assinaturaAte
    ? Math.ceil((user.assinaturaAte.getTime() - agora.getTime()) / 86_400_000)
    : null;

  const planos = PLANOS.map((p) => ({
    id: p.id,
    nome: p.nome,
    meses: p.meses,
    valor: p.valor,
    valorCheio: p.valorCheio,
    economia: economiaPct(p),
    porMes: p.valor / p.meses,
    valorFmt: brl(p.valor),
    valorCheioFmt: brl(p.valorCheio),
    porMesFmt: brl(p.valor / p.meses),
  }));

  return (
    <AppShell>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 px-4 py-3.5 backdrop-blur-xl sm:px-5 md:px-7">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4">
          <div>
            <p className="mono-label mb-1 text-accent">Configurações</p>
            <h1 className="text-base font-extrabold tracking-[-0.02em] text-text">Minha Conta</h1>
          </div>
          <span className="hidden rounded-full border border-border bg-surface-2/60 px-3 py-1.5 text-[10px] font-bold text-muted sm:block">Perfil e assinatura</span>
        </div>
      </header>

      <ContaWorkspace
        nome={user.nome}
        email={user.email}
        role={user.role}
        plano={user.plano}
        diasRestantes={diasRestantes}
        vencimento={user.assinaturaAte ? user.assinaturaAte.toISOString() : null}
        planos={planos}
      />
    </AppShell>
  );
}
