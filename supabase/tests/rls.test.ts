import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "../../apps/web/lib/db/pglite";
import { migrate } from "../../apps/web/lib/db/migrate";
import type { Db } from "../../apps/web/lib/db/types";

/**
 * Testes de RLS: uma organização nunca vê evento, cliente ou código de outra;
 * desligar uma assinatura esconde os dados do módulo na hora, sem perder o histórico.
 */
const A_USER = "00000000-0000-0000-0000-00000000000a";
const B_USER = "00000000-0000-0000-0000-00000000000b";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";
let db: Db;
let orgA: string;
let orgB: string;

beforeAll(async () => {
  db = createPgliteDb();
  await migrate(db, { includeLocalShim: true });
  await db.service(async (t) => {
    for (const [id, email] of [
      [A_USER, "a@example.com"],
      [B_USER, "b@example.com"],
      [ADMIN, "socio@example.com"],
    ])
      await t.query("insert into auth.users(id, email) values ($1, $2)", [id, email]);
    orgA = (await t.query<{ id: string }>("insert into organizations(name, slug) values ('Loja A', 'loja-a') returning id"))[0].id;
    orgB = (await t.query<{ id: string }>("insert into organizations(name, slug) values ('Loja B', 'loja-b') returning id"))[0].id;
    await t.query("insert into memberships(organization_id, user_id) values ($1, $2), ($3, $4)", [orgA, A_USER, orgB, B_USER]);
    await t.query("insert into platform_admins(user_id) values ($1)", [ADMIN]);
    for (const org of [orgA, orgB]) {
      await t.query("insert into entitlements(organization_id, module, plan) values ($1, 'marco_zero', 'MZ2'), ($1, 'sketch', 'completo')", [org]);
      await t.query("insert into customers(organization_id, id, name) values ($1, 'c1', 'Cliente')", [org]);
      await t.query("insert into orders(organization_id, id, customer_id, ordered_at, total_cents) values ($1, 'o1', 'c1', '2026-11-01', 15000)", [org]);
      await t.query("insert into domain_events(id, organization_id, type, idempotency_key, payload) values ($1, $2, 'sketch.acquisition_source.created', 'k1', '{}')", [`ev-${org}`, org]);
      await t.query("insert into origin_codes(organization_id, code, channel_key, utm_url) values ($1, 'SK-CLUBES-0001', 'clubes', 'https://example.com')", [org]);
      await t.query("insert into sketch_profiles(organization_id, path, data) values ($1, 2, '{}')", [org]);
      await t.query("insert into mz_missions(organization_id, week_start, plan) values ($1, '2026-11-16', '{}')", [org]);
      await t.query("insert into order_source_attributions(organization_id, order_id, source_code) values ($1, 'o1', 'SK-CLUBES-0001')", [org]);
      await t.query("insert into ai_usage(organization_id, feature, prompt_version, model) values ($1, 'missao', 'v1', 'offline')", [org]);
    }
  });
});

const count = (user: string, table: string) => db.asUser(user, async (t) => Number((await t.query<{ n: string }>(`select count(*)::int as n from ${table}`))[0].n));

describe("isolamento entre organizações", () => {
  it.each(["organizations", "customers", "orders", "domain_events", "origin_codes", "sketch_profiles", "mz_missions", "order_source_attributions", "entitlements"])("%s: cada loja vê só a sua", async (table) => {
    const perOrg = table === "entitlements" ? 2 : 1;
    expect(await count(A_USER, table)).toBe(perOrg);
    expect(await count(B_USER, table)).toBe(perOrg);
    const ids = await db.asUser(A_USER, (t) => t.query<{ org: string }>(`select ${table === "organizations" ? "id" : "organization_id"} as org from ${table}`));
    expect(ids.every((r) => r.org === orgA)).toBe(true);
  });

  it("não consegue gravar cliente em outra loja", async () => {
    await expect(db.asUser(A_USER, (t) => t.query("insert into customers(organization_id, id, name) values ($1, 'x', 'Intrusa')", [orgB]))).rejects.toThrow();
  });

  it("não consegue publicar evento direto (só o servidor publica)", async () => {
    await expect(db.asUser(A_USER, (t) => t.query("insert into domain_events(id, organization_id, type, idempotency_key, payload) values ('ev-x', $1, 't', 'k', '{}')", [orgA]))).rejects.toThrow();
  });

  it("não consegue mudar o próprio plano", async () => {
    const r = await db.asUser(A_USER, (t) => t.query("update entitlements set plan = 'MZ4' where organization_id = $1 returning plan", [orgA]));
    expect(r).toHaveLength(0);
  });

  it("custo de IA: só a Ground vê", async () => {
    expect(await count(A_USER, "ai_usage")).toBe(0);
    expect(await count(ADMIN, "ai_usage")).toBe(2);
  });

  it("regras de preço: todos leem, só a Ground altera", async () => {
    await expect(db.asUser(A_USER, (t) => t.query("insert into pricing_rules(version, effective_from, rules) values (99, '2026-01-01', '{}')"))).rejects.toThrow();
    await db.asUser(ADMIN, (t) => t.query("insert into pricing_rules(version, effective_from, rules) values (99, '2026-01-01', '{}')"));
    expect(await count(A_USER, "pricing_rules")).toBe(1);
  });
});

describe("assinatura desligada esconde o módulo na hora, sem perder o histórico", () => {
  it("cancelar o Sketch esconde perfil, códigos e atribuições", async () => {
    await db.service((t) => t.query("update entitlements set status = 'cancelado' where organization_id = $1 and module = 'sketch'", [orgA]));
    expect(await count(A_USER, "sketch_profiles")).toBe(0);
    expect(await count(A_USER, "origin_codes")).toBe(0);
    expect(await count(A_USER, "order_source_attributions")).toBe(0);
    expect(await count(A_USER, "mz_missions")).toBe(1); // Marco Zero segue inteiro
    // histórico preservado
    const kept = await db.service((t) => t.query<{ n: number }>("select count(*)::int as n from sketch_profiles where organization_id = $1", [orgA]));
    expect(Number(kept[0].n)).toBe(1);
    // religar devolve tudo
    await db.service((t) => t.query("update entitlements set status = 'ativo' where organization_id = $1 and module = 'sketch'", [orgA]));
    expect(await count(A_USER, "sketch_profiles")).toBe(1);
  });

  it("cancelar o Marco Zero esconde missões, mas não o Sketch", async () => {
    await db.service((t) => t.query("update entitlements set status = 'cancelado' where organization_id = $1 and module = 'marco_zero'", [orgA]));
    expect(await count(A_USER, "mz_missions")).toBe(0);
    expect(await count(A_USER, "sketch_profiles")).toBe(1);
    await db.service((t) => t.query("update entitlements set status = 'ativo' where organization_id = $1 and module = 'marco_zero'", [orgA]));
  });
});

describe("idempotência no banco", () => {
  it("o mesmo evento não entra duas vezes", async () => {
    await expect(db.service((t) => t.query("insert into domain_events(id, organization_id, type, idempotency_key, payload) values ('ev-dup', $1, 'sketch.acquisition_source.created', 'k1', '{}')", [orgA]))).rejects.toThrow();
  });
  it("um pedido é atribuído uma vez só", async () => {
    await expect(db.service((t) => t.query("insert into order_source_attributions(organization_id, order_id, source_code) values ($1, 'o1', 'SK-OUTRO')", [orgA]))).rejects.toThrow();
  });
});
