"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

type Mensagem = { autor: "pessoa" | "agente"; texto: string };
type SuggestionIcon = "target" | "scale" | "gift" | "check" | "layers" | "wallet";

const SUGESTOES: Array<{ icon: SuggestionIcon; label: string; hint: string; texto: string; tone: string }> = [
  { icon: "target", label: "Entender surebet", hint: "Lucro protegido em qualquer resultado", texto: "O que é uma surebet e como ela dá lucro mesmo sem saber quem vai ganhar o jogo? Me explica com um exemplo de números.", tone: "text-accent bg-accent/10 border-accent/20" },
  { icon: "scale", label: "Stake e responsabilidade", hint: "Evite o erro mais caro do Lay", texto: "Qual a diferença entre stake e responsabilidade no Lay? Me mostra com um exemplo de odd 3.75 e stake de 100.", tone: "text-warning bg-warning/10 border-warning/20" },
  { icon: "gift", label: "Extrair uma freebet", hint: "Transforme o bônus em saldo real", texto: "Como funciona a extração de freebet? Quanto dá pra converter de uma freebet de R$ 50 e como escolho a odd?", tone: "text-info bg-info/10 border-info/20" },
  { icon: "check", label: "Conferir uma operação", hint: "Envie casas, odds e valores", texto: "Quero que você confira uma operação minha. Vou te passar as casas, as odds e os valores que apostei:", tone: "text-positive bg-positive/10 border-positive/20" },
  { icon: "layers", label: "Dominar o duplo green", hint: "Entenda os dois lados da proteção", texto: "O que é duplo green e proteção de duplo green? Quando vale a pena?", tone: "text-accent bg-accent/10 border-accent/20" },
  { icon: "wallet", label: "Organizar minha banca", hint: "Defina exposição e risco por operação", texto: "Como eu devo dividir minha banca entre as casas e quanto arriscar por operação?", tone: "text-warning bg-warning/10 border-warning/20" },
];

function formatar(texto: string): ReactNode {
  return texto.split("\n").map((linha, i) => {
    if (!linha.trim()) return <span key={i} className="block h-2.5" />;

    const bullet = /^\s*[-*•]\s+/.test(linha);
    const numero = /^\s*\d+[.)]\s+/.test(linha);
    const conteudo = linha.replace(/^\s*[-*•]\s+/, "").replace(/^\s*(\d+[.)])\s+/, "$1 ");
    const partes = conteudo.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((parte, j) =>
      parte.startsWith("**") && parte.endsWith("**")
        ? <strong key={j} className="font-bold text-text">{parte.slice(2, -2)}</strong>
        : <span key={j}>{parte}</span>,
    );

    return (
      <span key={i} className={`block ${bullet ? "flex gap-2.5 pl-1" : ""} ${numero ? "pl-1" : ""}`}>
        {bullet && <span className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
        <span>{partes}</span>
      </span>
    );
  });
}

function IconeTutor({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
      <circle cx="12" cy="12" r="4.1" />
      <path d="m10.5 12 1 1 2.2-2.3" />
    </svg>
  );
}

function SuggestionGlyph({ icon }: { icon: SuggestionIcon }) {
  const paths: Record<SuggestionIcon, ReactNode> = {
    target: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3.5" /><path d="m14.5 9.5 5-5M16.5 4.5h3v3" /></>,
    scale: <><path d="M12 4v16M6 7h12M8 7 4.5 14h7L8 7ZM16 7l-3.5 7h7L16 7Z" /><path d="M8 20h8" /></>,
    gift: <><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" /><path d="M12 7H8.5a2 2 0 1 1 2-2c0 2 1.5 2 1.5 2ZM12 7h3.5a2 2 0 1 0-2-2c0 2-1.5 2-1.5 2Z" /></>,
    check: <><path d="M6 3h12v4H6zM5 5H3.8A1.8 1.8 0 0 0 2 6.8v13.4A1.8 1.8 0 0 0 3.8 22h16.4a1.8 1.8 0 0 0 1.8-1.8V6.8A1.8 1.8 0 0 0 20.2 5H19" /><path d="m7.5 14 3 3 6-7" /></>,
    layers: <><path d="m12 3-9 5 9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    wallet: <><path d="M4 5h14a2 2 0 0 1 2 2v13H4a2 2 0 0 1-2-2V5.8A2.8 2.8 0 0 1 4.8 3H18" /><path d="M14 11h8v5h-8a2.5 2.5 0 0 1 0-5Z" /><circle cx="15" cy="13.5" r=".6" fill="currentColor" /></>,
  };
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[icon]}</svg>;
}

function Capability({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[10px] font-semibold text-text-2"><span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_7px_var(--accent)]" />{label}</span>;
}

export default function AgenteChat() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    if (mensagens.length === 0 && !pending) {
      box.scrollTo({ top: 0 });
      return;
    }
    box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [mensagens, pending]);

  const enviar = (pergunta: string) => {
    const limpa = pergunta.trim();
    if (limpa.length < 4 || pending) return;

    const conversa: Mensagem[] = [...mensagens, { autor: "pessoa", texto: limpa }];
    setMensagens(conversa);
    setTexto("");
    setErro("");
    if (textareaRef.current) textareaRef.current.style.height = "48px";

    startTransition(async () => {
      try {
        const resposta = await fetch("/api/comunidade-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagens: conversa }),
        });
        const data = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
          setErro(data.error || "Não consegui responder agora. Tente novamente em instantes.");
          return;
        }
        setMensagens((atual) => [...atual, { autor: "agente", texto: data.resposta || "" }]);
      } catch {
        setErro("A conexão foi interrompida. Confira sua internet e tente novamente.");
      }
    });
  };

  const novaConversa = () => {
    setMensagens([]);
    setTexto("");
    setErro("");
    if (textareaRef.current) textareaRef.current.style.height = "48px";
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-3 sm:px-6 sm:py-5">
      <section className="relative flex h-[calc(100dvh-6.5rem)] min-h-[600px] flex-col overflow-hidden rounded-[28px] border border-accent/20 bg-[linear-gradient(145deg,rgba(9,18,34,0.98),rgba(5,11,22,0.99)_48%,rgba(7,16,31,0.98))] shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
        <div className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-accent/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-56 right-0 h-[420px] w-[420px] rounded-full bg-info/[0.06] blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(96,165,250,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.13)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_48%)]" />

        <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-border/80 bg-bg/35 px-4 py-3.5 backdrop-blur-xl sm:px-6 sm:py-4">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-accent/30 bg-gradient-to-br from-accent to-[#1d4ed8] text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)]">
            <IconeTutor className="h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#091222] bg-positive" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-black tracking-tight sm:text-base">Central AI</h1>
              <span className="rounded-md border border-accent/20 bg-accent/10 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.16em] text-accent">Beta</span>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-muted sm:text-[11px]">Seu copiloto para operações mais claras e seguras</p>
          </div>
          {mensagens.length > 0 && (
            <button type="button" onClick={novaConversa} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-border bg-surface/80 px-3 text-[10px] font-bold text-text-2 transition hover:border-accent/50 hover:text-accent sm:text-[11px]">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
              <span className="hidden sm:inline">Nova conversa</span>
            </button>
          )}
        </header>

        <div ref={scrollRef} className="relative z-[1] min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
          {mensagens.length === 0 ? (
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center py-3">
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.07] px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-accent">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  Inteligência para arbitragem
                </span>
                <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-black leading-[1.08] tracking-[-0.04em] sm:text-4xl">
                  Decida com mais clareza.<br /><span className="bg-gradient-to-r from-[#60a5fa] via-[#3b82f6] to-[#22d3ee] bg-clip-text text-transparent">Antes de apostar.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-muted sm:text-sm">Analise operações, entenda estratégias e valide cálculos com um assistente especializado no seu dia a dia.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Capability label="Análise de retorno" />
                  <Capability label="Conferência de stakes" />
                  <Capability label="Gestão de risco" />
                </div>
              </div>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {SUGESTOES.map((sugestao) => (
                  <button key={sugestao.label} type="button" onClick={() => enviar(sugestao.texto)} className="group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface/65 px-3.5 py-3 text-left backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface-2 hover:shadow-[0_14px_32px_rgba(0,0,0,0.2)]">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${sugestao.tone}`}><SuggestionGlyph icon={sugestao.icon} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-text">{sugestao.label}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted">{sugestao.hint}</span>
                    </span>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-6 pb-3">
              <div className="flex items-center gap-3 py-1"><span className="h-px flex-1 bg-border" /><span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted">Conversa atual</span><span className="h-px flex-1 bg-border" /></div>
              {mensagens.map((mensagem, index) => mensagem.autor === "pessoa" ? (
                <div key={index} className="flex justify-end">
                  <div className="max-w-[88%] sm:max-w-[78%]">
                    <p className="mb-1.5 pr-1 text-right font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-muted">Você</p>
                    <div className="rounded-2xl rounded-br-md border border-accent/30 bg-gradient-to-br from-accent to-[#2458c7] px-4 py-3 text-sm leading-relaxed text-white shadow-[0_10px_28px_rgba(59,130,246,0.22)]">
                      <p className="whitespace-pre-wrap">{mensagem.texto}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={index} className="flex items-start gap-3">
                  <span className="mt-5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent"><IconeTutor className="h-[18px] w-[18px]" /></span>
                  <div className="min-w-0 max-w-[88%] sm:max-w-[82%]">
                    <p className="mb-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-accent">Central AI</p>
                    <div className="rounded-2xl rounded-tl-md border border-border bg-surface/85 px-4 py-3.5 text-[13px] leading-6 text-text-2 shadow-[0_12px_32px_rgba(0,0,0,0.13)] sm:text-sm">{formatar(mensagem.texto)}</div>
                  </div>
                </div>
              ))}

              {pending && (
                <div className="flex items-start gap-3" role="status" aria-label="Central AI está analisando">
                  <span className="mt-5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent"><IconeTutor className="h-[18px] w-[18px]" /></span>
                  <div>
                    <p className="mb-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-accent">Analisando</p>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-surface/85 px-4 py-4">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
                    </div>
                  </div>
                </div>
              )}

              {erro && <div role="alert" className="ml-12 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning">{erro}</div>}
            </div>
          )}
        </div>

        <footer className="relative z-10 shrink-0 border-t border-border/80 bg-bg/55 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="mx-auto max-w-4xl">
            <div className="group relative overflow-hidden rounded-2xl border border-border-strong bg-surface/90 p-2 shadow-[0_16px_45px_rgba(0,0,0,0.2)] transition focus-within:border-accent/60 focus-within:shadow-[0_18px_50px_rgba(37,99,235,0.12)]">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent opacity-0 transition group-focus-within:opacity-100" />
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={texto}
                  onChange={(event) => {
                    setTexto(event.target.value);
                    event.target.style.height = "48px";
                    event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); enviar(texto); }
                  }}
                  rows={1}
                  placeholder="Descreva sua operação ou faça uma pergunta..."
                  className="h-12 max-h-32 min-h-12 flex-1 resize-none bg-transparent px-2.5 py-3 text-sm leading-6 outline-none placeholder:text-muted"
                />
                <button type="button" onClick={() => enviar(texto)} disabled={pending || texto.trim().length < 4} aria-label="Enviar pergunta" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-[#2458c7] text-white shadow-[0_8px_22px_rgba(59,130,246,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_11px_28px_rgba(59,130,246,0.34)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 14-7-4 14-3-6-7-1Z" /><path d="m12 13 7-8" /></svg>
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 px-1 text-[9px] leading-relaxed text-muted sm:text-[10px]">
              <p><b className="text-text-2">Enter</b> envia · <b className="text-text-2">Shift + Enter</b> quebra a linha</p>
              <p className="hidden text-right sm:block">Confira odds e valores na casa antes de apostar.</p>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
