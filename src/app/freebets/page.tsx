import AppShell from "@/components/AppShell";
import { requireUserId } from "@/lib/auth";
import { houseLogoMap, housesForSelect, logoForHouse } from "@/lib/houses";
import { readCloneGroups } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";
import FreebetsWorkspace from "./FreebetsWorkspace";

export const dynamic = "force-dynamic";

export default async function FreebetsPage() {
  const userId = await requireUserId();
  const [freebetsRaw, parceiros, cloneGroups] = await Promise.all([
    prisma.freebet.findMany({ where: { userId }, include: { casa: true, parceiro: true }, orderBy: { createdAt: "desc" } }),
    prisma.parceiro.findMany({ where: { userId, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    readCloneGroups(),
  ]);

  const cloneLogo = houseLogoMap(cloneGroups);

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
