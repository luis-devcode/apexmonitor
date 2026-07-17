import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ComissoesWorkspace from "./ComissoesWorkspace";

export const dynamic = "force-dynamic";

export default async function ComissoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  // Todos os pagamentos que geraram comissão, com o afiliado e o cliente.
  const pagamentos = await prisma.pagamento.findMany({
    where: { afiliadoId: { not: null }, comissaoValor: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      valor: true,
      comissaoValor: true,
      comissaoPaga: true,
      comissaoPagaEm: true,
      createdAt: true,
      afiliado: { select: { id: true, nome: true, cupom: true, chavePix: true } },
      user: { select: { nome: true, email: true } },
    },
  });

  // Agrupa por afiliado: quanto a pagar (pendente) e quanto já foi repassado.
  type Grupo = {
    id: string;
    nome: string;
    cupom: string;
    chavePix: string | null;
    aPagar: number;
    jaPago: number;
    pendentes: { cliente: string; valor: number; comissao: number; data: string }[];
  };
  const porAfiliado = new Map<string, Grupo>();

  for (const p of pagamentos) {
    if (!p.afiliado) continue;
    const g = porAfiliado.get(p.afiliado.id) ?? {
      id: p.afiliado.id,
      nome: p.afiliado.nome,
      cupom: p.afiliado.cupom,
      chavePix: p.afiliado.chavePix,
      aPagar: 0,
      jaPago: 0,
      pendentes: [],
    };
    if (p.comissaoPaga) {
      g.jaPago += p.comissaoValor;
    } else {
      g.aPagar += p.comissaoValor;
      g.pendentes.push({
        cliente: p.user.nome,
        valor: p.valor,
        comissao: p.comissaoValor,
        data: p.createdAt.toISOString(),
      });
    }
    porAfiliado.set(p.afiliado.id, g);
  }

  // Quem tem algo a receber primeiro, depois por nome.
  const grupos = [...porAfiliado.values()].sort((a, b) => b.aPagar - a.aPagar || a.nome.localeCompare(b.nome, "pt-BR"));
  const totalDevido = grupos.reduce((s, g) => s + g.aPagar, 0);

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Comissões</h1>
          <p className="hidden text-xs text-muted sm:block">Quanto você deve a cada afiliado.</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-bold text-amber-400">{totalDevido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted">Total a repassar</p>
        </div>
      </header>

      <ComissoesWorkspace grupos={grupos} />
    </AppShell>
  );
}
