import AppShell from "@/components/AppShell";
import { requireUserId } from "@/lib/auth";
import { houseLogoMap, housesForSelect, logoForHouse } from "@/lib/houses";
import { readCloneGroups } from "@/lib/odds-feed";
import { prisma } from "@/lib/prisma";
import { CasaForm, ContaOwnerForm, MovimentoForm } from "./BancaForms";

export const dynamic = "force-dynamic";

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TIPO_LABEL: Record<string, string> = {
  DEPOSITO: "Depósito",
  SAQUE: "Saque",
  AJUSTE: "Ajuste",
  TRANSFERENCIA: "Transferência",
};

const ICONS = {
  wallet: <><path d="M3 6h16a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V6Z" /><path d="M3 10h18M16 14h2" /></>,
  house: <><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M9 21v-7h6v7" /></>,
  in: <><path d="M12 3v13M7 11l5 5 5-5" /><path d="M5 21h14" /></>,
  out: <><path d="M12 21V8M7 13l5-5 5 5" /><path d="M5 3h14" /></>,
};

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;
}

function HouseLogo({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={`Logo ${name}`} className="h-12 w-12 shrink-0 rounded-xl bg-surface-3 object-contain p-1" />;
  }
  return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-3 text-sm font-black text-muted">{name.charAt(0).toUpperCase()}</span>;
}

export default async function BancaPage() {
  const userId = await requireUserId();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [contas, movimentos, cloneGroups, pendingLegs, monthResult, parceiros] = await Promise.all([
    prisma.conta.findMany({
      where: { userId },
      include: { casa: true, parceiro: true, movimentos: { orderBy: { data: "desc" }, take: 1 } },
      orderBy: { saldo: "desc" },
    }),
    prisma.movimento.findMany({
      where: { userId },
      include: { conta: { include: { casa: true, parceiro: true } } },
      orderBy: { data: "desc" },
      take: 20,
    }),
    readCloneGroups(),
    prisma.pernaOperacao.findMany({
      where: { userId, resultado: "PENDENTE", contaId: { not: null } },
      select: { contaId: true, stake: true, odd: true, isLay: true, freebet: true, risco: true },
    }),
    prisma.operacao.aggregate({ where: { userId, status: "FINALIZADA", createdAt: { gte: monthStart } }, _sum: { lucroReal: true } }),
    prisma.parceiro.findMany({
      where: { userId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, documento: true },
    }),
  ]);

  // O dinheiro preso numa aposta é o RISCO — no lay, a responsabilidade, não a
  // stake. Freebet não prende dinheiro nenhum. (`risco` só existe nas pernas
  // novas; nas antigas reconstruímos.)
  const riscoDaPerna = (leg: { stake: number; odd: number; isLay: boolean; freebet: boolean; risco: number }) => {
    if (leg.risco > 0) return leg.risco;
    if (leg.freebet) return 0;
    return leg.isLay ? leg.stake * Math.max(0, leg.odd - 1) : leg.stake;
  };

  const patrimony = contas.reduce((sum, conta) => sum + conta.saldo, 0);
  const inPlayByAccount = new Map<string, number>();
  for (const leg of pendingLegs) { if (leg.contaId) inPlayByAccount.set(leg.contaId, (inPlayByAccount.get(leg.contaId) || 0) + riscoDaPerna(leg)); }
  // Comprometido = já apostado, ainda dentro do saldo (a baixa acontece no
  // fechamento da operação). Livre é o que sobra pra apostar de novo.
  const inPlay = pendingLegs.reduce((sum, leg) => sum + riscoDaPerna(leg), 0);
  const livre = patrimony - inPlay;
  const realizedMonth = monthResult._sum.lucroReal || 0;
  const totalPositivo = contas.reduce((sum, conta) => sum + Math.max(0, conta.saldo), 0);
  const contaList = contas.map((conta) => ({ id: conta.id, casa: conta.casa.nome, saldo: conta.saldo, parceiro: conta.parceiro?.nome || null }));

  const cloneLogo = houseLogoMap(cloneGroups);
  const availableHouses = housesForSelect(cloneGroups);

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Minha Banca</h1>
          <p className="hidden text-xs text-muted sm:block">Capital distribuído nas casas e movimentação de caixa.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <MovimentoForm contas={contaList} />
          <CasaForm houses={availableHouses} parceiros={parceiros} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1380px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-3 lg:grid-cols-[1.45fr_.55fr_.55fr_.55fr]">
          <article className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-surface p-5">
            <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink"><Icon name="wallet" /></span>
              <div>
                <p className="mono-label text-muted">Patrimônio controlado</p>
                <p className="mt-1 text-3xl font-black tracking-tight tabular-nums text-accent sm:text-4xl">{brl(patrimony)}</p>
                <p className="mt-1.5 text-xs text-text-2">Todo o capital espalhado pelas casas cadastradas.</p>
              </div>
            </div>
          </article>
          <SummaryCard icon="wallet" label="Livre" value={brl(livre)} detail={`Em ${contas.length} casas`} tone={livre < 0 ? "negative" : "info"} />
          <SummaryCard icon="out" label="Em jogo" value={brl(inPlay)} detail={`${pendingLegs.length} apostas pendentes`} tone="warning" />
          <SummaryCard icon="in" label="Resultado no mês" value={brl(realizedMonth)} detail="Lucro líquido realizado" tone={realizedMonth < 0 ? "negative" : "positive"} />
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><p className="mono-label text-muted">Distribuição</p><h2 className="mt-1 text-base font-extrabold">Saldo por casa</h2></div>
            {contas.length > 0 && <p className="text-xs text-muted">{contas.length} {contas.length === 1 ? "conta ativa" : "contas ativas"}</p>}
          </div>

          {contas.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="house" /></span>
                <h3 className="mt-4 text-base font-extrabold">Sua banca começa pelas casas</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">Adicione a primeira casa, informe o saldo inicial e o painel passa a acompanhar sua distribuição de capital.</p>
                <p className="mt-3 text-xs font-semibold text-accent">Use “Adicionar casa” no topo.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {contas.map((conta) => {
                const accountInPlay = inPlayByAccount.get(conta.id) || 0;
                const accountLivre = conta.saldo - accountInPlay;
                const share = totalPositivo > 0 ? Math.max(0, conta.saldo) / totalPositivo * 100 : 0;
                const logo = conta.casa.logoUrl || logoForHouse(cloneLogo, conta.casa.nome);
                const last = conta.movimentos[0];
                const dono = conta.parceiro?.nome ?? "Minha banca";
                return (
                  <article key={conta.id} className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
                    <div className="flex items-center gap-3">
                      <HouseLogo src={logo} name={conta.casa.nome} />
                      <div className="min-w-0"><h3 className="truncate text-sm font-extrabold">{conta.casa.nome}</h3><p className="mt-0.5 text-[10px] text-muted">{last ? `Atualizado em ${last.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : "Sem movimentações"}</p></div>
                      {conta.casa.comissaoPct > 0 && <span className="ml-auto shrink-0 rounded-md bg-warning/10 px-2 py-1 text-[10px] font-bold text-warning">Com. {conta.casa.comissaoPct}%</span>}
                    </div>
                    <div className="mt-3 inline-flex max-w-full items-center rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text-2">
                      <span className="truncate">Dono: {dono}</span>
                    </div>
                    <div className="mt-3">
                      <ContaOwnerForm contaId={conta.id} casa={conta.casa.nome} donoAtual={conta.parceiro?.nome || null} donoAtualId={conta.parceiroId} parceiros={parceiros} />
                    </div>
                    <p className={`mt-4 text-2xl font-black tabular-nums ${conta.saldo < 0 ? "text-negative" : ""}`}>{brl(conta.saldo)}</p>
                    <div className="mt-1 flex gap-3 text-[10px] text-muted"><span>Em jogo <b className="text-warning">{brl(accountInPlay)}</b></span><span>Livre <b className={accountLivre < 0 ? "text-negative" : "text-text-2"}>{brl(accountLivre)}</b></span></div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, share)}%` }} /></div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted"><span>Participação na banca</span><span className="font-mono">{share.toFixed(1)}%</span></div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3"><p className="mono-label text-muted">Fluxo de caixa</p><h2 className="mt-1 text-base font-extrabold">Últimas movimentações</h2></div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {movimentos.length === 0 ? (
              <p className="px-5 py-14 text-center text-sm text-muted">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead><tr className="mono-label border-b border-border text-left text-muted"><th className="px-4 py-2.5 font-medium">Data</th><th className="px-4 py-2.5 font-medium">Casa</th><th className="px-4 py-2.5 font-medium">Movimento</th><th className="px-4 py-2.5 font-medium">Descrição</th><th className="px-4 py-2.5 text-right font-medium">Valor</th></tr></thead>
                  <tbody>{movimentos.map((movimento) => (
                    <tr key={movimento.id} className="border-b border-border/60 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{movimento.data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{movimento.conta.casa.nome}</p>
                        <p className="mt-0.5 text-[10px] text-muted">{movimento.conta.parceiro?.nome ?? "Minha banca"}</p>
                      </td>
                      <td className="px-4 py-3 text-text-2">{TIPO_LABEL[movimento.tipo] ?? movimento.tipo}</td>
                      <td className="max-w-64 truncate px-4 py-3 text-muted">{movimento.descricao || "—"}</td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${movimento.valor < 0 ? "text-negative" : "text-positive"}`}>{movimento.valor >= 0 ? "+" : ""}{brl(movimento.valor)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({ icon, label, value, detail, tone }: { icon: keyof typeof ICONS; label: string; value: string; detail: string; tone: "info" | "positive" | "negative" | "warning" }) {
  const colors = { info: "bg-info/10 text-info", positive: "bg-positive/10 text-positive", negative: "bg-negative/10 text-negative", warning: "bg-warning/10 text-warning" };
  return <article className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-start justify-between gap-2"><p className="mono-label text-muted">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${colors[tone]}`}><Icon name={icon} className="h-4 w-4" /></span></div><p className="mt-3 text-lg font-black tabular-nums">{value}</p><p className="mt-1 text-[10px] text-muted">{detail}</p></article>;
}
