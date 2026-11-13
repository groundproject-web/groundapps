"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PricingRulesSchema, type SketchPlan } from "@ground/core";
import { requireAdmin } from "@/lib/auth";
import { billing } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { allPricingRules, currentRules } from "@/lib/pricing";

/** Liberação manual de plano (provedor "manual"). */
export async function releasePlanAction(form: FormData) {
  const s = await requireAdmin();
  const orgId = String(form.get("orgId"));
  const mz = String(form.get("mz") ?? "") || null;
  const sk = (String(form.get("sk") ?? "") || null) as SketchPlan | null;
  await billing().activate(orgId, s.userId, { mzTierId: mz, sketchPlan: sk }, await currentRules(new Date().toISOString().slice(0, 10)));
  revalidatePath("/admin");
}

/** Nova versão da regra de preço. Só vale para cobranças a partir da data de início. */
export async function newPricingVersionAction(form: FormData) {
  const s = await requireAdmin();
  let parsed;
  try {
    parsed = PricingRulesSchema.safeParse(JSON.parse(String(form.get("rules"))));
  } catch {
    redirect("/admin/configuracao?erro=" + encodeURIComponent("JSON inválido"));
  }
  if (!parsed.success) redirect("/admin/configuracao?erro=" + encodeURIComponent(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")));
  const all = await allPricingRules();
  const version = Math.max(...all.map((r) => r.version)) + 1;
  const rules = { ...parsed.data, version };
  const db = await getDb();
  await db.asUser(s.userId, (t) => t.query("insert into pricing_rules(version, effective_from, rules, created_by) values ($1,$2,$3,$4)", [version, rules.effectiveFrom, JSON.stringify(rules), s.userId]));
  redirect("/admin/configuracao?salvo=" + version);
}

export async function orgSettingsAction(form: FormData) {
  await requireAdmin();
  const orgId = String(form.get("orgId"));
  const win = Number(form.get("window")) || null;
  const pct = Number(form.get("control")) || null;
  const db = await getDb();
  await db.service((t) => t.query("insert into mz_settings(organization_id, attribution_window_days, control_group_pct) values ($1,$2,$3) on conflict (organization_id) do update set attribution_window_days = excluded.attribution_window_days, control_group_pct = excluded.control_group_pct, updated_at = now()", [orgId, win, pct]));
  revalidatePath("/admin");
}

export async function contactStatusAction(form: FormData) {
  const s = await requireAdmin();
  const db = await getDb();
  await db.asUser(s.userId, (t) => t.query("update contact_requests set status = $2 where id = $1", [String(form.get("id")), String(form.get("status"))]));
  revalidatePath("/admin/pendencias");
}
