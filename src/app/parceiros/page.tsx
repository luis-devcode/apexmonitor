import AppShell from "@/components/AppShell";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParceiroActions, ParceiroEditButton, ParceiroForm } from "./ParceirosForms";

export const dynamic = "force-dynamic";

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCpf = (documento?: string | null) => {
  if (!documento) return null;
  const d = documento.replace(/\D/g, "");
  if (d.length !== 11) return documento;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const periodoLabel: Record<string, string> = { DIA: "por dia", SEMANA: "por semana", MES: "por mês" };

const ICONS = {
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  house: <><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M9 21v-7h6v7" /></>,
  wallet: <><path d="M3 6h16a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V6Z" /><path d="M3 10h18M16 14h2" /></>,
};

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;
}

export default async function ParceirosPage() {
  const userId = await requireUserId();
  const parceiros = await prisma.parceiro.findMany({
    where: { userId },
    include: {
      contas: { include: { casa: true } },
      _count: { select: { operacoes: true, freebets: true } },
    },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  const ativos = parceiros.filter((p) => p.ativo).length;
  const casasCadastradas = parceiros.reduce((sum, p) => sum + p.contas.length, 0);
  const capitalSobCpfs = parceiros.reduce((sum, p) => sum + p.contas.reduce((s, c) => s + c.saldo, 0), 0);

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-7">
        <div>
          <h1 className="text-[15px] font-bold">Parceiros (CPF)</h1>
          <p className="hidden text-xs text-muted sm:block">Pessoas (CPF) com quem você tem contas nas casas de apostas.</p>
        </div>
        <div className="ml-auto">
          <ParceiroForm />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1380px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className="card-featured rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-2"><p className="mono-label">Parceiros (CPF)</p><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-white"><Icon name="users" className="h-4 w-4" /></span></div>
            <p className="mt-3 text-2xl font-black tabular-nums">{parceiros.length}</p>
            <p className="mt-1 text-[11px] text-white/75">{ativos} {ativos === 1 ? "ativo" : "ativos"}</p>
          </article>
          <SummaryCard icon="check" label="Ativos" value={String(ativos)} detail="Disponíveis para operar" tone="positive" />
          <SummaryCard icon="house" label="Casas cadastradas" value={String(casasCadastradas)} detail="Total de casas nos CPFs" tone="info" />
          <SummaryCard icon="wallet" label="Saldo de todas as casas" value={brl(capitalSobCpfs)} detail="Soma dos saldos nos CPFs" tone="warning" />
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><p className="mono-label text-muted">Cadastro</p><h2 className="mt-1 text-base font-extrabold">Pessoas</h2></div>
            {parceiros.length > 0 && <p className="text-xs text-muted">{parceiros.length} {parceiros.length === 1 ? "parceiro" : "parceiros"}</p>}
          </div>

          {parceiros.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="users" /></span>
                <h3 className="mt-4 text-base font-extrabold">Cadastre quem opera com você</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">Adicione as pessoas cujo CPF você usa para abrir contas nas casas. Depois é possível vincular cada conta ao seu dono.</p>
                <p className="mt-3 text-xs font-semibold text-accent">Use “Adicionar parceiro” no topo.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {parceiros.map((parceiro) => {
                const saldo = parceiro.contas.reduce((s, c) => s + c.saldo, 0);
                const cpf = formatCpf(parceiro.documento);
                const custo = parceiro.custoValor || 0;
                return (
                  <article key={parceiro.id} className={`rounded-2xl border bg-surface p-4 transition-colors ${parceiro.ativo ? "border-border hover:border-border-strong" : "border-border/60 opacity-70"}`}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/12 text-sm font-black text-accent">{initials(parceiro.nome)}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-extrabold">{parceiro.nome}</h3>
                        {parceiro.email && <p className="mt-0.5 truncate text-[11px] text-muted">{parceiro.email}</p>}
                        <p className="mt-0.5 font-mono text-[11px] text-muted">{cpf ?? "CPF não informado"}</p>
                      </div>
                      {!parceiro.ativo && <span className="shrink-0 rounded-md bg-surface-3 px-2 py-1 text-[10px] font-bold text-muted">Arquivado</span>}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
                        <p className="mono-label text-muted">Contas</p>
                        <p className="mt-1 text-base font-black tabular-nums">{parceiro.contas.length}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
                        <p className="mono-label text-muted">Saldo de todas as casas</p>
                        <p className={`mt-1 text-base font-black tabular-nums ${saldo < 0 ? "text-negative" : ""}`}>{brl(saldo)}</p>
                      </div>
                    </div>

                    <div className="mt-2 rounded-xl border border-border bg-surface-2 px-3 py-2">
                      <p className="mono-label text-muted">Pagamento do CPF</p>
                      <p className="mt-1 text-sm font-black tabular-nums">
                        {custo > 0 ? `${brl(custo)} ${periodoLabel[parceiro.custoPeriodo || "MES"] ?? "por mês"}` : "Sem custo cadastrado"}
                      </p>
                    </div>

                    {parceiro.contas.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {parceiro.contas.slice(0, 6).map((conta) => (
                          <span key={conta.id} className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-2">{conta.casa.nome}</span>
                        ))}
                        {parceiro.contas.length > 6 && <span className="rounded-md px-1 py-0.5 text-[10px] text-muted">+{parceiro.contas.length - 6}</span>}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                      <span className="shrink-0 text-[10px] text-muted">{parceiro._count.operacoes} {parceiro._count.operacoes === 1 ? "operação" : "operações"}</span>
                      <div className="flex items-center gap-1">
                        <ParceiroEditButton parceiro={{ id: parceiro.id, nome: parceiro.nome, documento: parceiro.documento, email: parceiro.email, custoValor: parceiro.custoValor, custoPeriodo: parceiro.custoPeriodo }} />
                        <ParceiroActions
                          id={parceiro.id}
                          ativo={parceiro.ativo}
                          podeExcluir={parceiro.contas.length === 0 && parceiro._count.operacoes === 0 && parceiro._count.freebets === 0}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({ icon, label, value, detail, tone }: { icon: keyof typeof ICONS; label: string; value: string; detail: string; tone: "info" | "positive" | "negative" | "warning" }) {
  const colors = { info: "bg-info/10 text-info", positive: "bg-positive/10 text-positive", negative: "bg-negative/10 text-negative", warning: "bg-warning/10 text-warning" };
  return <article className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-start justify-between gap-2"><p className="mono-label text-muted">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${colors[tone]}`}><Icon name={icon} className="h-4 w-4" /></span></div><p className="mt-3 text-lg font-black tabular-nums">{value}</p><p className="mt-1 text-[10px] text-muted">{detail}</p></article>;
}
