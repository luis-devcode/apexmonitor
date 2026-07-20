import Link from "next/link";
import { BrandMark, BrandName } from "@/components/Brand";
import { PLANOS, brl, economiaPct } from "@/lib/planos";

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const PILARES = [
  {
    numero: "01",
    titulo: "Encontre antes que a odd mude",
    texto: "Compare dezenas de casas em uma única tela. A melhor linha salta aos olhos sem você precisar caçar de aba em aba.",
    icone: "M4 19V5m0 14h16M7 15l4-4 3 2 5-6",
  },
  {
    numero: "02",
    titulo: "Calcule sem erro",
    texto: "Confira stakes, cenários e retorno com as contas prontas antes de colocar dinheiro na operação.",
    icone: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 4h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01",
  },
  {
    numero: "03",
    titulo: "Controle o resultado real",
    texto: "Registre a operação e acompanhe banca, ROI e custos para saber exatamente quanto está livre, exposto e realizado.",
    icone: "M3 3v18h18M7 15l3-3 3 2 5-7",
  },
];

const MODULOS = [
  {
    titulo: "Monitor de odds ao vivo",
    texto: "Dezenas de casas lado a lado, atualizando a cada segundo. A melhor linha salta na tela — você para de abrir 15 abas.",
    etiqueta: "Tempo real",
    icone: "M4 19V5m0 14h16M7 14l4-4 3 3 5-6",
  },
  {
    titulo: "Surebets na hora",
    texto: "O sistema encontra as combinações, distribui as stakes e mostra o retorno. Você decide com a conta pronta.",
    etiqueta: "Cálculo",
    icone: "M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4",
  },
  {
    titulo: "Super Odds e Duplo Green",
    texto: "Odds turbinadas e jogadas de duplo green organizadas, com os cenários e o retorno já calculados.",
    etiqueta: "Oportunidades",
    icone: "M13 2 3 14h7l-1 8 10-12h-7l1-8Z",
  },
  {
    titulo: "Extração de freebet",
    texto: "Veja quanto extrair da freebet e qual cobertura usar. O que dava dor de cabeça vira uma decisão simples.",
    etiqueta: "Freebets",
    icone: "M4 8h16M12 3v18M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M4 8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2",
  },
  {
    titulo: "Banca, ROI e custos",
    texto: "Sua operação inteira em números: lucro real, ROI, exposição e custos por período e parceiro. Nada de planilha solta.",
    etiqueta: "Gestão",
    icone: "M3 3v18h18M7 16l4-4 3 2 5-7",
  },
  {
    titulo: "Parceiros e contas (CPF)",
    texto: "Controle cada CPF, cada casa e cada saldo de forma organizada, segura e sempre à mão.",
    etiqueta: "Operação",
    icone: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87",
  },
];

const COMPARATIVO = [
  ["Encontrar a melhor odd", "Abrir e atualizar até 15 abas", "Dezenas de casas numa tela"],
  ["Validar uma oportunidade", "Refazer contas na mão", "Stakes e retorno calculados"],
  ["Saber o lucro de verdade", "Cruzar planilhas e anotações", "Resultado, ROI e custos"],
  ["Controlar contas e CPFs", "Saldos espalhados", "Tudo ligado à operação"],
];

const BENEFICIOS_PLANOS: Record<string, string[]> = {
  mensal: [
    "Monitor de odds ao vivo",
    "Calculadoras e oportunidades",
    "Gestão completa da operação",
    "Suporte da equipe ApexMonitor",
    "Cancele quando quiser",
  ],
  trimestral: [
    "Tudo do plano mensal",
    "3 meses de acesso sem interrupções",
    "Mais tempo para escalar resultados",
    "Melhor equilíbrio entre preço e período",
  ],
  anual: [
    "Tudo do plano trimestral",
    "12 meses de acesso completo",
    "Suporte prioritário",
    "Menor valor mensal equivalente",
  ],
};

const FAQ = [
  {
    pergunta: "Preciso instalar alguma coisa?",
    resposta: "Não. É tudo online — você acessa pelo navegador, no computador ou no celular, e já pode começar a operar.",
  },
  {
    pergunta: "As odds são reais e atualizadas?",
    resposta: "Sim. O monitor acompanha dezenas de casas ao mesmo tempo e atualiza continuamente. Como a cotação pode mudar em segundos, confirme sempre a odd na casa antes de fechar.",
  },
  {
    pergunta: "Vocês garantem lucro?",
    resposta: "Não, e desconfie de quem garante. O ApexMonitor entrega informação em tempo real, cálculo e controle da operação. O resultado depende de como você opera, e apostas envolvem risco.",
  },
  {
    pergunta: "Serve para quem está começando?",
    resposta: "Sim. As calculadoras fazem as contas difíceis e o monitor mostra onde estão as oportunidades. A interface conduz você do sinal ao registro da operação.",
  },
  {
    pergunta: "Todos os planos liberam a plataforma completa?",
    resposta: "Sim. Mensal, trimestral e anual liberam os mesmos módulos. O que muda é o período contratado e a economia no valor mensal equivalente.",
  },
  {
    pergunta: "Posso cancelar quando quiser?",
    resposta: "Pode. No cartão, você interrompe a renovação quando quiser; no Pix, paga pelo período escolhido, sem renovação automática.",
  },
];

const CASAS_DESTAQUE = [
  ["Betano", "bet365", "Superbet", "Sportingbet", "Betfair", "pixbet", "KTO", "Betnacional", "novibet", "Stake", "BET7K", "Esportes da Sorte", "EstrelaBet", "BetBra", "BETMGM"],
  ["Aposta Ganha", "APOSTABET", "7GAMES", "alfa", "betfast", "BR4BET", "ESPORTIVABET", "Jogo de Ouro", "LOTOGREEN", "VAIDEBET", "VERSUS BET", "VIVA SORTE", "SportyBet", "BETesporte", "SorteBet"],
];

const INSTAGRAM_URL = "https://www.instagram.com/apexmonitor/";
// Preencha apenas com números e código do país. Ex.: 5511999999999.
const WHATSAPP_NUMBER: string = "";

export default function Landing() {
  const planos = PLANOS.map((plano) => ({
    ...plano,
    economia: economiaPct(plano),
    porMes: plano.valor / plano.meses,
  }));
  const anual = planos.find((plano) => plano.id === "anual")!;
  const whatsappUrl = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : null;

  return (
    <div className="sales-landing min-h-dvh overflow-hidden bg-bg text-text">
      <a href="#conteudo-principal" className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-accent px-4 py-3 text-sm font-black text-accent-ink transition-transform focus:translate-y-0">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="ApexMonitor — início" className="flex min-h-11 items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <BrandName className="text-[12px] sm:text-[13px]" />
          </Link>

          <nav aria-label="Navegação da página" className="hidden items-center gap-7 lg:flex">
            <a href="#como-funciona" className="text-sm font-semibold text-text-2 transition-colors hover:text-text">Como funciona</a>
            <a href="#plataforma" className="text-sm font-semibold text-text-2 transition-colors hover:text-text">Plataforma</a>
            <a href="#precos" className="text-sm font-semibold text-text-2 transition-colors hover:text-text">Planos</a>
            <a href="#suporte" className="text-sm font-semibold text-text-2 transition-colors hover:text-text">Suporte</a>
            <a href="#duvidas" className="text-sm font-semibold text-text-2 transition-colors hover:text-text">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-text-2 transition-colors hover:text-text">
              Entrar
            </Link>
            <Link href="/assinar" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-3.5 text-sm font-black text-accent-ink shadow-[0_8px_30px_color-mix(in_srgb,var(--accent)_24%,transparent)] transition hover:bg-accent-hover sm:px-5">
              Assinar agora
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo-principal">
        <section className="relative px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
            <div className="max-w-2xl">
              <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-accent sm:text-[11px]">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
                </span>
                Odds em tempo real + gestão completa
              </div>

              <h1 className="mt-7 text-[2.55rem] font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-[4.4rem]">
                Aposta consistente
                <span className="mt-2 block bg-gradient-to-r from-accent via-[#7db1ff] to-info bg-clip-text text-transparent">
                  não é sorte. É controle.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-text-2 sm:text-lg sm:leading-8">
                O ApexMonitor reúne em uma tela o que hoje exige várias abas e planilhas: odds ao vivo de dezenas de casas, oportunidades calculadas e a gestão completa da sua banca.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/assinar" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-accent to-accent-deep px-6 text-sm font-black text-white shadow-[0_16px_44px_color-mix(in_srgb,var(--accent)_34%,transparent)] transition hover:brightness-110">
                  Começar agora
                  <Icon d="m9 18 6-6-6-6" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href="#plataforma" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface/60 px-6 text-sm font-bold text-text transition hover:border-accent/50 hover:bg-surface-2">
                  <Icon d="M5 12h14M13 6l6 6-6 6" className="h-4 w-4 text-accent" />
                  Ver o que a plataforma faz
                </a>
              </div>

              <ul className="mt-7 grid gap-2.5 text-sm text-text-2 sm:grid-cols-3">
                {["40+ casas monitoradas", "Atualização a cada segundo", "Cancele quando quiser"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-positive/12 text-positive">
                      <Icon d="m5 12 4 4L19 6" className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
              <div className="landing-console relative overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-[0_42px_100px_-32px_rgba(0,0,0,0.9)]">
                <div className="flex h-11 items-center border-b border-border bg-surface-2/70 px-4">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-negative/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-positive/70" />
                  </div>
                  <p className="ml-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-muted sm:text-[10px]">Central de oportunidades</p>
                  <div className="ml-auto flex items-center gap-2 rounded-full border border-positive/20 bg-positive/10 px-2 py-1 font-mono text-[8px] font-black uppercase tracking-wider text-positive sm:text-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-positive" /> ao vivo
                  </div>
                </div>

                <div className="grid gap-3 p-3 sm:p-5 lg:grid-cols-[1.35fr_0.65fr]">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-accent/35 bg-accent/[0.07] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-accent">Melhor linha detectada</p>
                          <h2 className="mt-2 text-sm font-black sm:text-base">Palmeiras × Flamengo</h2>
                          <p className="mt-1 text-[10px] text-muted">Futebol · Mercado 1×2 · demonstração</p>
                        </div>
                        <span className="rounded-md border border-positive/20 bg-positive/10 px-2 py-1 text-[10px] font-black text-positive">+2,1%</span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {[["Casa", "1.91"], ["Empate", "3.62"], ["Fora", "4.35"]].map(([label, odd], index) => (
                          <div key={label} className={`rounded-lg border px-2 py-2.5 text-center ${index === 0 ? "border-accent/40 bg-accent/10" : "border-border bg-bg/45"}`}>
                            <p className="text-[8px] font-bold uppercase tracking-wider text-muted">{label}</p>
                            <p className="mt-0.5 text-lg font-black tracking-tight">{odd}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[10px]">
                        <span className="text-muted">Melhor cotação</span>
                        <span className="font-black text-text">Bet365 <span className="text-accent">↗</span></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[["Casas", "40+"], ["Jogos", "300+"], ["Atualização", "1s"]].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-border bg-bg/40 p-3">
                          <p className="font-mono text-[8px] uppercase tracking-wider text-muted">{label}</p>
                          <p className="mt-1.5 text-lg font-black sm:text-xl">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-xl border border-border bg-bg/40 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-[8px] uppercase tracking-wider text-muted">Fluxo da operação</p>
                        <Icon d="M12 20V10M18 20V4M6 20v-5" className="h-4 w-4 text-accent" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {[["Odd capturada", "Concluído"], ["Cálculo validado", "Concluído"], ["Registro financeiro", "Pronto"]].map(([label, status], index) => (
                          <div key={label} className="flex items-center gap-2.5">
                            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${index < 2 ? "bg-positive/15 text-positive" : "bg-accent/15 text-accent"}`}>
                              <Icon d={index < 2 ? "m6 12 4 4 8-9" : "M12 6v6l4 2"} className="h-3 w-3" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-bold text-text">{label}</p>
                              <p className="text-[8px] text-muted">{status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-gradient-to-br from-surface-2 to-bg p-4">
                      <p className="font-mono text-[8px] uppercase tracking-wider text-muted">Visão financeira</p>
                      <div className="mt-3 flex h-16 items-end gap-1" aria-label="Gráfico ilustrativo de evolução financeira">
                        {[28, 38, 31, 49, 43, 59, 67, 61, 78, 86].map((height, index) => (
                          <span key={index} className="flex-1 rounded-t-sm bg-gradient-to-t from-accent/25 to-accent" style={{ height: `${height}%` }} />
                        ))}
                      </div>
                      <p className="mt-2 text-[9px] leading-relaxed text-muted">Banca, exposição, ROI e custos sem planilha paralela.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-xl border border-border-strong bg-surface/95 p-3 shadow-2xl backdrop-blur-xl sm:flex">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-positive/12 text-positive"><Icon d="m5 12 4 4L19 6" className="h-4 w-4" /></span>
                <div>
                  <p className="text-[10px] font-black text-text">Oportunidade validada</p>
                  <p className="mt-0.5 text-[9px] text-muted">Conta pronta para executar</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface/45 px-4 py-7 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 text-center sm:grid-cols-3 sm:text-left">
            {[["40+", "casas monitoradas"], ["300+", "jogos ao vivo"], ["1 segundo", "entre atualizações"]].map(([numero, texto]) => (
              <div key={texto} className="flex items-center justify-center gap-3 sm:justify-start sm:border-l sm:border-border sm:pl-6">
                <strong className="text-xl font-black tracking-tight text-text sm:text-2xl">{numero}</strong>
                <span className="max-w-28 text-xs font-semibold leading-4 text-muted">{texto}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="casas-title" className="relative overflow-hidden border-b border-border bg-bg py-16 sm:py-20">
          <div className="house-marquee-watermark" aria-hidden="true">CASAS</div>
          <div className="relative z-10 mx-auto mb-9 max-w-3xl px-4 text-center sm:px-6">
            <p className="mono-label text-accent">Cobertura ampla</p>
            <h2 id="casas-title" className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-4xl">Dezenas de casas. Uma única tela.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-2">A melhor cotação aparece sem você perder tempo abrindo e atualizando uma aba por vez.</p>
          </div>

          <div className="house-marquee space-y-3" aria-label="Exemplos de casas acompanhadas">
            {CASAS_DESTAQUE.map((casas, rowIndex) => (
              <div key={rowIndex} className={`house-marquee-track ${rowIndex === 0 ? "house-marquee-forward" : "house-marquee-reverse"}`}>
                <div className="house-marquee-group">
                  {casas.map((casa) => <span key={casa} className="house-wordmark">{casa}</span>)}
                </div>
                <div className="house-marquee-group" aria-hidden="true">
                  {casas.map((casa) => <span key={casa} className="house-wordmark">{casa}</span>)}
                </div>
              </div>
            ))}
          </div>
          <p className="relative z-10 mx-auto mt-7 max-w-2xl px-4 text-center text-[10px] leading-5 text-muted">Marcas exibidas apenas para identificação das plataformas. Disponibilidade de mercados e cotações pode variar.</p>
        </section>

        <section id="como-funciona" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mono-label text-accent">Como funciona</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">Do sinal da oportunidade ao controle do seu resultado.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-2">Você encontra, confere e registra sem trocar de ferramenta a cada etapa — mais velocidade para agir e mais clareza para acompanhar.</p>
            </div>

            <div className="relative mt-12 rounded-3xl border border-border bg-surface/55 p-5 sm:p-8 lg:mt-14 lg:p-10">
              <div className="absolute left-[17%] right-[17%] top-[67px] hidden h-px bg-gradient-to-r from-accent/20 via-accent/70 to-accent/20 lg:block" aria-hidden="true" />
              <div className="relative grid gap-8 lg:grid-cols-3 lg:gap-0">
              {PILARES.map((pilar, index) => (
                <article key={pilar.titulo} className="group relative flex items-start gap-5 lg:block lg:px-8 lg:text-center">
                  {index < PILARES.length - 1 && <span className="absolute -bottom-8 left-7 top-14 w-px bg-gradient-to-b from-accent/50 to-border lg:hidden" aria-hidden="true" />}
                  <div className="relative z-10 shrink-0 lg:mx-auto lg:w-fit">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl border border-accent/35 bg-bg text-accent shadow-[0_10px_32px_color-mix(in_srgb,var(--accent)_15%,transparent)] transition duration-200 group-hover:border-accent/60 group-hover:bg-accent/10">
                      <Icon d={pilar.icone} className="h-5 w-5" />
                    </span>
                    <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-accent/40 bg-accent font-mono text-[8px] font-black text-white">{pilar.numero}</span>
                  </div>
                  <div className="min-w-0 pt-1 lg:pt-0">
                    <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-accent lg:mt-6">Etapa {pilar.numero}</p>
                    <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">{pilar.titulo}</h3>
                    <p className="mt-3 text-sm leading-6 text-text-2">{pilar.texto}</p>
                  </div>
                </article>
              ))}
              </div>
              <div className="mt-8 flex items-center justify-center border-t border-border pt-6 lg:mt-10">
                <Link href="/assinar" className="group inline-flex min-h-11 items-center gap-2 text-sm font-black text-accent transition-colors hover:text-accent-hover">
                  Quero operar com mais controle
                  <Icon d="m9 18 6-6-6-6" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="plataforma" className="scroll-mt-20 border-y border-border bg-surface/35 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mono-label text-accent">Tudo conectado</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">Tudo o que sua operação precisa, num lugar só.</h2>
              <p className="mt-5 text-base leading-7 text-text-2">Seis ferramentas trabalhando juntas — da identificação da oportunidade ao controle do que realmente sobrou.</p>
            </div>

            <div className="mt-12 grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {MODULOS.map((modulo) => (
                <article key={modulo.titulo} className="group flex min-h-[220px] flex-col rounded-2xl border border-border bg-bg/45 p-6 transition duration-200 hover:-translate-y-1 hover:border-accent/35 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent transition-transform duration-200 group-hover:scale-105"><Icon d={modulo.icone} /></span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-muted">{modulo.etiqueta}</span>
                  </div>
                  <div className="mt-auto pt-8">
                    <h3 className="text-lg font-black tracking-tight">{modulo.titulo}</h3>
                    <p className="mt-2 text-sm leading-6 text-text-2">{modulo.texto}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <p className="mono-label text-accent">Chega de improviso</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">Você não perde por falta de aposta boa. Perde por operar no escuro.</h2>
              <p className="mt-5 text-base leading-7 text-text-2">As oportunidades existem. O que separa uma operação consistente da tentativa é ter a informação na hora certa e saber exatamente onde está cada real. Cinco abas e uma planilha bagunçada não são controle.</p>
              <Link href="/assinar" className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-black text-accent-ink transition hover:bg-accent-hover">
                Quero parar de operar no escuro <Icon d="m9 18 6-6-6-6" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-surface/70">
              <div className="grid grid-cols-[1.25fr_0.88fr_0.88fr] border-b border-border bg-surface-2/80 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-muted sm:px-5 sm:text-[10px]">
                <span>Tarefa</span>
                <span>Jeito antigo</span>
                <span className="text-accent">Com Apex</span>
              </div>
              {COMPARATIVO.map(([tarefa, antigo, apex]) => (
                <div key={tarefa} className="grid grid-cols-[1.25fr_0.88fr_0.88fr] gap-2 border-b border-border px-4 py-4 text-[10px] last:border-b-0 sm:px-5 sm:text-xs">
                  <strong className="pr-2 text-text">{tarefa}</strong>
                  <span className="flex gap-1.5 text-muted"><Icon d="M6 6l12 12M18 6 6 18" className="mt-0.5 h-3 w-3 shrink-0 text-negative" />{antigo}</span>
                  <span className="flex gap-1.5 font-bold text-text-2"><Icon d="m5 12 4 4L19 6" className="mt-0.5 h-3 w-3 shrink-0 text-positive" />{apex}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="precos" className="scroll-mt-20 border-y border-border bg-surface/35 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mono-label text-accent">Planos</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">Até 58% abaixo da referência de mercado.</h2>
              <p className="mt-5 text-base leading-7 text-text-2">A plataforma completa em qualquer plano. No anual, você paga o equivalente a {brl(anual.porMes)}/mês e economiza mais.</p>
            </div>

            <div className="checkout-v2-plans mt-14">
              {planos.map((plano) => {
                const destaque = plano.id === "trimestral";
                const maiorEconomia = plano.id === "anual";
                return (
                  <article key={plano.id} className={`checkout-v2-plan ${destaque ? "checkout-v2-plan-featured" : ""}`}>
                    {destaque && <span className="checkout-v2-badge">● Mais escolhido</span>}
                    {maiorEconomia && <span className="checkout-v2-badge checkout-v2-badge-economy">◆ Maior economia</span>}

                    <p className={`checkout-v2-plan-name ${destaque ? "text-positive" : ""}`}>{plano.nome}</p>
                    <div className="mt-6 flex items-end gap-2">
                      <span className="pb-1 text-sm font-bold text-muted">R$</span>
                      <strong className="text-4xl font-black tracking-[-0.055em] sm:text-5xl">
                        {brl(plano.valor).replace("R$\u00a0", "").replace("R$ ", "")}
                      </strong>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {plano.meses === 1 ? "por mês" : plano.meses === 3 ? "a cada 3 meses" : "por ano"}
                    </p>
                    <p className="mt-3 text-xs text-muted">
                      Referência de mercado: <span className="line-through">{brl(plano.valorCheio)}</span>
                    </p>

                    {plano.id !== "mensal" && (
                      <div className={`mt-4 rounded-xl border px-3.5 py-3 ${destaque ? "border-positive/25 bg-positive/[0.07]" : "border-accent/20 bg-accent/[0.06]"}`}>
                        <p className={`text-xs font-black ${destaque ? "text-positive" : "text-accent"}`}>
                          Equivale a apenas {brl(plano.porMes)}/mês
                        </p>
                        <p className="mt-1 text-[10px] text-muted">Economia de {plano.economia}% sobre a referência no período.</p>
                      </div>
                    )}

                    <div className="my-6 h-px bg-border" />
                    <ul className="space-y-3.5 text-sm text-text-2">
                      {BENEFICIOS_PLANOS[plano.id].map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <Icon d="m5 12 4 4L19 6" className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href={`/assinar?plano=${plano.id}`} className={`checkout-v2-select ${destaque ? "checkout-v2-select-featured" : ""}`}>
                      {destaque && <Icon d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" className="h-4 w-4" />}
                      {plano.id === "mensal" ? "Começar agora" : destaque ? "Ativar plano trimestral" : "Garantir plano anual"}
                    </Link>
                  </article>
                );
              })}
            </div>
            <div className="mt-7 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted sm:flex-row sm:gap-5">
              <span className="flex items-center gap-2"><Icon d="m5 12 4 4L19 6" className="h-4 w-4 text-positive" />Pagamento via Pix ou cartão</span>
              <span className="flex items-center gap-2"><Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" className="h-4 w-4 text-positive" />Ambiente seguro</span>
            </div>
            <div className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-positive/25 bg-positive/[0.07] px-5 py-4 text-left shadow-[0_16px_50px_color-mix(in_srgb,var(--positive)_8%,transparent)] sm:px-6">
              <span className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-positive/70 bg-[radial-gradient(circle,var(--surface)_36%,color-mix(in_srgb,var(--positive)_18%,var(--bg))_100%)] text-center shadow-[0_0_32px_color-mix(in_srgb,var(--positive)_22%,transparent)]" aria-label="Selo de 7 dias de garantia">
                <span className="absolute inset-1 rounded-full border border-dashed border-positive/50" aria-hidden="true" />
                <span className="relative flex flex-col items-center font-black uppercase leading-none text-positive">
                  <span className="text-xl tracking-[-0.04em]">7 dias</span>
                  <span className="mt-1 text-[8px] tracking-[0.16em]">Garantia</span>
                </span>
              </span>
              <p className="text-sm leading-6 text-text-2">
                <strong className="block font-black text-text">7 dias de garantia. Você testa sem risco.</strong>
                Se a plataforma não fizer sentido para você, solicite o reembolso dentro desse prazo.
              </p>
            </div>
          </div>
        </section>

        <section id="duvidas" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="mono-label text-accent">Sem letras miúdas</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">Dúvidas antes de começar?</h2>
              <p className="mt-5 text-base leading-7 text-text-2">Aqui estão as respostas mais importantes para você decidir com clareza.</p>
            </div>
            <div className="space-y-3">
              {FAQ.map((item) => (
                <details key={item.pergunta} className="group rounded-xl border border-border bg-surface/60 p-5 open:border-accent/30 open:bg-surface-2/70">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 text-sm font-black marker:content-none">
                    {item.pergunta}
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-bg text-muted transition group-open:rotate-180 group-open:text-accent"><Icon d="m6 9 6 6 6-6" className="h-4 w-4" /></span>
                  </summary>
                  <p className="mt-3 max-w-2xl pr-10 text-sm leading-6 text-text-2">{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="suporte" className="scroll-mt-20 border-y border-border bg-surface/35 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <p className="mono-label text-accent">Suporte</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">Fale com a equipe ApexMonitor.</h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-text-2">Acompanhe as novidades no Instagram ou escolha o canal de atendimento que preferir.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="group flex min-h-48 flex-col rounded-2xl border border-border bg-bg/55 p-6 transition duration-200 hover:-translate-y-1 hover:border-accent/45 hover:bg-surface-2/70">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                    <Icon d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM17.5 6.5h.01" className="h-5 w-5" />
                  </span>
                  <Icon d="M7 17 17 7M8 7h9v9" className="h-4 w-4 text-muted transition group-hover:text-accent" />
                </div>
                <div className="mt-auto pt-7">
                  <h3 className="text-lg font-black">Instagram</h3>
                  <p className="mt-1 text-sm font-bold text-accent">@apexmonitor</p>
                  <p className="mt-2 text-xs leading-5 text-text-2">Novidades, atualizações da plataforma e contato com a equipe.</p>
                </div>
              </a>

              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="group flex min-h-48 flex-col rounded-2xl border border-border bg-bg/55 p-6 transition duration-200 hover:-translate-y-1 hover:border-positive/45 hover:bg-surface-2/70">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-xl border border-positive/25 bg-positive/10 text-positive"><Icon d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.4 9.4 0 0 1-4-.9L3 21l1.8-4.6A8.7 8.7 0 1 1 21 11.5Z" /></span>
                    <Icon d="M7 17 17 7M8 7h9v9" className="h-4 w-4 text-muted transition group-hover:text-positive" />
                  </div>
                  <div className="mt-auto pt-7"><h3 className="text-lg font-black">WhatsApp</h3><p className="mt-1 text-sm font-bold text-positive">Iniciar atendimento</p><p className="mt-2 text-xs leading-5 text-text-2">Tire suas dúvidas diretamente com a nossa equipe.</p></div>
                </a>
              ) : (
                <div aria-disabled="true" className="flex min-h-48 flex-col rounded-2xl border border-border bg-bg/35 p-6 opacity-75">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-xl border border-positive/20 bg-positive/[0.07] text-positive"><Icon d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.4 9.4 0 0 1-4-.9L3 21l1.8-4.6A8.7 8.7 0 1 1 21 11.5Z" /></span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-[0.14em] text-muted">Em breve</span>
                  </div>
                  <div className="mt-auto pt-7"><h3 className="text-lg font-black">WhatsApp</h3><p className="mt-1 text-sm font-bold text-text-2">Canal sendo configurado</p><p className="mt-2 text-xs leading-5 text-muted">O botão será liberado assim que o número de atendimento for informado.</p></div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="landing-cta relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-accent/30 bg-surface p-8 text-center sm:p-14 lg:p-20">
            <div className="relative z-10">
              <BrandMark className="mx-auto h-14 w-14" />
              <p className="mono-label mt-6 text-accent">Informação na hora certa</p>
              <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-5xl">Pare de operar no escuro.</h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-text-2">Odds em tempo real e controle total da sua operação — com todos os módulos liberados a partir de {brl(anual.porMes)}/mês.</p>
              <Link href="/assinar" className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-accent to-accent-deep px-7 text-sm font-black text-white shadow-[0_16px_44px_color-mix(in_srgb,var(--accent)_34%,transparent)] transition hover:brightness-110">
                Começar agora <Icon d="m9 18 6-6-6-6" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-4 text-[10px] text-muted">Sem promessa de lucro. Informação e controle para decisões mais conscientes.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <div className="flex items-center justify-center gap-2.5 md:justify-start"><BrandMark className="h-7 w-7" /><BrandName className="text-[12px]" /></div>
            <p className="mt-3 max-w-2xl text-[11px] leading-5 text-muted">Ferramenta de análise e gestão para apostadores. Não somos uma casa de apostas e não garantimos lucro. Apostas envolvem risco. Conteúdo destinado a maiores de 18 anos.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-text-2">
            <Link href="/login" className="min-h-11 content-center hover:text-text">Entrar</Link>
            <Link href="/assinar" className="min-h-11 content-center hover:text-accent">Assinar</Link>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="min-h-11 content-center hover:text-accent">Instagram</a>
            <Link href="/privacidade" className="min-h-11 content-center hover:text-text">Privacidade</Link>
            <Link href="/termos" className="min-h-11 content-center hover:text-text">Termos</Link>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-7xl text-center text-[10px] text-muted md:text-left">© {new Date().getFullYear()} ApexMonitor · apexmonitor.com.br</p>
      </footer>
    </div>
  );
}
