import "server-only";
import { makeEvent, type EventPayload, type EventType } from "@ground/core";
import type { Queryable } from "./db";

/**
 * Publica um evento interno (domain_events). Idempotente: o mesmo fato (chave) não entra duas vezes.
 * Roda no contexto de serviço: o lojista não publica evento direto (RLS).
 */
export async function publish<T extends EventType>(t: Queryable, orgId: string, type: T, payload: EventPayload<T>, key: string): Promise<boolean> {
  const e = makeEvent(orgId, type, payload, key);
  const r = await t.query("insert into domain_events(id, organization_id, type, idempotency_key, payload) values ($1,$2,$3,$4,$5) on conflict do nothing returning id", [e.id, orgId, type, key, JSON.stringify(e.payload)]);
  return r.length > 0;
}

/**
 * Consome os eventos pendentes de um consumidor, uma vez cada (event_consumptions).
 * Cada handler roda na mesma transação do registro de consumo.
 */
export async function consume(t: Queryable, orgId: string, consumer: string, types: EventType[], handler: (type: EventType, payload: unknown, id: string) => Promise<void>): Promise<number> {
  const pending = await t.query<{ id: string; type: EventType; payload: unknown }>(
    `select e.id, e.type, e.payload from domain_events e
     where e.organization_id = $1 and e.type = any($2)
       and not exists (select 1 from event_consumptions c where c.consumer = $3 and c.event_id = e.id)
     order by e.created_at`,
    [orgId, types, consumer],
  );
  let n = 0;
  for (const e of pending) {
    const claimed = await t.query("insert into event_consumptions(consumer, event_id, organization_id) values ($1,$2,$3) on conflict do nothing returning event_id", [consumer, e.id, orgId]);
    if (!claimed.length) continue;
    await handler(e.type, e.payload, e.id);
    n++;
  }
  return n;
}
