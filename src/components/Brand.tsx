import type { ReactNode } from "react";

/**
 * Marca do ApexMonitor. Um símbolo só, usado em toda a interface (sidebar,
 * login, assinatura) — antes o login tinha um "C" e a sidebar um hexágono, o
 * que num produto comercial passava a impressão de duas marcas diferentes.
 */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`brand-mark relative grid ${className} shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-accent via-[#2f6fe7] to-accent-deep text-white`}>
      {/* Marca ApexMonitor: o pico (apex) atravessado por um pulso de sinal (monitor). */}
      <svg viewBox="0 0 48 48" className="h-[66%] w-[66%]" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 34 L24 14 L37 34" />
        <path d="M15 30 L20 30 L23 24.5 L27 33 L30 29 L35 29" strokeWidth="2.8" />
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
