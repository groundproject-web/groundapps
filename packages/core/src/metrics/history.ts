import type { Customer, Order } from "../types";

/** Histórico de compras de uma cliente, já ordenado por data. */
export interface CustomerHistory {
  customer: Customer;
  orders: Order[];
  first: Order;
  last: Order;
  totalCents: number;
}

export function buildHistories(customers: Customer[], orders: Order[], asOf?: string): CustomerHistory[] {
  const byCustomer = new Map<string, Order[]>();
  for (const o of orders) {
    if (asOf && o.date > asOf) continue;
    if (!byCustomer.has(o.customerId)) byCustomer.set(o.customerId, []);
    byCustomer.get(o.customerId)!.push(o);
  }
  const out: CustomerHistory[] = [];
  for (const c of customers) {
    const list = byCustomer.get(c.id);
    if (!list || list.length === 0) continue;
    list.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    out.push({
      customer: c,
      orders: list,
      first: list[0],
      last: list[list.length - 1],
      totalCents: list.reduce((s, o) => s + o.totalCents, 0),
    });
  }
  return out;
}

/** IDs dos pedidos que foram a primeira compra de cada cliente. */
export function firstOrderIds(histories: CustomerHistory[]): Set<string> {
  return new Set(histories.map((h) => h.first.id));
}
