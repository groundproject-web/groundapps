import "server-only";
import { randomUUID } from "node:crypto";
import { DEFAULT_PRICING_RULES, importSpreadsheet, planFirstMission, quote } from "@ground/core";
import { carlaSketchSeed, generateCarlaSeed, joaoSeed, type SketchSeed } from "@ground/core/seeds";
import type { Db, Queryable } from "./db";
import { hashPassword } from "./crypto";
import { writeDataset } from "./store";
import { ensureOriginCodes, type SketchData } from "./sketch";
import { initialLearnings } from "./mz";

/**
 * Seed de demonstração (iguais aos protótipos):
 * - Carla · Fôlego Nutrição: 2.000 clientes, Marco Zero + Sketch (caminho 2)
 * - João · Brutal Wear: sem base, Sketch sozinho (caminho 1)
 * - Sócio da Ground: acesso ao /admin
 * Senha das contas de demo: DEMO_PASSWORD (padrão em .env.example). Login sem senha só fora de produção.
 */
export const DEMO_ACCOUNTS = {
  carla: "carla@demo.ground.local",
  joao: "joao@demo.ground.local",
  socio: "socio@demo.ground.local",
};

export async function ensureDemoSeed(db: Db) {
  const done = await db.service((t) => t.query("select 1 from public.demo_accounts limit 1"));
  if (done.length) return;
  const pw = hashPassword(process.env.DEMO_PASSWORD ?? "ground-demo-2026");
  await db.service(async (t) => {
    await t.query("insert into pricing_rules(version, effective_from, rules) values ($1,$2,$3) on conflict do nothing", [DEFAULT_PRICING_RULES.version, DEFAULT_PRICING_RULES.effectiveFrom, JSON.stringify(DEFAULT_PRICING_RULES)]);
    const users: Record<string, string> = {};
    for (const [label, email] of Object.entries(DEMO_ACCOUNTS)) {
      const id = randomUUID();
      users[label] = id;
      await t.query("insert into auth.users(id, email) values ($1,$2)", [id, email]);
      await t.query("insert into public.local_credentials(user_id, password_hash) values ($1,$2)", [id, pw]);
      await t.query("insert into public.demo_accounts(user_id, label) values ($1,$2)", [id, label]);
    }
    await t.query("insert into platform_admins(user_id) values ($1)", [users.socio]);

    // ---------- Carla ----------
    const carla = generateCarlaSeed();
    const [folego] = await t.query<{ id: string }>("insert into organizations(name, slug, owner_display_name, segment, store_url, is_demo, clock_date) values ('Fôlego Nutrição','folego-demo','Carla','Suplementos · Nuvemshop','https://example.com/folego', true, $1) returning id", [carla.asOf]);
    await t.query("insert into memberships(organization_id, user_id, role) values ($1,$2,'owner')", [folego.id, users.carla]);
    await t.query("insert into entitlements(organization_id, module, plan) values ($1,'marco_zero','MZ2'), ($1,'sketch','completo')", [folego.id]);
    await t.query("insert into billing_subscriptions(organization_id, provider, status, quote, billing_day) values ($1,'manual','ativa',$2, 5)", [folego.id, JSON.stringify(quote({ mzTierId: "MZ2", sketchPlan: "completo" }, DEFAULT_PRICING_RULES))]);
    await t.query("insert into mz_settings(organization_id, billed_tier) values ($1,'MZ2')", [folego.id]);
    await t.query("insert into data_sources(organization_id, kind, last_sync_at) values ($1,'demo', now())", [folego.id]);
    const first = importSpreadsheet(carla.csv);
    const imp = importSpreadsheet(carla.csv, { decisions: Object.fromEntries(first.doubts.map((d) => [d.id, "juntar" as const])) });
    await writeDataset(t, folego.id, imp.customers, imp.orders);
    const plan = planFirstMission({ storeOwner: "Carla", storeName: "Fôlego", customers: imp.customers, orders: imp.orders, asOf: carla.asOf, controlPct: DEFAULT_PRICING_RULES.controlGroupPct });
    await t.query("insert into mz_missions(organization_id, week_start, plan) values ($1,$2,$3)", [folego.id, plan.weekStart, JSON.stringify(plan)]);
    for (const l of initialLearnings(carla.asOf))
      await t.query("insert into learnings(organization_id, key, sentence, kind, state, history) values ($1,$2,$3,$4,$5,$6)", [folego.id, l.key, l.sentence, l.kind, l.state, JSON.stringify(l.history)]);
    await seedSketch(t, folego.id, carlaSketchSeed(), "novembro");

    // ---------- João ----------
    const [brutal] = await t.query<{ id: string }>("insert into organizations(name, slug, owner_display_name, segment, store_url, is_demo, clock_date) values ('Brutal Wear','brutal-demo','João','Roupa de treino · Instagram','https://example.com/brutalwear', true, $1) returning id", [carla.asOf]);
    await t.query("insert into memberships(organization_id, user_id, role) values ($1,$2,'owner')", [brutal.id, users.joao]);
    await t.query("insert into entitlements(organization_id, module, plan) values ($1,'sketch','inicio')", [brutal.id]);
    await t.query("insert into billing_subscriptions(organization_id, provider, status, quote, billing_day) values ($1,'manual','ativa',$2, 10)", [brutal.id, JSON.stringify(quote({ sketchPlan: "inicio" }, DEFAULT_PRICING_RULES))]);
    await seedSketch(t, brutal.id, joaoSeed(), "novembro");
  });
}

async function seedSketch(t: Queryable, orgId: string, s: SketchSeed, month: string) {
  const data: SketchData = {
    path: s.path,
    segment: s.segment,
    storeUrl: s.storeUrl,
    intro: s.intro,
    baseCard: s.baseCard,
    importedFromMz: s.path === 2 ? { loyal: 140, atRisk: 220, total: 360 } : undefined,
    persona: s.persona,
    readLabel: s.readLabel,
    matrix: s.matrix,
    emptySpace: s.emptySpace,
    hypothesis: s.hypothesis,
    terrainTitle: s.terrainTitle,
    channelsTitle: s.channelsTitle,
    channels: s.channels,
    traffic: s.traffic,
    signals: s.signals,
    later: s.later,
    planMonth: month,
  };
  await t.query("insert into sketch_profiles(organization_id, path, data, research_read_at) values ($1,$2,$3, now())", [orgId, s.path, JSON.stringify(data)]);
  for (const m of s.chat) {
    const { from, kind, ...content } = m;
    await t.query("insert into sketch_messages(organization_id, sender, kind, content) values ($1,$2,$3,$4)", [orgId, from, kind, JSON.stringify(content)]);
  }
  for (const d of s.docs) await t.query("insert into sketch_sources(organization_id, id, kind, url, text, collected_at) values ($1,$2,$3,$4,$5,$6)", [orgId, d.id, d.source.kind, d.source.url ?? null, d.text, d.source.collectedAt]);
  for (const m of s.missions) await t.query("insert into sketch_missions(organization_id, key, week, data, done) values ($1,$2,$3,$4,false)", [orgId, m.key, m.week, JSON.stringify(m)]);
  await ensureOriginCodes(t, orgId, s.storeUrl, s.channels, s.missions);
}
