import "server-only";
import {
  addDays,
  canShow,
  findEmptySpace,
  makeOriginCode,
  repurchaseBySource,
  reprioritizeChannels,
  shouldSuggestMarcoZero,
  type Channel,
  type Persona,
  type SketchMission,
  type SuggestionKey,
  type SuggestionMemory,
  type TerrainMatrix,
  type TrafficTest,
  type Order,
} from "@ground/core";
import type { ChatSeedMessage } from "@ground/core/seeds";
import { getDb, type Queryable } from "./db";
import { publish } from "./events";
import { insertOrders } from "./store";
import type { OrgContext } from "./orgs";

export interface SketchData {
  path: 1 | 2;
  segment: string;
  storeUrl: string;
  intro: { label: string; title: string; subtitle: string };
  baseCard: { status: "fato" | "sem_info"; title: string; text: string; count?: number };
  importedFromMz?: { loyal: number; atRisk: number; total: number };
  persona: Persona | null;
  readLabel: string;
  matrix: TerrainMatrix | null;
  emptySpace: { title: string; text: string } | null;
  hypothesis: { title: string; text: string } | null;
  terrainTitle: string;
  channelsTitle: string;
  channels: Channel[];
  traffic: TrafficTest;
  signals: { label: string; value: number; measured: boolean }[];
  later?: { withContact: number; repeatBuyers: number; daysToSecond: number };
  planMonth: string;
}

export interface OriginCodeRow {
  code: string;
  channel_key: string;
  mission_key: string | null;
  utm_url: string;
}

const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

export async function loadSketch(ctx: OrgContext) {
  const db = await getDb();
  return db.asUser(ctx.session.userId, async (t) => {
    const [p] = await t.query<{ path: 1 | 2; data: SketchData; research_read_at: unknown }>("select path, data, research_read_at from sketch_profiles where organization_id = $1", [ctx.org.id]);
    const msgs = await t.query<{ id: string; sender: "app" | "lojista"; kind: ChatSeedMessage["kind"]; content: Omit<ChatSeedMessage, "from" | "kind"> }>("select id::text, sender, kind, content from sketch_messages where organization_id = $1 order by id", [ctx.org.id]);
    const missions = await t.query<{ key: string; week: number; data: SketchMission; done: boolean }>("select key, week, data, done from sketch_missions where organization_id = $1 order by week, key", [ctx.org.id]);
    const codes = await t.query<OriginCodeRow>("select code, channel_key, mission_key, utm_url from origin_codes where organization_id = $1 order by channel_key, mission_key nulls first", [ctx.org.id]);
    const checkins = await t.query<{ week: unknown; answers: SketchCheckin }>("select week, answers from sketch_checkins where organization_id = $1 order by week desc", [ctx.org.id]);
    const sourceCount = Number((await t.query<{ n: number }>("select count(*)::int as n from sketch_sources where organization_id = $1", [ctx.org.id]))[0].n);
    const mem = await t.query<{ key: SuggestionKey; shown_at: unknown; dismissed_at: unknown; accepted_at: unknown }>("select key, shown_at, dismissed_at, accepted_at from suggestion_memory where organization_id = $1", [ctx.org.id]);
    return {
      profile: p ? { ...p, research_read_at: p.research_read_at ? iso(p.research_read_at) : null } : null,
      messages: msgs.map((m) => ({ id: m.id, from: m.sender, kind: m.kind, ...m.content })),
      missions: missions.map((m) => ({ ...m.data, done: m.done })),
      codes,
      checkins: checkins.map((c) => ({ week: iso(c.week), answers: c.answers })),
      sourceCount,
      memory: new Map(mem.map((m) => [m.key, { key: m.key, shownAt: m.shown_at ? iso(m.shown_at) : undefined, dismissedAt: m.dismissed_at ? iso(m.dismissed_at) : undefined, acceptedAt: m.accepted_at ? iso(m.accepted_at) : undefined } as SuggestionMemory])),
    };
  });
}

export interface SketchCheckin {
  did: "todas" | "parte" | "nenhuma";
  happened: string;
  reportedNewSales?: number;
}

export function gapColumn(d: SketchData): number | null {
  if (!d.matrix || !d.persona) return null;
  return findEmptySpace(d.matrix, [d.persona.pain, d.persona.desire, d.persona.motive, ...d.persona.expressions.map((e) => e.text)]);
}

/** Gera (uma vez) os códigos de origem de cada canal e missão e publica o evento para o Marco Zero. */
export async function ensureOriginCodes(t: Queryable, orgId: string, storeUrl: string, channels: Channel[], missions: SketchMission[]) {
  const all = [...channels.map((c) => ({ channelKey: c.key, missionKey: undefined as string | undefined })), ...missions.filter((m) => m.channelKey).map((m) => ({ channelKey: m.channelKey!, missionKey: m.key }))];
  for (const a of all) {
    const oc = makeOriginCode({ orgId, storeUrl, channelKey: a.channelKey, missionKey: a.missionKey });
    const r = await t.query("insert into origin_codes(organization_id, code, channel_key, mission_key, utm_url) values ($1,$2,$3,$4,$5) on conflict do nothing returning code", [orgId, oc.code, oc.channelKey, a.missionKey ?? null, oc.utmUrl]);
    if (r.length) await publish(t, orgId, "sketch.acquisition_source.created", { code: oc.code, channelKey: oc.channelKey, missionKey: a.missionKey }, oc.code);
  }
}

export async function toggleChannel(ctx: OrgContext, key: string) {
  const db = await getDb();
  await db.asUser(ctx.session.userId, async (t) => {
    const [p] = await t.query<{ data: SketchData }>("select data from sketch_profiles where organization_id = $1", [ctx.org.id]);
    if (!p) return;
    p.data.channels = p.data.channels.map((c) => (c.key === key ? { ...c, inPlan: !c.inPlan } : c));
    await t.query("update sketch_profiles set data = $2, updated_at = now() where organization_id = $1", [ctx.org.id, JSON.stringify(p.data)]);
  });
}

export async function toggleSketchMission(ctx: OrgContext, key: string) {
  const db = await getDb();
  await db.asUser(ctx.session.userId, (t) => t.query("update sketch_missions set done = not done, done_at = case when done then null else now() end where organization_id = $1 and key = $2", [ctx.org.id, key]));
}

export async function addSketchMessage(ctx: OrgContext, sender: "app" | "lojista", kind: "texto" | "audio" | "imagem", content: Record<string, unknown>) {
  const db = await getDb();
  await db.asUser(ctx.session.userId, (t) => t.query("insert into sketch_messages(organization_id, sender, kind, content) values ($1,$2,$3,$4)", [ctx.org.id, sender, kind, JSON.stringify(content)]));
}

export async function addSource(ctx: OrgContext, id: string, kind: string, text: string, url: string | null) {
  const db = await getDb();
  await db.asUser(ctx.session.userId, (t) => t.query("insert into sketch_sources(organization_id, id, kind, url, text, collected_at) values ($1,$2,$3,$4,$5, now()) on conflict do nothing", [ctx.org.id, id, kind, url, text.slice(0, 2000)]));
}

export async function saveSketchCheckin(ctx: OrgContext, week: string, answers: SketchCheckin) {
  const db = await getDb();
  await db.asUser(ctx.session.userId, (t) => t.query("insert into sketch_checkins(organization_id, week, answers) values ($1,$2,$3) on conflict (organization_id, week) do update set answers = excluded.answers", [ctx.org.id, week, JSON.stringify(answers)]));
}

export async function markSuggestion(ctx: OrgContext, key: SuggestionKey, action: "shown" | "dismissed" | "accepted") {
  const db = await getDb();
  const col = action === "shown" ? "shown_at" : action === "dismissed" ? "dismissed_at" : "accepted_at";
  await db.asUser(ctx.session.userId, (t) => t.query(`insert into suggestion_memory(organization_id, key, ${col}) values ($1,$2,$3) on conflict (organization_id, key) do update set ${col} = excluded.${col}`, [ctx.org.id, key, ctx.today]));
}

export function suggestionVisible(mem: Map<SuggestionKey, SuggestionMemory>, key: SuggestionKey, today: string) {
  return canShow(key, mem.get(key), today);
}

/**
 * Recompra por canal de origem: só com os dois módulos (integração). Lê os pedidos (core)
 * e os códigos (Sketch); devolve o que o Marco Zero diz ao Sketch sobre quem volta.
 */
export async function channelRepurchase(ctx: OrgContext, channels: Channel[]) {
  if (!ctx.integrated) return null;
  const db = await getDb();
  return db.asUser(ctx.session.userId, async (t) => {
    const codes = await t.query<OriginCodeRow>("select code, channel_key from origin_codes where organization_id = $1", [ctx.org.id]);
    if (!codes.length) return null;
    const channelOf = new Map(codes.map((c) => [c.code, c.channel_key]));
    const os = await t.query<{ id: string; customer_id: string; ordered_at: unknown; total_cents: number; source_code: string | null }>("select id, customer_id, ordered_at, total_cents, source_code from orders where organization_id = $1 and customer_id in (select customer_id from orders where organization_id = $1 and source_code = any($2))", [ctx.org.id, codes.map((c) => c.code)]);
    const orders: Order[] = os.map((o) => ({ id: o.id, customerId: o.customer_id, date: iso(o.ordered_at), totalCents: Number(o.total_cents), sourceCode: o.source_code }));
    const customers = [...new Set(orders.map((o) => o.customerId))].map((id) => ({ id, name: id }));
    const cohorts = repurchaseBySource(customers, orders, ctx.today);
    const byChannel = new Map<string, { acquired: number; returned: number }>();
    for (const c of cohorts) {
      const ch = channelOf.get(c.sourceCode);
      if (!ch) continue;
      const cur = byChannel.get(ch) ?? { acquired: 0, returned: 0 };
      byChannel.set(ch, { acquired: cur.acquired + c.acquired, returned: cur.returned + c.returned });
    }
    const total = [...byChannel.values()].reduce((a, b) => ({ acquired: a.acquired + b.acquired, returned: a.returned + b.returned }), { acquired: 0, returned: 0 });
    return { rows: reprioritizeChannels(channels, byChannel), total, cohorts };
  });
}

/** Vendas novas medidas por código de origem no mês (com a loja conectada). */
export async function measuredNewSales(ctx: OrgContext, since: string) {
  const db = await getDb();
  return db.asUser(ctx.session.userId, async (t) => {
    const codes = await t.query<{ code: string }>("select code from origin_codes where organization_id = $1", [ctx.org.id]).catch(() => []);
    if (!codes.length) return null;
    const r = await t.query<{ n: number }>(
      `select count(*)::int as n from orders o where o.organization_id = $1 and o.source_code = any($2) and o.ordered_at >= $3
       and not exists (select 1 from orders p where p.organization_id = o.organization_id and p.customer_id = o.customer_id and (p.ordered_at < o.ordered_at or (p.ordered_at = o.ordered_at and p.id < o.id)))`,
      [ctx.org.id, codes.map((c) => c.code), since],
    );
    return Number(r[0].n);
  });
}

/**
 * Staging/demo: simula um mês de Sketch na loja da Carla — 23 clientes vindas dos clubes (9 voltaram)
 * e 12 das nutricionistas (1 voltou), com código de origem. Serve para ver a integração funcionando.
 */
export async function simulateSketchMonth(ctx: OrgContext) {
  const db = await getDb();
  const attributed = await db.asUser(ctx.session.userId, async (t) => {
    const codes = await t.query<OriginCodeRow>("select code, channel_key, mission_key from origin_codes where organization_id = $1 and mission_key is null", [ctx.org.id]);
    const code = (ch: string) => codes.find((c) => c.channel_key === ch)?.code;
    const plan: [string, number, number][] = [
      ["clubes", 23, 9],
      ["nutris", 12, 1],
    ];
    const orders: Order[] = [];
    for (const [ch, n, back] of plan) {
      const c = code(ch);
      if (!c) continue;
      for (let i = 0; i < n; i++) {
        const id = `sk_${ch}_${i}`;
        await t.query("insert into customers(organization_id, id, name) values ($1,$2,$3) on conflict do nothing", [ctx.org.id, id, `Cliente nova ${ch} ${i + 1}`]);
        const first = addDays(ctx.today, -88 + (i % 20));
        orders.push({ id: `${id}_1`, customerId: id, date: first, totalCents: 14900, sourceCode: c, items: [{ product: "Whey Fôlego 900g", quantity: 1 }] });
        if (i < back) orders.push({ id: `${id}_2`, customerId: id, date: addDays(first, 44), totalCents: 14900, items: [{ product: "Whey Fôlego 900g", quantity: 1 }] });
      }
    }
    await t.query("delete from orders where organization_id = $1 and id like 'sk\\_%'", [ctx.org.id]);
    await insertOrders(t, ctx.org.id, orders, true);
    const out: Order[] = [];
    for (const o of orders) {
      if (!o.sourceCode) continue;
      // um pedido é atribuído uma vez só
      const r = await t.query("insert into order_source_attributions(organization_id, order_id, source_code) values ($1,$2,$3) on conflict do nothing returning order_id", [ctx.org.id, o.id, o.sourceCode]);
      if (r.length) out.push(o);
    }
    return out;
  });
  await db.service(async (t) => {
    for (const o of attributed) await publish(t, ctx.org.id, "core.order.attributed_source", { orderId: o.id, customerId: o.customerId, code: o.sourceCode! }, o.id);
  });
}

export function suggestMzFromLater(d: SketchData) {
  return d.later ? shouldSuggestMarcoZero({ withContact: d.later.withContact, repeatBuyers: d.later.repeatBuyers }) : false;
}
