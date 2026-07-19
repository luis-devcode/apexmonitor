import Link from "next/link";
import { BrandMark } from "@/components/Brand";
import { tokenResetValido } from "@/lib/reset-senha";
import RedefinirForm from "./RedefinirForm";

export const dynamic = "force-dynamic";

// Página PÚBLICA (a pessoa chega aqui sem estar logada, pelo link do e-mail).
export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valido = token ? await tokenResetValido(token) : false;

  if (!valido) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 flex flex-col items-center gap-3">
            <BrandMark className="h-14 w-14 rounded-2xl" />
            <h1 className="text-xl font-black tracking-tight">Apex<span className="text-accent">Monitor</span></h1>
          </div>
          <div className="panel rounded-2xl border border-border bg-surface p-6">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-warning/10 text-warning">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            </span>
            <h2 className="mt-4 text-lg font-extrabold">Link inválido ou expirado</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-text-2">
              Este link de redefinição não vale mais (expira em 1 hora e só pode ser usado uma vez).
            </p>
            <Link
              href="/esqueci-senha"
              className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-black text-accent-ink transition hover:bg-accent-hover"
            >
              Pedir um novo link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <RedefinirForm token={token!} />;
}
