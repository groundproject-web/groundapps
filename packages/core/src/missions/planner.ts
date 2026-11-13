import type { Customer, Order } from "../types";
import { addDays, daysBetween, formatInt } from "../util";
import { computeSegments, type SegmentKey } from "../metrics/segments";
import { computeProductCycles, customersDueForProduct, type ProductCycle } from "../metrics/productCycle";
import { buildHistories } from "../metrics/history";
import { estimateMission, type MissionResult } from "./attribution";
import { splitControlGroup } from "./control";
import { BLOCKER_LABEL, type Blocker, type CheckinAnswers } from "./checkin";
import type { Learning } from "../learnings/evolve";

/**
 * Planejador de missões do Marco Zero (regras determinísticas).
 * A IA reescreve o texto da mensagem e do "por que", mas o QUEM, o TAMANHO e o FORMATO
 * saem daqui — assim a missão é auditável e testável.
 */
export interface MissionPart {
  role: "principal" | "continua" | "conserta" | "extra";
  title: string;
  detail: string;
  targetIds: string[];
  control: string[];
  message: string;
  batches?: number;
  status: "fato" | "hipotese" | "sem_info";
}

export interface MissionPlan {
  weekStart: string;
  headline: string;
  subtitle: string;
  why: string[];
  parts: MissionPart[];
  estimate: { orders: number; revenueCents: number; responseRate: number; status: "hipotese" };
  productCycle?: { product: string; medianDays: number; p25Days: number; p75Days: number };
  notes: string[];
  structuralInvite: boolean;
  smaller: boolean;
}

export interface PlannerContext {
  storeOwner: string; // "Carla"
  storeName: string; // "Fôlego"
  customers: Customer[];
  orders: Order[];
  asOf: string;
  controlPct: number;
  responseRate?: number; // hipótese de resposta, padrão 15%
  learnings?: Learning[];
  structuralSignals?: string[];
}

export function careMessage(owner: string, store: string, product: string, days: number): string {
  return `Oi, [nome]! Aqui é a ${owner}, da ${store}. Vi que faz uns ${days} dias que você levou o seu ${shortProduct(product)}, então ele deve estar perto do fim.\n\nSeparei o seu sabor de sempre para você não ficar sem. Quer que eu reserve? É só responder aqui que eu te mando o link.`;
}

export function firstExperienceMessage(owner: string, store: string, product: string): string {
  return `Oi, [nome]! Aqui é a ${owner}, da ${store}. Você provou o nosso ${shortProduct(product)} há pouco tempo e eu queria saber: caiu bem?\n\nSe quiser provar outro sabor, te mando uma amostra junto com o próximo pedido.`;
}

export function winBackMessage(owner: string, store: string): string {
  return `Oi, [nome]! Aqui é a ${owner}, da ${store}. Faz um tempo que a gente não se fala e eu lembrei de você.\n\nComo foi a sua experiência com a gente? Se quiser, te conto o que chegou de novo.`;
}

export function shorterMessage(owner: string, store: string, product: string): string {
  return `Oi, [nome]! ${owner}, da ${store}. Seu ${shortProduct(product)} deve estar acabando. Quer que eu separe outro?`;
}

function shortProduct(p: string): string {
  return p.replace(/\s*\d+\s?(g|kg|ml)\b.*$/i, "").trim().toLowerCase() || p.toLowerCase();
}

function avgTicket(orders: Order[], ids: Set<string>): number {
  const list = orders.filter((o) => ids.has(o.customerId));
  return list.length ? Math.round(list.reduce((s, o) => s + o.totalCents, 0) / list.length) : 0;
}

/** Primeira missão: ciclo de produto quando houver item; senão, o grupo Em risco. */
export function planFirstMission(ctx: PlannerContext): MissionPlan {
  const rate = ctx.responseRate ?? 0.15;
  const cycles = computeProductCycles(ctx.customers, ctx.orders, ctx.asOf);
  const cycle = cycles[0];
  const { bySegment, segments } = computeSegments(ctx.customers, ctx.orders, ctx.asOf);
  const weekStart = ctx.asOf;

  if (cycle) {
    const due = customersDueForProduct(ctx.customers, ctx.orders, ctx.asOf, cycle);
    if (due.length >= 10) return productMission(ctx, cycle, due.map((d) => d.customerId), rate, bySegment, weekStart);
  }
  // fallback: Em risco
  const risk = segments.find((s) => s.key === "em_risco")!;
  const ids = risk.customerIds.slice(0, 200);
  const split = splitControlGroup(ids, `mission:${weekStart}:risco`, ctx.controlPct);
  const est = estimateMission(split.recipients.length, rate, avgTicket(ctx.orders, new Set(ids)));
  return {
    weekStart,
    headline: `${formatInt(ids.length)} clientes já voltaram antes e sumiram há mais de 60 dias.`,
    subtitle: "Elas já conhecem a sua marca. Uma mensagem de cuidado costuma bastar para retomar a conversa.",
    why: ["São clientes do grupo Em risco.", "Já compraram duas vezes ou mais.", "A mensagem fala de cuidado, não de desconto."],
    parts: [{ role: "principal", title: "Retomar a conversa com quem já voltou", detail: `${split.recipients.length} clientes`, targetIds: split.recipients, control: split.control, message: winBackMessage(ctx.storeOwner, ctx.storeName), status: "hipotese" }],
    estimate: est,
    notes: [],
    structuralInvite: (ctx.structuralSignals ?? []).length > 0,
    smaller: false,
  };
}

function productMission(ctx: PlannerContext, cycle: ProductCycle, ids: string[], rate: number, bySegment: Map<string, SegmentKey | null>, weekStart: string): MissionPlan {
  const split = splitControlGroup(ids, `mission:${weekStart}:${cycle.product}`, ctx.controlPct);
  const est = estimateMission(ids.length, rate, avgTicket(ctx.orders, new Set(ids)));
  const segs = new Set(ids.map((id) => bySegment.get(id)).filter(Boolean));
  const segNames: Record<string, string> = { fieis: "Fiéis", em_risco: "Em risco", sumidos: "Sumidos", compra_unica_recente: "Compra única recente", voltaram_ha_pouco: "Voltaram há pouco" };
  const segText = [...segs].map((s) => segNames[s as string]).join(" e ");
  const p = shortProduct(cycle.product);
  return {
    weekStart,
    headline: `${formatInt(ids.length)} clientes compraram ${p} há ${Math.round((cycle.p25Days + cycle.p75Days) / 2)} dias, e o pote está acabando.`,
    subtitle: `Um ${cycle.product} dura em média ${cycle.p25Days} a ${cycle.p75Days} dias. Mande esta mensagem para elas antes que comprem de outra marca.`,
    why: [
      `São clientes do grupo ${segText}.`,
      `A última compra delas foi ${p}, entre ${cycle.p25Days} e ${cycle.p75Days} dias atrás, e nada depois.`,
      "A mensagem fala de cuidado, não de desconto.",
    ],
    parts: [
      {
        role: "principal",
        title: `Lembrete do ${p}`,
        detail: `${split.recipients.length} clientes recebem. ${split.control.length} ficam de fora para comparar.`,
        targetIds: split.recipients,
        control: split.control,
        message: careMessage(ctx.storeOwner, ctx.storeName, cycle.product, Math.round((cycle.p25Days + cycle.p75Days) / 2)),
        status: "hipotese",
      },
    ],
    estimate: est,
    productCycle: { product: cycle.product, medianDays: cycle.medianDays, p25Days: cycle.p25Days, p75Days: cycle.p75Days },
    notes: [],
    structuralInvite: (ctx.structuralSignals ?? []).length > 0,
    smaller: false,
  };
}

const BLOCKER_NOTE: Record<Blocker, (ctx: { missingPhones: number }) => string> = {
  tempo: () => "Como faltou tempo, a missão vem em lotes de 50, um por dia, no fim da tarde.",
  contato: ({ missingPhones }) => `Antes de enviar: ${missingPhones} clientes estão sem telefone. Missão extra de 5 minutos: deixar o WhatsApp obrigatório no checkout.`,
  receio: () => "Como bateu o receio de incomodar, a mensagem ficou ainda mais curta, e quem não responder não recebe outra.",
};

/**
 * Próxima missão, a partir do check-in e do resultado:
 * - Continua: o que deu certo, aplicado a um novo grupo
 * - Conserta: o que travou, com outro formato
 * - Nada enviado: missão MENOR ("do tamanho da sua semana")
 * - Bloqueios moldam o formato (lotes, missão extra de contato, texto mais curto)
 */
export function planNextMission(ctx: PlannerContext, previous: MissionPlan, checkin: CheckinAnswers, result: MissionResult): MissionPlan {
  const weekStart = addDays(previous.weekStart, 7);
  const product = previous.productCycle?.product ?? "pedido";
  const prevTargets = new Set(previous.parts.flatMap((p) => [...p.targetIds, ...p.control]));
  const { bySegment } = computeSegments(ctx.customers, ctx.orders, ctx.asOf);
  const hs = buildHistories(ctx.customers, ctx.orders, ctx.asOf);
  const missingPhones = ctx.customers.filter((c) => !c.phone && prevTargets.has(c.id)).length;
  const notes: string[] = [];
  if (checkin.blocker) notes.push(BLOCKER_NOTE[checkin.blocker]({ missingPhones }));

  if (checkin.sendStatus === "nenhuma") {
    // mesma missão, menor: só o pedaço mais quente da lista anterior
    const prevMain = previous.parts[0];
    const hot = prevMain.targetIds.slice(0, Math.max(10, Math.min(60, Math.ceil(prevMain.targetIds.length / 3))));
    const split = splitControlGroup(hot, `mission:${weekStart}:menor`, ctx.controlPct);
    const msg = checkin.blocker === "receio" ? shorterMessage(ctx.storeOwner, ctx.storeName, product) : prevMain.message;
    return {
      weekStart,
      headline: "Uma missão do tamanho da sua semana.",
      subtitle: "Missão que não sai não ensina nada. Então a próxima fica menor, com o que travou já resolvido no desenho dela.",
      why: [`${hot.length} clientes da lista anterior, as que estão mais perto do fim do ciclo.`, checkin.blocker ? `O que travou: ${BLOCKER_LABEL[checkin.blocker].toLowerCase()}.` : "Sem motivo registrado."],
      parts: [
        { role: "continua", title: "A mesma missão, menor", detail: `Só ${split.recipients.length} clientes. Cabe em meia hora.`, targetIds: split.recipients, control: split.control, message: msg, batches: checkin.blocker === "tempo" ? Math.ceil(split.recipients.length / 50) : undefined, status: "sem_info" },
        ...(checkin.blocker === "contato" ? [extraContactPart()] : []),
      ],
      estimate: estimateMission(split.recipients.length, ctx.responseRate ?? 0.15, previous.estimate.orders ? Math.round(previous.estimate.revenueCents / previous.estimate.orders) : 0),
      productCycle: previous.productCycle,
      notes,
      structuralInvite: (ctx.structuralSignals ?? []).length > 0,
      smaller: true,
    };
  }

  // Funcionou → continua num novo grupo; o pior grupo → conserta com outro formato
  const worst = [...result.byGroup].filter((g) => g.sent >= 10).sort((a, b) => a.rate - b.rate)[0];
  const best = [...result.byGroup].filter((g) => g.sent >= 10).sort((a, b) => b.rate - a.rate)[0];
  const worked = result.rate > result.comparison.rate;

  // novo grupo: próximas clientes no ciclo do produto (que não estavam na missão anterior)
  let fresh: string[] = [];
  if (previous.productCycle) {
    const cyc = previous.productCycle;
    for (const h of hs) {
      if (prevTargets.has(h.customer.id)) continue;
      const last = h.last;
      if (!last.items?.some((i) => i.product === cyc.product)) continue;
      const since = daysBetween(last.date, ctx.asOf);
      if (since >= cyc.p25Days - 7 && since <= cyc.p75Days + 7) fresh.push(h.customer.id);
    }
  }
  if (fresh.length < 10) {
    fresh = hs.filter((h) => !prevTargets.has(h.customer.id) && bySegment.get(h.customer.id) === "em_risco").map((h) => h.customer.id).slice(0, 150);
  }
  const keepSplit = splitControlGroup(fresh, `mission:${weekStart}:continua`, ctx.controlPct);
  const keepMsg = checkin.blocker === "receio" ? shorterMessage(ctx.storeOwner, ctx.storeName, product) : previous.parts[0].message;

  const parts: MissionPart[] = [
    {
      role: "continua",
      title: worked ? "Mesma mensagem, novo grupo" : "Mesma ideia, outro grupo",
      detail: `${keepSplit.recipients.length} clientes que chegam agora ao fim do ciclo${best ? `. O grupo que mais voltou foi ${segLabel(best.segment)}` : ""}.`,
      targetIds: keepSplit.recipients,
      control: keepSplit.control,
      message: keepMsg,
      batches: checkin.blocker === "tempo" ? Math.ceil(keepSplit.recipients.length / 50) : undefined,
      status: worked && !result.comparison.weak ? "fato" : "hipotese",
    },
  ];
  if (worst && (worst !== best || !worked)) {
    // grupo no momento do envio (não o de hoje), sem quem já voltou
    const atSend = computeSegments(ctx.customers, ctx.orders, previous.weekStart).bySegment;
    const returnedIds = new Set(ctx.orders.filter((o) => result.attributedOrderIds.includes(o.id)).map((o) => o.customerId));
    const worstIds = previous.parts[0].targetIds.filter((id) => (atSend.get(id) ?? "sem_grupo") === worst.segment && !returnedIds.has(id));
    const fixSplit = splitControlGroup(worstIds, `mission:${weekStart}:conserta`, ctx.controlPct);
    parts.push({
      role: "conserta",
      title: `Conserta · ${segLabel(worst.segment)}`,
      detail: `Sai o "sabor de sempre", entra a pergunta sobre a primeira experiência. ${fixSplit.recipients.length} clientes.`,
      targetIds: fixSplit.recipients,
      control: fixSplit.control,
      message: firstExperienceMessage(ctx.storeOwner, ctx.storeName, product),
      status: "hipotese",
    });
  }
  if (checkin.blocker === "contato") parts.push(extraContactPart());

  const total = parts.reduce((s, p) => s + p.targetIds.length, 0);
  return {
    weekStart,
    headline: "Continuar o que deu certo. Consertar o que travou.",
    subtitle: "A missão nova nasce do resultado da anterior. O que funcionou se repete com outro grupo; o que travou muda de forma antes de voltar.",
    why: [
      `Na semana passada, ${result.returned} de ${result.sent} voltaram (${Math.round(result.rate * 100)}%), contra ${Math.round(result.comparison.rate * 100)}% sem mensagem.`,
      worst ? `${segLabel(worst.segment)} voltou menos: ${worst.returned} de ${worst.sent}.` : "Nenhum grupo travou.",
    ],
    parts,
    estimate: estimateMission(total, Math.max(0.05, Math.min(0.3, result.rate || 0.15)), result.returned ? Math.round(result.revenueCents / Math.max(1, result.attributedOrderIds.length)) : previous.estimate.orders ? Math.round(previous.estimate.revenueCents / previous.estimate.orders) : 0),
    productCycle: previous.productCycle,
    notes,
    structuralInvite: (ctx.structuralSignals ?? []).length > 0,
    smaller: false,
  };
}

function extraContactPart(): MissionPart {
  return {
    role: "extra",
    title: "Missão extra · 5 minutos",
    detail: "Deixar o WhatsApp obrigatório no checkout da loja. Assim a próxima lista vem completa.",
    targetIds: [],
    control: [],
    message: "",
    status: "hipotese",
  };
}

export function segLabel(seg: string): string {
  return ({ fieis: "Fiéis", em_risco: "Em risco", sumidos: "Sumidos", compra_unica_recente: "Compra única recente", voltaram_ha_pouco: "Voltaram há pouco", sem_grupo: "Sem grupo" } as Record<string, string>)[seg] ?? seg;
}
