import AppShell from "@/components/AppShell";
import { requireUserId } from "@/lib/auth";
import { CATEGORIA_CPF, porMes } from "@/lib/custos";
import { prisma } from "@/lib/prisma";
import CustosWorkspace, { type CustoItem } from "./CustosWorkspace";

export const dynamic = "force-dynamic";

export default async function CustosPage() {
  const userId = await requireUserId();
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [custosRaw, parceiros, lucroMesAgg] = await Promise.all([
    prisma.custo.findMany({ where: { userId }, orderBy: [{ ativo: "desc" }, { createdAt: "desc" }] }),
    prisma.parceiro.findMany({
      where: { userId, ativo: true },
      select: { id: true, nome: true, custoValor: true, custoPeriodo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.operacao.aggregate({
      where: { userId, status: "FINALIZADA", createdAt: { gte: inicioMes } },
      _sum: { lucroReal: true },
    }),
  ]);

  const custos: CustoItem[] = custosRaw.map((c) => ({
    id: c.id,
    descricao: c.descricao,
    categoria: c.categoria,
    valor: c.valor,
    periodo: c.periodo,
    diaVencimento: c.diaVencimento,
    ativo: c.ativo,
    notas: c.notas,
    mensal: porMes(c.valor, c.periodo),
    origem: "MANUAL",
  }));

  // O pagamento dos CPFs já foi digitado em Parceiros — aqui ele só é somado,
  // nunca redigitado. Cadastrar de novo seria contar o mesmo custo duas vezes.
  const custosCpf: CustoItem[] = parceiros
    .filter((p) => p.custoValor > 0)
    .map((p) => ({
      id: `parceiro-${p.id}`,
      descricao: p.nome,
      categoria: CATEGORIA_CPF.id,
      valor: p.custoValor,
      periodo: p.custoPeriodo ?? "MES",
      diaVencimento: null,
      ativo: true,
      notas: null,
      mensal: porMes(p.custoValor, p.custoPeriodo ?? "MES"),
      origem: "PARCEIRO",
    }));

  const lucroMes = lucroMesAgg._sum.lucroReal ?? 0;

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Custos</h1>
          <p className="hidden text-xs text-muted sm:block">O que a operação custa por mês — e quanto sobra de verdade.</p>
        </div>
      </header>

      <CustosWorkspace custos={[...custosCpf, ...custos]} lucroMes={lucroMes} />
    </AppShell>
  );
}
