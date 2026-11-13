import "server-only";
import {
  addDays,
  classifyRepliesOffline,
  computeBaseline,
  computeIdleMoney,
  computeMissionResult,
  computeProductCycles,
  computeSegments,
  daysBetween,
  detectStructural,
  markAdjusted,
  newLearning,
  observe,
  planFirstMission,
  planNextMission,
  recordOutcome,
  signalsFromReplies,
  simulateWeekOrders,
  weekStart,
  BLOCKER_LABEL,
  segLabel,
  type CheckinAnswers,
  type Learning,
  type MissionPlan,
  type MissionResult,
  type ReplyClassification,
} from "@ground/core";
import { getDb, type Queryable } from "./db";
import { loadDataset, insertOrders, type LoadedDataset } from "./store";
import { currentRules } from "./pricing";
import { publish } from "./events";
import { queueEmail } from "./email";
import type { OrgContext } from "./orgs";

export interface MissionRow {
  id: string;
  week_start: string;
  status: "aberta" | "fechada";
  plan: MissionPlan;
  message_override: string | null;
}

export interface ResultExtras {
  learningsBefore: Learning[];
  replies: ReplyClassification[];
  ticketNoCouponCents: number | null;
  ticketWithCouponCents: number | null;
  simulated: boolean;
  builtShareBefore: number;
  builtShareAfter: number;
}

const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

export async function mzSettings(orgId: string, today: string) {
  const rules = await currentRules(today);
  const db = await getDb();
  const [s] = await db.service((t) => t.query<{ attribution_window_days: number | null; control_group_pct: number | null; checkin_upload_retention_days: number }>("select attribution_window_days, control_group_pct, checkin_upload_retention_days from mz_settings where organization_id = $1", [orgId]));
  return {
    windowDays: s?.attribution_window_days ?? rules.attributionWindowDays,
    controlPct: Number(s?.control_group_pct ?? rules.controlGroupPct),
    retentionDays: s?.checkin_upload_retention_days ?? 30,
    rules,
  };
}

/** Todos os números da leitura, calculados na hora a partir da base. */
export function overview(ds: LoadedDataset, today: string) {
  const baseline = computeBaseline(ds.customers, ds.orders, today);
  const seg = computeSegments(ds.customers, ds.orders, today);
  const idle = computeIdleMoney(ds.customers, ds.orders, today);
  const cycles = computeProductCycles(ds.customers, ds.orders, today);
  return { baseline, segments: seg.segments, bySegment: seg.bySegment, idle, cycles };
}

/** % de receita construída semana a semana (últimas N semanas). */
export function weeklyBuiltShare(ds: LoadedDataset, today: string, weeks = 8) {
  const firsts = new Set<string>();
  const seen = new Set<string>();
  for (const o of [...ds.orders].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    if (!seen.has(o.customerId)) {
      seen.add(o.customerId);
      firsts.add(o.id);
    }
  }
  const end = weekStart(today);
  const out: { week: string; share: number; totalCents: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const w = addDays(end, -7 * i);
    // janela móvel de 4 semanas, para não oscilar com semanas pequenas
    const from = addDays(w, -21);
    const to = addDays(w, 6);
    let built = 0;
    let total = 0;
    for (const o of ds.orders) {
      if (o.date < from || o.date > to) continue;
      total += o.totalCents;
      if (!firsts.has(o.id)) built += o.totalCents;
    }
    out.push({ week: w, share: total ? built / total : 0, totalCents: total });
  }
  return out;
}

export async function listMissions(t: Queryable, orgId: string): Promise<MissionRow[]> {
  const rows = await t.query<MissionRow & { week_start: unknown }>("select id, week_start, status, plan, message_override from mz_missions where organization_id = $1 order by week_start", [orgId]);
  return rows.map((r) => ({ ...r, week_start: iso(r.week_start) }));
}

export async function getLearnings(t: Queryable, orgId: string): Promise<Learning[]> {
  const rows = await t.query<{ key: string; sentence: string; kind: Learning["kind"]; state: Learning["state"]; successes: number; failures: number; recurrence: number; evidence_mission_ids: string[]; history: Learning["history"] }>("select * from learnings where organization_id = $1 and module = 'marco_zero' order by key", [orgId]);
  return rows.map((r) => ({ key: r.key, sentence: r.sentence, kind: r.kind, state: r.state, successes: r.successes, failures: r.failures, recurrence: r.recurrence, evidenceMissionIds: r.evidence_mission_ids, history: r.history }));
}

async function saveLearnings(t: Queryable, orgId: string, ls: Learning[]) {
  for (const l of ls) {
    await t.query(
      `insert into learnings(organization_id, key, module, sentence, kind, state, successes, failures, recurrence, evidence_mission_ids, history, updated_at)
       values ($1,$2,'marco_zero',$3,$4,$5,$6,$7,$8,$9,$10, now())
       on conflict (organization_id, key) do update set sentence = excluded.sentence, state = excluded.state, successes = excluded.successes, failures = excluded.failures, recurrence = excluded.recurrence, evidence_mission_ids = excluded.evidence_mission_ids, history = excluded.history, updated_at = now()`,
      [orgId, l.key, l.sentence, l.kind, l.state, l.successes, l.failures, l.recurrence, JSON.stringify(l.evidenceMissionIds), JSON.stringify(l.history)],
    );
  }
}

export function initialLearnings(at: string): Learning[] {
  return [
    newLearning("cuidado_sem_cupom", "Mensagem de cuidado, sem cupom, traz cliente de volta.", "mensagem", at, "hipotese"),
    newLearning("grupo_que_mais_volta", "Quem já voltou antes responde mais à mensagem.", "grupo", at, "sem_info"),
    newLearning("sabor_de_sempre_unica", "“Sabor de sempre” não funciona com quem comprou uma vez.", "grupo", at, "sem_info"),
    newLearning("frete_nas_respostas", "O frete aparece nas respostas das clientes.", "sinal", at, "sem_info"),
  ];
}

/** Garante a missão da semana. Cria a primeira a partir da base (planejador determinístico). */
export async function ensureMission(ctx: OrgContext, ds: LoadedDataset): Promise<MissionRow | null> {
  if (!ds.orders.length) return null;
  const db = await getDb();
  const s = await mzSettings(ctx.org.id, ctx.today);
  return db.asUser(ctx.session.userId, async (t) => {
    const list = await listMissions(t, ctx.org.id);
    if (list.length) return list[list.length - 1];
    const plan = planFirstMission({ storeOwner: ctx.org.owner_display_name || "a gente", storeName: ctx.org.name.split(" ")[0], customers: ds.customers, orders: ds.orders, asOf: ctx.today, controlPct: s.controlPct });
    const [m] = await t.query<MissionRow & { week_start: unknown }>("insert into mz_missions(organization_id, week_start, plan) values ($1,$2,$3) on conflict (organization_id, week_start) do update set plan = mz_missions.plan returning id, week_start, status, plan, message_override", [ctx.org.id, plan.weekStart, JSON.stringify(plan)]);
    const existing = await getLearnings(t, ctx.org.id);
    if (!existing.length) await saveLearnings(t, ctx.org.id, initialLearnings(ctx.today));
    return { ...m, week_start: iso(m.week_start) };
  });
}

export async function getMissionBundle(ctx: OrgContext) {
  const db = await getDb();
  return db.asUser(ctx.session.userId, async (t) => {
    const missions = await listMissions(t, ctx.org.id);
    const ids = missions.map((m) => m.id);
    const checkins = ids.length ? await t.query<{ mission_id: string; answers: CheckinAnswers }>("select mission_id, answers from mz_checkins where mission_id = any($1)", [ids]) : [];
    const results = ids.length ? await t.query<{ mission_id: string; result: MissionResult & { extras: ResultExtras } }>("select mission_id, result from mz_results where mission_id = any($1)", [ids]) : [];
    const learnings = await getLearnings(t, ctx.org.id);
    const alerts = await t.query<{ signal_type: string; weeks: string[]; created_at: unknown }>("select signal_type, weeks, created_at from structural_alerts where organization_id = $1 and module = 'marco_zero' order by created_at desc", [ctx.org.id]);
    return {
      missions,
      checkins: new Map(checkins.map((c) => [c.mission_id, c.answers])),
      results: new Map(results.map((r) => [r.mission_id, r.result])),
      learnings,
      alerts,
    };
  });
}

export async function saveMessageOverride(ctx: OrgContext, missionId: string, text: string) {
  const db = await getDb();
  await db.asUser(ctx.session.userId, (t) => t.query("update mz_missions set message_override = $3 where organization_id = $1 and id = $2", [ctx.org.id, missionId, text.slice(0, 2000)]));
}

/**
 * Check-in → Resultado → Ajuste.
 * O que o lojista conta é HIPÓTESE; o que a loja mostra (pedidos na janela) é FATO.
 * Em demo/staging, quando a loja não tem pedidos reais na janela, os pedidos da semana são simulados
 * a partir da resposta (e marcados como simulados).
 */
export async function submitCheckin(ctx: OrgContext, missionId: string, answers: CheckinAnswers) {
  const db = await getDb();
  const s = await mzSettings(ctx.org.id, ctx.today);
  const ds = await loadDataset(ctx.session.userId, ctx.org.id);
  return db.asUser(ctx.session.userId, async (t) => {
    const missions = await listMissions(t, ctx.org.id);
    const m = missions.find((x) => x.id === missionId);
    if (!m || m.status !== "aberta") throw new Error("Missão não está aberta.");
    const main = m.plan.parts[0];
    const windowEnd = addDays(m.week_start, s.windowDays);
    const recipients = answers.sendStatus === "todas" ? main.targetIds : answers.sendStatus === "parte" ? main.targetIds.slice(0, Math.min(main.targetIds.length, answers.sentCount ?? 0)) : [];
    let orders = ds.orders;
    let simulated = false;
    const realInWindow = ds.orders.some((o) => o.date > m.week_start && o.date <= windowEnd && o.sourceCode !== "simulacao");
    if (ctx.org.is_demo && !realInWindow) {
      const listIds = [...main.targetIds, ...main.control];
      const sim = simulateWeekOrders({ seed: `${missionId}:${answers.sendStatus}:${recipients.length}`, from: m.week_start, days: s.windowDays, recipients, others: listIds.filter((id) => !recipients.includes(id)), recipientRate: 0.175, baseRate: 0.05, avgTicketCents: m.plan.estimate.orders ? Math.round(m.plan.estimate.revenueCents / m.plan.estimate.orders) : 15000, product: m.plan.productCycle?.product });
      await insertOrders(t, ctx.org.id, sim, true);
      orders = [...ds.orders, ...sim];
      simulated = true;
    }
    const segAtSend = computeSegments(ds.customers, ds.orders, m.week_start).bySegment;
    const fallbackRate = 0.05;
    const result = computeMissionResult({
      sentAt: m.week_start,
      windowDays: s.windowDays,
      sendStatus: answers.sendStatus,
      sentCount: recipients.length,
      targets: main.targetIds,
      control: main.control,
      orders,
      fallbackBaselineRate: fallbackRate,
      segmentOf: (id) => segAtSend.get(id) ?? null,
      estimate: { orders: m.plan.estimate.orders, revenueCents: m.plan.estimate.revenueCents },
    });

    // tickets: sem cupom (missão) × com cupom (30 dias antes)
    const attributed = orders.filter((o) => result.attributedOrderIds.includes(o.id));
    const withCoupon = ds.orders.filter((o) => o.coupon && o.date > addDays(m.week_start, -60) && o.date <= m.week_start);
    const avg = (xs: { totalCents: number }[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b.totalCents, 0) / xs.length) : null);

    const replies = answers.replies ?? [];
    const before = await getLearnings(t, ctx.org.id);
    let ls = before.length ? before : initialLearnings(ctx.today);
    const at = ctx.today;
    const upd = (key: string, f: (l: Learning) => Learning) => (ls = ls.map((l) => (l.key === key ? f(l) : l)));
    if (answers.sendStatus !== "nenhuma") {
      upd("cuidado_sem_cupom", (l) => recordOutcome(l, result.rate > result.comparison.rate ? "sucesso" : "falha", { validComparison: !result.comparison.weak, missionId, at }));
      const best = [...result.byGroup].filter((g) => g.sent >= 10).sort((a, b) => b.rate - a.rate)[0];
      const worst = [...result.byGroup].filter((g) => g.sent >= 10).sort((a, b) => a.rate - b.rate)[0];
      if (best) upd("grupo_que_mais_volta", (l) => observe({ ...l, sentence: `${segLabel(best.segment)} responde mais à mensagem.` }, { at, missionId }));
      if (worst && worst.rate < result.comparison.rate + 0.03 && worst !== best) upd("sabor_de_sempre_unica", (l) => markAdjusted(recordOutcome({ ...l, state: l.state === "sem_info" ? "hipotese" : l.state }, "falha", { validComparison: !result.comparison.weak, missionId, at }), { at, missionId, note: "Mensagem trocada para a da primeira experiência" }));
    }
    if (replies.some((r) => r.category === "frete")) upd("frete_nas_respostas", (l) => observe(l, { at, missionId }));
    if (answers.blocker) {
      const key = `bloqueio_${answers.blocker}`;
      const existing = ls.find((l) => l.key === key);
      const base = existing ?? newLearning(key, `O que trava a execução: ${BLOCKER_LABEL[answers.blocker].toLowerCase()}.`, "bloqueio", at, "hipotese");
      const adj = markAdjusted(observe(base, { at, missionId }), { at, missionId, note: "Considerado no ajuste" });
      ls = existing ? ls.map((l) => (l.key === key ? adj : l)) : [...ls, adj];
    }
    await saveLearnings(t, ctx.org.id, ls);

    // sinais semanais e gargalo estrutural (3 semanas seguidas)
    const week = weekStart(m.week_start);
    const signals = signalsFromReplies(replies, 3);
    if (answers.sendStatus === "nenhuma") signals.push("missao_travada");
    for (const sig of signals) await t.query("insert into weekly_signals(organization_id, module, week, signal_type) values ($1,'marco_zero',$2,$3) on conflict do nothing", [ctx.org.id, week, sig]);

    const builtBefore = computeBaseline(ds.customers, ds.orders, m.week_start).recentBuiltShare;
    const builtAfter = computeBaseline(ds.customers, orders, windowEnd).recentBuiltShare;
    const extras: ResultExtras = { learningsBefore: before, replies, ticketNoCouponCents: avg(attributed), ticketWithCouponCents: avg(withCoupon), simulated, builtShareBefore: builtBefore, builtShareAfter: builtAfter };

    await t.query("insert into mz_checkins(mission_id, organization_id, answers) values ($1,$2,$3)", [missionId, ctx.org.id, JSON.stringify(answers)]);
    await t.query("insert into mz_results(mission_id, organization_id, result) values ($1,$2,$3)", [missionId, ctx.org.id, JSON.stringify({ ...result, extras })]);
    await t.query("update mz_missions set status = 'fechada', closed_at = now() where id = $1", [missionId]);

    // ajuste: a próxima missão nasce do resultado
    const next = planNextMission({ storeOwner: ctx.org.owner_display_name || "a gente", storeName: ctx.org.name.split(" ")[0], customers: ds.customers, orders, asOf: addDays(m.week_start, 7), controlPct: s.controlPct, learnings: ls }, m.plan, answers, result);
    await t.query("insert into mz_missions(organization_id, week_start, plan) values ($1,$2,$3) on conflict (organization_id, week_start) do nothing", [ctx.org.id, next.weekStart, JSON.stringify(next)]);
    return { result, next, simulated };
  }).then(async (out) => {
    // eventos e alertas (servidor)
    await afterCheckin(ctx, answers);
    return out;
  });
}

async function afterCheckin(ctx: OrgContext, answers: CheckinAnswers) {
  const db = await getDb();
  await db.service(async (t) => {
    if (answers.replies?.length) {
      await publish(t, ctx.org.id, "mz.customer_voice.classified", { week: weekStart(ctx.today), categories: answers.replies.map((r) => ({ category: r.category, label: r.label, count: r.count, excerpts: r.excerpts })) }, `voice:${weekStart(ctx.today)}`);
    }
    await detectAndAlert(t, ctx.org.id, ctx.org.name, weekStart(ctx.today));
  });
}

export async function detectAndAlert(t: Queryable, orgId: string, orgName: string, currentWeek: string) {
  const sigs = await t.query<{ week: unknown; signal_type: string }>("select week, signal_type from weekly_signals where organization_id = $1 and module = 'marco_zero'", [orgId]);
  // a semana corrente do sinal é a última com registro
  const weeks = [...new Set(sigs.map((s) => iso(s.week)))].sort();
  const last = weeks[weeks.length - 1] ?? currentWeek;
  const found = detectStructural(sigs.map((s) => ({ week: iso(s.week), type: s.signal_type })), last);
  for (const f of found) {
    const r = await t.query("insert into structural_alerts(organization_id, module, signal_type, weeks) values ($1,'marco_zero',$2,$3) on conflict do nothing returning id", [orgId, f.type, JSON.stringify(f.weeks)]);
    if (r.length) {
      await publish(t, orgId, "any.structural_signal", { type: f.type, weeks: f.weeks, evidence: [], module: "marco_zero" }, `structural:${f.type}:${f.weeks.join(",")}`);
      await queueEmail(t, { orgId, toUser: null, kind: "gargalo_estrutural", subject: `[Ground] Gargalo estrutural em ${orgName}: ${f.type}`, body: `O sinal "${f.type}" apareceu ${f.weeks.length} semanas seguidas (${f.weeks.join(", ")}). Veja em /admin.`, dedupeKey: `alert:${orgId}:${f.type}:${f.weeks.join(",")}` });
    }
  }
}

/** "Responder de outro jeito": desfaz o check-in enquanto a semana seguinte não foi respondida. */
export async function undoCheckin(ctx: OrgContext, missionId: string) {
  const db = await getDb();
  await db.asUser(ctx.session.userId, async (t) => {
    const missions = await listMissions(t, ctx.org.id);
    const i = missions.findIndex((m) => m.id === missionId);
    if (i < 0) return;
    const m = missions[i];
    const next = missions[i + 1];
    if (next) {
      const [c] = await t.query("select 1 from mz_checkins where mission_id = $1", [next.id]);
      if (c) throw new Error("A semana seguinte já teve check-in.");
      await t.query("delete from mz_missions where id = $1", [next.id]);
    }
    const [r] = await t.query<{ result: { extras?: ResultExtras } }>("select result from mz_results where mission_id = $1", [missionId]);
    if (r?.result.extras?.learningsBefore?.length) {
      await t.query("delete from learnings where organization_id = $1 and module = 'marco_zero'", [ctx.org.id]);
      await saveLearnings(t, ctx.org.id, r.result.extras.learningsBefore);
    }
    await t.query("delete from orders where organization_id = $1 and is_simulated and ordered_at > $2 and ordered_at <= $3", [ctx.org.id, m.week_start, addDays(m.week_start, 14)]);
    await t.query("delete from weekly_signals where organization_id = $1 and week = $2", [ctx.org.id, weekStart(m.week_start)]);
    await t.query("delete from mz_results where mission_id = $1", [missionId]);
    await t.query("delete from mz_checkins where mission_id = $1", [missionId]);
    await t.query("update mz_missions set status = 'aberta', closed_at = null where id = $1", [missionId]);
  });
}

/** Classificação das respostas no check-in: texto colado (+ prints/áudio via IA quando ligada). */
export function classifyLocally(texts: string[]): ReplyClassification[] {
  return classifyRepliesOffline(texts.filter((x) => x.trim()));
}

export function daysUntilCheckin(weekStartIso: string, today: string): number {
  return Math.max(0, 7 - daysBetween(weekStartIso, today));
}
