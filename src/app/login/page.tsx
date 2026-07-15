import { redirect } from "next/navigation";
import { getCurrentUser, semUsuarios } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const primeiroAcesso = await semUsuarios();
  return <LoginForm primeiroAcesso={primeiroAcesso} />;
}
