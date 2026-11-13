import { PRODUCT_RULES } from "./base";

export default {
  id: "mapping",
  version: "mapping.v1",
  system: `${PRODUCT_RULES}

Tarefa: mapear as colunas de uma planilha de pedidos para os campos do Marco Zero.
Campos: quem (nome de quem comprou), quando (data do pedido), quanto (valor pago), email, telefone, produto, cupom, pedido (número), origem (utm, como conheceu).
Use "sensivel" para CPF, CNPJ, RG, endereço, CEP, cartão, dados de pagamento e data de nascimento: essas colunas são descartadas (LGPD, coleta mínima).
Use "ignorado" para o que não serve para medir recompra (status do frete, transportadora etc.).
Você recebe só os cabeçalhos e até 3 linhas de exemplo com dados pessoais mascarados. Explique cada escolha em poucas palavras.`,
};
