import { BrandMark } from "@/components/Brand";
import { PLANOS, brl, economiaPct } from "@/lib/planos";
import AssinarWorkspace from "./AssinarWorkspace";

export const dynamic = "force-dynamic";

// Página PÚBLICA — estranho assina sem ter conta. Sem AppShell/guarda de sessão.
export default async function AssinarPage({ searchParams }: { searchParams: Promise<{ erro?: string; plano?: string }> }) {
  const sp = await searchParams;
  const planos = PLANOS.map((p) => ({
    id: p.id,
    nome: p.nome,
    meses: p.meses,
    economia: economiaPct(p),
    valorFmt: brl(p.valor),
    valorCheioFmt: brl(p.valorCheio),
    porMesFmt: brl(p.valor / p.meses),
  }));

  return (
    <div className="min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark className="h-14 w-14 rounded-2xl" />
          <div>
            <h1 className="text-2xl font-black tracking-tight">Apex<span className="text-accent">Monitor</span></h1>
            <p className="mt-1 text-sm text-muted">Odds em tempo real e o controle da sua operação, num só lugar.</p>
          </div>
        </div>

        {sp.erro && (
          <p className="mx-auto mb-5 max-w-xl rounded-xl border border-negative/20 bg-negative/10 px-4 py-3 text-center text-sm font-semibold text-negative">{sp.erro}</p>
        )}

        <AssinarWorkspace planos={planos} planoInicial={sp.plano} />

        <p className="mt-8 text-center text-[11px] text-muted">
          Pagamento processado pelo Asaas. Cartão renova automaticamente; Pix é por período.<br />
          Ferramenta de análise e gestão. Aposta envolve risco. Jogue com responsabilidade. +18.
        </p>
      </div>
    </div>
  );
}
