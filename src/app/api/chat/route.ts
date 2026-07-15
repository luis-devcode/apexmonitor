import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * As mensagens do chat da comunidade. A tela chama isto de tempos em tempos
 * pra ver o que chegou de novo.
 */
export async function GET() {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "nao autorizado" }, { status: 401 });

  const [mensagensRaw, problemasAbertos] = await Promise.all([
    prisma.chatMensagem.findMany({
      include: {
        author: { select: { id: true, nome: true, email: true, role: true } },
        respostaA: {
          select: {
            id: true,
            conteudo: true,
            author: { select: { nome: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.chatMensagem.count({ where: { status: "ABERTO" } }),
  ]);

  return NextResponse.json({
    // Vêm do banco de trás pra frente (as últimas 200); a tela lê de cima pra baixo.
    mensagens: mensagensRaw.reverse().map((m) => ({
      id: m.id,
      conteudo: m.conteudo,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      autorId: m.author.id,
      autorNome: m.author.nome || m.author.email,
      autorAdmin: m.author.role === "ADMIN",
      meu: m.author.id === user.id,
      respostaA: m.respostaA
        ? {
            id: m.respostaA.id,
            conteudo: m.respostaA.conteudo,
            autorNome: m.respostaA.author.nome || m.respostaA.author.email,
          }
        : null,
    })),
    problemasAbertos,
    souAdmin: user.role === "ADMIN",
  });
}
