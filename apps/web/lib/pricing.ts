import "server-only";
import { DEFAULT_PRICING_RULES, PricingRulesSchema, rulesAt, type PricingRules } from "@ground/core";
import { getDb } from "./db";

/** Todas as versões de regra de preço (tabela pricing_rules). Fallback: a semente (hipótese). */
export async function allPricingRules(): Promise<PricingRules[]> {
  const db = await getDb();
  const rows = await db.service((t) => t.query<{ rules: unknown }>("select rules from pricing_rules order by version"));
  const parsed = rows.map((r) => PricingRulesSchema.safeParse(r.rules)).filter((r) => r.success).map((r) => r.data!);
  return parsed.length ? parsed : [DEFAULT_PRICING_RULES];
}

export async function currentRules(date: string): Promise<PricingRules> {
  return rulesAt(await allPricingRules(), date);
}
