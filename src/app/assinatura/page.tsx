import { redirect } from "next/navigation";
import { BrandMark } from "@/components/Brand";
import { assinaturaAtiva, getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function AssinaturaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (assinaturaAtiva(user)) redirect("/");

  const bloqueado = user.status === "BLOQUEADO";
  const venceu = bloqueado
    ? "Seu acesso foi bloqueado pelo administrador."
    : user.assinaturaAte
    ? `Sua assinatura venceu em ${user.assinaturaAte.toLocaleDateString("pt-BR")}.`
    : "Você ainda não tem uma assinatura ativa.";

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <BrandMark className="h-14 w-14 rounded-2xl" />
          <div className="text-center">
            <h1 className="text-xl font-black tracking-tight">Apex<span className="text-accent">Monitor</span></h1>
            <p className="mono-label text-muted">Odds &amp; Gestão</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-warning/10 text-warning">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          </span>
          <h2 className="mt-4 text-lg font-extrabold">{bloqueado ? "Acesso bloqueado" : "Assinatura inativa"}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-text-2">{venceu}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {bloqueado ? "Fale com o administrador para revisar o acesso." : "Renove para voltar a acessar o monitor de odds e a gestão."}
          </p>

          {!bloqueado && (
            <a
              href="https://wa.me/"
              className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-black text-accent-ink shadow-[0_8px_26px_rgba(59,130,246,0.3)] transition hover:bg-accent-hover"
            >
              Renovar assinatura
            </a>
          )}

          <p className="mt-4 text-[11px] text-muted">Logado como {user.email}</p>
          <form action={logoutAction}>
            <button type="submit" className="mt-1 text-xs font-semibold text-muted transition hover:text-text">Sair</button>
          </form>
        </div>
      </div>
    </div>
  );
}
