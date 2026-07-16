import AppShell from "@/components/AppShell";
import { requireUserId } from "@/lib/auth";
import { houseLogoMap, housesForSelect, logoForHouse } from "@/lib/houses";
import { readCloneGroups } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";
import { procedimentoLabel } from "@/lib/procedimentos";
import FreebetsWorkspace from "./FreebetsWorkspace";

export const dynamic = "force-dynamic";

export default async function FreebetsPage() {
  const userId = await requireUserId();
  const [freebetsRaw, parceiros, cloneGroups, operacoesRaw] = await Promise.all([
    prisma.freebet.findMany({
      where: { userId },
      // `operacao` = de qual operação a freebet nasceu (data, jogo, procedimento).
      include: { casa: true, parceiro: true, operacao: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parceiro.findMany({ where: { userId, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    readCloneGroups(),
    // Só os ids/datas: serve pra numerar as operações igual à planilha (nº 1 = a mais antiga).
    prisma.operacao.findMany({ where: { userId }, select: { id: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const cloneLogo = houseLogoMap(cloneGroups);
  const numeroDaOperacao = new Map(operacoesRaw.map((o, i) => [o.id, i + 1]));

  const freebets = freebetsRaw.map((f) => ({
    id: f.id,
    casaNome: f.casa?.nome ?? "—",
    casaLogo: f.casa?.logoUrl || logoForHouse(cloneLogo, f.casa?.nome),
    parceiroNome: f.parceiro?.nome ?? null,
    parceiroId: f.parceiroId,
    valor: f.valor,
    tipo: f.tipo,
    procedimento: f.procedimento,
    requisito: f.requisito,
    status: f.status,
    valorExtraido: f.valorExtraido,
    expiraEm: f.expiraEm ? f.expiraEm.toISOString() : null,
    notas: f.notas,
    // A operação que gerou a freebet (null quando foi cadastrada na mão).
    origem: f.operacao
      ? {
          numero: numeroDaOperacao.get(f.operacao.id) ?? 0,
          evento: f.operacao.evento,
          // O dia financeiro da operação é o createdAt (quando foi registrada).
          data: f.operacao.createdAt.toISOString(),
          procedimento: procedimentoLabel(f.operacao.procedimento) ?? f.operacao.tipo,
        }
      : null,
  }));

  const houses = housesForSelect(cloneGroups);

  const procedimentos = [...new Set(freebetsRaw.map((f) => f.procedimento).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Freebets</h1>
          <p className="hidden text-xs text-muted sm:block">Controle das freebets recebidas em missões e promoções.</p>
        </div>
      </header>

      <FreebetsWorkspace freebets={freebets} parceiros={parceiros} houses={houses} procedimentos={procedimentos} />
    </AppShell>
  );
}
