import { PageHeader } from "@ground/ui";

export const metadata = { title: "Política de privacidade (rascunho)" };

export default function PoliticaPrivacidade() {
  return (
    <main id="conteudo" className="max-w-[760px] mx-auto px-4 py-10">
      <p role="note" className="st-gargalo rounded-xl p-4 font-mono text-xs tracking-[0.1em] uppercase">
        Rascunho · não é a versão final · em revisão jurídica · não publicar como definitivo
      </p>
      <PageHeader label="Ground Project" title="Política de privacidade" />
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed">
        <h2 className="font-display font-semibold text-xl m-0">Papéis</h2>
        <p>O lojista é o controlador dos dados das clientes dele. A Ground é a operadora e trata esses dados só para prestar o serviço contratado.</p>
        <h2 className="font-display font-semibold text-xl m-0">Coleta mínima</h2>
        <p>Do histórico de pedidos, usamos só: quem comprou, quando, quanto, o produto, o cupom e o contato (telefone e e-mail). CPF, endereço e dados de pagamento são descartados na leitura e não são guardados.</p>
        <h2 className="font-display font-semibold text-xl m-0">Proteção</h2>
        <p>Telefone e e-mail ficam criptografados. Tokens de integração ficam num cofre de segredos. Dados pessoais não vão para os registros (logs). O acesso é separado por loja.</p>
        <h2 className="font-display font-semibold text-xl m-0">Prints do check-in</h2>
        <p>O conteúdo é lido e resumido em categorias, sem nome de cliente. O arquivo é apagado em até 30 dias.</p>
        <h2 className="font-display font-semibold text-xl m-0">Inteligência artificial</h2>
        <p>Usamos a API da Anthropic (Claude) para organizar planilhas, escrever mensagens e classificar respostas. Antes do envio, dados pessoais das amostras são mascarados.</p>
        <h2 className="font-display font-semibold text-xl m-0">Exclusão</h2>
        <p>Ao cancelar a conta ou a pedido do lojista, os dados são apagados em até 30 dias.</p>
        <p className="text-duna">[A completar pelo advogado: encarregado (DPO), transferência internacional, bases legais, prazos de retenção, direitos do titular, contato.]</p>
      </div>
    </main>
  );
}
