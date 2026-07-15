import AppShell from "@/components/AppShell";
import ComunidadeChat from "./ComunidadeChat";

export const dynamic = "force-dynamic";

export default function ComunidadePage() {
  return (
    <AppShell>
      <ComunidadeChat />
    </AppShell>
  );
}
