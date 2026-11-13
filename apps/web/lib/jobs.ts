import "server-only";
import { addDays, computeSegments, computeProductCycles, evaluateTier, tierForBase, weekStart, type UpgradeState } from "@ground/core";
import { getDb } from "./db";
import { queueEmail, flushOutbox } from "./email";
import { publish, consume } from "./events";
import { currentRules } from "./pricing";
import { detectAndAlert } from "./mz";

const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

/**
 * Fechamento semanal (cron de segunda-feira). Idempotente por (job, organização, semana):
 * rodar duas vezes não manda dois lembretes nem duplica eventos.
 * 1. lembrete do check-in (um só, mesmo com os dois módulos)
 * 2. recálculo dos grupos → evento mz.loyal_segment.updated
 * 3. faixa do Marco Zero (aviso de upgrade com carência)
 * 4. limpeza dos prints/áudios vencidos (LGPD)
 * 5. gargalo estrutural
 */
export async function runWeeklyClose(opts: { orgId?: string; today?: string } = {}) {
  const db = await getDb();
  const orgs = await db.service((t) => t.query<{ id: string; name: string; clock_date: unknown }>(opts.orgId ? "select id, name, clock_date from organizations where id = $1" : "select id, name, clock_date from organizations where deletion_requested_at is null", opts.orgId ? [opts.orgId] : []));
  const report: { org: string; done: string[] }[] = [];
  for (const o of orgs) {
    const today = opts.today ?? (o.clock_date ? iso(o.clock_date) : new Date().toISOString().slice(0, 10));
    const week = weekStart(today);
    const done: string[] = [];
    // lido ANTES da transação (o PGlite tem uma conexão só: transação aninhada travaria)
    const rules = await currentRules(today);
    await db.service(async (t) => {
      const claimed = await t.query("insert into job_runs(job, organization_id, run_key) values ('fechamento_semanal', $1, $2) on conflict do nothing returning run_key", [o.id, week]);
      if (!claimed.length) return;
      // 1. lembrete
      const open = await t.query<{ id: string; week_start: unknown }>("select id, week_start from mz_missions where organization_id = $1 and status = 'aberta' order by week_start desc limit 1", [o.id]);
      const skOpen = await t.query("select 1 from sketch_missions where organization_id = $1 and not done limit 1", [o.id]);
      const due = open[0] && addDays(iso(open[0].week_start), 7) <= today;
      if (due || skOpen.length) {
        const owners = await t.query<{ user_id: string }>("select user_id from memberships where organization_id = $1 and role = 'owner'", [o.id]);
        for (const u of owners)
          if (await queueEmail(t, { orgId: o.id, toUser: u.user_id, kind: "lembrete_checkin", subject: "Como foi a missão da semana?", body: `Oi! Faz uma semana que saiu a missão da ${o.name}. Leva 1 minuto: conta se a mensagem saiu e para quem. O resto a gente mede na loja.\n\nResponder: ${process.env.APP_URL ?? "http://localhost:3000"}/app/marco-zero/check-in`, dedupeKey: `checkin:${o.id}:${week}` }))
            done.push("lembrete");
      }
      // 2-3. grupos e faixa
      const cs = await t.query<{ id: string; name: string }>("select id, name from customers where organization_id = $1", [o.id]);
      if (cs.length) {
        const os = await t.query<{ id: string; customer_id: string; ordered_at: unknown; total_cents: number }>("select id, customer_id, ordered_at, total_cents from orders where organization_id = $1", [o.id]);
        const its = await t.query<{ order_id: string; name: string }>("select i.order_id, p.name from order_items i join products p on p.organization_id = i.organization_id and p.id = i.product_id where i.organization_id = $1", [o.id]);
        const items = new Map<string, { product: string; quantity: number }[]>();
        for (const i of its) items.set(i.order_id, [...(items.get(i.order_id) ?? []), { product: i.name, quantity: 1 }]);
        const orders = os.map((x) => ({ id: x.id, customerId: x.customer_id, date: iso(x.ordered_at), totalCents: Number(x.total_cents), items: items.get(x.id) ?? [] }));
        const seg = computeSegments(cs, orders, today);
        const loyal = seg.segments.find((s) => s.key === "fieis")!;
        const risk = seg.segments.find((s) => s.key === "em_risco")!;
        const cycles = computeProductCycles(cs, orders, today);
        if (await publish(t, o.id, "mz.loyal_segment.updated", { loyalIds: loyal.customerIds, atRiskIds: risk.customerIds, counts: { loyal: loyal.count, atRisk: risk.count }, topProducts: cycles.slice(0, 3).map((c) => c.product), productCycles: cycles.slice(0, 3).map((c) => ({ product: c.product, medianDays: c.medianDays })) }, `loyal:${week}`)) done.push("evento_grupos");

        const [st] = await t.query<{ billed_tier: string | null; tier_state: UpgradeState }>("select billed_tier, tier_state from mz_settings where organization_id = $1", [o.id]);
        const [ent] = await t.query<{ plan: string }>("select plan from entitlements where organization_id = $1 and module = 'marco_zero' and status <> 'cancelado'", [o.id]);
        if (ent) {
          const billed = st?.billed_tier ?? ent.plan ?? tierForBase(cs.length, rules).id;
          const n = evaluateTier({ billedTier: billed, customers: cs.length, today, current: st?.tier_state ?? { kind: "ok" }, rules });
          await t.query("insert into mz_settings(organization_id, billed_tier, tier_state) values ($1,$2,$3) on conflict (organization_id) do update set billed_tier = excluded.billed_tier, tier_state = excluded.tier_state, updated_at = now()", [o.id, n.billedTier, JSON.stringify(n.state)]);
          if (n.state.kind !== "ok") done.push(`faixa:${n.state.kind}`);
        }
      }
      // 4. LGPD: apaga arquivos vencidos (o resumo classificado fica)
      const del = await t.query("update checkin_uploads set storage_path = null, deleted_at = now() where organization_id = $1 and deleted_at is null and delete_after <= $2 returning id", [o.id, today]);
      if (del.length) done.push(`arquivos_apagados:${del.length}`);
      // 5. gargalo estrutural
      await detectAndAlert(t, o.id, o.name, week);
      // consumidores idempotentes
      await runConsumers(t, o.id);
    });
    report.push({ org: o.name, done });
  }
  const sent = await db.service((t) => flushOutbox(t));
  return { report, emailsSent: sent };
}

/** Consumidores dos eventos internos. Cada um processa cada evento uma vez só. */
export async function runConsumers(t: import("./db").Queryable, orgId: string) {
  // Sketch ← Marco Zero: clientes fiéis e em risco viram o ponto de partida da persona
  await consume(t, orgId, "sketch", ["mz.loyal_segment.updated", "mz.customer_voice.classified"], async (type, payload) => {
    if (type === "mz.loyal_segment.updated") {
      const p = payload as { counts: { loyal: number; atRisk: number } };
      await t.query("update sketch_profiles set data = jsonb_set(data, '{importedFromMz}', $2::jsonb), updated_at = now() where organization_id = $1", [orgId, JSON.stringify({ loyal: p.counts.loyal, atRisk: p.counts.atRisk, total: p.counts.loyal + p.counts.atRisk })]);
    }
  });
  // Marco Zero ← Sketch: códigos de origem viram o mini-grupo "Novas do Sketch"
  await consume(t, orgId, "marco_zero", ["sketch.acquisition_source.created", "sketch.persona.updated"], async () => {
    /* o mini-grupo é calculado na leitura a partir de origin_codes + orders; aqui só marcamos o consumo */
  });
}

/** Staging/demo: avança o relógio da loja em 7 dias e roda o fechamento semanal. */
export async function advanceWeek(orgId: string) {
  const db = await getDb();
  const [o] = await db.service((t) => t.query<{ clock_date: unknown; is_demo: boolean }>("select clock_date, is_demo from organizations where id = $1", [orgId]));
  const today = o?.clock_date ? iso(o.clock_date) : new Date().toISOString().slice(0, 10);
  const next = addDays(today, 7);
  await db.service((t) => t.query("update organizations set clock_date = $2 where id = $1", [orgId, next]));
  return runWeeklyClose({ orgId, today: next });
}
