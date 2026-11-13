import type { Order, Status } from "../types";
import { addDays } from "../util";

/**
 * Resultado de uma missão do Marco Zero.
 * Um pedido conta para a missão quando é de uma cliente que recebeu a mensagem
 * e cai dentro da janela de atribuição (padrão 7 dias depois do envio).
 */
export type SendStatus = "todas" | "parte" | "nenhuma";

export const MIN_VALID_CONTROL = 20;

export interface AttributionInput {
  sentAt: string; // yyyy-mm-dd
  windowDays: number;
  sendStatus: SendStatus;
  /** Lista da missão sem o grupo de comparação */
  targets: string[];
  /** Grupo de comparação sorteado */
  control: string[];
  /** Quando "parte": quem efetivamente recebeu. Se só o número for conhecido, use `sentCount`. */
  recipients?: string[];
  sentCount?: number;
  orders: Order[];
  /** Taxa de clientes parecidas sem contato no período anterior (fallback de comparação) */
  fallbackBaselineRate: number;
  segmentOf?: (customerId: string) => string | null;
  estimate?: { orders: number; revenueCents: number };
}

export interface GroupBreakdown {
  segment: string;
  sent: number;
  returned: number;
  rate: number;
}

export interface MissionResult {
  sendStatus: SendStatus;
  sent: number;
  returned: number;
  revenueCents: number;
  rate: number;
  comparison: {
    kind: "grupo_de_comparacao" | "controle_e_nao_enviadas" | "clientes_parecidas";
    size: number;
    returned: number;
    rate: number;
    weak: boolean;
  };
  extraOrders: number;
  extraRevenueCents: number;
  /** Quando nada foi enviado: quantas voltaram sozinhas (vira a régua das próximas) */
  cameBackAlone?: { count: number; of: number; rate: number };
  effectStatus: Status;
  byGroup: GroupBreakdown[];
  attributedOrderIds: string[];
  estimate?: { orders: number; revenueCents: number };
  window: { from: string; to: string };
}

function returnedSet(ids: string[], orders: Order[], from: string, to: string) {
  const set = new Set(ids);
  const byCustomer = new Map<string, Order[]>();
  for (const o of orders) {
    if (!set.has(o.customerId)) continue;
    if (o.date <= from || o.date > to) continue;
    if (!byCustomer.has(o.customerId)) byCustomer.set(o.customerId, []);
    byCustomer.get(o.customerId)!.push(o);
  }
  return byCustomer;
}

export function computeMissionResult(input: AttributionInput): MissionResult {
  const from = input.sentAt;
  const to = addDays(input.sentAt, input.windowDays);
  const window = { from, to };
  const allTargets = input.targets;

  if (input.sendStatus === "nenhuma") {
    const everyone = [...allTargets, ...input.control];
    const back = returnedSet(everyone, input.orders, from, to);
    const rate = everyone.length ? back.size / everyone.length : 0;
    return {
      sendStatus: "nenhuma",
      sent: 0,
      returned: 0,
      revenueCents: 0,
      rate: 0,
      comparison: { kind: "clientes_parecidas", size: everyone.length, returned: back.size, rate, weak: false },
      extraOrders: 0,
      extraRevenueCents: 0,
      cameBackAlone: { count: back.size, of: everyone.length, rate },
      effectStatus: "sem_info",
      byGroup: [],
      attributedOrderIds: [],
      estimate: input.estimate,
      window,
    };
  }

  let recipients: string[];
  let notSent: string[] = [];
  if (input.sendStatus === "todas") recipients = allTargets;
  else if (input.recipients) {
    const r = new Set(input.recipients);
    recipients = allTargets.filter((id) => r.has(id));
    notSent = allTargets.filter((id) => !r.has(id));
  } else {
    // só o número é conhecido: os primeiros N da lista, em ordem estável
    const n = Math.min(allTargets.length, Math.max(0, input.sentCount ?? 0));
    recipients = allTargets.slice(0, n);
    notSent = allTargets.slice(n);
  }

  const back = returnedSet(recipients, input.orders, from, to);
  const attributed = [...back.values()].flat();
  const revenue = attributed.reduce((s, o) => s + o.totalCents, 0);
  const rate = recipients.length ? back.size / recipients.length : 0;

  // comparação
  const compIds = input.sendStatus === "parte" ? [...input.control, ...notSent] : input.control;
  let comparison: MissionResult["comparison"];
  if (input.control.length >= MIN_VALID_CONTROL || compIds.length >= MIN_VALID_CONTROL) {
    const cb = returnedSet(compIds, input.orders, from, to);
    comparison = {
      kind: input.sendStatus === "parte" && notSent.length ? "controle_e_nao_enviadas" : "grupo_de_comparacao",
      size: compIds.length,
      returned: cb.size,
      rate: compIds.length ? cb.size / compIds.length : 0,
      // quem "não recebeu por falta de tempo" não foi sorteado: a comparação fica mais fraca
      weak: input.control.length < MIN_VALID_CONTROL,
    };
  } else {
    comparison = { kind: "clientes_parecidas", size: 0, returned: 0, rate: input.fallbackBaselineRate, weak: true };
  }

  const extra = Math.round(recipients.length * (rate - comparison.rate));
  const avgTicket = attributed.length ? revenue / attributed.length : 0;

  const groups = new Map<string, GroupBreakdown>();
  if (input.segmentOf) {
    for (const id of recipients) {
      const seg = input.segmentOf(id) ?? "sem_grupo";
      if (!groups.has(seg)) groups.set(seg, { segment: seg, sent: 0, returned: 0, rate: 0 });
      const g = groups.get(seg)!;
      g.sent++;
      if (back.has(id)) g.returned++;
    }
    for (const g of groups.values()) g.rate = g.sent ? g.returned / g.sent : 0;
  }

  return {
    sendStatus: input.sendStatus,
    sent: recipients.length,
    returned: back.size,
    revenueCents: revenue,
    rate,
    comparison,
    extraOrders: Math.max(0, extra),
    extraRevenueCents: Math.max(0, Math.round(extra * avgTicket)),
    effectStatus: comparison.weak ? "hipotese" : "fato",
    byGroup: [...groups.values()].sort((a, b) => b.sent - a.sent),
    attributedOrderIds: attributed.map((o) => o.id),
    estimate: input.estimate,
    window,
  };
}

/** Estimativa de uma missão: SEMPRE hipótese. */
export function estimateMission(listSize: number, responseRate: number, avgTicketCents: number) {
  const orders = Math.round(listSize * responseRate);
  return { orders, revenueCents: orders * avgTicketCents, status: "hipotese" as const, responseRate };
}
