"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "apex_cookie_consent_v1";
const CONSENT_VALIDITY = 365 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = "apex:open-cookie-preferences";

type Consent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: number;
};

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (!parsed.updatedAt || Date.now() - parsed.updatedAt > CONSENT_VALIDITY) return null;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function persistConsent(consent: Consent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("apex:cookie-consent", { detail: consent }));
}

function Toggle({ active, onChange, disabled, label }: { active: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition ${active ? "border-accent bg-accent" : "border-border-strong bg-surface-3"} disabled:cursor-not-allowed disabled:opacity-70`}
    >
      <span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

export function CookiePreferencesButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className={className}>
      Preferências de cookies
    </button>
  );
}

export default function CookiePreferences() {
  const [hydrated, setHydrated] = useState(false);
  const [banner, setBanner] = useState(false);
  const [panel, setPanel] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const open = () => setPanel(true);
    window.addEventListener(OPEN_EVENT, open);
    const timer = window.setTimeout(() => {
      const consent = readConsent();
      if (consent) {
        setAnalytics(consent.analytics);
        setMarketing(consent.marketing);
      } else {
        setBanner(true);
      }
      setHydrated(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_EVENT, open);
    };
  }, []);

  const save = (nextAnalytics: boolean, nextMarketing: boolean) => {
    const consent: Consent = {
      essential: true,
      analytics: nextAnalytics,
      marketing: nextMarketing,
      updatedAt: Date.now(),
    };
    persistConsent(consent);
    setAnalytics(nextAnalytics);
    setMarketing(nextMarketing);
    setBanner(false);
    setPanel(false);
  };

  if (!hydrated) return null;

  return (
    <>
      {banner && (
        <aside aria-label="Aviso de privacidade" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-4xl rounded-2xl border border-border-strong bg-surface/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3Z" /><circle cx="8.5" cy="11.5" r=".7" fill="currentColor" /><circle cx="12.5" cy="16" r=".7" fill="currentColor" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black">Sua privacidade importa</h2>
              <p className="mt-1 text-xs leading-5 text-text-2">Usamos armazenamento necessário para login, segurança, tema e suas preferências. Cookies opcionais ficam desligados até você autorizar. Consulte nossa <Link href="/cookies" className="font-bold text-accent hover:text-accent-hover">Política de Cookies</Link>.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
              <button type="button" onClick={() => setPanel(true)} className="min-h-11 rounded-xl border border-border-strong px-4 text-xs font-black text-text transition hover:border-accent/40">Personalizar</button>
              <button type="button" onClick={() => save(false, false)} className="min-h-11 rounded-xl bg-accent px-5 text-xs font-black text-white transition hover:bg-accent-hover">Somente necessários</button>
            </div>
          </div>
        </aside>
      )}

      {panel && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPanel(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="cookie-title" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border-strong bg-surface p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-accent">Central de privacidade</p>
                <h2 id="cookie-title" className="mt-1 text-2xl font-black tracking-tight">Preferências de cookies</h2>
              </div>
              <button type="button" aria-label="Fechar preferências" onClick={() => setPanel(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted transition hover:text-text">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-text-2">Você pode alterar sua escolha a qualquer momento. O ApexMonitor não instala ferramentas opcionais antes da sua autorização.</p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-4 rounded-2xl border border-border bg-bg/45 p-4">
                <div className="min-w-0 flex-1"><h3 className="text-sm font-black">Estritamente necessários</h3><p className="mt-1 text-xs leading-5 text-muted">Mantêm sessão, segurança, tema e esta escolha de privacidade. Não podem ser desativados.</p></div>
                <Toggle active onChange={() => {}} disabled label="Cookies necessários sempre ativos" />
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-border bg-bg/45 p-4">
                <div className="min-w-0 flex-1"><h3 className="text-sm font-black">Análise de uso</h3><p className="mt-1 text-xs leading-5 text-muted">Permitiria medir uso e desempenho. Nenhuma ferramenta de análise está instalada atualmente.</p></div>
                <Toggle active={analytics} onChange={() => setAnalytics((value) => !value)} label="Autorizar análise de uso" />
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-border bg-bg/45 p-4">
                <div className="min-w-0 flex-1"><h3 className="text-sm font-black">Marketing</h3><p className="mt-1 text-xs leading-5 text-muted">Permitiria publicidade personalizada. Nenhuma ferramenta de publicidade está instalada atualmente.</p></div>
                <Toggle active={marketing} onChange={() => setMarketing((value) => !value)} label="Autorizar cookies de marketing" />
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => save(false, false)} className="min-h-12 rounded-xl border border-border-strong px-4 text-xs font-black text-text transition hover:border-accent/40">Recusar opcionais</button>
              <button type="button" onClick={() => save(analytics, marketing)} className="min-h-12 rounded-xl bg-accent px-4 text-xs font-black text-white transition hover:bg-accent-hover">Salvar preferências</button>
            </div>
            <p className="mt-4 text-center text-[10px] text-muted">Leia também a <Link href="/privacidade" className="font-bold text-accent">Política de Privacidade</Link>.</p>
          </section>
        </div>
      )}
    </>
  );
}
