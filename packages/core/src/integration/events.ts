import { z } from "zod";
import { hash32 } from "../util";

/**
 * Contratos de eventos internos (docs/Integracao.md, seção 2).
 * Um módulo publica em `domain_events`; o outro consome de forma idempotente.
 * Nenhum módulo lê as tabelas internas do outro.
 * Eventos NUNCA carregam nome, e-mail ou telefone de cliente — só IDs e agregados.
 */
export const EventPayloads = {
  "mz.loyal_segment.updated": z.object({
    loyalIds: z.array(z.string()),
    atRiskIds: z.array(z.string()),
    counts: z.object({ loyal: z.number(), atRisk: z.number() }),
    topProducts: z.array(z.string()),
    productCycles: z.array(z.object({ product: z.string(), medianDays: z.number() })),
  }),
  "mz.customer_voice.classified": z.object({
    week: z.string(),
    categories: z.array(z.object({ category: z.string(), label: z.string(), count: z.number(), excerpts: z.array(z.string()) })),
  }),
  "sketch.acquisition_source.created": z.object({
    code: z.string(),
    channelKey: z.string(),
    missionKey: z.string().optional(),
    message: z.string().optional(),
  }),
  "core.order.attributed_source": z.object({ orderId: z.string(), customerId: z.string(), code: z.string() }),
  "mz.cohort_repurchase.by_source": z.object({
    month: z.string(),
    cohorts: z.array(z.object({ code: z.string(), acquired: z.number(), rate60: z.number().nullable(), rate90: z.number().nullable(), partialLtvCents: z.number() })),
  }),
  "sketch.persona.updated": z.object({ profile: z.string(), keyPhrases: z.array(z.string()), emptySpace: z.string().nullable() }),
  "any.structural_signal": z.object({ type: z.string(), weeks: z.array(z.string()), evidence: z.array(z.string()), module: z.enum(["marco_zero", "sketch"]) }),
} as const;

export type EventType = keyof typeof EventPayloads;
export type EventPayload<T extends EventType> = z.infer<(typeof EventPayloads)[T]>;

export interface DomainEvent<T extends EventType = EventType> {
  id: string;
  orgId: string;
  type: T;
  /** chave de idempotência: o mesmo fato gera a mesma chave */
  idempotencyKey: string;
  payload: EventPayload<T>;
  createdAt: string;
}

export function makeEvent<T extends EventType>(orgId: string, type: T, payload: EventPayload<T>, idempotencyKey: string, createdAt = new Date().toISOString()): DomainEvent<T> {
  const parsed = EventPayloads[type].parse(payload) as EventPayload<T>;
  assertNoPersonalData(parsed);
  return { id: `ev_${hash32(`${orgId}|${type}|${idempotencyKey}`).toString(36)}`, orgId, type, idempotencyKey, payload: parsed, createdAt };
}

/** Garante que nenhum evento carregue e-mail ou telefone. */
export function assertNoPersonalData(payload: unknown): void {
  const s = JSON.stringify(payload);
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(s)) throw new Error("Evento com e-mail de cliente");
  if (/\b\d{10,13}\b/.test(s)) throw new Error("Evento com telefone de cliente");
}

/**
 * Consumidor idempotente genérico (puro): processa cada evento uma vez por consumidor.
 * No banco, a garantia é a unique (consumer, event_id) em `event_consumptions`.
 */
export function consumeOnce<S>(state: S, processed: Set<string>, consumer: string, events: DomainEvent[], handler: (s: S, e: DomainEvent) => S): { state: S; processed: Set<string>; applied: number } {
  let s = state;
  const done = new Set(processed);
  let applied = 0;
  for (const e of events) {
    const k = `${consumer}:${e.id}`;
    if (done.has(k)) continue;
    s = handler(s, e);
    done.add(k);
    applied++;
  }
  return { state: s, processed: done, applied };
}

/** Atribuição de origem: um pedido é atribuído UMA vez só (a primeira atribuição vence). */
export function attributeOnce(existing: Map<string, string>, orderId: string, code: string): { map: Map<string, string>; created: boolean } {
  if (existing.has(orderId)) return { map: existing, created: false };
  const m = new Map(existing);
  m.set(orderId, code);
  return { map: m, created: true };
}
