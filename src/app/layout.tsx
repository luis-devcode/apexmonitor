import type { Metadata } from "next";
import CookiePreferences from "@/components/CookiePreferences";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApexMonitor — Odds em tempo real & gestão de apostas",
  description:
    "Monitor de odds em tempo real, calculadora de surebet e controle financeiro da sua operação — num só lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <CookiePreferences />
      </body>
    </html>
  );
}
