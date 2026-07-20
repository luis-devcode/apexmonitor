import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/LegalShell";
import { CookiePreferencesButton } from "@/components/CookiePreferences";

export const metadata: Metadata = {
  title: "Política de Cookies — ApexMonitor",
  description: "Entenda quais cookies e tecnologias locais o ApexMonitor utiliza.",
};

export default function CookiesPage() {
  return (
    <LegalShell
      eyebrow="LGPD · Controle"
      title="Política de Cookies"
      description="Veja quais tecnologias ficam no seu navegador, para que servem e como alterar sua escolha."
      updatedAt="19 de julho de 2026"
    >
      <LegalSection id="conceito" title="1. O que são cookies">
        <p>Cookies são pequenos arquivos que um site grava no navegador. Tecnologias semelhantes, como o armazenamento local, também podem guardar preferências no dispositivo. Elas podem ser necessárias ao funcionamento ou opcionais, dependendo da finalidade.</p>
      </LegalSection>

      <LegalSection id="uso" title="2. O que o ApexMonitor utiliza hoje">
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table>
            <thead><tr><th>Nome</th><th>Tipo e finalidade</th><th>Duração</th></tr></thead>
            <tbody>
              <tr><td><code>sessao</code></td><td>Cookie próprio e estritamente necessário para autenticação e segurança. É protegido com <code>HttpOnly</code>, <code>Secure</code> em produção e <code>SameSite=Lax</code>.</td><td>Até 30 dias ou até o logout.</td></tr>
              <tr><td><code>theme</code></td><td>Armazenamento local necessário para lembrar a preferência de tema claro ou escuro.</td><td>Até você apagar os dados do navegador.</td></tr>
              <tr><td><code>apex_cookie_consent_v1</code></td><td>Armazenamento local necessário para guardar sua escolha de privacidade.</td><td>12 meses; depois pedimos a escolha novamente.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Atualmente, o ApexMonitor <strong>não instala ferramentas de análise comportamental nem publicidade</strong>. Essas categorias permanecem desativadas por padrão.</p>
      </LegalSection>

      <LegalSection id="categorias" title="3. Categorias de cookies">
        <ul>
          <li><strong>Estritamente necessários:</strong> viabilizam login, segurança, preferências básicas e o funcionamento solicitado. Não dependem de consentimento quando forem realmente indispensáveis, mas seu uso é informado com transparência.</li>
          <li><strong>Análise de uso:</strong> serviriam para medir desempenho e navegação. Não são usados atualmente e dependerão de autorização antes de qualquer futura ativação.</li>
          <li><strong>Marketing:</strong> serviriam para publicidade ou personalização comercial. Não são usados atualmente e dependerão de autorização antes de qualquer futura ativação.</li>
        </ul>
      </LegalSection>

      <LegalSection id="terceiros" title="4. Sites e cookies de terceiros">
        <p>Ao continuar para o pagamento, você será direcionado ao ambiente do Asaas, que possui políticas e tecnologias próprias. Links externos, como referências à ANPD, também seguem as regras dos respectivos sites. O ApexMonitor não controla cookies definidos diretamente por esses domínios.</p>
      </LegalSection>

      <LegalSection id="controle" title="5. Como controlar suas preferências">
        <p>Use o botão abaixo para revisar ou revogar autorizações opcionais. Você também pode apagar cookies e armazenamento local nas configurações do navegador; isso pode encerrar a sessão e redefinir o tema.</p>
        <CookiePreferencesButton className="inline-flex min-h-11 items-center rounded-xl bg-accent px-5 text-xs font-black text-white transition hover:bg-accent-hover" />
        <p>O painel aplica escolhas futuras, mas nenhum script opcional está instalado neste momento.</p>
      </LegalSection>

      <LegalSection id="referencias" title="6. Transparência e referências">
        <p>Esta política segue os princípios de finalidade, necessidade, livre acesso e transparência previstos na LGPD e as recomendações do <a href="https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf" target="_blank" rel="noreferrer">Guia Orientativo sobre Cookies da ANPD</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}
