import type { Customer, Order } from "../types";
import { daysBetween, median } from "../util";
import { buildHistories } from "./history";

/**
 * Ciclo de recompra por produto: o intervalo típico (mediana) entre duas compras
 * do mesmo produto pela mesma cliente. Ex.: whey 900 g ≈ 40 a 50 dias.
 */
export interface ProductCycle {
  product: string;
  intervals: number;
  medianDays: number;
  p25Days: number;
  p75Days: number;
  buyers: number;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function computeProductCycles(customers: Customer[], orders: Order[], asOf: string, minIntervals = 10): ProductCycle[] {
  const hs = buildHistories(customers, orders, asOf);
  const intervals = new Map<string, number[]>();
  const buyers = new Map<string, Set<string>>();
  for (const h of hs) {
    const lastByProduct = new Map<string, string>();
    for (const o of h.orders) {
      for (const it of o.items ?? []) {
        if (!buyers.has(it.product)) buyers.set(it.product, new Set());
        buyers.get(it.product)!.add(h.customer.id);
        const prev = lastByProduct.get(it.product);
        if (prev && prev !== o.date) {
          if (!intervals.has(it.product)) intervals.set(it.product, []);
          intervals.get(it.product)!.push(daysBetween(prev, o.date));
        }
        lastByProduct.set(it.product, o.date);
      }
    }
  }
  const out: ProductCycle[] = [];
  for (const [product, list] of intervals) {
    if (list.length < minIntervals) continue;
    const s = [...list].sort((a, b) => a - b);
    out.push({
      product,
      intervals: list.length,
      medianDays: Math.round(median(s)!),
      p25Days: Math.round(quantile(s, 0.25)),
      p75Days: Math.round(quantile(s, 0.75)),
      buyers: buyers.get(product)?.size ?? 0,
    });
  }
  return out.sort((a, b) => b.intervals - a.intervals);
}

/**
 * Clientes no ponto do ciclo: a última compra do produto caiu entre p25 e p75 dias atrás
 * e ela não comprou nada depois disso.
 */
export function customersDueForProduct(customers: Customer[], orders: Order[], asOf: string, cycle: ProductCycle): { customerId: string; lastProductDate: string }[] {
  const hs = buildHistories(customers, orders, asOf);
  const out: { customerId: string; lastProductDate: string }[] = [];
  for (const h of hs) {
    let lastProduct: string | null = null;
    for (const o of h.orders) if (o.items?.some((i) => i.product === cycle.product)) lastProduct = o.date;
    if (!lastProduct || h.last.date !== lastProduct) continue;
    const since = daysBetween(lastProduct, asOf);
    if (since >= cycle.p25Days && since <= cycle.p75Days) out.push({ customerId: h.customer.id, lastProductDate: lastProduct });
  }
  return out;
}
