"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BrandMark, BrandName } from "@/components/Brand";
import { logoutAction } from "@/app/login/actions";

type NavItem = { href: string; label: string; icon: ReactNode };
type NavSection = { label: string; items: NavItem[] };

const I = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  radar: <><circle cx="12" cy="12" r="8" /><path d="M12 12l5-3M4.9 4.9a10 10 0 0 0 14.2 0" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="m15 9 5-5" /></>,
  split: <path d="M6 3v6a3 3 0 0 0 3 3h6M6 21v-6M18 8l3-3-3-3M18 21v-9" />,
  chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
  rows: <><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M17 15h.01" /></>,
  ticket: <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />,
  bank: <><path d="M3 21h18M4 10l8-5 8 5" /><path d="M6 10v8M10 10v8M14 10v8M18 10v8" /></>,
  calculator: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v4M8 19h4" /></>,
  spark: <path d="m13 2-2 8H5l6 4-2 8 10-12h-6V2Z" />,
  cards: <><rect x="2" y="7" width="15" height="12" rx="2" /><path d="M7 7V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 9h8M8 13h5" /></>,
  receipt: <><path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3 5 4.5Z" /><path d="M9 9h6M9 13h6" /></>,
};

const NAV: NavSection[] = [
  {
    label: "Principal",
    items: [
      { href: "/", label: "Visão financeira", icon: I.dashboard },
      { href: "/operacoes", label: "Planilha", icon: I.rows },
      { href: "/calculadora", label: "Calculadora", icon: I.calculator },
    ],
  },
  {
    label: "Mercado ao vivo",
    items: [
      { href: "/panorama-odds", label: "Panorama de Odds", icon: I.chart },
      { href: "/monitor-futebol", label: "Monitor Futebol", icon: I.radar },
      { href: "/monitor-basquete", label: "Monitor Basquete", icon: I.rows },
    ],
  },
  {
    label: "Oportunidades",
    items: [
      { href: "/surebets", label: "Surebets", icon: I.target },
      { href: "/duplo-green", label: "Duplo Green", icon: I.split },
      { href: "/super-odds", label: "Super Odds", icon: I.spark },
      { href: "/freebet", label: "Converter Freebet", icon: I.ticket },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/banca", label: "Minha Banca", icon: I.wallet },
      { href: "/contas", label: "Contas por Casa", icon: I.cards },
      { href: "/freebets", label: "Freebets", icon: I.ticket },
      { href: "/parceiros", label: "Parceiros (CPF)", icon: I.users },
      { href: "/custos", label: "Custos", icon: I.receipt },
    ],
  },
  {
    label: "Rede e inteligência",
    items: [
      { href: "/clones", label: "Clones de Casas", icon: I.bank },
      { href: "/comunidade", label: "Chat dos Membros", icon: I.chat },
      { href: "/comunidade/agente", label: "Agente de IA", icon: I.spark },
    ],
  },
];

// Seção visível só para ADMIN. Fica fora do NAV para não vazar nem no HTML de um
// cliente comum — a proteção real está na página, isto é só a navegação.
const NAV_ADMIN: NavSection = {
  label: "Administração",
  items: [
    { href: "/admin", label: "Clientes", icon: I.users },
    { href: "/admin/afiliados", label: "Afiliados", icon: I.split },
  ],
};

const currentNavItem = (pathname: string) => [...NAV, NAV_ADMIN]
  .flatMap((section) => section.items)
  .filter((item) => item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`))
  .sort((a, b) => b.href.length - a.href.length)[0];

function Icon({ children, className = "h-[17px] w-[17px]" }: { children: ReactNode; className?: string }) {
  return <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

const THEME_ICON = {
  dark: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  light: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
};

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"));
    return () => cancelAnimationFrame(frame);
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch { /* armazenamento indisponível */ }
  };
  const target = theme === "dark" ? "light" : "dark";
  return (
    <button onClick={toggle} title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"} aria-label="Alternar tema" className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-2 text-text-2 transition hover:border-accent/30 hover:text-accent">
      <Icon className="h-4 w-4">{THEME_ICON[target]}</Icon>
    </button>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inicial = (user.nome || user.email).charAt(0).toUpperCase();

  useEffect(() => {
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex items-center gap-2 rounded-lg border border-transparent p-1 transition hover:border-border hover:bg-surface-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-deep text-xs font-black text-white shadow-[0_0_18px_rgba(59,130,246,0.2)]">{inicial}</span>
        <div className="hidden max-w-36 text-left leading-tight md:block"><p className="truncate text-xs font-bold">{user.nome}</p><p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted">{user.role === "ADMIN" ? "Administrador" : "Assinante"}</p></div>
        <Icon className="hidden h-3 w-3 text-muted md:block"><path d="m7 10 5 5 5-5" /></Icon>
      </button>
      {open && (
        <div className="glass animate-menu-in absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-border-strong p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
          <div className="px-3 py-2.5"><p className="truncate text-xs font-bold">{user.nome}</p><p className="mt-1 truncate text-[10px] text-muted">{user.email}</p></div>
          <div className="h-px bg-border" />
          <form action={logoutAction}>
            <button type="submit" className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-text-2 transition hover:bg-negative/10 hover:text-negative"><Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Icon>Sair da conta</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Sidebar({ pathname, onNavigate, role }: { pathname: string; onNavigate: () => void; role: string }) {
  const activeHref = currentNavItem(pathname)?.href;
  const ativo = (href: string) => href === activeHref;
  const sections = role === "ADMIN" ? [...NAV, NAV_ADMIN] : NAV;
  return (
    <>
      <div className="flex h-[72px] shrink-0 items-center border-b border-border px-5">
        <Link href="/" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <div className="min-w-0"><p className="truncate"><BrandName /></p><p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-muted">Odds &amp; Gestão</p></div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        {sections.map((section, sectionIndex) => (
          <div key={section.label} className={sectionIndex === 0 ? "" : "mt-5"}>
            <p className="px-2.5 font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-muted/80">{section.label}</p>
            <div className="mt-1.5 space-y-0.5">
              {section.items.map((item) => {
                const selected = ativo(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={selected ? "page" : undefined} className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold transition ${selected ? "bg-accent/12 text-accent shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]" : "text-text-2 hover:bg-white/[0.035] hover:text-text"}`}>
                    {selected && <span className="absolute -left-3 h-5 w-0.5 rounded-r bg-accent shadow-[0_0_10px_var(--accent)]" />}
                    <span className={`grid h-7 w-7 place-items-center rounded-md transition ${selected ? "bg-accent/12 text-accent" : "bg-surface-2 text-muted group-hover:text-text-2"}`}><Icon>{item.icon}</Icon></span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <Link href="/operacoes?nova=1" onClick={onNavigate} className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-accent to-accent-deep px-3 py-2.5 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_rgba(22,76,183,0.25)] transition hover:brightness-110"><Icon className="h-4 w-4"><path d="M12 5v14M5 12h14" /></Icon>Nova operação</Link>
        <div className="mt-3 flex items-center gap-2 px-1.5"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-40" /><span className="relative h-2 w-2 rounded-full bg-positive" /></span><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted">Núcleo operacional online</span></div>
      </div>
    </>
  );
}

export type ShellUser = { nome: string; email: string; role: string };

export default function AppShellClient({ children, user }: { children: ReactNode; user: ShellUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const atual = currentNavItem(pathname);

  return (
    <div className="app-shell-bg relative flex h-dvh overflow-hidden">
      {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-50 bg-[#01040a]/75 backdrop-blur-sm lg:hidden" />}

      <aside className={`sidebar-surface fixed inset-y-0 left-0 z-[60] flex w-[268px] flex-col border-r border-border transition-transform duration-200 lg:static lg:z-20 lg:translate-x-0 ${mobileOpen ? "translate-x-0 animate-sidebar-in" : "-translate-x-full"}`}>
        <Sidebar pathname={pathname} onNavigate={() => setMobileOpen(false)} role={user.role} />
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="glass relative z-40 flex h-16 shrink-0 items-center border-b border-border px-3 sm:px-5">
          <button onClick={() => setMobileOpen(true)} aria-label="Abrir menu" className="mr-2 grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-2 text-text-2 lg:hidden"><Icon><path d="M4 7h16M4 12h16M4 17h16" /></Icon></button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden"><BrandMark /></div>
            <div className="min-w-0"><p className="truncate text-xs font-bold sm:text-[13px]">{atual?.label ?? "ApexMonitor"}</p><div className="mt-0.5 flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" /><p className="truncate font-mono text-[8px] uppercase tracking-[0.14em] text-muted"><span className="sm:hidden">Sistema online</span><span className="hidden sm:inline">Ambiente seguro · dados em tempo real</span></p></div></div>
          </div>
          <div className="ml-auto flex items-center gap-2"><ThemeToggle /><UserMenu user={user} /></div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
