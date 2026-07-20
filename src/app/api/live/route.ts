import { apiUser } from "@/lib/auth";
import { feedHealth, readFeed } from "@/lib/odds-feed";
import { abrirConexao, fecharConexao } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await apiUser();
  if (!user) return new Response("nao autorizado", { status: 401 });

  // Teto de conexões SSE simultâneas por usuário: um cliente legítimo mantém
  // poucas; abrir dezenas em paralelo (raspagem/DoS) bate no limite.
  const chaveConexao = `live:${user.id}`;
  if (!abrirConexao(chaveConexao, 20)) return new Response("muitas conexoes", { status: 429 });
  let liberado = false;
  const soltar = () => { if (!liberado) { liberado = true; fecharConexao(chaveConexao); } };

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let lastVersion = "";
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const stop = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        soltar();
        try { controller.close(); } catch { /* já fechado */ }
      };
      const safeEnqueue = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // cliente já desconectou: encerra de vez, sem lançar
          closed = true;
          if (timer) clearInterval(timer);
          soltar();
        }
      };

      const send = async () => {
        if (closed) return;
        try {
          const feed = await readFeed();
          if (closed) return; // pode ter desconectado durante a leitura
          const version = `${feed.updatedAt}|${feed.source?.connected}`;
          if (version !== lastVersion) {
            lastVersion = version;
            safeEnqueue(`event: feed\ndata: ${JSON.stringify({
              updatedAt: feed.updatedAt,
              health: feedHealth(feed),
            })}\n\n`);
          } else {
            safeEnqueue(": heartbeat\n\n");
          }
        } catch {
          safeEnqueue("event: error\ndata: {}\n\n");
        }
      };

      void send();
      timer = setInterval(() => void send(), 1000);
      request.signal.addEventListener("abort", stop, { once: true });
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
      soltar();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
