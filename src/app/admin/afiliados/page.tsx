import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AfiliadosWorkspace from "./AfiliadosWorkspace";

export const dynamic = "force-dynamic";

export default async function AfiliadosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const afiliados = await prisma.afiliado.findMany({
    orderBy: [{ ativo: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { clientes: true } },
      // Comissão já registrada mas ainda não repassada — é o que você deve a ele.
      pagamentos: {
        where: { comissaoPaga: false },
        select: { comissaoValor: true },
      },
    },
  });

  const lista = afiliados.map((a) => ({
    id: a.id,
    nome: a.nome,
    cupom: a.cupom,
    comissaoPct: a.comissaoPct,
    descontoPct: a.descontoPct,
    chavePix: a.chavePix,
    ativo: a.ativo,
    clientes: a._count.clientes,
    aReceber: a.pagamentos.reduce((s, p) => s + p.comissaoValor, 0),
  }));

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Afiliados</h1>
          <p className="hidden text-xs text-muted sm:block">Cupons de indicação e comissões.</p>
        </div>
        <div className="ml-auto flex gap-4 text-right">
          <div><p className="text-lg font-bold text-emerald-400">{lista.filter((a) => a.ativo).length}</p><p className="text-[10px] uppercase tracking-wider text-muted">Ativos</p></div>
          <div><p className="text-lg font-bold">{lista.reduce((s, a) => s + a.clientes, 0)}</p><p className="text-[10px] uppercase tracking-wider text-muted">Clientes trazidos</p></div>
        </div>
      </header>

      <AfiliadosWorkspace afiliados={lista} />
    </AppShell>
  );
}
