import AppShell from "@/components/AppShell";
import ConverterFreebet from "./FreebetExtractor";

export const dynamic = "force-dynamic";

export default function FreebetPage() {
  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg/70 px-6 py-3.5 backdrop-blur">
        <h1 className="text-[15px] font-semibold">Converter Freebet</h1>
        <span className="ml-auto hidden text-xs text-muted sm:block">
          Transforme sua freebet em dinheiro real com a melhor conversão
        </span>
      </header>
      <ConverterFreebet />
    </AppShell>
  );
}
