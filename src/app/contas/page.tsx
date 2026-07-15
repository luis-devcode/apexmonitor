import AppShell from "@/components/AppShell";
import { requireUserId } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { houseLogoMap, housesForSelect, logoForHouse } from "@/lib/houses";
import { readCloneGroups } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";
import ContasWorkspace from "./ContasWorkspace";

export const dynamic = "force-dynamic";

export default async function ContasPage() {
  const userId = await requireUserId();
  const [contasRaw, parceiros, cloneGroups] = await Promise.all([
    prisma.conta.findMany({
      where: { userId, parceiroId: { not: null } },
      include: { casa: true, parceiro: true, _count: { select: { movimentos: true, pernas: true } } },
      orderBy: [{ parceiro: { nome: "asc" } }, { casa: { nome: "asc" } }],
    }),
    prisma.parceiro.findMany({ where: { userId, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    readCloneGroups(),
  ]);

  const cloneLogo = houseLogoMap(cloneGroups);

  const contas = contasRaw.map((conta) => ({
    id: conta.id,
    casaNome: conta.casa.nome,
    casaLogo: conta.casa.logoUrl || logoForHouse(cloneLogo, conta.casa.nome),
    parceiroId: conta.parceiroId as string,
    parceiroNome: conta.parceiro?.nome ?? "—",
    saldo: conta.saldo,
    status: conta.status,
    login: conta.login,
    // Descriptografa só aqui, pra mostrar ao dono. No banco fica cifrada.
    senha: decryptSecret(conta.senha),
    notas: conta.notas,
    podeExcluir: conta._count.movimentos === 0 && conta._count.pernas === 0,
  }));

  // Casas para o cadastro: canônicas e sem duplicata (uma "Bolsa de Aposta" só).
  const houses = housesForSelect(cloneGroups);

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Contas por Casa</h1>
          <p className="hidden text-xs text-muted sm:block">As contas de cada parceiro nas casas de apostas.</p>
        </div>
      </header>

      <ContasWorkspace contas={contas} parceiros={parceiros} houses={houses} />
    </AppShell>
  );
}
