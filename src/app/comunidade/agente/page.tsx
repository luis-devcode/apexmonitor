import AppShell from "@/components/AppShell";
import AgenteChat from "./AgenteChat";

export const dynamic = "force-dynamic";

export default function AgentePage() {
  return (
    <AppShell>
      <AgenteChat />
    </AppShell>
  );
}
