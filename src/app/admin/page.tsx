import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminWorkspace from "./AdminWorkspace";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Proteção mais forte que as outras páginas: não basta ter assinatura, tem que
  // ser ADMIN. Um cliente pagante que digitasse /admin cairia aqui e voltaria pro
  // início. Falha fechada.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const clientes = await prisma.user.findMany({
    where: { role: "CLIENTE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nome: true,
      email: true,
      status: true,
      assinaturaAte: true,
      createdAt: true,
      afiliado: { select: { nome: true, cupom: true } },
    },
  });

  const agora = new Date().getTime();
  const lista = clientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    email: c.email,
    bloqueado: c.status === "BLOQUEADO",
    assinaturaAte: c.assinaturaAte ? c.assinaturaAte.toISOString() : null,
    ativa: !!c.assinaturaAte && c.assinaturaAte.getTime() > agora && c.status !== "BLOQUEADO",
    criadoEm: c.createdAt.toISOString(),
    afiliado: c.afiliado ? `${c.afiliado.nome} (${c.afiliado.cupom})` : null,
  }));

  const ativos = lista.filter((c) => c.ativa).length;
  const vencidos = lista.filter((c) => !c.ativa && !c.bloqueado).length;

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Administração</h1>
          <p className="hidden text-xs text-muted sm:block">Clientes, acesso e assinaturas.</p>
        </div>
        <div className="ml-auto flex gap-4 text-right">
          <div><p className="text-lg font-bold text-emerald-400">{ativos}</p><p className="text-[10px] uppercase tracking-wider text-muted">Ativos</p></div>
          <div><p className="text-lg font-bold text-amber-400">{vencidos}</p><p className="text-[10px] uppercase tracking-wider text-muted">Vencidos</p></div>
          <div><p className="text-lg font-bold">{lista.length}</p><p className="text-[10px] uppercase tracking-wider text-muted">Total</p></div>
        </div>
      </header>

      <AdminWorkspace clientes={lista} />
    </AppShell>
  );
}
