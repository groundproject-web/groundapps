import "server-only";
import { dedupe, hash32, parseCsv, enforceMapping, missingRequired, proposeMapping, rowsToOrders, type ColumnMapping, type Customer, type DoubtDecisions, type Order, type RawOrderRow } from "@ground/core";
import type { Queryable } from "./db";
import { getDb } from "./db";
import { decrypt, encrypt, lookupHash } from "./crypto";

/** Grava em lotes (multi-row insert) para bases grandes. */
async function insertMany(t: Queryable, table: string, cols: string[], rows: unknown[][], chunk = 400) {
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const params: unknown[] = [];
    const values = part.map((r) => `(${r.map((v) => (params.push(v), `$${params.length}`)).join(",")})`).join(",");
    await t.query(`insert into ${table} (${cols.join(",")}) values ${values}`, params);
  }
}

export const productId = (name: string) => `p_${hash32(name.toLowerCase()).toString(36)}`;

/** Substitui a base da loja (planilha nova ou seed). Roda como o usuário → RLS confere a organização. */
export async function writeDataset(t: Queryable, orgId: string, customers: Customer[], orders: Order[]) {
  // planilha nova substitui a base inteira (os ids das clientes são estáveis entre importações)
  await t.query("delete from orders where organization_id = $1", [orgId]);
  await t.query("delete from customers where organization_id = $1", [orgId]);
  await t.query("delete from products where organization_id = $1", [orgId]);
  await insertMany(
    t,
    "customers",
    ["organization_id", "id", "name", "email_enc", "phone_enc", "email_hash", "phone_hash"],
    customers.map((c) => [orgId, c.id, c.name, encrypt(c.email), encrypt(c.phone), lookupHash(c.email), lookupHash(c.phone)]),
  );
  const names = [...new Set(orders.flatMap((o) => o.items?.map((i) => i.product) ?? []))];
  const existing = new Set((await t.query<{ id: string }>("select id from products where organization_id = $1", [orgId])).map((r) => r.id));
  await insertMany(t, "products", ["organization_id", "id", "name"], names.filter((n) => !existing.has(productId(n))).map((n) => [orgId, productId(n), n]));
  await insertOrders(t, orgId, orders, false);
}

export async function insertOrders(t: Queryable, orgId: string, orders: Order[], simulated: boolean) {
  await insertMany(
    t,
    "orders",
    ["organization_id", "id", "customer_id", "ordered_at", "total_cents", "coupon", "source_code", "is_simulated"],
    orders.map((o) => [orgId, o.id, o.customerId, o.date, o.totalCents, o.coupon ?? null, o.sourceCode ?? null, simulated]),
  );
  const items = new Map<string, unknown[]>();
  for (const o of orders) for (const it of o.items ?? []) items.set(`${o.id}|${productId(it.product)}`, [orgId, o.id, productId(it.product), it.quantity]);
  await insertMany(t, "order_items", ["organization_id", "order_id", "product_id", "quantity"], [...items.values()]);
}

function iso(d: unknown): string {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
}

export interface LoadedDataset {
  customers: (Customer & { hasPhone: boolean; hasEmail: boolean })[];
  orders: Order[];
}

/** Carrega a base para os cálculos. Nome fica; contato NÃO é decifrado aqui. */
export async function loadDataset(userId: string, orgId: string): Promise<LoadedDataset> {
  const db = await getDb();
  return db.asUser(userId, async (t) => {
    const cs = await t.query<{ id: string; name: string; has_phone: boolean; has_email: boolean }>("select id, name, phone_enc is not null as has_phone, email_enc is not null as has_email from customers where organization_id = $1", [orgId]);
    const os = await t.query<{ id: string; customer_id: string; ordered_at: unknown; total_cents: number; coupon: string | null; source_code: string | null }>("select id, customer_id, ordered_at, total_cents, coupon, source_code from orders where organization_id = $1", [orgId]);
    const its = await t.query<{ order_id: string; name: string; quantity: number }>("select i.order_id, p.name, i.quantity from order_items i join products p on p.organization_id = i.organization_id and p.id = i.product_id where i.organization_id = $1", [orgId]);
    const byOrder = new Map<string, { product: string; quantity: number }[]>();
    for (const i of its) {
      if (!byOrder.has(i.order_id)) byOrder.set(i.order_id, []);
      byOrder.get(i.order_id)!.push({ product: i.name, quantity: i.quantity });
    }
    return {
      customers: cs.map((c) => ({ id: c.id, name: c.name, hasPhone: c.has_phone, hasEmail: c.has_email, phone: c.has_phone ? "•" : null, email: c.has_email ? "•" : null })),
      orders: os.map((o) => ({ id: o.id, customerId: o.customer_id, date: iso(o.ordered_at), totalCents: Number(o.total_cents), coupon: o.coupon, sourceCode: o.source_code, items: byOrder.get(o.id) ?? [] })),
    };
  });
}

/** Contatos decifrados, só para a lista da missão (exportar/copiar). */
export async function loadContacts(userId: string, orgId: string, ids: string[]): Promise<{ id: string; name: string; phone: string | null }[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db.asUser(userId, (t) => t.query<{ id: string; name: string; phone_enc: string | null }>("select id, name, phone_enc from customers where organization_id = $1 and id = any($2)", [orgId, ids]));
  return rows.map((r) => ({ id: r.id, name: r.name, phone: decrypt(r.phone_enc) })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/* ---------------- importação de planilha ---------------- */

export interface StagedImport {
  id: string;
  filename: string | null;
  status: string;
  mapping: ColumnMapping[];
  stats: Record<string, number>;
  doubts: { id: string; reason: string; a: { name: string; orderCount: number; lastDate: string; phoneMasked: string }; b: { name: string; orderCount: number; lastDate: string; phoneMasked: string } }[];
  decisions: DoubtDecisions;
  problems: { line: number; reason: string }[];
  discarded: string[];
}

const mask = (p: string | null) => (p ? `(${p.slice(0, 2)}) ${p.length === 11 ? p.slice(2, 3) + " " : ""}${p.slice(-8, -4)}-${p.slice(-4)}` : "sem telefone");

/** 1ª etapa: lê a planilha, descarta colunas sensíveis e guarda as linhas normalizadas cifradas. */
export async function stageImport(userId: string, orgId: string, filename: string, text: string, aiMapping?: ColumnMapping[]): Promise<{ id: string } | { error: string }> {
  const parsed = parseCsv(text);
  const mapping = enforceMapping(aiMapping ?? proposeMapping(parsed.headers));
  const missing = missingRequired(mapping);
  if (missing.length) return { error: `Não achamos as colunas de: ${missing.join(", ")}. Confira o cabeçalho da planilha.` };
  const { orders: rows, problems } = rowsToOrders(parsed.rows, mapping);
  if (!rows.length) return { error: "Nenhum pedido válido na planilha." };
  const d = dedupe(rows, {});
  const db = await getDb();
  const id = await db.asUser(userId, async (t) => {
    let [src] = await t.query<{ id: string }>("select id from data_sources where organization_id = $1 and kind = 'planilha'", [orgId]);
    if (!src) [src] = await t.query<{ id: string }>("insert into data_sources(organization_id, kind) values ($1, 'planilha') returning id", [orgId]);
    const [imp] = await t.query<{ id: string }>(
      "insert into imports(organization_id, data_source_id, filename, status, mapping, stats, doubts, problems, staged_enc, organization_fee_flag) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id",
      [
        orgId,
        src.id,
        filename,
        d.doubts.length ? "aguardando_confirmacao" : "organizando",
        JSON.stringify(mapping),
        JSON.stringify(d.stats),
        JSON.stringify(d.doubts.map((x) => ({ id: x.id, reason: x.reason, a: { name: x.a.name, orderCount: x.a.orderCount, lastDate: x.a.lastDate, phoneMasked: mask(x.a.phone) }, b: { name: x.b.name, orderCount: x.b.orderCount, lastDate: x.b.lastDate, phoneMasked: mask(x.b.phone) } }))),
        JSON.stringify(problems.slice(0, 50)),
        encrypt(JSON.stringify(rows)),
        rows.length > 50_000 || problems.length > rows.length * 0.2,
      ],
    );
    return imp.id;
  });
  return { id };
}

export async function getImport(userId: string, orgId: string, id: string): Promise<StagedImport | null> {
  const db = await getDb();
  const [r] = await db.asUser(userId, (t) => t.query<StagedImport & { mapping: ColumnMapping[] }>("select id, filename, status, mapping, stats, doubts, decisions, problems from imports where organization_id = $1 and id = $2", [orgId, id]));
  if (!r) return null;
  return { ...r, discarded: r.mapping.filter((m) => m.target === "sensivel" || m.target === "ignorado").map((m) => m.header) };
}

export async function latestImport(userId: string, orgId: string): Promise<StagedImport | null> {
  const db = await getDb();
  const [r] = await db.asUser(userId, (t) => t.query<{ id: string }>("select id from imports where organization_id = $1 order by created_at desc limit 1", [orgId]));
  return r ? getImport(userId, orgId, r.id) : null;
}

export async function decideDoubt(userId: string, orgId: string, importId: string, doubtId: string, decision: "juntar" | "separar" | null) {
  const db = await getDb();
  await db.asUser(userId, async (t) => {
    const [r] = await t.query<{ decisions: DoubtDecisions }>("select decisions from imports where organization_id = $1 and id = $2", [orgId, importId]);
    const next = { ...(r?.decisions ?? {}) };
    if (decision) next[doubtId] = decision;
    else delete next[doubtId];
    await t.query("update imports set decisions = $3 where organization_id = $1 and id = $2", [orgId, importId, JSON.stringify(next)]);
  });
}

/** 2ª etapa: aplica as decisões, grava a base e apaga as linhas cifradas temporárias. */
export async function commitImport(userId: string, orgId: string, importId: string): Promise<{ customers: number; orders: number }> {
  const db = await getDb();
  return db.asUser(userId, async (t) => {
    const [r] = await t.query<{ staged_enc: string | null; decisions: DoubtDecisions }>("select staged_enc, decisions from imports where organization_id = $1 and id = $2", [orgId, importId]);
    if (!r?.staged_enc) throw new Error("Importação já concluída ou inexistente.");
    const rows = JSON.parse(decrypt(r.staged_enc)!) as RawOrderRow[];
    const d = dedupe(rows, r.decisions ?? {});
    await writeDataset(t, orgId, d.customers, d.orders);
    await t.query("update imports set status = 'concluido', stats = $3, staged_enc = null where organization_id = $1 and id = $2", [orgId, importId, JSON.stringify(d.stats)]);
    await t.query("update data_sources set last_sync_at = now() where organization_id = $1 and kind = 'planilha'", [orgId]);
    return { customers: d.customers.length, orders: d.orders.length };
  });
}
