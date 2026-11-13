import type { Customer, Order } from "../types";
import { computeSegments } from "./segments";

/**
 * Dinheiro parado: clientes que compraram uma vez e sumiram.
 * receita potencial = sumidas × % × ticket médio da 1ª compra
 */
export interface IdleMoney {
  goneCount: number;
  avgFirstTicketCents: number;
  goneCustomerIds: string[];
}

export function computeIdleMoney(customers: Customer[], orders: Order[], asOf: string): IdleMoney {
  const { segments, histories } = computeSegments(customers, orders, asOf);
  const gone = segments.find((s) => s.key === "sumidos")!;
  const ids = new Set(gone.customerIds);
  const firstTickets = histories.filter((h) => ids.has(h.customer.id)).map((h) => h.first.totalCents);
  const avg = firstTickets.length ? Math.round(firstTickets.reduce((a, b) => a + b, 0) / firstTickets.length) : 0;
  return { goneCount: gone.count, avgFirstTicketCents: avg, goneCustomerIds: gone.customerIds };
}

export interface IdleSimulation {
  percent: number;
  customersBack: number;
  revenueCents: number;
  perMonthCents: number;
  months: number;
}

export function simulateReturn(idle: Pick<IdleMoney, "goneCount" | "avgFirstTicketCents">, percent: number, months = 6): IdleSimulation {
  const p = Math.min(40, Math.max(1, percent));
  const back = Math.round((idle.goneCount * p) / 100);
  const revenue = back * idle.avgFirstTicketCents;
  return { percent: p, customersBack: back, revenueCents: revenue, perMonthCents: Math.round(revenue / months), months };
}

/** % da receita que é alugada (o 1º número do "choque do mês 1"). */
export function dependencyShare(rentedCents: number, totalCents: number): number {
  return totalCents ? rentedCents / totalCents : 0;
}
