import { redirect } from "next/navigation";
import { getCurrentUser, semUsuarios } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redefinida?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const { redefinida } = await searchParams;
  const primeiroAcesso = await semUsuarios();
  const aviso = redefinida ? "Senha redefinida! Entre com sua nova senha." : undefined;
  return <LoginForm primeiroAcesso={primeiroAcesso} aviso={aviso} />;
}
