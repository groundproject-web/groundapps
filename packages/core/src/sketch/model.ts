import { z } from "zod";
import type { Status } from "../types";

/**
 * Sketch: toda frase de cliente e toda afirmação sobre concorrente guarda a fonte.
 * Sem fonte → "sem informação", nunca "fato".
 */
export const SourceRefSchema = z.object({
  kind: z.enum(["checkin_mz", "avaliacao_mz", "avaliacao_loja", "comentario", "print", "texto_colado", "url_publica", "api_oficial", "lojista"]),
  ref: z.string(), // id interno do documento/trecho
  url: z.string().url().nullable().optional(),
  collectedAt: z.string(), // ISO
  excerpt: z.string().max(400).optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export interface Quote {
  text: string;
  count: number;
  sources: SourceRef[];
}

export interface Persona {
  profile: string;
  description: string;
  status: Status;
  strength?: "forte" | "fraca";
  evidenceLabel: string; // "412 avaliações lidas"
  topQuote: Quote;
  expressions: Quote[];
  pain: string;
  desire: string;
  motive: string;
}

export interface MatrixCell {
  promises: boolean | null; // null = sem informação
  evidence?: SourceRef;
}

export interface Competitor {
  name: string;
  isYou?: boolean;
  confirmed: boolean; // sugerido pela IA, confirmado pelo lojista
  cells: MatrixCell[];
  channels?: string[];
  complaints?: { text: string; count: number; sources: SourceRef[] }[];
}

export interface TerrainMatrix {
  columns: string[];
  rows: Competitor[];
  readAt: string;
}

export function cellStatus(c: MatrixCell): Status {
  if (c.promises === null || !c.evidence) return "sem_info";
  return "fato";
}

/**
 * O espaço vazio: a coluna que nenhum concorrente (exceto você) ocupa
 * e que coincide com uma dor ou desejo da cliente.
 */
export function findEmptySpace(m: TerrainMatrix, customerNeeds: string[]): number | null {
  const needs = customerNeeds.map((n) => n.toLowerCase());
  const others = m.rows.filter((r) => !r.isYou && r.confirmed);
  const candidates = m.columns
    .map((col, i) => ({ col, i, occupied: others.filter((r) => r.cells[i]?.promises === true).length, known: others.filter((r) => r.cells[i]?.promises !== null).length }))
    .filter((c) => c.occupied === 0 && c.known === others.length);
  const matching = candidates.filter((c) => needs.some((n) => n.includes(c.col.toLowerCase()) || c.col.toLowerCase().split(/\s+/).some((w) => w.length > 4 && n.includes(w))));
  return (matching[0] ?? candidates[0])?.i ?? null;
}

/**
 * Proibido: monitoramento de preço e "quem cobra menos".
 * A matriz pode registrar o que uma marca PROMETE ("preço baixo" como posicionamento),
 * mas nunca valores, comparações de preço ou acompanhamento de preço.
 */
export function assertNoPriceColumns(columns: string[]): void {
  const bad = columns.filter((c) => /cobra menos|mais barat|monitor|R\$|\d+[,.]\d{2}|pre[cç]o (atual|praticado|m[eé]dio)|varia[cç][aã]o de pre/i.test(c));
  if (bad.length) throw new Error(`Coluna proibida na matriz (guerra de preço): ${bad.join(", ")}`);
}

export interface Channel {
  key: string;
  title: string;
  detail: string;
  kind: "conectores" | "clubes" | "grupos" | "eventos" | "perfis" | "comunidades";
  priority: 1 | 2 | 3 | 4;
  inPlan: boolean;
  status: Status;
}

export interface TrafficTest {
  budgetCents: number;
  days: number;
  message: string;
  stopRule: string;
  phase: "depois" | "pronto" | "ativo" | "parado";
  status: Status;
}

export interface SketchMission {
  key: string;
  week: number;
  title: string;
  detail: string;
  category: string;
  material?: { kind: "roteiro_conversa" | "carrossel" | "roteiro_video" | "cartao"; text: string };
  channelKey?: string;
  done: boolean;
  originCode?: string;
}

/** Validação do teste de tráfego: verba, prazo e regra de parada obrigatórios. */
export function validateTrafficTest(t: TrafficTest): string[] {
  const errs: string[] = [];
  if (!(t.budgetCents > 0)) errs.push("Defina a verba");
  if (!(t.days > 0 && t.days <= 30)) errs.push("Prazo entre 1 e 30 dias");
  if (!t.message.trim()) errs.push("Uma mensagem só, para testar");
  if (!t.stopRule.trim()) errs.push("Defina a regra de parada");
  return errs;
}
