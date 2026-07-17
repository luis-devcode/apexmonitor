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
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Minha Conta</h1>
          <p className="hidden text-xs text-muted sm:block">Seus dados e sua assinatura.</p>
        </div>
      </header>

      <ContaWorkspace
        nome={user.nome}
        email={user.email}
        plano={user.plano}
        diasRestantes={diasRestantes}
        vencimento={user.assinaturaAte ? user.assinaturaAte.toISOString() : null}
        planos={planos}
      />
    </AppShell>
  );
}
