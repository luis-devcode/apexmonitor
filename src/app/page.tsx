import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import Landing from "@/components/Landing";
import ResultadosChart from "@/components/ResultadosChart";
import { assinaturaAtiva, getCurrentUser } from "@/lib/auth";
import { porMes } from "@/lib/custos";
import { procedimentoLabel } from "@/lib/procedimentos";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DIA = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const sinal = (v: number) => `${v >= 0 ? "+" : ""}${brl(v)}`;
const percentual = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const isoDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

type PernaFinanceira = {
  contaId: string | null;
  stake: number;
  odd: number;
  isLay: boolean;
  freebet: boolean;
  risco: number;
  resultado: string;
};

/** Risco financeiro real: responsabilidade no lay e zero quando a stake é promocional. */
function riscoDaPerna(perna: Pick<PernaFinanceira, "stake" | "odd" | "isLay" | "freebet" | "risco">) {
  if (perna.risco > 0) return perna.risco;
  if (perna.freebet) return 0;
  return perna.isLay ? perna.stake * Math.max(0, perna.odd - 1) : perna.stake;
}

const ICONS = {
  trend: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M17 15h.01" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  receipt: <><path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3 5 4.5Z" /><path d="M9 9h6M9 13h6" /></>,
  warning: <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
  ticket: <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />,
  arrowIn: <><path d="M12 3v13M7 11l5 5 5-5" /><path d="M5 21h14" /></>,
  arrowOut: <><path d="M12 21V8M7 13l5-5 5 5" /><path d="M5 3h14" /></>,
};

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;
}

export default async function DashboardPage() {
  // Visitante não-logado vê a página de vendas; logado sem assinatura vai renovar;
  // logado e ativo cai no dashboard (comportamento original de requireUserId).
  const visitante = await getCurrentUser();
  if (!visitante) return <Landing />;
  if (!assinaturaAtiva(visitante)) redirect("/assinatura");

  const userId = visitante.id;
  const user = visitante;
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const mesLabel = capitalizar(agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));

  const [operacoes, contas, freebets, custos, parceiros, movimentosMes] = await Promise.all([
    prisma.operacao.findMany({
      where: { userId },
      include: { pernas: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.conta.findMany({
      where: { userId },
      include: { casa: true, parceiro: true },
      orderBy: { saldo: "desc" },
    }),
    prisma.freebet.findMany({
      where: { userId, status: "PENDENTE" },
      include: { casa: true },
      orderBy: [{ expiraEm: "asc" }],
    }),
    prisma.custo.findMany({
      where: { userId, ativo: true },
      select: { valor: true, periodo: true },
    }),
    prisma.parceiro.findMany({
      where: { userId, ativo: true, custoValor: { gt: 0 } },
      select: { custoValor: true, custoPeriodo: true },
    }),
    prisma.movimento.findMany({
      where: { userId, tipo: { in: ["DEPOSITO", "SAQUE"] }, data: { gte: inicioMes } },
      select: { tipo: true, valor: true },
    }),
  ]);

  const finalizadas = operacoes.filter((o) => o.status === "FINALIZADA");
  const abertas = operacoes.filter((o) => !["FINALIZADA", "ANULADA"].includes(o.status));
  // O resultado pertence ao dia em que a operação foi registrada. `liquidadaEm`
  // informa apenas quando o resultado ficou conhecido.
  const finalizadasMes = finalizadas.filter((o) => o.createdAt >= inicioMes);
  const finalizadasHoje = finalizadasMes.filter((o) => o.createdAt >= inicioHoje);
  const finalizadasMesAnterior = finalizadas.filter(
    (o) => o.createdAt >= inicioMesAnterior && o.createdAt < inicioMes,
  );

  const lucroBrutoMes = finalizadasMes.reduce((s, o) => s + (o.lucroReal ?? 0), 0);
  const lucroHoje = finalizadasHoje.reduce((s, o) => s + (o.lucroReal ?? 0), 0);
  const lucroMesAnterior = finalizadasMesAnterior.reduce((s, o) => s + (o.lucroReal ?? 0), 0);
  const investidoMes = finalizadasMes.reduce((s, o) => s + o.stakeTotal, 0);
  const lucroTotal = finalizadas.reduce((s, o) => s + (o.lucroReal ?? 0), 0);
  const investidoTotal = finalizadas.reduce((s, o) => s + o.stakeTotal, 0);
  const roiMes = investidoMes > 0 ? (lucroBrutoMes / investidoMes) * 100 : 0;
  const roiHistorico = investidoTotal > 0 ? (lucroTotal / investidoTotal) * 100 : 0;
  const resultadoMedio = finalizadasMes.length > 0 ? lucroBrutoMes / finalizadasMes.length : 0;
  const positivasMes = finalizadasMes.filter((o) => (o.lucroReal ?? 0) >= 0).length;

  // Custos recorrentes entram como provisão mensal. Isso evita chamar o lucro
  // operacional de "líquido" antes de pagar ferramentas, estrutura e CPFs.
  const custoFerramentas = custos.reduce((s, c) => s + porMes(c.valor, c.periodo), 0);
  const custoParceiros = parceiros.reduce((s, p) => s + porMes(p.custoValor, p.custoPeriodo ?? "MES"), 0);
  const custosMensais = custoFerramentas + custoParceiros;
  const resultadoLiquidoMes = lucroBrutoMes - custosMensais;
  const resultadoLiquidoAnterior = lucroMesAnterior - custosMensais;
  const coberturaCustos = custosMensais > 0 ? Math.max(0, (lucroBrutoMes / custosMensais) * 100) : lucroBrutoMes > 0 ? 100 : 0;
  const faltaEquilibrio = Math.max(0, custosMensais - lucroBrutoMes);

  const riscoOperacao = (o: (typeof abertas)[number]) => o.pernas
    .filter((p) => p.resultado === "PENDENTE")
    .reduce((s, p) => s + riscoDaPerna(p), 0);
  // Só reduz o saldo da banca quando a perna está conciliada com uma conta.
  // Operações sem conta continuam visíveis no alerta abaixo, sem fabricar uma
  // exposição em uma conta que ainda não foi escolhida.
  const emJogo = abertas.reduce(
    (s, o) => s + o.pernas
      .filter((p) => p.contaId && p.resultado === "PENDENTE")
      .reduce((t, p) => t + riscoDaPerna(p), 0),
    0,
  );
  const protegidas = abertas.filter((o) => o.pernas.length > 1);
  const semProtecao = abertas.filter((o) => o.pernas.length === 1);
  const exposicaoSemProtecao = semProtecao.reduce((s, o) => s + riscoOperacao(o), 0);
  const lucroPrevisto = protegidas.reduce((s, o) => s + o.lucroEsperado, 0);
  const semConta = abertas.filter((o) => o.pernas.some((p) => !p.contaId));
  const semContaValor = semConta.reduce(
    (s, o) => s + o.pernas.filter((p) => !p.contaId && p.resultado === "PENDENTE").reduce((t, p) => t + riscoDaPerna(p), 0),
    0,
  );

  const patrimonio = contas.reduce((s, c) => s + c.saldo, 0);
  const capitalLivre = patrimonio - emJogo;
  const exposicaoPct = patrimonio > 0 ? (emJogo / patrimonio) * 100 : 0;
  const riscoPorConta = new Map<string, number>();
  for (const o of abertas) {
    for (const perna of o.pernas) {
      if (!perna.contaId || perna.resultado !== "PENDENTE") continue;
      riscoPorConta.set(perna.contaId, (riscoPorConta.get(perna.contaId) ?? 0) + riscoDaPerna(perna));
    }
  }
  const totalSaldoPositivo = contas.reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const contasComPosicao = contas.map((conta) => {
    const exposto = riscoPorConta.get(conta.id) ?? 0;
    return {
      id: conta.id,
      casa: conta.casa.nome,
      dono: conta.parceiro?.nome ?? "Minha banca",
      saldo: conta.saldo,
      exposto,
      livre: conta.saldo - exposto,
      participacao: totalSaldoPositivo > 0 ? (Math.max(0, conta.saldo) / totalSaldoPositivo) * 100 : 0,
    };
  });
  const maiorConta = contasComPosicao.reduce<(typeof contasComPosicao)[number] | null>(
    (maior, conta) => !maior || conta.participacao > maior.participacao ? conta : maior,
    null,
  );

  // Freebet é valor nominal, não caixa. As vencidas saem do potencial disponível.
  const vencidas = freebets.filter((f) => f.expiraEm && f.expiraEm < agora);
  const freebetsValidas = freebets.filter((f) => !f.expiraEm || f.expiraEm >= agora);
  const aVencer = freebetsValidas.filter((f) => f.expiraEm && f.expiraEm.getTime() - agora.getTime() <= 3 * DIA);
  const freebetsValor = freebetsValidas.reduce((s, f) => s + f.valor, 0);
  const vencidasValor = vencidas.reduce((s, f) => s + f.valor, 0);

  // Aporte e saque explicam variação de caixa, mas não são lucro ou prejuízo.
  const depositosMes = movimentosMes.filter((m) => m.tipo === "DEPOSITO").reduce((s, m) => s + Math.abs(m.valor), 0);
  const saquesMes = movimentosMes.filter((m) => m.tipo === "SAQUE").reduce((s, m) => s + Math.abs(m.valor), 0);

  const inicioJanela = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 29);
  const porDia = new Map<string, { lucro: number; operacoes: number }>();
  for (const o of finalizadas) {
    if (o.createdAt < inicioJanela) continue;
    const chave = isoDia(o.createdAt);
    const atual = porDia.get(chave) ?? { lucro: 0, operacoes: 0 };
    atual.lucro += o.lucroReal ?? 0;
    atual.operacoes += 1;
    porDia.set(chave, atual);
  }
  const dias = Array.from({ length: 30 }, (_, i) => {
    const data = new Date(inicioJanela.getTime() + i * DIA);
    const chave = isoDia(data);
    const info = porDia.get(chave);
    return { iso: chave, lucro: info?.lucro ?? 0, operacoes: info?.operacoes ?? 0 };
  });

  const primeiroNome = (user?.nome ?? "").trim().split(/\s+/)[0];
  const alertas = [
    vencidas.length > 0 ? { href: "/freebets", tone: "negative" as const, texto: `${vencidas.length} ${vencidas.length === 1 ? "freebet vencida" : "freebets vencidas"} · ${brl(vencidasValor)} nominal` } : null,
    semConta.length > 0 ? { href: "/operacoes", tone: "info" as const, texto: `${semConta.length} ${semConta.length === 1 ? "operação sem conta/CPF" : "operações sem conta/CPF"} · ${brl(semContaValor)} sem conciliação` } : null,
    semProtecao.length > 0 ? { href: "/operacoes", tone: "warning" as const, texto: `${semProtecao.length} ${semProtecao.length === 1 ? "posição sem proteção" : "posições sem proteção"} · risco de ${brl(exposicaoSemProtecao)}` } : null,
    custosMensais === 0 ? { href: "/custos", tone: "warning" as const, texto: "Cadastre seus custos para enxergar o resultado líquido real" } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <AppShell>
      <div className="dashboard-command mx-auto w-full max-w-[1440px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono-label text-accent">Centro financeiro · {mesLabel}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {primeiroNome ? `Visão financeira de ${primeiroNome}` : "Visão financeira"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">Caixa, exposição, resultado e custos separados para você saber quanto tem, quanto está arriscado e quanto realmente sobrou.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/operacoes?nova=1" className="h-9 rounded-lg bg-accent px-3.5 text-xs font-black leading-9 text-accent-ink transition hover:bg-accent-hover">+ Nova operação</Link>
            <Link href="/operacoes" className="h-9 rounded-lg border border-border bg-surface px-3.5 text-xs font-bold leading-9 text-text-2 transition hover:border-border-strong hover:text-text">Abrir planilha</Link>
          </div>
        </header>

        {alertas.length > 0 && (
          <section aria-label="Pontos de atenção" className="flex flex-wrap gap-2">
            {alertas.map((alerta) => <Alerta key={alerta.texto} {...alerta} />)}
          </section>
        )}

        <section className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
          <article className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${resultadoLiquidoMes >= 0 ? "border-positive/25 bg-gradient-to-br from-positive/[0.13] via-surface to-surface" : "border-negative/25 bg-gradient-to-br from-negative/[0.12] via-surface to-surface"}`}>
            <div className={`absolute -right-16 -top-24 h-64 w-64 rounded-full blur-3xl ${resultadoLiquidoMes >= 0 ? "bg-positive/10" : "bg-negative/10"}`} />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-muted">Resultado líquido do mês</p>
                  <p className={`mt-2 text-4xl font-black tracking-tight tabular-nums sm:text-5xl ${resultadoLiquidoMes >= 0 ? "text-positive" : "text-negative"}`}>{sinal(resultadoLiquidoMes)}</p>
                  <p className="mt-2 text-xs text-text-2">Lucro das operações menos a provisão mensal de custos.</p>
                </div>
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${resultadoLiquidoMes >= 0 ? "bg-positive/12 text-positive" : "bg-negative/12 text-negative"}`}><Icon name="trend" /></span>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                <MiniResumo label="Resultado operacional" valor={sinal(lucroBrutoMes)} tom={lucroBrutoMes >= 0 ? "positive" : "negative"} />
                <MiniResumo label="Custos provisionados" valor={`− ${brl(custosMensais)}`} tom="warning" />
                <MiniResumo label="Mês anterior" valor={sinal(resultadoLiquidoAnterior)} tom={resultadoLiquidoAnterior >= 0 ? "neutral" : "negative"} />
              </div>

              <div className="mt-5 border-t border-border/70 pt-4">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="font-bold text-text-2">Cobertura dos custos</span>
                  <span className={coberturaCustos >= 100 ? "font-black text-positive" : "font-black text-warning"}>{coberturaCustos.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className={`h-full rounded-full ${coberturaCustos >= 100 ? "bg-positive" : "bg-warning"}`} style={{ width: `${Math.min(100, Math.max(0, coberturaCustos))}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  {custosMensais === 0
                    ? <>Sem custos cadastrados. <Link href="/custos" className="font-bold text-accent hover:underline">Configurar custos →</Link></>
                    : faltaEquilibrio > 0
                      ? `Faltam ${brl(faltaEquilibrio)} de lucro operacional para pagar o custo do mês.`
                      : `Custos cobertos; ${brl(resultadoLiquidoMes)} permanece depois da estrutura mensal.`}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="mono-label text-muted">Posição de capital</p><h2 className="mt-1 text-base font-extrabold">Banca nas casas</h2></div>
              <Link href="/banca" className="text-xs font-bold text-accent hover:underline">Gerenciar →</Link>
            </div>
            <p className="mt-4 text-3xl font-black tracking-tight tabular-nums">{brl(patrimonio)}</p>
            <p className="mt-1 text-[11px] text-muted">Saldo controlado em {contas.length} {contas.length === 1 ? "conta" : "contas"}; freebets não entram neste valor.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-surface-2 p-3"><p className="mono-label text-muted">Disponível</p><p className={`mt-1.5 text-lg font-black tabular-nums ${capitalLivre < 0 ? "text-negative" : "text-info"}`}>{brl(capitalLivre)}</p></div>
              <div className="rounded-xl border border-border bg-surface-2 p-3"><p className="mono-label text-muted">Em exposição</p><p className="mt-1.5 text-lg font-black tabular-nums text-warning">{brl(emJogo)}</p></div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-warning" style={{ width: `${Math.min(100, Math.max(0, exposicaoPct))}%` }} /></div>
            <div className="mt-2 flex justify-between gap-3 text-[10px] text-muted">
              <span>{exposicaoPct.toFixed(1)}% da banca comprometida</span>
              {maiorConta && <span className="truncate text-right">Maior posição: <b className="text-text-2">{maiorConta.casa} {maiorConta.participacao.toFixed(0)}%</b></span>}
            </div>
          </article>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon="trend" label="Resultado hoje" valor={sinal(lucroHoje)} detalhe={`${finalizadasHoje.length} ${finalizadasHoje.length === 1 ? "operação fechada" : "operações fechadas"}`} tom={lucroHoje >= 0 ? "positive" : "negative"} />
          <KpiCard icon="target" label="ROI realizado no mês" valor={percentual(roiMes)} detalhe={`${brl(investidoMes)} de volume fechado`} tom={roiMes >= 0 ? "positive" : "negative"} />
          <KpiCard icon="receipt" label="Resultado médio" valor={sinal(resultadoMedio)} detalhe={`Por operação · ${finalizadasMes.length} no mês`} tom={resultadoMedio >= 0 ? "info" : "negative"} />
          <KpiCard icon="shield" label="Potencial protegido" valor={sinal(lucroPrevisto)} detalhe={`${protegidas.length} abertas com 2+ pernas`} tom="warning" />
        </section>

        <ResultadosChart dias={dias} />

        <section className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
          <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <SectionTitle eyebrow="Fechamento gerencial" titulo={`Demonstrativo de ${mesLabel}`} href="/custos" link="Ver custos" />
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <LinhaFinanceira label="Resultado das operações" detalhe={`${finalizadasMes.length} operações liquidadas`} valor={lucroBrutoMes} tom={lucroBrutoMes >= 0 ? "positive" : "negative"} />
              <LinhaFinanceira label="Ferramentas e estrutura" detalhe="Provisão mensal recorrente" valor={-custoFerramentas} tom="warning" />
              <LinhaFinanceira label="CPFs e parceiros" detalhe="Provisão mensal recorrente" valor={-custoParceiros} tom="warning" />
              <LinhaFinanceira label="Resultado líquido" detalhe="Operação menos estrutura" valor={resultadoLiquidoMes} tom={resultadoLiquidoMes >= 0 ? "positive" : "negative"} destaque />
            </div>
            <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3.5">
              <p className="mono-label text-muted">Fluxo de caixa externo</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-info/10 text-info"><Icon name="arrowIn" className="h-4 w-4" /></span><div><p className="text-[10px] text-muted">Aportes</p><p className="text-sm font-black tabular-nums">{brl(depositosMes)}</p></div></div>
                <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent"><Icon name="arrowOut" className="h-4 w-4" /></span><div><p className="text-[10px] text-muted">Saques</p><p className="text-sm font-black tabular-nums">{brl(saquesMes)}</p></div></div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted">Aportes e saques alteram o caixa, mas não entram no lucro. Transferências entre casas também não mudam o patrimônio.</p>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <SectionTitle eyebrow="Risco operacional" titulo="Posições em aberto" href="/operacoes" link="Abrir planilha" />
            {abertas.length === 0 ? (
              <EstadoVazio titulo="Nenhuma posição em aberto" texto="Tudo o que foi registrado já está liquidado na planilha." />
            ) : (
              <div className="mt-4 space-y-2">
                {abertas.slice(0, 6).map((operacao) => {
                  const risco = riscoOperacao(operacao);
                  const protegida = operacao.pernas.length > 1;
                  return (
                    <Link key={operacao.id} href="/operacoes" className="grid gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3 transition hover:border-accent/40 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                      <div className="min-w-0"><p className="truncate text-sm font-bold">{operacao.evento}</p><p className="mt-0.5 truncate text-[10px] text-muted">{procedimentoLabel(operacao.procedimento) ?? operacao.tipo} · {operacao.casas ?? "casa não informada"}</p></div>
                      <div className="sm:text-right"><p className="text-[9px] uppercase tracking-wide text-muted">Exposição</p><p className="text-sm font-black tabular-nums">{brl(risco)}</p></div>
                      <span className={`w-fit rounded-md px-2 py-1 text-[10px] font-bold ${protegida ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning"}`}>{protegida ? `${sinal(operacao.lucroEsperado)} previsto` : "Sem proteção"}</span>
                    </Link>
                  );
                })}
                {abertas.length > 6 && <p className="pt-1 text-center text-[11px] text-muted">Mais {abertas.length - 6} posições na planilha.</p>}
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <SectionTitle eyebrow="Liquidez e concentração" titulo="Distribuição da banca" href="/banca" link="Ver todas" />
            {contasComPosicao.length === 0 ? (
              <EstadoVazio titulo="Nenhuma conta cadastrada" texto="Cadastre os saldos das casas para acompanhar liquidez e concentração." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead><tr className="mono-label border-b border-border text-left text-muted"><th className="pb-2 font-medium">Casa / dono</th><th className="pb-2 text-right font-medium">Saldo</th><th className="pb-2 text-right font-medium">Em jogo</th><th className="pb-2 text-right font-medium">Livre</th><th className="pb-2 pl-5 font-medium">Peso</th></tr></thead>
                  <tbody>{contasComPosicao.slice(0, 7).map((conta) => (
                    <tr key={conta.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3"><p className="font-bold">{conta.casa}</p><p className="mt-0.5 text-[10px] text-muted">{conta.dono}</p></td>
                      <td className="py-3 text-right font-bold tabular-nums">{brl(conta.saldo)}</td>
                      <td className="py-3 text-right tabular-nums text-warning">{brl(conta.exposto)}</td>
                      <td className={`py-3 text-right font-bold tabular-nums ${conta.livre < 0 ? "text-negative" : "text-text-2"}`}>{brl(conta.livre)}</td>
                      <td className="py-3 pl-5"><div className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, conta.participacao)}%` }} /></span><span className="w-10 text-right font-mono text-[10px] text-muted">{conta.participacao.toFixed(1)}%</span></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <SectionTitle eyebrow="Ativo promocional" titulo="Freebets disponíveis" href="/freebets" link="Gerenciar" />
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent"><Icon name="ticket" /></span>
              <div><p className="text-2xl font-black tabular-nums text-accent">{brl(freebetsValor)}</p><p className="mt-0.5 text-[11px] text-muted">Valor nominal válido · não somado ao caixa</p></div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <ResumoCompacto label="Válidas" valor={String(freebetsValidas.length)} />
              <ResumoCompacto label="Até 3 dias" valor={String(aVencer.length)} tom={aVencer.length > 0 ? "warning" : "neutral"} />
              <ResumoCompacto label="Vencidas" valor={String(vencidas.length)} tom={vencidas.length > 0 ? "negative" : "neutral"} />
            </div>
            {aVencer[0]?.expiraEm && <p className="mt-3 rounded-lg border border-warning/25 bg-warning/[0.07] px-3 py-2 text-[11px] text-warning">Próxima: <b>{aVencer[0].casa?.nome ?? "Freebet"}</b> vence em {aVencer[0].expiraEm.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}.</p>}
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between text-[11px]"><span className="text-muted">ROI histórico</span><b className={roiHistorico >= 0 ? "text-positive" : "text-negative"}>{percentual(roiHistorico)}</b></div>
              <div className="mt-2 flex items-center justify-between text-[11px]"><span className="text-muted">Operações positivas no mês</span><b>{positivasMes} de {finalizadasMes.length}</b></div>
              <div className="mt-2 flex items-center justify-between text-[11px]"><span className="text-muted">Resultado operacional histórico</span><b className={lucroTotal >= 0 ? "text-positive" : "text-negative"}>{sinal(lucroTotal)}</b></div>
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}

type Tone = "positive" | "negative" | "warning" | "info" | "neutral";

function MiniResumo({ label, valor, tom }: { label: string; valor: string; tom: Tone }) {
  const cor = { positive: "text-positive", negative: "text-negative", warning: "text-warning", info: "text-info", neutral: "text-text" }[tom];
  return <div className="rounded-xl border border-border/80 bg-surface/60 px-3 py-3"><p className="mono-label text-muted">{label}</p><p className={`mt-1.5 text-sm font-black tabular-nums ${cor}`}>{valor}</p></div>;
}

function KpiCard({ icon, label, valor, detalhe, tom }: { icon: keyof typeof ICONS; label: string; valor: string; detalhe: string; tom: Exclude<Tone, "neutral"> }) {
  const estilo = {
    positive: "bg-positive/10 text-positive",
    negative: "bg-negative/10 text-negative",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  }[tom];
  return <article className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><p className="mono-label text-muted">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${estilo}`}><Icon name={icon} className="h-4 w-4" /></span></div><p className="mt-3 text-xl font-black tabular-nums">{valor}</p><p className="mt-1 text-[10px] text-muted">{detalhe}</p></article>;
}

function SectionTitle({ eyebrow, titulo, href, link }: { eyebrow: string; titulo: string; href: string; link: string }) {
  return <div className="flex items-start justify-between gap-3"><div><p className="mono-label text-muted">{eyebrow}</p><h2 className="mt-1 text-base font-extrabold">{titulo}</h2></div><Link href={href} className="shrink-0 text-xs font-bold text-accent hover:underline">{link} →</Link></div>;
}

function LinhaFinanceira({ label, detalhe, valor, tom, destaque = false }: { label: string; detalhe: string; valor: number; tom: "positive" | "negative" | "warning"; destaque?: boolean }) {
  const cor = tom === "positive" ? "text-positive" : tom === "negative" ? "text-negative" : "text-warning";
  return <div className={`flex items-center justify-between gap-4 border-b border-border/60 px-3.5 py-3 last:border-0 ${destaque ? "bg-surface-2" : ""}`}><div><p className={`${destaque ? "font-extrabold" : "font-semibold"} text-sm`}>{label}</p><p className="mt-0.5 text-[10px] text-muted">{detalhe}</p></div><p className={`${destaque ? "text-base" : "text-sm"} shrink-0 font-black tabular-nums ${cor}`}>{sinal(valor)}</p></div>;
}

function ResumoCompacto({ label, valor, tom = "neutral" }: { label: string; valor: string; tom?: "neutral" | "warning" | "negative" }) {
  const cor = tom === "warning" ? "text-warning" : tom === "negative" ? "text-negative" : "text-text";
  return <div className="rounded-lg border border-border bg-surface-2 px-2 py-2.5 text-center"><p className={`text-lg font-black tabular-nums ${cor}`}>{valor}</p><p className="mt-0.5 text-[9px] text-muted">{label}</p></div>;
}

function EstadoVazio({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className="mt-4 grid min-h-44 place-items-center rounded-xl border border-dashed border-border px-5 text-center"><div><span className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-positive/10 text-positive"><Icon name="shield" className="h-4 w-4" /></span><p className="mt-3 text-sm font-bold">{titulo}</p><p className="mt-1 max-w-sm text-xs text-muted">{texto}</p></div></div>;
}

function Alerta({ href, tone, texto }: { href: string; tone: "negative" | "warning" | "info"; texto: string }) {
  const cores = { negative: "border-negative/30 bg-negative/[0.08] text-negative", warning: "border-warning/30 bg-warning/[0.08] text-warning", info: "border-info/30 bg-info/[0.08] text-info" }[tone];
  return <Link href={href} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition hover:brightness-110 ${cores}`}><Icon name="warning" className="h-3.5 w-3.5" />{texto}</Link>;
}
