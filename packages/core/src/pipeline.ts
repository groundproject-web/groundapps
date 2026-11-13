import type { Customer, Order } from "./types";
import { parseCsv } from "./import/csv";
import { enforceMapping, missingRequired, proposeMapping, type ColumnMapping } from "./import/mapping";
import { rowsToOrders, type RowProblem } from "./import/normalize";
import { dedupe, type DoubtDecisions, type DoubtPair } from "./import/dedup";
import { addDays, hash32, rng } from "./util";

/**
 * Importação de planilha de ponta a ponta:
 * CSV → mapeamento (proposto e com as regras LGPD aplicadas) → pedidos → deduplicação.
 */
export interface ImportResult {
  mapping: ColumnMapping[];
  missing: string[];
  customers: Customer[];
  orders: Order[];
  doubts: DoubtPair[];
  problems: RowProblem[];
  discarded: string[];
  stats: { ordersRead: number; registrations: number; autoMerged: number; uniqueCustomers: number; pendingDoubts: number };
}

export function importSpreadsheet(text: string, opts: { decisions?: DoubtDecisions; mapping?: ColumnMapping[]; idPrefix?: string } = {}): ImportResult {
  const parsed = parseCsv(text);
  const mapping = enforceMapping(opts.mapping ?? proposeMapping(parsed.headers));
  const missing = missingRequired(mapping);
  if (missing.length) {
    return { mapping, missing, customers: [], orders: [], doubts: [], problems: [], discarded: [], stats: { ordersRead: 0, registrations: 0, autoMerged: 0, uniqueCustomers: 0, pendingDoubts: 0 } };
  }
  const { orders: raw, problems } = rowsToOrders(parsed.rows, mapping);
  const d = dedupe(raw, opts.decisions ?? {}, opts.idPrefix ?? "c");
  return {
    mapping,
    missing,
    customers: d.customers,
    orders: d.orders,
    doubts: d.doubts,
    problems,
    discarded: mapping.filter((m) => m.target === "sensivel" || m.target === "ignorado").map((m) => m.header),
    stats: d.stats,
  };
}

/**
 * Simulador de pedidos de uma semana (SÓ demo/staging, botão "avançar uma semana").
 * Quem recebeu a mensagem volta com taxa `recipientRate`; o resto da base, com `baseRate`.
 * Determinístico pela semente. Os pedidos ficam marcados com origem "simulacao".
 */
export function simulateWeekOrders(params: {
  seed: string;
  from: string; // dia do envio
  days: number;
  recipients: string[];
  others: string[];
  recipientRate: number;
  baseRate: number;
  avgTicketCents: number;
  product?: string;
}): Order[] {
  const r = rng(hash32(params.seed));
  const out: Order[] = [];
  const mk = (customerId: string) => {
    const day = 1 + Math.floor(r() * params.days);
    const cents = Math.round((params.avgTicketCents * (0.85 + r() * 0.3)) / 100) * 100;
    out.push({ id: `sim_${hash32(params.seed + customerId).toString(36)}`, customerId, date: addDays(params.from, day), totalCents: cents, items: params.product ? [{ product: params.product, quantity: 1 }] : [], coupon: null, sourceCode: "simulacao" });
  };
  // contagem exata (round(n × taxa)), sorteando QUEM de forma determinística: a demo fica estável
  const pickN = (ids: string[], rate: number) => {
    const list = [...ids].sort();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list.slice(0, Math.round(list.length * rate));
  };
  for (const id of pickN(params.recipients, params.recipientRate)) mk(id);
  for (const id of pickN(params.others, params.baseRate)) mk(id);
  return out;
}
