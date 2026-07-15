import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import AppShellClient from "@/components/AppShellClient";
import { assinaturaAtiva, getCurrentUser } from "@/lib/auth";

/**
 * Guardião do app. Como TODAS as páginas internas usam <AppShell>, a trava de
 * acesso mora aqui: sem sessão → login; assinatura vencida → renovação.
 */
export default async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!assinaturaAtiva(user)) redirect("/assinatura");

  return (
    <AppShellClient user={{ nome: user.nome, email: user.email, role: user.role }}>
      {children}
    </AppShellClient>
  );
}
