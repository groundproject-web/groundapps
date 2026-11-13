import { z } from "zod/v4";

/**
 * Saídas estruturadas da IA. TODA saída carrega o estado da gramática do traço:
 * status: fato | hipotese | gargalo | sem_info
 */
export const StatusSchema = z.enum(["fato", "hipotese", "gargalo", "sem_info"]);

export const MappingProposalSchema = z.object({
  columns: z.array(
    z.object({
      header: z.string(),
      target: z.enum(["quem", "quando", "quanto", "email", "telefone", "produto", "cupom", "pedido", "origem", "ignorado", "sensivel"]),
      reason: z.string(),
    }),
  ),
  status: StatusSchema,
});
export type MappingProposal = z.infer<typeof MappingProposalSchema>;

export const MissionCopySchema = z.object({
  message: z.string().describe("Mensagem pronta para WhatsApp, com a variável [nome]. Fala de cuidado, não de desconto."),
  why: z.array(z.string()).max(4),
  status: StatusSchema,
});
export type MissionCopy = z.infer<typeof MissionCopySchema>;

export const ReplyClassesSchema = z.object({
  categories: z.array(
    z.object({
      category: z.string().describe("slug curto: pediu_link, frete, sabor_novo, comprou_fora, sem_interesse..."),
      label: z.string(),
      count: z.number().int(),
      excerpts: z.array(z.string()).max(3).describe("trechos SEM nome, telefone ou e-mail de cliente"),
    }),
  ),
  totalReplies: z.number().int(),
  status: z.literal("hipotese"),
});
export type ReplyClasses = z.infer<typeof ReplyClassesSchema>;

export const PersonaProposalSchema = z.object({
  profile: z.string(),
  description: z.string(),
  expressions: z.array(z.string()).max(8).describe("Trechos copiados LITERALMENTE das fontes"),
  pain: z.string(),
  desire: z.string(),
  motive: z.string(),
  status: StatusSchema,
});
export type PersonaProposal = z.infer<typeof PersonaProposalSchema>;

export const EvidenceSchema = z.object({
  url: z.string(),
  collectedAt: z.string(),
  excerpt: z.string(),
});

export const CompetitorResearchSchema = z.object({
  competitors: z.array(
    z.object({
      name: z.string(),
      site: z.string().nullable(),
      promises: z.array(z.object({ attribute: z.string(), promises: z.boolean().nullable(), evidence: EvidenceSchema.nullable(), status: StatusSchema })),
      channels: z.array(z.object({ channel: z.string(), evidence: EvidenceSchema.nullable(), status: StatusSchema })),
      complaints: z.array(z.object({ text: z.string(), frequency: z.string(), evidence: EvidenceSchema.nullable(), status: StatusSchema })),
      praises: z.array(z.object({ text: z.string(), evidence: EvidenceSchema.nullable(), status: StatusSchema })),
    }),
  ),
  status: StatusSchema,
});
export type CompetitorResearch = z.infer<typeof CompetitorResearchSchema>;
