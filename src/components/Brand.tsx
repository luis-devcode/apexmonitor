import type { ReactNode } from "react";

/**
 * Marca do ApexMonitor. Um símbolo só, usado em toda a interface (sidebar,
 * login, assinatura) — antes o login tinha um "C" e a sidebar um hexágono, o
 * que num produto comercial passava a impressão de duas marcas diferentes.
 */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`brand-mark relative grid ${className} shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-accent via-[#2f6fe7] to-accent-deep text-white`}>
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 3 7 4v8l-7 4-7-4V7l7-4Z" />
        <path d="m8.5 9 3.5-2 3.5 2v4L12 15l-3.5-2V9Z" />
      </svg>
      <span className="absolute inset-x-1 bottom-0 h-px bg-white/50" />
    </span>
  );
}

/** "APEX MONITOR" com a segunda palavra em destaque — o lockup padrão do nome. */
export function BrandName({ className = "text-[13px]" }: { className?: string }): ReactNode {
  return (
    <span className={`font-black tracking-[0.08em] ${className}`}>
      APEX <span className="text-accent">MONITOR</span>
    </span>
  );
}
