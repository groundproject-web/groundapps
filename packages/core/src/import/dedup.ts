import type { Customer, Order } from "../types";
import { hash32 } from "../util";
import { nameKey, type RawOrderRow } from "./normalize";

/**
 * Junção de cadastros repetidos.
 * - Automática: quando batem e-mail E telefone.
 * - Em dúvida (o lojista confirma): mesmo telefone com nome/e-mail diferente,
 *   ou mesmo e-mail com telefone diferente.
 */
export interface Registration {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  orderCount: number;
  lastDate: string;
}

export interface DoubtPair {
  id: string;
  reason: "mesmo_telefone" | "mesmo_email";
  a: Registration;
  b: Registration;
}

export type DoubtDecisions = Record<string, "juntar" | "separar">;

export interface DedupResult {
  customers: Customer[];
  orders: Order[];
  doubts: DoubtPair[];
  stats: {
    ordersRead: number;
    registrations: number;
    autoMerged: number;
    uniqueCustomers: number;
    pendingDoubts: number;
  };
}

class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p === x) return x;
    const r = this.find(p);
    this.parent.set(x, r);
    return r;
  }
  union(a: string, b: string): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    // raiz determinística: a menor chave
    if (ra < rb) this.parent.set(rb, ra);
    else this.parent.set(ra, rb);
    return true;
  }
}

const regKey = (r: Pick<RawOrderRow, "name" | "email" | "phone">) => `${nameKey(r.name)}|${r.email ?? ""}|${r.phone ?? ""}`;

export function doubtId(a: string, b: string): string {
  return "d_" + hash32([a, b].sort().join("~")).toString(36);
}

export function dedupe(rows: RawOrderRow[], decisions: DoubtDecisions = {}, idPrefix = "c"): DedupResult {
  const regs = new Map<string, Registration>();
  for (const r of rows) {
    const key = regKey(r);
    const cur = regs.get(key);
    if (cur) {
      cur.orderCount++;
      if (r.date > cur.lastDate) cur.lastDate = r.date;
    } else regs.set(key, { key, name: r.name, email: r.email, phone: r.phone, orderCount: 1, lastDate: r.date });
  }

  const uf = new UnionFind();
  const regList = [...regs.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  regList.forEach((r) => uf.find(r.key));

  // 1) junção automática: e-mail E telefone
  const byBoth = new Map<string, string>();
  let autoMerged = 0;
  for (const r of regList) {
    if (!r.email || !r.phone) continue;
    const k = `${r.email}|${r.phone}`;
    const prev = byBoth.get(k);
    if (prev) {
      if (uf.union(prev, r.key)) autoMerged++;
    } else byBoth.set(k, r.key);
  }

  // 2) pares em dúvida, entre grupos já formados
  const doubts: DoubtPair[] = [];
  const seenPairs = new Set<string>();
  const indexBy = (field: "phone" | "email") => {
    const m = new Map<string, Registration[]>();
    for (const r of regList) {
      const v = r[field];
      if (!v) continue;
      if (!m.has(v)) m.set(v, []);
      m.get(v)!.push(r);
    }
    return m;
  };
  for (const [field, reason] of [
    ["phone", "mesmo_telefone"],
    ["email", "mesmo_email"],
  ] as const) {
    for (const list of indexBy(field).values()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          if (uf.find(a.key) === uf.find(b.key)) continue;
          const id = doubtId(uf.find(a.key), uf.find(b.key));
          if (seenPairs.has(id)) continue;
          seenPairs.add(id);
          doubts.push({ id, reason, a, b });
        }
      }
    }
  }
  let pending = 0;
  for (const d of doubts) {
    const decision = decisions[d.id];
    if (decision === "juntar") uf.union(d.a.key, d.b.key);
    else if (decision === undefined) pending++;
  }

  // 3) monta clientes e pedidos
  const groupRegs = new Map<string, Registration[]>();
  for (const r of regList) {
    const root = uf.find(r.key);
    if (!groupRegs.has(root)) groupRegs.set(root, []);
    groupRegs.get(root)!.push(r);
  }
  const customerIdByRoot = new Map<string, string>();
  const customers: Customer[] = [];
  for (const [root, list] of groupRegs) {
    const id = `${idPrefix}_${hash32(root).toString(36)}`;
    customerIdByRoot.set(root, id);
    // o nome mais completo e mais recente vence
    const best = [...list].sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.name.length - a.name.length)[0];
    customers.push({
      id,
      name: best.name,
      email: list.find((r) => r.email)?.email ?? null,
      phone: list.find((r) => r.phone)?.phone ?? null,
    });
  }
  const orders: Order[] = rows.map((r, i) => ({
    id: r.orderRef ? `o_${r.orderRef}_${i}` : `o_${r.line}`,
    customerId: customerIdByRoot.get(uf.find(regKey(r)))!,
    date: r.date,
    totalCents: r.totalCents,
    items: r.products.map((product) => ({ product, quantity: 1 })),
    coupon: r.coupon,
    sourceCode: r.sourceCode,
  }));

  return {
    customers,
    orders,
    doubts,
    stats: {
      ordersRead: rows.length,
      registrations: regList.length,
      autoMerged,
      uniqueCustomers: customers.length,
      pendingDoubts: pending,
    },
  };
}
