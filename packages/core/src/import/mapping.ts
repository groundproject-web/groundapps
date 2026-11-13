/**
 * Mapeamento de colunas da planilha para os campos do Marco Zero.
 * A IA pode propor um mapeamento melhor; esta heurística é a base determinística
 * (e o fallback quando a IA não está disponível).
 *
 * LGPD: colunas com dado sensível (CPF, RG, endereço, cartão) são SEMPRE descartadas,
 * mesmo que a IA proponha outra coisa.
 */
export const FIELDS = ["quem", "quando", "quanto", "email", "telefone", "produto", "cupom", "pedido", "origem"] as const;
export type Field = (typeof FIELDS)[number];
export type ColumnTarget = Field | "ignorado" | "sensivel";

export const FIELD_LABEL: Record<ColumnTarget, string> = {
  quem: "Quem",
  quando: "Quando",
  quanto: "Quanto",
  email: "Contato",
  telefone: "Contato",
  produto: "Item",
  cupom: "Desconto",
  pedido: "Pedido",
  origem: "Origem",
  ignorado: "Ignorado",
  sensivel: "Ignorado · dado sensível",
};

export const REQUIRED_FIELDS: Field[] = ["quem", "quando", "quanto"];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const SENSITIVE = [/\bcpf\b/, /\bcnpj\b/, /\brg\b/, /endereco/, /\bcep\b/, /logradouro/, /bairro/, /cartao/, /\bcard\b/, /pagamento/, /documento/, /nascimento/];

const RULES: [Field, RegExp[]][] = [
  ["email", [/e ?mail/]],
  ["telefone", [/telefone/, /celular/, /whats/, /\bfone\b/, /\btel\b/, /phone/]],
  ["quando", [/data/, /\bdate\b/, /\bdia\b/, /criado em/, /created/]],
  ["quanto", [/total/, /valor/, /\bpago\b/, /price/, /amount/, /faturamento/]],
  ["cupom", [/cupom/, /coupon/, /desconto/]],
  ["produto", [/produto/, /\bitem\b/, /\bsku\b/, /product/]],
  ["origem", [/utm/, /origem/, /como conheceu/, /indicacao/]],
  ["pedido", [/numero do pedido/, /\bpedido\b/, /order id/, /\bid\b/]],
  ["quem", [/nome/, /cliente/, /comprador/, /\bname\b/, /customer/]],
];

export interface ColumnMapping {
  header: string;
  index: number;
  target: ColumnTarget;
}

export function isSensitiveHeader(header: string): boolean {
  const h = norm(header);
  return SENSITIVE.some((r) => r.test(h));
}

export function proposeMapping(headers: string[]): ColumnMapping[] {
  const used = new Set<Field>();
  return headers.map((header, index) => {
    if (isSensitiveHeader(header)) return { header, index, target: "sensivel" as const };
    const h = norm(header);
    for (const [field, patterns] of RULES) {
      if (used.has(field)) continue;
      if (patterns.some((p) => p.test(h))) {
        // "Status do frete", "Status do pagamento" não são dado de recompra
        if (/status|frete|envio|rastreio/.test(h)) break;
        used.add(field);
        return { header, index, target: field };
      }
    }
    return { header, index, target: "ignorado" as const };
  });
}

/** Garante as regras não negociáveis sobre um mapeamento vindo da IA ou do lojista. */
export function enforceMapping(mapping: ColumnMapping[]): ColumnMapping[] {
  return mapping.map((m) => (isSensitiveHeader(m.header) ? { ...m, target: "sensivel" } : m));
}

export function missingRequired(mapping: ColumnMapping[]): Field[] {
  const have = new Set(mapping.map((m) => m.target));
  return REQUIRED_FIELDS.filter((f) => !have.has(f));
}
