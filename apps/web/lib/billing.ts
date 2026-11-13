import "server-only";
import { quote, type ModuleKey, type PricingRules, type SketchPlan } from "@ground/core";
import { getDb } from "./db";

/**
 * Camada de cobrança com interface própria. O gateway (Asaas, Pagar.me ou Stripe) ainda não foi decidido;
 * o primeiro provedor é o "manual": a Ground libera o plano pelo painel interno.
 */
export interface PlanSelection {
  mzTierId: string | null;
  sketchPlan: SketchPlan | null;
}

export interface BillingProvider {
  id: "manual" | "asaas" | "pagarme" | "stripe";
  /** o lojista pede um plano (no manual: vira pendência no /admin) */
  requestPlan(orgId: string, actor: string, sel: PlanSelection, rules: PricingRules): Promise<void>;
  /** a Ground (ou o webhook do gateway) ativa o plano */
  activate(orgId: string, actor: string | null, sel: PlanSelection, rules: PricingRules): Promise<void>;
  cancel(orgId: string, actor: string, module: ModuleKey | "tudo"): Promise<void>;
}

export const manualProvider: BillingProvider = {
  id: "manual",
  async requestPlan(orgId, actor, sel, rules) {
    const db = await getDb();
    await db.service(async (t) => {
      await t.query("insert into billing_events(organization_id, kind, detail, actor) values ($1,'plano_solicitado',$2,$3)", [orgId, JSON.stringify({ ...sel, quote: quote(sel, rules) }), actor]);
      await t.query("insert into contact_requests(organization_id, module, topic, message) values ($1,'billing','Liberar plano',$2)", [orgId, JSON.stringify(sel)]);
    });
  },
  async activate(orgId, actor, sel, rules) {
    const db = await getDb();
    await db.service(async (t) => {
      const upsert = async (module: ModuleKey, plan: string | null) => {
        if (plan) await t.query("insert into entitlements(organization_id, module, plan, status, source, updated_at) values ($1,$2,$3,'ativo','manual', now()) on conflict (organization_id, module) do update set plan = excluded.plan, status = 'ativo', updated_at = now()", [orgId, module, plan]);
        else await t.query("update entitlements set status = 'cancelado', updated_at = now() where organization_id = $1 and module = $2", [orgId, module]);
      };
      await upsert("marco_zero", sel.mzTierId);
      await upsert("sketch", sel.sketchPlan);
      if (sel.mzTierId) await t.query("insert into mz_settings(organization_id, billed_tier, tier_state) values ($1,$2,'{\"kind\":\"ok\"}') on conflict (organization_id) do update set billed_tier = excluded.billed_tier, tier_state = '{\"kind\":\"ok\"}'", [orgId, sel.mzTierId]);
      const q = quote(sel, rules);
      await t.query("insert into billing_subscriptions(organization_id, provider, status, quote) values ($1,'manual','ativa',$2) on conflict (organization_id) do update set quote = excluded.quote, status = 'ativa', updated_at = now()", [orgId, JSON.stringify(q)]);
      await t.query("insert into billing_events(organization_id, kind, detail, actor) values ($1,'plano_liberado',$2,$3)", [orgId, JSON.stringify({ ...sel, quote: q }), actor]);
    });
  },
  async cancel(orgId, actor, module) {
    const db = await getDb();
    await db.service(async (t) => {
      if (module === "tudo") await t.query("update entitlements set status = 'cancelado', updated_at = now() where organization_id = $1", [orgId]);
      else await t.query("update entitlements set status = 'cancelado', updated_at = now() where organization_id = $1 and module = $2", [orgId, module]);
      await t.query("insert into billing_events(organization_id, kind, detail, actor) values ($1,'cancelamento',$2,$3)", [orgId, JSON.stringify({ module }), actor]);
    });
  },
};

export function billing(): BillingProvider {
  return manualProvider;
}
