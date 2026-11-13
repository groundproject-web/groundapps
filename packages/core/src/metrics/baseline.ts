import type { Customer, Order, Status } from "../types";
import { daysBetween, lastMonths, mean, median, monthKey } from "../util";
import { buildHistories, firstOrderIds } from "./history";

/**
 * "Seu marco zero": os números principais da base.
 * - alugada = receita de pedidos que foram a PRIMEIRA compra da cliente
 * - construída = receita de pedidos de clientes que VOLTARAM (2º pedido em diante)
 */
export interface MonthlyRevenue {
  month: string; // yyyy-mm
  rentedCents: number;
  builtCents: number;
  totalCents: number;
  builtShare: number; // 0..1
}

export interface BaselineMetrics {
  asOf: string;
  customers: number;
  orders: number;
  firstOrderDate: string | null;
  repeatCustomers: number;
  repurchaseRate: number; // 0..1
  daysToSecondMedian: number | null;
  daysToSecondMean: number | null;
  ltvCents: number;
  totalRevenueCents: number;
  rentedCents: number;
  builtCents: number;
  builtShare: number; // 0..1, no período inteiro
  monthly: MonthlyRevenue[];
  /** Participação construída nos últimos 6 meses (o número que aparece na tela). */
  recentBuiltShare: number;
  status: Status;
}

export function computeBaseline(customers: Customer[], orders: Order[], asOf: string, months = 6): BaselineMetrics {
  const hs = buildHistories(customers, orders, asOf);
  const firsts = firstOrderIds(hs);
  const considered = orders.filter((o) => o.date <= asOf);

  const repeat = hs.filter((h) => h.orders.length >= 2);
  const daysToSecond = repeat.map((h) => daysBetween(h.orders[0].date, h.orders[1].date));
  const total = considered.reduce((s, o) => s + o.totalCents, 0);
  let rented = 0;
  for (const o of considered) if (firsts.has(o.id)) rented += o.totalCents;

  const keys = lastMonths(asOf, months);
  const monthly: MonthlyRevenue[] = keys.map((month) => ({ month, rentedCents: 0, builtCents: 0, totalCents: 0, builtShare: 0 }));
  const byMonth = new Map(monthly.map((m) => [m.month, m]));
  for (const o of considered) {
    const m = byMonth.get(monthKey(o.date));
    if (!m) continue;
    if (firsts.has(o.id)) m.rentedCents += o.totalCents;
    else m.builtCents += o.totalCents;
    m.totalCents += o.totalCents;
  }
  let recentBuilt = 0;
  let recentTotal = 0;
  for (const m of monthly) {
    m.builtShare = m.totalCents ? m.builtCents / m.totalCents : 0;
    recentBuilt += m.builtCents;
    recentTotal += m.totalCents;
  }

  const firstDate = hs.length ? hs.map((h) => h.first.date).sort()[0] : null;
  return {
    asOf,
    customers: hs.length,
    orders: considered.length,
    firstOrderDate: firstDate,
    repeatCustomers: repeat.length,
    repurchaseRate: hs.length ? repeat.length / hs.length : 0,
    daysToSecondMedian: median(daysToSecond),
    daysToSecondMean: mean(daysToSecond),
    ltvCents: hs.length ? Math.round(total / hs.length) : 0,
    totalRevenueCents: total,
    rentedCents: rented,
    builtCents: total - rented,
    builtShare: total ? (total - rented) / total : 0,
    monthly,
    recentBuiltShare: recentTotal ? recentBuilt / recentTotal : 0,
    status: hs.length ? "fato" : "sem_info",
  };
}
