import { PageHeader } from "@ground/ui";

export const metadata = { title: "Termos de uso (rascunho)" };

export default function Termos() {
  return (
    <main id="conteudo" className="max-w-[760px] mx-auto px-4 py-10">
      <p role="note" className="st-gargalo rounded-xl p-4 font-mono text-xs tracking-[0.1em] uppercase">
        Rascunho · não é a versão final · em revisão jurídica · não publicar como definitivo
      </p>
      <PageHeader label="Ground Project" title="Termos de uso" />
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed">
        <p>1. Os apps Ground Marco Zero e Ground Sketch entregam leitura, plano e missões. Não prometem resultado: toda estimativa é uma hipótese.</p>
        <p>2. Os apps não enviam mensagens às clientes da loja. O lojista decide o que enviar, para quem e quando.</p>
        <p>3. O lojista é responsável por ter base legal para usar os dados das próprias clientes (LGPD). A Ground trata esses dados como operadora, só para prestar o serviço.</p>
        <p>4. Planos, preços e regras de teste estão em validação e podem mudar. Mudanças de faixa só acontecem com o aceite do lojista.</p>
        <p>5. Cancelamento a qualquer momento. A exclusão dos dados pode ser pedida no app e é feita em até 30 dias.</p>
        <p className="text-duna">[A completar pelo advogado: foro, responsabilidade, propriedade intelectual, disponibilidade, suspensão.]</p>
      </div>
    </main>
  );
}
