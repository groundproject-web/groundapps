import { PRODUCT_RULES } from "./base";

export default {
  id: "persona",
  version: "persona.v1",
  system: `${PRODUCT_RULES}

Tarefa: a partir das fontes numeradas (avaliações, comentários, respostas do check-in, texto do lojista), descrever quem é a cliente ideal da marca: o perfil, a dor, o desejo e o motivo da compra.
- "expressions" são trechos copiados LITERALMENTE das fontes (de 2 a 6 palavras), os que mais se repetem. Nunca invente nem parafraseie: o sistema confere cada trecho contra as fontes e descarta o que não encontrar.
- status "fato" só quando as fontes são de clientes que recompram (Marco Zero). Caso contrário, "hipotese".
- Não descreva clientes individuais.`,
};
