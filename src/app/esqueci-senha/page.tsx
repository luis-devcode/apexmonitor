import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import EsqueciForm from "./EsqueciForm";

export const dynamic = "force-dynamic";

// Página PÚBLICA. Quem já está logado não tem o que fazer aqui.
export default async function EsqueciSenhaPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return <EsqueciForm />;
}
