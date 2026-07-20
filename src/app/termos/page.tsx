import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/LegalShell";
import { getLegalInfo } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso — ApexMonitor",
  description: "Condições para utilização da plataforma ApexMonitor.",
};

export default function TermosPage() {
  const legal = getLegalInfo();

  return (
    <LegalShell
      eyebrow="Condições do serviço"
      title="Termos de Uso"
      description="Estes termos definem as regras para acessar e utilizar os recursos do ApexMonitor."
      updatedAt="19 de julho de 2026"
    >
      {legal.hasPendingFields && (
        <aside className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning">
          <strong className="block font-black">Revisão necessária antes da publicação oficial</strong>
          Preencha documento e endereço do fornecedor nas variáveis legais do ambiente.
        </aside>
      )}

      <LegalSection id="aceite" title="1. Aceite e fornecedor">
        <p>Ao criar conta, contratar um plano ou utilizar a plataforma, você declara que leu e concorda com estes termos e com a Política de Privacidade.</p>
        <p>O serviço é fornecido por <strong>{legal.controllerName}</strong>{legal.controllerDocument !== "PENDENTE" ? `, ${legal.controllerDocument}` : ""}. Contato: <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>.</p>
      </LegalSection>

      <LegalSection id="servico" title="2. O que o ApexMonitor oferece">
        <p>O ApexMonitor oferece ferramentas de comparação de odds, cálculos de cenários, gestão de banca, custos, contas, parceiros, operações e recursos de comunidade e inteligência artificial.</p>
        <p>Somos uma ferramenta de apoio informacional e organizacional. <strong>Não somos uma casa de apostas, não recebemos apostas, não intermediamos apostas e não garantimos lucro ou resultado.</strong></p>
      </LegalSection>

      <LegalSection id="elegibilidade" title="3. Elegibilidade e conta">
        <ul>
          <li>O serviço é destinado exclusivamente a pessoas com 18 anos ou mais.</li>
          <li>Você deve fornecer informações corretas, manter sua senha em sigilo e avisar imediatamente sobre uso indevido.</li>
          <li>A conta é pessoal. Não é permitido vender, ceder, compartilhar acesso de forma abusiva ou contornar limites técnicos.</li>
          <li>Você é responsável pelos dados de terceiros inseridos na plataforma e deve possuir uma base legítima para tratá-los.</li>
        </ul>
      </LegalSection>

      <LegalSection id="assinatura" title="4. Planos, pagamento e renovação">
        <ul>
          <li>Preços, período e recursos aplicáveis são apresentados antes da contratação.</li>
          <li>Pagamentos são processados pelo Asaas. Dados de cobrança e do meio de pagamento podem ser coletados diretamente por esse fornecedor.</li>
          <li>Assinaturas no cartão podem renovar automaticamente conforme a opção informada no checkout. O Pix vale pelo período contratado e não renova automaticamente.</li>
          <li>Cupons são sujeitos às condições, validade e limites da campanha.</li>
          <li>Cancelamento impede futuras renovações, mas não elimina obrigações já vencidas. Direitos de arrependimento e reembolso serão observados quando previstos na legislação aplicável.</li>
        </ul>
      </LegalSection>

      <LegalSection id="riscos" title="5. Odds, decisões e riscos">
        <p>Odds mudam rapidamente e podem divergir da informação exibida. Você deve confirmar cotação, mercado, evento, regras, limites e disponibilidade diretamente na casa antes de executar qualquer operação.</p>
        <p>Cálculos, alertas e respostas de inteligência artificial podem conter falhas, atrasos ou interpretações incorretas. A decisão final é sempre do usuário. Apostas envolvem risco financeiro; use limites e jogue com responsabilidade.</p>
      </LegalSection>

      <LegalSection id="uso" title="6. Uso permitido e proibido">
        <p>Você pode utilizar o serviço para fins pessoais ou profissionais lícitos relacionados à sua própria operação. É proibido:</p>
        <ul>
          <li>violar leis, direitos de terceiros ou regras aplicáveis às casas utilizadas;</li>
          <li>tentar acessar contas, dados, APIs ou infraestrutura sem autorização;</li>
          <li>copiar, revender, extrair em massa ou explorar o serviço de forma automatizada sem permissão;</li>
          <li>enviar malware, interferir no funcionamento ou realizar ataques e testes invasivos;</li>
          <li>publicar conteúdo ilegal, discriminatório, enganoso, ofensivo ou que exponha dados pessoais indevidamente.</li>
        </ul>
      </LegalSection>

      <LegalSection id="credenciais" title="7. Credenciais e dados operacionais">
        <p>A plataforma permite guardar credenciais de casas para facilitar sua organização. Essas informações são cifradas antes do armazenamento. Ainda assim, você deve usar senhas exclusivas, autenticação em dois fatores quando disponível e limitar o cadastro ao estritamente necessário.</p>
        <p>Você continua responsável por conferir saldos, operações, obrigações fiscais e registros oficiais nas respectivas fontes.</p>
      </LegalSection>

      <LegalSection id="disponibilidade" title="8. Disponibilidade e alterações">
        <p>Buscamos manter o serviço disponível e os dados atualizados, mas podem ocorrer manutenções, falhas de fornecedores, indisponibilidade de casas, atrasos de fontes e eventos fora de nosso controle. Recursos podem ser ajustados para segurança, desempenho, conformidade ou evolução do produto.</p>
      </LegalSection>

      <LegalSection id="propriedade" title="9. Propriedade intelectual">
        <p>Marca, interface, código, textos, bases organizadas e demais elementos do ApexMonitor são protegidos pela legislação aplicável. A assinatura concede uma licença limitada, pessoal, revogável e não exclusiva de uso durante a vigência do plano.</p>
      </LegalSection>

      <LegalSection id="responsabilidade" title="10. Responsabilidade">
        <p>Na extensão permitida pela lei, o ApexMonitor não responde por decisões de aposta, variação de odds, bloqueios ou limitações de casas, perdas decorrentes de dados incorretos fornecidos pelo usuário, falhas externas ou uso contrário a estes termos.</p>
        <p>Nada nestes termos exclui direitos obrigatórios do consumidor, responsabilidade que não possa ser legalmente afastada ou deveres relacionados à proteção de dados.</p>
      </LegalSection>

      <LegalSection id="suspensao" title="11. Suspensão e encerramento">
        <p>Podemos suspender ou encerrar acesso em caso de fraude, risco de segurança, inadimplência, violação relevante destes termos ou exigência legal, assegurando informações e meios de contestação quando cabíveis. Você pode solicitar o encerramento e a exclusão de dados, observadas as retenções legais.</p>
      </LegalSection>

      <LegalSection id="lei" title="12. Lei aplicável e contato">
        <p>Estes termos seguem as leis da República Federativa do Brasil. Em relações de consumo, fica preservado o foro legalmente competente do consumidor.</p>
        <p>Dúvidas, cancelamentos e solicitações podem ser enviados para <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}
