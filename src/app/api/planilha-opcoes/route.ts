import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * O que a janela de "Adicionar à planilha" precisa saber: em quais contas dá
 * pra registrar a aposta e quais freebets estão paradas esperando extração.
 */
export async function GET() {
  const user = await apiUser();
  if (!user) return NextResponse.json({ contas: [], freebets: [] }, { status: 401 });

  const [contasRaw, freebetsRaw] = await Promise.all([
    prisma.conta.findMany({
      where: { userId: user.id },
      include: { casa: true, parceiro: true },
      orderBy: [{ casa: { nome: "asc" } }],
    }),
    prisma.freebet.findMany({
      where: { userId: user.id, status: "PENDENTE", usoOperacaoId: null },
      include: { casa: true, parceiro: true },
      orderBy: [{ expiraEm: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return NextResponse.json({
    contas: contasRaw.map((c) => ({
      id: c.id,
      casa: c.casa.nome,
      parceiro: c.parceiro?.nome ?? "Minha banca",
      saldo: c.saldo,
    })),
    freebets: freebetsRaw.map((f) => ({
      id: f.id,
      casa: f.casa?.nome ?? "Sem casa",
      casaLogo: f.casa?.logoUrl ?? null,
      parceiro: f.parceiro?.nome ?? null,
      valor: f.valor,
      expiraEm: f.expiraEm?.toISOString() ?? null,
    })),
  });
}
