import type { Customer, Order, Status } from "../types";
import { daysBetween } from "../util";
import { buildHistories } from "../metrics/history";
import type { Channel } from "./model";

/**
 * mz.cohort_repurchase.by_source: para cada código de origem, as clientes adquiridas
 * (1ª compra com aquele código), a % que recomprou em 60 e 90 dias e o LTV parcial.
 * O diferencial: a aquisição é medida pela recompra, não pela primeira venda.
 */
export interface SourceCohort {
  sourceCode: string;
  acquired: number;
  returned: number; // voltaram em qualquer momento
  eligible60: number;
  repurchased60: number;
  rate60: number | null;
  eligible90: number;
  repurchased90: number;
  rate90: number | null;
  partialLtvCents: number;
}

export function repurchaseBySource(customers: Customer[], orders: Order[], asOf: string): SourceCohort[] {
  const hs = buildHistories(customers, orders, asOf);
  const map = new Map<string, SourceCohort>();
  for (const h of hs) {
    const code = h.first.sourceCode;
    if (!code) continue;
    if (!map.has(code)) map.set(code, { sourceCode: code, acquired: 0, returned: 0, eligible60: 0, repurchased60: 0, rate60: null, eligible90: 0, repurchased90: 0, rate90: null, partialLtvCents: 0 });
    const c = map.get(code)!;
    c.acquired++;
    c.partialLtvCents += h.totalCents;
    const second = h.orders[1];
    if (second) c.returned++;
    const age = daysBetween(h.first.date, asOf);
    if (age >= 60) {
      c.eligible60++;
      if (second && daysBetween(h.first.date, second.date) <= 60) c.repurchased60++;
    }
    if (age >= 90) {
      c.eligible90++;
      if (second && daysBetween(h.first.date, second.date) <= 90) c.repurchased90++;
    }
  }
  for (const c of map.values()) {
    c.rate60 = c.eligible60 ? c.repurchased60 / c.eligible60 : null;
    c.rate90 = c.eligible90 ? c.repurchased90 / c.eligible90 : null;
    c.partialLtvCents = c.acquired ? Math.round(c.partialLtvCents / c.acquired) : 0;
  }
  return [...map.values()].sort((a, b) => b.acquired - a.acquired);
}

export interface ChannelRepriorization {
  channelKey: string;
  acquired: number;
  returned: number;
  oldPriority: number;
  newPriority: number;
  status: Status;
  sentence: string;
}

/**
 * Canais que trazem quem recompra sobem de prioridade; os outros viram hipótese a revisar.
 * Precisa de amostra mínima (padrão 5 clientes adquiridas) para mexer na prioridade.
 */
export function reprioritizeChannels(channels: Channel[], cohortsByChannel: Map<string, { acquired: number; returned: number }>, minSample = 5): ChannelRepriorization[] {
  const rates = [...cohortsByChannel.values()].filter((c) => c.acquired >= minSample).map((c) => c.returned / c.acquired);
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  return channels.map((ch) => {
    const c = cohortsByChannel.get(ch.key);
    if (!c || c.acquired < minSample) {
      return { channelKey: ch.key, acquired: c?.acquired ?? 0, returned: c?.returned ?? 0, oldPriority: ch.priority, newPriority: ch.priority, status: "sem_info" as Status, sentence: `${ch.title}: ainda sem clientes suficientes para medir.` };
    }
    const rate = c.returned / c.acquired;
    const up = rate >= avg;
    const np = Math.max(1, Math.min(4, ch.priority + (up ? 1 : -1)));
    return {
      channelKey: ch.key,
      acquired: c.acquired,
      returned: c.returned,
      oldPriority: ch.priority,
      newPriority: np,
      status: (up ? "fato" : "hipotese") as Status,
      sentence: `${ch.title} trouxe${c.acquired === 1 ? "" : "ram"} ${c.acquired} clientes; ${c.returned} já ${c.returned === 1 ? "voltou" : "voltaram"}.`,
    };
  });
}
