import AppShell from "@/components/AppShell";
import DashboardLive from "@/components/DashboardLive";

export const dynamic = "force-dynamic";

/** O antigo Dashboard: o retrato do mercado (odds, surebets, super odds) ao vivo. */
export default function PanoramaOddsPage() {
  return (
    <AppShell>
      <DashboardLive />
    </AppShell>
  );
}
