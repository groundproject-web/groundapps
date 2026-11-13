"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { acceptUpgrade, addDays, type SketchPlan, type UpgradeState } from "@ground/core";
import { getOrgContext } from "@/lib/orgs";
import { billing } from "@/lib/billing";
import { currentRules } from "@/lib/pricing";
import { getDb } from "@/lib/db";
import { queueEmail } from "@/lib/email";

export async function requestPlanAction(form: FormData) {
  const ctx = await getOrgContext();
  const mz = String(form.get("mz") ?? "") || null;
  const sk = (String(form.get("sk") ?? "") || null) as SketchPlan | null;
  if (!mz && !sk) redirect("/app/plano?erro=1");
  await billing().requestPlan(ctx.org.id, ctx.session.userId, { mzTierId: mz, sketchPlan: sk }, await currentRules(ctx.today));
  redirect("/app/plano?pedido=1");
}

/** O upgrade de faixa SÓ acontece com o aceite do lojista. */
export async function acceptUpgradeAction() {
  const ctx = await getOrgContext();
  const db = await getDb();
  const rules = await currentRules(ctx.today);
  const [st] = await db.asUser(ctx.session.userId, (t) => t.query<{ billed_tier: string; tier_state: UpgradeState }>("select billed_tier, tier_state from mz_settings where organization_id = $1", [ctx.org.id]));
  if (!st || (st.tier_state.kind !== "aviso" && st.tier_state.kind !== "carencia_vencida")) redirect("/app/plano");
  const next = acceptUpgrade({ billedTier: st.billed_tier, state: st.tier_state });
  const sk = ctx.entitlements.find((e) => e.module === "sketch" && e.status !== "cancelado")?.plan as SketchPlan | undefined;
  await billing().activate(ctx.org.id, ctx.session.userId, { mzTierId: next.billedTier, sketchPlan: sk ?? null }, rules);
  revalidatePath("/app", "layout");
  redirect("/app/plano?upgrade=1");
}

export async function cancelAction(form: FormData) {
  const ctx = await getOrgContext();
  const module = String(form.get("module")) as "marco_zero" | "sketch" | "tudo";
  await billing().cancel(ctx.org.id, ctx.session.userId, module);
  revalidatePath("/app", "layout");
  redirect("/app/plano?cancelado=1");
}

/** LGPD: pedido de exclusão. Apagamos em até 30 dias; a Ground é avisada. */
export async function requestDeletionAction() {
  const ctx = await getOrgContext();
  const db = await getDb();
  await db.service(async (t) => {
    await t.query("update organizations set deletion_requested_at = now() where id = $1 and deletion_requested_at is null", [ctx.org.id]);
    await t.query("insert into billing_events(organization_id, kind, detail, actor) values ($1,'exclusao_solicitada',$2,$3)", [ctx.org.id, JSON.stringify({ prazo: addDays(ctx.today, 30) }), ctx.session.userId]);
    await queueEmail(t, { orgId: ctx.org.id, toUser: null, kind: "exclusao", subject: `[Ground] Pedido de exclusão de dados: ${ctx.org.name}`, body: `Apagar os dados até ${addDays(ctx.today, 30)}.`, dedupeKey: `exclusao:${ctx.org.id}` });
  });
  redirect("/app/privacidade?pedido=1");
}
