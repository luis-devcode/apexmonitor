import { apiUser } from "@/lib/auth";
import { feedHealth, readFeed } from "@/lib/odds-feed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await apiUser())) return new Response("nao autorizado", { status: 401 });

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
