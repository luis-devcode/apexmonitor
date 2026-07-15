import AppShell from "@/components/AppShell";
import SurebetCalculator from "@/components/SurebetCalculator";
import { requireUserId } from "@/lib/auth";
import { readEventOptionsForUser } from "@/lib/event-options";

export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const userId = await requireUserId();
  const eventos = await readEventOptionsForUser(userId);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1540px] space-y-7 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/[0.13] via-surface to-surface px-6 py-7 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:px-8">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-2xl font-black text-accent-ink shadow-[0_10px_32px_rgba(59,130,246,0.32)]">%</span>
            <div>
              <p className="mono-label text-accent">Ferramenta operacional</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Calculadora de Surebet</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-2 sm:text-base">Distribua stakes, compare o lucro por resultado e simule comissão, aumento, cashback e freebet. Back/Lay fica disponível apenas para casas de bolsa.</p>
            </div>
          </div>
        </div>
        <SurebetCalculator className="shadow-[0_22px_70px_rgba(0,0,0,0.22)]" eventos={eventos} />
      </div>
    </AppShell>
  );
}
