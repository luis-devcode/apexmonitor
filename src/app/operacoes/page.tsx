import AppShell from "@/components/AppShell";
import { requireUserId } from "@/lib/auth";
import { readEventOptionsForUser } from "@/lib/event-options";
import { houseLogoMap, housesForSelect, logoForHouse } from "@/lib/houses";
import { readCloneGroups } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";
import PlanilhaWorkspace from "./PlanilhaWorkspace";

export const dynamic = "force-dynamic";

export default async function PlanilhaPage({ searchParams }: { searchParams: Promise<{ nova?: string }> }) {
  const abrirNova = (await searchParams).nova === "1";
  const userId = await requireUserId();
  const [operacoesRaw, contasRaw, freebetsRaw, cloneGroups, eventos] = await Promise.all([
    prisma.operacao.findMany({
      where: { userId },
      include: {
        pernas: { include: { conta: { include: { casa: true, parceiro: true } } }, orderBy: { createdAt: "asc" } },
        freebetsUsadas: { include: { casa: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.conta.findMany({ where: { userId }, include: { casa: true, parceiro: true }, orderBy: [{ casa: { nome: "asc" } }] }),
    prisma.freebet.findMany({
      where: { userId, status: "PENDENTE", usoOperacaoId: null },
      include: { casa: true, parceiro: true },
      orderBy: [{ expiraEm: "asc" }, { createdAt: "desc" }],
    }),
    readCloneGroups(),
    readEventOptionsForUser(userId),
  ]);

  const cloneLogo = houseLogoMap(cloneGroups);
  const logoFor = (casa: string | null) => logoForHouse(cloneLogo, casa);

  const operacoes = operacoesRaw.map((o) => ({
    id: o.id,
    evento: o.evento,
    esporte: o.esporte,
    tipo: o.tipo,
    procedimento: o.procedimento,
    data: o.data.toISOString(),
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    stakeTotal: o.stakeTotal,
    lucroEsperado: o.lucroEsperado,
    lucroReal: o.lucroReal,
    casas: o.casas,
    notas: o.notas,
    pernas: o.pernas.map((p) => ({
      id: p.id,
      casa: p.casa,
      casaLogo: logoFor(p.casa),
      contaId: p.contaId,
      contaLabel: p.conta ? `${p.conta.parceiro?.nome ?? "Sem parceiro"} · ${p.conta.casa.nome}` : null,
      selecao: p.selecao,
      odd: p.odd,
      stake: p.stake,
      isLay: p.isLay,
      freebet: p.freebet,
      comissaoPct: p.comissaoPct,
      aumentoPct: p.aumentoPct,
      // Fallback pras pernas antigas, salvas antes do campo existir.
      risco: p.freebet ? 0 : p.risco > 0 ? p.risco : (p.isLay ? p.stake * Math.max(0, p.odd - 1) : p.stake),
      resultado: p.resultado,
      retorno: p.retorno,
    })),
    freebetUsada: o.freebetsUsadas[0] ? {
      id: o.freebetsUsadas[0].id,
      casaNome: o.freebetsUsadas[0].casa?.nome ?? "Sem casa",
      valor: o.freebetsUsadas[0].valor,
      valorExtraido: o.freebetsUsadas[0].valorExtraido,
    } : null,
  }));

  const contas = contasRaw.map((c) => ({
    id: c.id,
    casaNome: c.casa.nome,
    parceiroNome: c.parceiro?.nome ?? "Sem parceiro",
    label: `${c.parceiro?.nome ?? "Sem parceiro"} · ${c.casa.nome}`,
  }));

  const freebets = freebetsRaw.map((f) => ({
    id: f.id,
    casaNome: f.casa?.nome ?? "Sem casa",
    parceiroNome: f.parceiro?.nome ?? null,
    valor: f.valor,
  }));

  const finalizadas = operacoesRaw.filter((o) => o.status === "FINALIZADA");
  const totalInvestido = operacoesRaw.reduce((s, o) => s + o.stakeTotal, 0);
  const lucroTotal = finalizadas.reduce((s, o) => s + (o.lucroReal ?? 0), 0);
  const investidoFinalizadas = finalizadas.reduce((s, o) => s + o.stakeTotal, 0);
  const roiGeral = investidoFinalizadas > 0 ? (lucroTotal / investidoFinalizadas) * 100 : 0;
  const positivas = finalizadas.filter((o) => (o.lucroReal ?? 0) >= 0).length;
  const taxaAcerto = finalizadas.length > 0 ? (positivas / finalizadas.length) * 100 : 0;

  const stats = { totalInvestido, lucroTotal, roiGeral, operacoes: operacoesRaw.length, taxaAcerto, finalizadas: finalizadas.length };
  // Casas disponíveis pro seletor de freebet no fechamento (canônicas, sem duplicata).
  const casas = housesForSelect(cloneGroups);
  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Planilha</h1>
          <p className="hidden text-xs text-muted sm:block">Suas operações registradas — resultado, ROI e taxa de acerto.</p>
        </div>
      </header>

      <PlanilhaWorkspace key={abrirNova ? "nova" : "lista"} operacoes={operacoes} contas={contas} freebets={freebets} casas={casas} stats={stats} eventos={eventos} abrirNova={abrirNova} />
    </AppShell>
  );
}
