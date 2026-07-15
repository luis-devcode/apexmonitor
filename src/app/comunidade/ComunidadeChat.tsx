"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { statusBug, STATUS_BUG } from "@/lib/chat";
import { apagarMensagemAction, enviarMensagemAction, marcarStatusBugAction } from "./actions";

type Mensagem = {
  id: string;
  conteudo: string;
  status: string | null;
  createdAt: string;
  autorId: string;
  autorNome: string;
  autorAdmin: boolean;
  meu: boolean;
  respostaA: { id: string; conteudo: string; autorNome: string } | null;
};
type Dados = { mensagens: Mensagem[]; problemasAbertos: number; souAdmin: boolean };

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaKey = (iso: string) => new Date(iso).toDateString();
const diaLabel = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 86_400_000);
  if (diaKey(iso) === hoje.toDateString()) return "Hoje";
  if (diaKey(iso) === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

/** Cor do avatar a partir do nome — o mesmo membro tem sempre a mesma cor. */
const CORES = ["bg-accent", "bg-info", "bg-positive", "bg-warning", "bg-negative"];
const corDe = (nome: string) => CORES[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length];

export default function ComunidadeChat() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [texto, setTexto] = useState("");
  const [ehProblema, setEhProblema] = useState(false);
  const [respondendo, setRespondendo] = useState<Mensagem | null>(null);
  const [soProblemas, setSoProblemas] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, startEnvio] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const noFim = useRef(true);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/chat");
    if (!r.ok) return;
    setDados(await r.json());
  }, []);

  // Busca o que chegou de novo a cada 4s — é o que faz a conversa andar sozinha.
  useEffect(() => {
    const primeira = setTimeout(() => void carregar(), 0);
    const t = setInterval(() => void carregar(), 4000);
    return () => { clearTimeout(primeira); clearInterval(t); };
  }, [carregar]);

  // Desce até o fim quando chega mensagem nova — mas só se a pessoa já estava
  // no fim; se ela subiu pra ler algo antigo, não arrancamos a tela dela.
  useEffect(() => {
    const box = scrollRef.current;
    if (box && noFim.current) box.scrollTop = box.scrollHeight;
  }, [dados, soProblemas]);

  const aoRolar = () => {
    const box = scrollRef.current;
    if (box) noFim.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  };

  const enviar = () => {
    const limpo = texto.trim();
    if (!limpo || enviando) return;
    setTexto("");
    setErro("");
    noFim.current = true;
    const problema = ehProblema;
    const resposta = respondendo;
    setEhProblema(false);
    setRespondendo(null);
    startEnvio(async () => {
      const falha = await enviarMensagemAction(limpo, problema, resposta?.id);
      if (falha) {
        setErro(falha);
        setTexto(limpo);
        setEhProblema(problema);
        setRespondendo(resposta);
        return;
      }
      await carregar();
    });
  };

  const responder = (mensagem: Mensagem) => {
    setRespondendo(mensagem);
    setErro("");
    requestAnimationFrame(() => textoRef.current?.focus());
  };

  const todas = dados?.mensagens ?? [];
  const mensagens = soProblemas ? todas.filter((m) => m.status) : todas;
  const abertos = dados?.problemasAbertos ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
      <div className="flex h-[calc(100dvh-7.5rem)] min-h-[540px] flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-[0_24px_70px_rgba(0,0,0,0.2)]">

        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-gradient-to-br from-accent/[0.1] via-surface to-surface px-4 py-3.5 sm:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 9h8M8 13h5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-extrabold sm:text-base">Chat da Comunidade</h1>
            <p className="truncate text-[11px] text-muted">
              Converse sobre qualquer coisa com os outros membros — e relate o que estiver estranho no site.
            </p>
          </div>
          {/* A fila de correção: um clique mostra só o que foi relatado. */}
          <button
            onClick={() => { setSoProblemas((s) => !s); noFim.current = true; }}
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
              soProblemas ? "border-warning bg-warning/15 text-warning" : "border-border text-text-2 hover:border-warning/50 hover:text-warning"
            }`}
          >
            {soProblemas ? "Ver tudo" : "Problemas"}
            {abertos > 0 && <span className="ml-1.5 rounded-full bg-warning px-1.5 py-0.5 text-[9px] font-black text-black">{abertos}</span>}
          </button>
        </header>

        <div ref={scrollRef} onScroll={aoRolar} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-5">
          {!dados ? (
            <p className="py-10 text-center text-xs text-muted">Carregando…</p>
          ) : mensagens.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-2xl">💬</span>
              <h3 className="mt-4 text-base font-extrabold">
                {soProblemas ? "Nenhum problema relatado" : "Ninguém falou nada ainda"}
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
                {soProblemas
                  ? "Quando alguém marcar uma mensagem como problema do site, ela aparece aqui."
                  : "Puxa o assunto. Dúvida, surebet que deu certo, casa que limitou — ou algo estranho no site."}
              </p>
            </div>
          ) : (
            mensagens.map((m, i) => {
              const anterior = mensagens[i - 1];
              const novoDia = !anterior || diaKey(anterior.createdAt) !== diaKey(m.createdAt);
              // Mensagens seguidas da mesma pessoa em até 5 min viram um bloco só.
              const agrupada =
                !novoDia &&
                anterior?.autorId === m.autorId &&
                new Date(m.createdAt).getTime() - new Date(anterior.createdAt).getTime() < 5 * 60_000 &&
                !m.status &&
                !m.respostaA;

              return (
                <div key={m.id}>
                  {novoDia && (
                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{diaLabel(m.createdAt)}</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <MensagemLinha
                    mensagem={m}
                    agrupada={agrupada}
                    souAdmin={dados.souAdmin}
                    onResponder={responder}
                    onMudou={() => void carregar()}
                  />
                </div>
              );
            })
          )}
        </div>

        <footer className="shrink-0 border-t border-border bg-surface-2/40 px-3 py-3 sm:px-5">
          {erro && <p className="mb-2 rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative">{erro}</p>}
          {respondendo && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-accent bg-accent/[0.06] px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold text-accent">Respondendo a {respondendo.autorNome}</p>
                <p className="truncate text-xs text-muted">{respondendo.conteudo}</p>
              </div>
              <button
                type="button"
                onClick={() => setRespondendo(null)}
                aria-label="Cancelar resposta"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition hover:bg-white/5 hover:text-text"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
          )}
          {ehProblema && (
            <p className="mb-2 rounded-lg border border-warning/25 bg-warning/[0.07] px-3 py-2 text-[11px] leading-relaxed text-warning">
              Relato de problema: conta <b>o que você fez</b>, <b>o que esperava</b> e <b>o que aconteceu</b>. Se der, diga em que tela foi.
            </p>
          )}
          <div className={`flex items-end gap-2 rounded-xl border bg-surface p-2 transition ${ehProblema ? "border-warning/60" : "border-border focus-within:border-accent"}`}>
            <textarea
              ref={textoRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
              }}
              rows={1}
              placeholder={ehProblema ? "O que você fez, o que esperava e o que aconteceu…" : "Manda a real pro pessoal…"}
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none placeholder:text-muted"
            />
            <button
              onClick={enviar}
              disabled={enviando || !texto.trim()}
              aria-label="Enviar mensagem"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-ink transition hover:bg-accent-hover disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-text-2">
              <input
                type="checkbox"
                checked={ehProblema}
                onChange={(e) => setEhProblema(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--warning)]"
              />
              Isso é um problema do site
            </label>
            <p className="text-[10px] text-muted">
              <b className="text-text-2">Enter</b> envia · <b className="text-text-2">Shift+Enter</b> quebra linha
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function MensagemLinha({ mensagem: m, agrupada, souAdmin, onResponder, onMudou }: {
  mensagem: Mensagem;
  agrupada: boolean;
  souAdmin: boolean;
  onResponder: (mensagem: Mensagem) => void;
  onMudou: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const status = statusBug(m.status);
  const podeApagar = m.meu || souAdmin;

  return (
    <div id={`mensagem-${m.id}`} className={`group relative flex gap-3 rounded-lg px-2 transition hover:bg-white/[0.03] ${agrupada ? "py-0.5" : "pb-1 pt-2.5"} ${status ? "border-l-2 border-warning/50 bg-warning/[0.03]" : ""}`}>
      {agrupada ? (
        <span className="w-9 shrink-0 pt-0.5 text-right text-[10px] text-transparent group-hover:text-muted">{hora(m.createdAt)}</span>
      ) : (
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black text-white ${corDe(m.autorNome)}`}>
          {m.autorNome.charAt(0).toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        {!agrupada && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-text">{m.autorNome}</span>
            {m.autorAdmin && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-accent">Equipe</span>}
            <span className="text-[10px] text-muted">{hora(m.createdAt)}</span>
            {status && (
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${status.cls}`}>
                Problema · {status.label}
              </span>
            )}
          </div>
        )}
        {m.respostaA && (
          <button
            type="button"
            onClick={() => document.getElementById(`mensagem-${m.respostaA?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="my-1 block w-full max-w-xl rounded-md border-l-2 border-accent bg-accent/[0.05] px-2.5 py-1.5 text-left transition hover:bg-accent/[0.09]"
          >
            <span className="block text-[10px] font-extrabold text-accent">{m.respostaA.autorNome}</span>
            <span className="block truncate text-xs text-muted">{m.respostaA.conteudo}</span>
          </button>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-2">{m.conteudo}</p>
        <button
          type="button"
          onClick={() => onResponder(m)}
          className="mt-1 flex items-center gap-1 text-[10px] font-bold text-muted transition hover:text-accent"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 17-5-5 5-5M4 12h10a6 6 0 0 1 6 6" /></svg>
          Responder
        </button>

        {/* Fila de correção: só o admin muda o estado do relato. */}
        {status && souAdmin && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {STATUS_BUG.map((s) => (
              <button
                key={s.id}
                disabled={pending || s.id === m.status}
                onClick={() => startTransition(async () => { await marcarStatusBugAction(m.id, s.id); onMudou(); })}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition disabled:opacity-40 ${
                  s.id === m.status ? "border-transparent " + s.cls : "border-border text-muted hover:text-text"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {podeApagar && (
        <button
          disabled={pending}
          onClick={() => startTransition(async () => { await apagarMensagemAction(m.id); onMudou(); })}
          title="Apagar mensagem"
          className="absolute right-2 top-1.5 hidden h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-negative/10 hover:text-negative group-hover:grid"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </svg>
        </button>
      )}
    </div>
  );
}
