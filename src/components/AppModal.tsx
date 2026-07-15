"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg" | "xl";

const sizes: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const subscribeToClient = () => () => {};

export default function AppModal({
  title,
  subtitle,
  eyebrow = "ApexMonitor",
  onClose,
  children,
  size = "md",
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  scroll?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);

  useEffect(() => {
    if (!mounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] grid place-items-center overflow-y-auto px-3 py-4 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fechar janela" onClick={onClose} className="absolute inset-0 cursor-default bg-[#01040a]/82 backdrop-blur-md" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[min(760px,90vw)] -translate-x-1/2 rounded-full bg-accent/10 blur-[110px]" />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[calc(100dvh-2rem)] w-full ${sizes[size]} flex-col overflow-hidden rounded-[26px] border border-white/[0.10] bg-surface/95 shadow-[0_32px_100px_rgba(0,0,0,0.68),0_0_0_1px_rgba(59,130,246,0.05)] outline-none sm:max-h-[calc(100dvh-3rem)]`}
      >
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent" />
        <header className="relative flex shrink-0 items-start gap-3.5 border-b border-border/80 bg-gradient-to-r from-accent/[0.08] via-transparent to-transparent px-4 py-4 sm:px-5 sm:py-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent/12 text-accent shadow-[0_8px_24px_rgba(37,99,235,0.18)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 5h14v14H5z" /><path d="M8 9h8M8 13h5M8 17h3" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-black leading-tight tracking-tight text-text sm:text-xl">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted sm:text-[13px]">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface/70 text-muted transition hover:border-border-strong hover:bg-surface-2 hover:text-text">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>

        {scroll ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div> : children}
      </div>
    </div>,
    document.body,
  );
}
