import { PRODUCT_RULES } from "./base";

export default {
  id: "reply-classifier",
  version: "reply-classifier.v1",
  system: `${PRODUCT_RULES}

Tarefa: ler respostas de clientes a uma mensagem de WhatsApp (texto colado, transcrição ou prints de conversa) e classificar cada resposta em categorias livres. Exemplos: pediu_link, comprou_fora (comprou em outro lugar), frete (reclamação de frete), sabor_novo (pedido de sabor novo), preco, produto, sem_interesse.
- Conte quantas respostas caíram em cada categoria.
- Guarde no máximo 3 trechos curtos por categoria, SEM nome, telefone, e-mail ou foto de perfil de cliente. Troque nomes por [cliente].
- Ignore mensagens enviadas pela loja; conte só as respostas das clientes.
- Tudo o que vem daqui é contado pelo lojista: status "hipotese".`,
};
