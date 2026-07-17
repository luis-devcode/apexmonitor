import Link from "next/link";
import { BrandMark, BrandName } from "@/components/Brand";
import { PLANOS, brl, economiaPct } from "@/lib/planos";

/* ---------------------------------------------------------------------------
 * Landing pública. Copy aplica o método (crença + inimigo + mecanismo, com
 * números reais como autoridade). Sem promessa de lucro; aviso de +18. Todo
 * CTA leva pro checkout (/assinar). Visitante não-logado cai aqui.
 * ------------------------------------------------------------------------- */

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const MODULOS = [
  { t: "Monitor de odds ao vivo", d: "Dezenas de casas lado a lado, atualizando a cada segundo. A melhor linha salta na tela — você para de abrir 15 abas.", p: "M3 3v18h18M7 14l4-4 3 3 5-6" },
  { t: "Surebets na hora", d: "O sistema calcula o lucro garantido entre casas e mostra só o que vale a pena. Sem caçar na mão.", p: "M12 2v4M12 18v4M4 12H2m20 0h-2M6 6l-1.5-1.5M18 18l1.5 1.5M6 18l-1.5 1.5M18 6l1.5-1.5M12 8a4 4 0 100 8 4 4 0 000-8Z" },
  { t: "Super Odds & Duplo Green", d: "As odds turbinadas e as jogadas de duplo green mapeadas, com o retorno já calculado.", p: "M13 2 3 14h7l-1 8 10-12h-7l1-8Z" },
  { t: "Extração de freebet", d: "A conta pronta de quanto extrair da freebet, com a cobertura ideal. O que dava dor de cabeça vira um clique.", p: "M4 8h16M4 8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M12 3v18" },
  { t: "Banca, ROI e custos", d: "Sua operação inteira em números: lucro real, ROI, custos, por período e por parceiro. Nada de planilha solta.", p: "M3 3v18h18M18 9l-5 5-3-3-4 4" },
  { t: "Parceiros e contas (CPF)", d: "Controle de cada CPF, cada casa, cada saldo — organizado, seguro e sempre à mão.", p: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
];

const FAQ = [
  { q: "Preciso instalar alguma coisa?", a: "Não. É tudo online — você acessa pelo navegador, no computador ou no celular, e já está operando." },
  { q: "As odds são de verdade e atualizadas?", a: "Sim, ao vivo, de dezenas de casas ao mesmo tempo. Ainda assim, confirme sempre a odd na casa antes de fechar — cotação muda em segundos, e essa é a boa prática de qualquer operador sério." },
  { q: "Vocês garantem lucro?", a: "Não, e desconfie de quem garante. O ApexMonitor te dá informação em tempo real e controle da operação — as melhores ferramentas do mercado. O resultado depende de como você opera." },
  { q: "Posso cancelar quando quiser?", a: "Pode. No cartão a renovação é automática e você cancela a qualquer momento; no Pix você paga por período, sem amarras." },
  { q: "Serve pra quem está começando?", a: "Serve. As calculadoras fazem a conta difícil por você, e o monitor te mostra onde estão as oportunidades. Você aprende operando." },
];

export default function Landing() {
  const planos = PLANOS.map((p) => ({ ...p, economia: economiaPct(p), porMes: p.valor / p.meses }));

  return (
    <div className="min-h-dvh bg-bg text-text">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5"><BrandMark className="h-8 w-8" /><BrandName className="text-[13px]" /></Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3.5 py-2 text-xs font-bold text-text-2 transition hover:text-text">Entrar</Link>
            <Link href="/assinar" className="rounded-lg bg-accent px-4 py-2 text-xs font-black text-accent-ink transition hover:bg-accent-hover">Assinar</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden px-5 py-20 sm:py-28">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-accent/25 blur-[120px]" />
        <div className="pointer-events-none absolute -right-40 top-20 h-[400px] w-[400px] rounded-full bg-[#1749b7]/20 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" /> Odds em tempo real + gestão
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              Aposta consistente<br /><span className="bg-gradient-to-r from-accent to-[#7fb0ff] bg-clip-text text-transparent">não é sorte.</span> É controle.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-text-2">
              O ApexMonitor reúne numa tela só o que você faz hoje em cinco abas e uma planilha: odds ao vivo de dezenas de casas, surebets calculadas na hora e a gestão completa da sua banca.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/assinar" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-accent to-accent-deep px-6 text-sm font-black text-white shadow-[0_12px_36px_rgba(59,130,246,0.35)] transition hover:brightness-110">
                Começar agora <Icon d="m9 18 6-6-6-6" className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a href="#modulos" className="inline-flex h-12 items-center rounded-xl border border-border px-5 text-sm font-bold text-text-2 transition hover:border-border-strong hover:text-text">Ver o que faz</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-xs text-muted">
              <span className="flex items-center gap-1.5"><Icon d="m5 12 4 4L19 6" className="h-3.5 w-3.5 text-positive" /> 40+ casas monitoradas</span>
              <span className="flex items-center gap-1.5"><Icon d="m5 12 4 4L19 6" className="h-3.5 w-3.5 text-positive" /> atualizado a cada segundo</span>
              <span className="flex items-center gap-1.5"><Icon d="m5 12 4 4L19 6" className="h-3.5 w-3.5 text-positive" /> cancela quando quiser</span>
            </div>
          </div>

          {/* MOCKUP do monitor */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-accent/20 blur-3xl" />
            <div className="overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)]">
              <div className="flex items-center gap-2 border-b border-border bg-surface-2/60 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-negative/70" /><span className="h-2.5 w-2.5 rounded-full bg-warning/70" /><span className="h-2.5 w-2.5 rounded-full bg-positive/70" />
                <span className="ml-2 text-[10px] font-bold text-muted">Monitor de Odds — ao vivo</span>
                <span className="ml-auto flex items-center gap-1.5 text-[9px] font-bold text-positive"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-positive" /> AO VIVO</span>
              </div>
              <div className="space-y-2.5 p-4">
                {[
                  { j: "Palmeiras × Flamengo", c: "1.85", d: "3.40", f: "4.20", casa: "Bet365", roi: "+2.1%", hot: true },
                  { j: "Real Madrid × City", c: "2.10", d: "3.55", f: "3.10", casa: "Betano", roi: "+1.4%", hot: false },
                  { j: "Chelsea × Arsenal", c: "2.75", d: "3.30", f: "2.55", casa: "Superbet", roi: "+0.8%", hot: false },
                ].map((r) => (
                  <div key={r.j} className={`rounded-xl border p-3 ${r.hot ? "border-accent/40 bg-accent/[0.06]" : "border-border bg-bg/40"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{r.j}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${r.hot ? "bg-positive/15 text-positive" : "bg-surface-2 text-muted"}`}>{r.roi} ROI</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[["Casa", r.c], ["Empate", r.d], ["Fora", r.f]].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-surface-2/60 px-2 py-1.5 text-center">
                          <p className="text-[8px] uppercase tracking-wider text-muted">{k}</p>
                          <p className="text-sm font-black">{v}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-1.5 text-right text-[9px] text-muted">melhor: {r.casa}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INIMIGO */}
      <section className="border-y border-border bg-surface/40 px-5 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Você não perde por falta de aposta boa.<br /><span className="text-muted">Perde por operar no escuro.</span></h2>
          <p className="mt-5 text-base leading-relaxed text-text-2">
            As oportunidades existem o tempo todo. O que separa quem lucra de forma consistente de quem só tenta é ter a <b className="text-text">informação na hora certa</b> e saber <b className="text-text">exatamente onde está cada real</b>. Planilha bagunçada e cinco abas abertas não é operação — é torcida.
          </p>
        </div>
      </section>

      {/* MODULOS */}
      <section id="modulos" className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mono-label text-accent">A plataforma</span>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Tudo o que sua operação precisa, num lugar só</h2>
            <p className="mt-4 text-text-2">Seis ferramentas que trabalham juntas — do sinal da oportunidade ao controle do seu lucro.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((m) => (
              <div key={m.t} className="group rounded-2xl border border-border bg-surface-2/40 p-6 transition hover:-translate-y-1 hover:border-accent/30 hover:bg-surface-2/70">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent transition group-hover:scale-110"><Icon d={m.p} /></span>
                <h3 className="mt-4 text-base font-extrabold">{m.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-2">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NUMEROS */}
      <section className="border-y border-border bg-surface/40 px-5 py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {[["40+", "casas"], ["300+", "jogos ao vivo"], ["1s", "de atualização"], ["6", "ferramentas"]].map(([n, l]) => (
            <div key={l}>
              <p className="bg-gradient-to-b from-accent to-[#7fb0ff] bg-clip-text text-4xl font-black text-transparent sm:text-5xl">{n}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRECOS */}
      <section id="precos" className="px-5 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mono-label text-accent">Planos</span>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Metade do preço do mercado</h2>
            <p className="mt-4 text-text-2">O mercado cobra R$200/mês. Aqui você paga menos — e no anual, bem menos.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {planos.map((p) => {
              const destaque = p.id === "anual";
              return (
                <div key={p.id} className={`relative flex flex-col rounded-2xl border p-6 ${destaque ? "border-accent/50 bg-accent/[0.05] shadow-[0_24px_70px_rgba(23,73,183,0.2)]" : "border-border bg-surface-2/40"}`}>
                  {destaque && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Melhor valor</span>}
                  <p className="text-sm font-black">{p.nome}</p>
                  <p className="mt-3 text-xs text-muted">Mercado: <span className="line-through">{brl(p.valorCheio)}</span></p>
                  <div className="mt-1 flex items-end gap-1.5">
                    <span className="text-4xl font-black tracking-tight">{brl(p.porMes)}</span><span className="mb-1.5 text-xs text-muted">/mês</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{brl(p.valor)} por {p.meses === 1 ? "mês" : `${p.meses} meses`}</p>
                  {p.economia > 0 && <p className="mt-3 inline-flex w-fit rounded-full bg-positive/15 px-2.5 py-1 text-[11px] font-black text-positive">Economize {p.economia}%</p>}
                  <Link href={`/assinar?plano=${p.id}`} className={`mt-6 flex h-11 items-center justify-center rounded-xl text-sm font-black transition ${destaque ? "bg-gradient-to-b from-accent to-accent-deep text-white hover:brightness-110" : "border border-border-strong text-text hover:border-accent/40 hover:text-accent"}`}>
                    Assinar {p.nome}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-muted">Pix ou cartão de crédito. Cancele quando quiser.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-surface/40 px-5 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-black tracking-tight">Perguntas frequentes</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-surface-2/40 p-5 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between text-sm font-bold marker:content-none">
                  {f.q}
                  <Icon d="m6 9 6 6 6-6" className="h-4 w-4 text-muted transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-text-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden px-5 py-24 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[120px]" />
        <BrandMark className="mx-auto h-14 w-14 rounded-2xl" />
        <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Pare de operar no escuro.</h2>
        <p className="mx-auto mt-4 max-w-lg text-text-2">Odds em tempo real e o controle total da sua operação — a partir de {brl(planos.find((p) => p.id === "anual")!.porMes)}/mês.</p>
        <Link href="/assinar" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-accent to-accent-deep px-8 text-sm font-black text-white shadow-[0_16px_44px_rgba(59,130,246,0.4)] transition hover:brightness-110">
          Começar agora <Icon d="m9 18 6-6-6-6" className="h-4 w-4" />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2.5"><BrandMark className="h-7 w-7" /><BrandName className="text-[12px]" /></div>
          <p className="max-w-xl text-[11px] leading-relaxed text-muted">
            Ferramenta de análise e gestão para apostadores. Não somos uma casa de apostas e não garantimos lucro. Aposta envolve risco — jogue com responsabilidade. Conteúdo destinado a maiores de 18 anos.
          </p>
          <div className="flex gap-5 text-xs text-text-2">
            <Link href="/login" className="hover:text-text">Entrar</Link>
            <Link href="/assinar" className="hover:text-text">Assinar</Link>
          </div>
          <p className="text-[10px] text-muted">© {new Date().getFullYear()} ApexMonitor · apexmonitor.com.br</p>
        </div>
      </footer>
    </div>
  );
}
