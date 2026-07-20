import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/LegalShell";
import { getLegalInfo } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade — ApexMonitor",
  description: "Saiba como o ApexMonitor coleta, utiliza, protege e compartilha dados pessoais.",
};

const UPDATED_AT = "19 de julho de 2026";

export default function PrivacidadePage() {
  const legal = getLegalInfo();

  return (
    <LegalShell
      eyebrow="LGPD · Transparência"
      title="Política de Privacidade"
      description="Este documento explica, em linguagem direta, quais dados pessoais o ApexMonitor trata, por que eles são necessários e como você pode exercer seus direitos."
      updatedAt={UPDATED_AT}
    >
      {legal.hasPendingFields && (
        <aside className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning">
          <strong className="block font-black">Revisão necessária antes da publicação oficial</strong>
          Os dados cadastrais do controlador ainda precisam ser preenchidos nas variáveis <code>LEGAL_ENTITY_DOCUMENT</code> e <code>LEGAL_ENTITY_ADDRESS</code>.
        </aside>
      )}

      <LegalSection id="controlador" title="1. Quem controla seus dados">
        <p>O controlador é <strong>{legal.controllerName}</strong>{legal.controllerDocument !== "PENDENTE" ? `, inscrito sob ${legal.controllerDocument}` : ""}{legal.controllerAddress !== "PENDENTE" ? `, com endereço em ${legal.controllerAddress}` : ""}. O canal para assuntos de privacidade e exercício de direitos é <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>.</p>
        <p>O ApexMonitor é uma plataforma de análise e gestão para operações com apostas. Não é uma casa de apostas.</p>
      </LegalSection>

      <LegalSection id="dados" title="2. Dados pessoais tratados">
        <p>Dependendo dos recursos utilizados, podemos tratar as seguintes categorias:</p>
        <ul>
          <li><strong>Cadastro e acesso:</strong> nome, e-mail, senha armazenada em formato protegido, função, situação da conta, plano e validade da assinatura.</li>
          <li><strong>Pagamento e assinatura:</strong> plano, valor, método, identificador da cobrança no Asaas, cupom, indicação de afiliado e dados necessários para conciliação. Nome, CPF, endereço e dados do meio de pagamento são coletados no ambiente do Asaas.</li>
          <li><strong>Dados operacionais inseridos por você:</strong> casas, logins e credenciais, saldos, contas, parceiros, CPF ou documento, e-mail de parceiros, movimentações, operações, odds, stakes, resultados, freebets, custos e anotações.</li>
          <li><strong>Comunidade e inteligência artificial:</strong> mensagens publicadas na comunidade, perguntas enviadas ao agente e o histórico necessário para gerar contexto.</li>
          <li><strong>Dados técnicos:</strong> token de sessão, datas de acesso, registros de segurança, endereço IP e informações básicas do navegador ou dispositivo registradas pela infraestrutura.</li>
          <li><strong>Preferências locais:</strong> tema visual e escolhas de cookies armazenadas no navegador.</li>
        </ul>
        <p>Pedimos que você não insira dados sensíveis ou dados de terceiros que não sejam necessários para usar a plataforma.</p>
      </LegalSection>

      <LegalSection id="finalidades" title="3. Para que usamos os dados e bases legais">
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table>
            <thead><tr><th>Finalidade</th><th>Base legal principal</th></tr></thead>
            <tbody>
              <tr><td>Criar a conta, autenticar, entregar módulos e manter a assinatura.</td><td>Execução de contrato e procedimentos preliminares.</td></tr>
              <tr><td>Processar pagamentos, emitir registros e conciliar cobranças.</td><td>Execução de contrato e cumprimento de obrigação legal ou regulatória.</td></tr>
              <tr><td>Guardar e organizar os dados operacionais solicitados pelo usuário.</td><td>Execução de contrato.</td></tr>
              <tr><td>Prevenir fraude, abuso, incidentes e acesso não autorizado.</td><td>Legítimo interesse e proteção da vida ou da incolumidade, quando aplicável.</td></tr>
              <tr><td>Responder suporte, solicitações de privacidade e comunicações transacionais.</td><td>Execução de contrato, obrigação legal e legítimo interesse.</td></tr>
              <tr><td>Usar cookies ou tecnologias opcionais de análise e marketing.</td><td>Consentimento, quando e se essas tecnologias forem habilitadas.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Quando o tratamento depender de consentimento, você poderá recusá-lo ou revogá-lo sem afetar tratamentos baseados em outras hipóteses legais.</p>
      </LegalSection>

      <LegalSection id="compartilhamento" title="4. Com quem os dados podem ser compartilhados">
        <ul>
          <li><strong>Asaas:</strong> hospedagem do checkout, cobrança, assinatura e confirmação de pagamento.</li>
          <li><strong>Google Gemini:</strong> processamento das perguntas e do contexto enviados voluntariamente ao agente de IA.</li>
          <li><strong>Resend:</strong> envio de mensagens transacionais, como dados de acesso após confirmação de pagamento.</li>
          <li><strong>Cloudflare e infraestrutura de hospedagem:</strong> segurança, entrega do site, registros técnicos, banco de dados e backups.</li>
          <li><strong>Autoridades e terceiros autorizados:</strong> quando necessário para cumprir a lei, ordem válida, defender direitos ou investigar incidentes.</li>
        </ul>
        <p>Não vendemos dados pessoais. Prestadores recebem apenas os dados compatíveis com a finalidade contratada e devem adotar medidas de proteção adequadas.</p>
      </LegalSection>

      <LegalSection id="transferencia" title="5. Transferências internacionais">
        <p>Alguns fornecedores, como Google, Resend e Cloudflare, podem processar ou armazenar dados fora do Brasil. Nesses casos, buscamos utilizar fornecedores reconhecidos e mecanismos contratuais e técnicos compatíveis com a LGPD e as normas da ANPD.</p>
      </LegalSection>

      <LegalSection id="retencao" title="6. Por quanto tempo mantemos os dados">
        <ul>
          <li>O cookie de sessão pode permanecer por até <strong>30 dias</strong>, salvo encerramento antecipado da sessão.</li>
          <li>Dados da conta e da operação permanecem enquanto a conta estiver ativa e pelo período necessário para prestação do serviço, defesa de direitos e cumprimento de obrigações.</li>
          <li>Registros de pagamento são conservados pelo prazo exigido pela legislação fiscal, contábil, consumerista e de prevenção a fraudes.</li>
          <li>Backups remotos seguem ciclo técnico de retenção de até <strong>90 dias</strong>; dados excluídos podem permanecer protegidos até a rotação do backup.</li>
          <li>Preferências de cookies são renovadas ou solicitadas novamente após <strong>12 meses</strong>.</li>
        </ul>
        <p>Ao final do tratamento, os dados são eliminados, anonimizados ou conservados apenas nas hipóteses permitidas pelo artigo 16 da LGPD.</p>
      </LegalSection>

      <LegalSection id="seguranca" title="7. Como protegemos os dados">
        <p>Adotamos medidas proporcionais ao risco, incluindo senha de usuário derivada por função criptográfica, token de sessão aleatório com armazenamento apenas de seu hash, credenciais de casas cifradas, conexão HTTPS, restrição de acesso, firewall, isolamento do banco, backups e registros de segurança.</p>
        <p>Nenhum sistema é totalmente invulnerável. Em caso de incidente relevante, adotaremos as medidas de contenção e comunicação exigidas pela legislação.</p>
      </LegalSection>

      <LegalSection id="direitos" title="8. Seus direitos como titular">
        <p>Nos termos da LGPD, você pode solicitar:</p>
        <ul>
          <li>confirmação da existência de tratamento e acesso aos dados;</li>
          <li>correção de informações incompletas, inexatas ou desatualizadas;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
          <li>portabilidade, quando regulamentada e tecnicamente aplicável;</li>
          <li>informações sobre compartilhamento e sobre a possibilidade de negar consentimento;</li>
          <li>revogação do consentimento e eliminação de dados tratados com essa base, observadas as exceções legais;</li>
          <li>oposição a tratamento irregular e revisão de decisões exclusivamente automatizadas, quando aplicável.</li>
        </ul>
        <p>Envie a solicitação para <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>. Poderemos solicitar informações para confirmar sua identidade e proteger a conta. Se a questão não for resolvida, você também poderá procurar a ANPD ou órgãos de defesa do consumidor.</p>
      </LegalSection>

      <LegalSection id="menores" title="9. Uso por menores de idade">
        <p>O ApexMonitor é destinado exclusivamente a pessoas com <strong>18 anos ou mais</strong>. Não coletamos intencionalmente dados de crianças ou adolescentes para oferta do serviço.</p>
      </LegalSection>

      <LegalSection id="alteracoes" title="10. Alterações desta política">
        <p>Esta política pode ser atualizada para refletir mudanças no produto, fornecedores ou legislação. Alterações relevantes serão comunicadas por meio adequado, e a data no início do documento será atualizada.</p>
        <p>Referências: <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noreferrer">Lei nº 13.709/2018 (LGPD)</a> e <a href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares" target="_blank" rel="noreferrer">orientações da ANPD sobre direitos dos titulares</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}
