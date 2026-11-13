import type { Customer, Order, Status } from "../types";
import { daysBetween } from "../util";
import { buildHistories, type CustomerHistory } from "./history";

/**
 * Grupos de clientes. As regras ficam numa tabela de configuração
 * (aqui o padrão; no banco, `segment_rules`, ajustável por loja no futuro).
 */
export type SegmentKey = "fieis" | "em_risco" | "sumidos" | "compra_unica_recente" | "voltaram_ha_pouco";

export interface SegmentRule {
  key: SegmentKey;
  name: string;
  status: Status;
  minOrders: number;
  maxOrders?: number;
  /** a última compra foi há no máximo N dias */
  lastWithinDays?: number;
  /** a última compra foi há mais de N dias */
  lastOlderThanDays?: number;
  description: string;
  /** Regra proposta pela equipe técnica, aguardando os sócios. */
  proposta?: boolean;
}

export const DEFAULT_SEGMENT_RULES: SegmentRule[] = [
  { key: "fieis", name: "Fiéis", status: "fato", minOrders: 3, lastWithinDays: 60, description: "Três compras ou mais, a última nos últimos 60 dias." },
  { key: "em_risco", name: "Em risco", status: "hipotese", minOrders: 2, lastOlderThanDays: 60, description: "Já voltaram antes, mas não compram há mais de 60 dias. Ainda dá para recuperar." },
  { key: "sumidos", name: "Sumidos", status: "gargalo", minOrders: 1, maxOrders: 1, lastOlderThanDays: 90, description: "Compraram uma vez, há mais de 90 dias, e nunca voltaram. É onde está o dinheiro parado." },
  { key: "compra_unica_recente", name: "Compra única recente", status: "sem_info", minOrders: 1, maxOrders: 1, lastWithinDays: 90, description: "Compraram pela primeira vez nos últimos 90 dias. Ainda é cedo para dizer se vão voltar." },
  // Lacuna da tabela do PRD: 2 compras com a última há ≤ 60 dias não cai em nenhum grupo.
  // Proposta registrada em docs/DECISOES.md, aguardando os sócios.
  { key: "voltaram_ha_pouco", name: "Voltaram há pouco", status: "hipotese", minOrders: 2, maxOrders: 2, lastWithinDays: 60, description: "Fizeram a 2ª compra nos últimos 60 dias. A 3ª ainda não veio.", proposta: true },
];

export function matchesRule(rule: SegmentRule, orders: number, daysSinceLast: number): boolean {
  if (orders < rule.minOrders) return false;
  if (rule.maxOrders !== undefined && orders > rule.maxOrders) return false;
  if (rule.lastWithinDays !== undefined && daysSinceLast > rule.lastWithinDays) return false;
  if (rule.lastOlderThanDays !== undefined && daysSinceLast <= rule.lastOlderThanDays) return false;
  return true;
}

export function segmentOf(h: CustomerHistory, asOf: string, rules = DEFAULT_SEGMENT_RULES): SegmentKey | null {
  const since = daysBetween(h.last.date, asOf);
  return rules.find((r) => matchesRule(r, h.orders.length, since))?.key ?? null;
}

export interface SegmentSummary {
  key: SegmentKey;
  name: string;
  status: Status;
  description: string;
  count: number;
  totalCents: number;
  customerIds: string[];
  proposta?: boolean;
}

export function computeSegments(customers: Customer[], orders: Order[], asOf: string, rules = DEFAULT_SEGMENT_RULES) {
  const hs = buildHistories(customers, orders, asOf);
  const summaries = new Map<SegmentKey, SegmentSummary>(
    rules.map((r) => [r.key, { key: r.key, name: r.name, status: r.status, description: r.description, count: 0, totalCents: 0, customerIds: [], proposta: r.proposta }]),
  );
  const bySegment = new Map<string, SegmentKey | null>();
  for (const h of hs) {
    const k = segmentOf(h, asOf, rules);
    bySegment.set(h.customer.id, k);
    if (!k) continue;
    const s = summaries.get(k)!;
    s.count++;
    s.totalCents += h.totalCents;
    s.customerIds.push(h.customer.id);
  }
  return { segments: [...summaries.values()], bySegment, histories: hs };
}
